-- Endurece o RLS: isolamento entre escolas já existia; aqui entram as permissões POR PAPEL
-- dentro da escola (antes, qualquer membro, inclusive Aluno, lia e escrevia quase tudo).
-- Idempotente: pode ser executada mais de uma vez.
--
-- ATENÇÃO: antes de aplicar em produção, compare com o schema real (supabase db dump --schema public).
-- Esta migration APAGA todas as políticas das tabelas listadas abaixo e as recria.

-- ============ Funções auxiliares (SECURITY DEFINER evita recursão de RLS) ============
CREATE OR REPLACE FUNCTION public.tem_papel(p_escola uuid, VARIADIC p_papeis text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membros_escola
    WHERE escola_id = p_escola AND user_id = auth.uid() AND papel::text = ANY (p_papeis)
  );
$$;

-- O usuário leciona nessa turma (e, se informada, nessa disciplina)?
CREATE OR REPLACE FUNCTION public.professor_leciona(p_turma uuid, p_disciplina uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turma_professores
    WHERE turma_id = p_turma AND professor_id = auth.uid()
      AND (p_disciplina IS NULL OR disciplina_id = p_disciplina)
  );
$$;

-- O app grava notas/frequência com o id de `matriculas` OU de `turma_alunos` (o repositório tem as
-- duas definições). As funções abaixo aceitam os dois, para a migration valer em qualquer um dos esquemas.

-- O usuário leciona para a turma dessa matrícula (e disciplina, se informada)?
CREATE OR REPLACE FUNCTION public.professor_leciona_matricula(p_matricula uuid, p_disciplina uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT turma_id FROM public.matriculas WHERE id = p_matricula
      UNION ALL
      SELECT turma_id FROM public.turma_alunos WHERE id = p_matricula
    ) m
    JOIN public.turma_professores tp ON tp.turma_id = m.turma_id
    WHERE tp.professor_id = auth.uid()
      AND (p_disciplina IS NULL OR tp.disciplina_id = p_disciplina)
  );
$$;

-- A matrícula é do próprio usuário (aluno)?
CREATE OR REPLACE FUNCTION public.matricula_e_minha(p_matricula uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.matriculas WHERE id = p_matricula AND aluno_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.turma_alunos ta JOIN public.membros_escola me ON me.id = ta.aluno_id
                 WHERE ta.id = p_matricula AND me.user_id = auth.uid());
$$;

-- A matrícula pertence a essa escola? (impede gravar nota/frequência de uma escola numa matrícula de outra)
CREATE OR REPLACE FUNCTION public.matricula_na_escola(p_matricula uuid, p_escola uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.matriculas WHERE id = p_matricula AND escola_id = p_escola)
      OR EXISTS (SELECT 1 FROM public.turma_alunos ta JOIN public.turmas t ON t.id = ta.turma_id
                 WHERE ta.id = p_matricula AND t.escola_id = p_escola);
$$;

-- O vínculo (membros_escola.id) é do próprio usuário?
CREATE OR REPLACE FUNCTION public.membro_e_meu(p_membro uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.membros_escola WHERE id = p_membro AND user_id = auth.uid());
$$;

