-- Níveis de suporte (N1, N2, N3) e auditoria do acesso da equipe a dados das escolas.
--
-- Princípio: a equipe de suporte NUNCA lê as tabelas das escolas diretamente (o RLS continua negando).
-- Ela usa as funções abaixo, que (1) conferem o nível do operador, (2) exigem o motivo (ex.: nº do chamado)
-- nos níveis que enxergam dados de pessoas e (3) gravam cada acesso em audit_logs.
--
--   N1: escolas, resumo da escola, lista de usuários SEM CPF e com e-mail mascarado.
--   N2: + estrutura (turmas, professores, disciplinas, grade) e e-mail completo. Exige motivo.
--   N3: + notas, frequência e faturas de um aluno. Exige motivo.
--   N4: dono do sistema (is_root): tudo, também com motivo e auditoria. super_admin equivale a N3.
--   financeiro / operacional: nenhum acesso a dados de escola.
-- Idempotente.

ALTER TABLE public.root_admins
  ADD COLUMN IF NOT EXISTS nivel_suporte smallint CHECK (nivel_suporte BETWEEN 1 AND 3);   -- usado quando role = 'suporte'; vazio = N1

CREATE OR REPLACE FUNCTION public.suporte_nivel() RETURNS smallint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT CASE WHEN r.is_root THEN 4
                WHEN r.role = 'super_admin' THEN 3
                WHEN r.role = 'suporte' THEN COALESCE(r.nivel_suporte, 1)
                ELSE 0 END
    FROM public.root_admins r WHERE r.id = auth.uid() AND r.is_active
  ), 0)::smallint;
$$;

