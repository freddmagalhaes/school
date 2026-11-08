-- Responsável: vínculo com o(s) aluno(s) e acesso SOMENTE LEITURA aos dados desses alunos.
-- Idempotente.

CREATE TABLE IF NOT EXISTS public.responsaveis_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  responsavel_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  parentesco text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (responsavel_id, aluno_id),
  CHECK (responsavel_id <> aluno_id)
);
CREATE INDEX IF NOT EXISTS responsaveis_alunos_aluno_idx ON public.responsaveis_alunos (aluno_id);
ALTER TABLE public.responsaveis_alunos ENABLE ROW LEVEL SECURITY;

-- ============ Funções (SECURITY DEFINER) ============
-- O usuário é responsável por esse aluno (id do perfil do aluno)?
CREATE OR REPLACE FUNCTION public.responsavel_do_aluno(p_aluno uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.responsaveis_alunos WHERE responsavel_id = auth.uid() AND aluno_id = p_aluno);
$$;

-- ... dono dessa matrícula (id de matriculas OU de turma_alunos)?
CREATE OR REPLACE FUNCTION public.responsavel_da_matricula(p_matricula uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matriculas m
    JOIN public.responsaveis_alunos ra ON ra.aluno_id = m.aluno_id
    WHERE m.id = p_matricula AND ra.responsavel_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.turma_alunos ta
    JOIN public.membros_escola me ON me.id = ta.aluno_id
    JOIN public.responsaveis_alunos ra ON ra.aluno_id = me.user_id
    WHERE ta.id = p_matricula AND ra.responsavel_id = auth.uid()
  );
$$;

-- ... dono desse vínculo de aluno (membros_escola.id; usado por faturas e turma_alunos)?
CREATE OR REPLACE FUNCTION public.responsavel_do_membro(p_membro uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membros_escola me
    JOIN public.responsaveis_alunos ra ON ra.aluno_id = me.user_id
    WHERE me.id = p_membro AND ra.responsavel_id = auth.uid()
  );
$$;

-- O vínculo só vale entre um Responsável e um Aluno da MESMA escola.
CREATE OR REPLACE FUNCTION public.vinculo_responsavel_valido(p_escola uuid, p_responsavel uuid, p_aluno uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.membros_escola WHERE escola_id = p_escola AND user_id = p_responsavel AND papel::text = 'Responsavel')
     AND EXISTS (SELECT 1 FROM public.membros_escola WHERE escola_id = p_escola AND user_id = p_aluno AND papel::text = 'Aluno');
$$;

-- Perfil: o responsável vê o perfil dos alunos que acompanha.
CREATE OR REPLACE FUNCTION public.pode_ver_perfil(p_perfil uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_perfil = auth.uid()
    OR public.responsavel_do_aluno(p_perfil)
    OR EXISTS (
      SELECT 1
      FROM public.membros_escola alvo
      JOIN public.membros_escola eu ON eu.escola_id = alvo.escola_id
      WHERE alvo.user_id = p_perfil AND eu.user_id = auth.uid()
        AND eu.papel::text IN ('Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor')
    );
$$;

-- ============ Políticas da tabela de vínculos ============
DROP POLICY IF EXISTS resp_alunos_select ON public.responsaveis_alunos;
DROP POLICY IF EXISTS resp_alunos_write ON public.responsaveis_alunos;
CREATE POLICY resp_alunos_select ON public.responsaveis_alunos FOR SELECT USING (
  responsavel_id = auth.uid()
  OR public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria')
);
CREATE POLICY resp_alunos_write ON public.responsaveis_alunos FOR ALL
  USING (public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria'))
  WITH CHECK (
    public.tem_papel(escola_id, 'Admin', 'Diretor', 'Secretaria')
    AND public.vinculo_responsavel_valido(escola_id, responsavel_id, aluno_id)
  );

-- ============ Leitura dos dados do filho (nunca escrita) ============
DROP POLICY IF EXISTS membros_select ON public.membros_escola;
CREATE POLICY membros_select ON public.membros_escola FOR SELECT USING (
  user_id = auth.uid()
  OR public.responsavel_do_aluno(user_id)
  OR public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor')
);

DROP POLICY IF EXISTS matriculas_select ON public.matriculas;
CREATE POLICY matriculas_select ON public.matriculas FOR SELECT USING (
  aluno_id = auth.uid()
  OR public.responsavel_do_aluno(aluno_id)
  OR public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria')
  OR public.professor_leciona(turma_id)
);

DROP POLICY IF EXISTS turma_alunos_select ON public.turma_alunos;
CREATE POLICY turma_alunos_select ON public.turma_alunos FOR SELECT USING (
  public.membro_e_meu(aluno_id)
  OR public.responsavel_do_membro(aluno_id)
  OR EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = turma_id
             AND (public.tem_papel(t.escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria') OR public.professor_leciona(t.id))));

DROP POLICY IF EXISTS notas_select ON public.notas;
CREATE POLICY notas_select ON public.notas FOR SELECT USING (
  public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria')
  OR public.professor_leciona_matricula(matricula_id, disciplina_id)
  OR public.matricula_e_minha(matricula_id)
  OR public.responsavel_da_matricula(matricula_id)
);

DROP POLICY IF EXISTS frequencia_select ON public.frequencia;
CREATE POLICY frequencia_select ON public.frequencia FOR SELECT USING (
  public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria')
  OR public.professor_leciona_matricula(matricula_id)
  OR public.matricula_e_minha(matricula_id)
  OR public.responsavel_da_matricula(matricula_id)
);

DROP POLICY IF EXISTS faturas_select ON public.faturas;
CREATE POLICY faturas_select ON public.faturas FOR SELECT USING (
  public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor')
  OR public.membro_e_meu(aluno_id)
  OR public.responsavel_do_membro(aluno_id)
);