-- Quem trabalha na escola pode ver o perfil de quem também está nela; aluno vê só o próprio.
CREATE OR REPLACE FUNCTION public.pode_ver_perfil(p_perfil uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_perfil = auth.uid() OR EXISTS (
    SELECT 1
    FROM public.membros_escola alvo
    JOIN public.membros_escola eu ON eu.escola_id = alvo.escola_id
    WHERE alvo.user_id = p_perfil AND eu.user_id = auth.uid()
      AND eu.papel::text IN ('Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor')
  );
$$;

-- ============ Remove as políticas antigas das tabelas gerenciadas aqui ============
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN (
      'perfis', 'membros_escola', 'turmas', 'disciplinas', 'turma_professores', 'turma_alunos',
      'matrizes_curriculares', 'matriculas', 'notas', 'frequencia', 'periodos_letivos',
      'financeiro_verbas', 'faturas', 'assinaturas')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============ perfis ============
CREATE POLICY perfis_select ON public.perfis FOR SELECT USING (public.pode_ver_perfil(id));
CREATE POLICY perfis_update_proprio ON public.perfis FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============ membros_escola ============
CREATE POLICY membros_select ON public.membros_escola FOR SELECT USING (
  user_id = auth.uid()
  OR public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor')
);
-- Admin gerencia todos os vínculos; Secretaria só Professor, Aluno e Responsável. (O convite usa a Edge Function com service_role.)
CREATE POLICY membros_insert ON public.membros_escola FOR INSERT WITH CHECK (
  public.tem_papel(escola_id, 'Admin')
  OR (public.tem_papel(escola_id, 'Secretaria') AND papel::text IN ('Professor', 'Aluno', 'Responsavel'))
);
CREATE POLICY membros_update ON public.membros_escola FOR UPDATE USING (
  public.tem_papel(escola_id, 'Admin')
  OR (public.tem_papel(escola_id, 'Secretaria') AND papel::text IN ('Professor', 'Aluno', 'Responsavel'))
) WITH CHECK (
  public.tem_papel(escola_id, 'Admin')
  OR (public.tem_papel(escola_id, 'Secretaria') AND papel::text IN ('Professor', 'Aluno', 'Responsavel'))
);
CREATE POLICY membros_delete ON public.membros_escola FOR DELETE USING (
  public.tem_papel(escola_id, 'Admin')
  OR (public.tem_papel(escola_id, 'Secretaria') AND papel::text IN ('Professor', 'Aluno', 'Responsavel'))
);

-- ============ Estrutura acadêmica: todos da escola leem; Admin/Diretor/Secretaria escrevem ============
CREATE POLICY turmas_select ON public.turmas FOR SELECT USING (public.user_in_escola(escola_id));
CREATE POLICY turmas_write ON public.turmas FOR ALL
  USING (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'))
  WITH CHECK (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'));

CREATE POLICY disciplinas_select ON public.disciplinas FOR SELECT USING (public.user_in_escola(escola_id));
CREATE POLICY disciplinas_write ON public.disciplinas FOR ALL
  USING (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'))
  WITH CHECK (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'));

CREATE POLICY turma_professores_select ON public.turma_professores FOR SELECT USING (public.user_in_escola(escola_id));
CREATE POLICY turma_professores_write ON public.turma_professores FOR ALL
  USING (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'))
  WITH CHECK (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'));

-- Só Admin define o calendário letivo
CREATE POLICY periodos_select ON public.periodos_letivos FOR SELECT USING (public.user_in_escola(escola_id));
CREATE POLICY periodos_write ON public.periodos_letivos FOR ALL
  USING (public.tem_papel(escola_id, 'Admin')) WITH CHECK (public.tem_papel(escola_id, 'Admin'));

-- matrizes_curriculares e turma_alunos não têm escola_id: usam a turma
CREATE POLICY matrizes_select ON public.matrizes_curriculares FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = turma_id AND public.user_in_escola(t.escola_id)));
CREATE POLICY matrizes_write ON public.matrizes_curriculares FOR ALL
  USING (EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = turma_id AND public.tem_papel(t.escola_id, 'Admin', 'Diretor', 'Secretaria')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = turma_id AND public.tem_papel(t.escola_id, 'Admin', 'Diretor', 'Secretaria')));

CREATE POLICY turma_alunos_select ON public.turma_alunos FOR SELECT USING (
  public.membro_e_meu(aluno_id)
  OR EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = turma_id
             AND (public.tem_papel(t.escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria') OR public.professor_leciona(t.id))));
CREATE POLICY turma_alunos_write ON public.turma_alunos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = turma_id AND public.tem_papel(t.escola_id, 'Admin', 'Diretor', 'Secretaria')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = turma_id AND public.tem_papel(t.escola_id, 'Admin', 'Diretor', 'Secretaria')));

-- ============ Matrículas ============
CREATE POLICY matriculas_select ON public.matriculas FOR SELECT USING (
  aluno_id = auth.uid()
  OR public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria')
  OR public.professor_leciona(turma_id)
);
CREATE POLICY matriculas_write ON public.matriculas FOR ALL
  USING (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'))
  WITH CHECK (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'));

-- ============ Notas e frequência ============
CREATE POLICY notas_select ON public.notas FOR SELECT USING (
  public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria')
  OR public.professor_leciona_matricula(matricula_id, disciplina_id)
  OR public.matricula_e_minha(matricula_id)
);
CREATE POLICY notas_write ON public.notas FOR ALL
  USING (
    public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria')
    OR public.professor_leciona_matricula(matricula_id, disciplina_id)
  )
  WITH CHECK (
    public.matricula_na_escola(matricula_id, escola_id)
    AND (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria')
         OR public.professor_leciona_matricula(matricula_id, disciplina_id))
  );

CREATE POLICY frequencia_select ON public.frequencia FOR SELECT USING (
  public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria')
  OR public.professor_leciona_matricula(matricula_id)
  OR public.matricula_e_minha(matricula_id)
);
CREATE POLICY frequencia_write ON public.frequencia FOR ALL
  USING (
    public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria')
    OR public.professor_leciona_matricula(matricula_id)
  )
  WITH CHECK (
    public.matricula_na_escola(matricula_id, escola_id)
    AND (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria')
         OR public.professor_leciona_matricula(matricula_id))
  );

-- ============ Financeiro: leitura Admin/Diretor/Subdiretor; escrita (e aprovação) Admin/Diretor ============
CREATE POLICY verbas_select ON public.financeiro_verbas FOR SELECT
  USING (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor'));
CREATE POLICY verbas_write ON public.financeiro_verbas FOR ALL
  USING (public.tem_papel(escola_id, 'Admin', 'Diretor'))
  WITH CHECK (public.tem_papel(escola_id, 'Admin', 'Diretor'));

CREATE POLICY faturas_select ON public.faturas FOR SELECT USING (
  public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor')
  OR public.membro_e_meu(aluno_id)
);
CREATE POLICY faturas_write ON public.faturas FOR ALL
  USING (public.tem_papel(escola_id, 'Admin', 'Diretor'))
  WITH CHECK (public.tem_papel(escola_id, 'Admin', 'Diretor'));

-- ============ assinaturas (cadastro público e backoffice) ============
-- Visitante só cria assinatura pendente e sem escola (antes: qualquer linha, até "ativo").
CREATE POLICY assinaturas_insert_publico ON public.assinaturas FOR INSERT
  WITH CHECK (status = 'pendente' AND escola_id IS NULL);
CREATE POLICY assinaturas_select_operador ON public.assinaturas FOR SELECT USING (public.is_operator_active());
CREATE POLICY assinaturas_update_operador ON public.assinaturas FOR UPDATE
  USING (public.is_operator_active()) WITH CHECK (public.is_operator_active());