-- Confere o nível e o motivo e registra o acesso. Chamada no início de cada função de suporte.
CREATE OR REPLACE FUNCTION public.suporte_exige(p_nivel smallint, p_escola uuid, p_acao text, p_motivo text, p_extra jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nivel smallint := public.suporte_nivel();
BEGIN
  IF v_nivel < p_nivel THEN
    RAISE EXCEPTION 'Seu nível de suporte não permite esta consulta.' USING ERRCODE = '42501';
  END IF;
  IF p_nivel >= 2 AND length(btrim(coalesce(p_motivo, ''))) < 10 THEN
    RAISE EXCEPTION 'Informe o motivo do acesso (mínimo 10 caracteres), por exemplo o número do chamado.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.audit_logs (user_id, escola_id, acao, detalhes)
  VALUES (auth.uid(), p_escola, p_acao,
          p_extra || jsonb_build_object('nivel', v_nivel, 'motivo', nullif(btrim(coalesce(p_motivo, '')), '')));
END $$;

-- N1: lista de escolas para escolher (sem dados pessoais; não gera registro)
CREATE OR REPLACE FUNCTION public.suporte_escolas() RETURNS TABLE (id uuid, nome text, cnpj text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.suporte_nivel() < 1 THEN RAISE EXCEPTION 'Seu nível de suporte não permite esta consulta.' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT e.id, e.nome::text, e.cnpj::text FROM public.escolas e ORDER BY e.nome;
END $$;

-- N1: resumo da escola
CREATE OR REPLACE FUNCTION public.suporte_escola_resumo(p_escola uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  PERFORM public.suporte_exige(1::smallint, p_escola, 'SUPORTE_VER_RESUMO', NULL);
  SELECT jsonb_build_object(
    'escola', (SELECT jsonb_build_object('nome', e.nome, 'cnpj', e.cnpj, 'telefone', e.telefone, 'criada_em', e.created_at) FROM public.escolas e WHERE e.id = p_escola),
    'assinaturas', COALESCE((SELECT jsonb_agg(jsonb_build_object('plano', a.plano, 'status', a.status, 'ciclo', a.ciclo)) FROM public.assinaturas a WHERE a.escola_id = p_escola), '[]'::jsonb),
    'usuarios_por_papel', COALESCE((SELECT jsonb_object_agg(papel, n) FROM (SELECT papel::text AS papel, count(*) AS n FROM public.membros_escola WHERE escola_id = p_escola GROUP BY papel) x), '{}'::jsonb),
    'turmas', (SELECT count(*) FROM public.turmas WHERE escola_id = p_escola),
    'alunos_matriculados', (SELECT count(DISTINCT aluno_id) FROM public.matriculas WHERE escola_id = p_escola AND status = 'Ativo')
  ) INTO r;
  RETURN r;
END $$;

-- N1: usuários da escola. Sem CPF. E-mail mascarado no N1; completo do N2 em diante (com motivo).
CREATE OR REPLACE FUNCTION public.suporte_usuarios(p_escola uuid, p_motivo text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_completo boolean := public.suporte_nivel() >= 2 AND length(btrim(coalesce(p_motivo, ''))) >= 10;
  r jsonb;
BEGIN
  PERFORM public.suporte_exige(1::smallint, p_escola, 'SUPORTE_VER_USUARIOS', p_motivo, jsonb_build_object('email_completo', v_completo));
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'user_id', m.user_id, 'nome', p.nome, 'papel', m.papel, 'tipo_vinculo', m.tipo_vinculo,
      'carga_horaria_semanal', m.carga_horaria_semanal, 'data_fim', m.data_fim,
      'email', CASE WHEN v_completo THEN u.email ELSE regexp_replace(u.email, '^(.).*(@.*)$', '\1***\2') END
    ) ORDER BY p.nome), '[]'::jsonb)
  INTO r
  FROM public.membros_escola m
  JOIN public.perfis p ON p.id = m.user_id
  LEFT JOIN auth.users u ON u.id = m.user_id
  WHERE m.escola_id = p_escola;
  RETURN r;
END $$;

-- N2: estrutura da escola (turmas, quem leciona o quê, grade)
CREATE OR REPLACE FUNCTION public.suporte_estrutura(p_escola uuid, p_motivo text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  PERFORM public.suporte_exige(2::smallint, p_escola, 'SUPORTE_VER_ESTRUTURA', p_motivo);
  SELECT jsonb_build_object(
    'turmas', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'nome', t.nome, 'turno', t.turno, 'ano_letivo', t.ano_letivo,
        'alunos_ativos', (SELECT count(*) FROM public.matriculas m WHERE m.turma_id = t.id AND m.status = 'Ativo'),
        'professores', COALESCE((SELECT jsonb_agg(jsonb_build_object('professor', pp.nome, 'disciplina', d.nome))
                                 FROM public.turma_professores tp JOIN public.perfis pp ON pp.id = tp.professor_id
                                 JOIN public.disciplinas d ON d.id = tp.disciplina_id WHERE tp.turma_id = t.id), '[]'::jsonb),
        'aulas_na_grade', (SELECT count(*) FROM public.horarios_aula h WHERE h.turma_id = t.id)
      ) ORDER BY t.nome) FROM public.turmas t WHERE t.escola_id = p_escola), '[]'::jsonb),
    'disciplinas', COALESCE((SELECT jsonb_agg(d.nome ORDER BY d.nome) FROM public.disciplinas d WHERE d.escola_id = p_escola), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

-- N3: notas, frequência e faturas de UM aluno
CREATE OR REPLACE FUNCTION public.suporte_aluno(p_escola uuid, p_aluno uuid, p_motivo text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; v_membro uuid;
BEGIN
  PERFORM public.suporte_exige(3::smallint, p_escola, 'SUPORTE_VER_ALUNO', p_motivo, jsonb_build_object('aluno_id', p_aluno));
  SELECT id INTO v_membro FROM public.membros_escola WHERE escola_id = p_escola AND user_id = p_aluno AND papel = 'Aluno';
  IF v_membro IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado nesta escola.' USING ERRCODE = 'P0002';
  END IF;
  SELECT jsonb_build_object(
    'nome', (SELECT nome FROM public.perfis WHERE id = p_aluno),
    'matriculas', COALESCE((SELECT jsonb_agg(jsonb_build_object('turma', t.nome, 'status', m.status))
                            FROM public.matriculas m JOIN public.turmas t ON t.id = m.turma_id
                            WHERE m.escola_id = p_escola AND m.aluno_id = p_aluno), '[]'::jsonb),
    'notas', COALESCE((SELECT jsonb_agg(jsonb_build_object('disciplina', d.nome, 'valor', n.valor, 'data', n.data) ORDER BY n.data)
                       FROM public.notas n JOIN public.matriculas m ON m.id = n.matricula_id
                       LEFT JOIN public.disciplinas d ON d.id = n.disciplina_id
                       WHERE m.escola_id = p_escola AND m.aluno_id = p_aluno), '[]'::jsonb),
    'frequencia', (SELECT jsonb_build_object('presencas', count(*) FILTER (WHERE f.presente), 'faltas', count(*) FILTER (WHERE NOT f.presente))
                   FROM public.frequencia f JOIN public.matriculas m ON m.id = f.matricula_id
                   WHERE m.escola_id = p_escola AND m.aluno_id = p_aluno),
    'faturas', COALESCE((SELECT jsonb_agg(jsonb_build_object('mes', fa.mes_referencia, 'valor', fa.valor, 'vencimento', fa.data_vencimento, 'status', fa.status) ORDER BY fa.data_vencimento)
                         FROM public.faturas fa WHERE fa.escola_id = p_escola AND fa.aluno_id = v_membro), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;

-- Permissões: só usuários logados chamam; cada função confere o nível por dentro
REVOKE ALL ON FUNCTION public.suporte_nivel(), public.suporte_exige(smallint, uuid, text, text, jsonb),
  public.suporte_escolas(), public.suporte_escola_resumo(uuid), public.suporte_usuarios(uuid, text),
  public.suporte_estrutura(uuid, text), public.suporte_aluno(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suporte_nivel(), public.suporte_escolas(), public.suporte_escola_resumo(uuid),
  public.suporte_usuarios(uuid, text), public.suporte_estrutura(uuid, text), public.suporte_aluno(uuid, uuid, text) TO authenticated;
-- suporte_exige é interna: nem authenticated a chama direto (senão qualquer um poderia gravar registros falsos de acesso)
REVOKE ALL ON FUNCTION public.suporte_exige(smallint, uuid, text, text, jsonb) FROM authenticated;

-- Auditoria: o dono lê tudo; a escola já lê os registros dela (política existente) e assim vê quem do suporte acessou.
-- Ninguém altera nem apaga registros pelo app.
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;
DROP POLICY IF EXISTS audit_owner_select ON public.audit_logs;
CREATE POLICY audit_owner_select ON public.audit_logs FOR SELECT USING (public.is_root_owner());
