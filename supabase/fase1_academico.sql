-- Fase 1: Enturmação e Acadêmico
-- Criação de tabelas para gerenciar a malha curricular e alocação de alunos/professores.

-- 1. Tabela de Disciplinas
CREATE TABLE IF NOT EXISTS public.disciplinas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    nome text NOT NULL,
    codigo text, -- Ex: MAT, POR, HIS
    carga_horaria_padrao integer,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Tabela de Turmas
-- Turnos comuns: Matutino, Vespertino, Noturno, Integral
CREATE TABLE IF NOT EXISTS public.turmas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    nome text NOT NULL, -- Ex: "1º Ano A"
    turno text NOT NULL, 
    ano_letivo text NOT NULL, -- Ex: "2026"
    vagas_limite integer DEFAULT 30,
    status text DEFAULT 'Ativa', -- Ativa, Fechada
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Matrizes Curriculares (Quais disciplinas compõem uma turma)
CREATE TABLE IF NOT EXISTS public.matrizes_curriculares (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    disciplina_id uuid NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
    carga_horaria integer NOT NULL,
    UNIQUE(turma_id, disciplina_id)
);

-- 4. Vínculo: Alunos na Turma (Enturmação)
CREATE TABLE IF NOT EXISTS public.turma_alunos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    aluno_id uuid NOT NULL REFERENCES public.membros_escola(id) ON DELETE CASCADE,
    data_matricula timestamp with time zone DEFAULT now(),
    status text DEFAULT 'Ativo', -- Ativo, Transferido, Desistente
    UNIQUE(turma_id, aluno_id)
);

-- 5. Vínculo: Professores e Disciplinas na Turma
CREATE TABLE IF NOT EXISTS public.turma_professores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    disciplina_id uuid NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
    professor_id uuid NOT NULL REFERENCES public.membros_escola(id) ON DELETE CASCADE,
    UNIQUE(turma_id, disciplina_id) -- Uma disciplina na turma tem 1 professor titular (por simplificação)
);

-- ==========================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- Todas as tabelas terão RLS. O acesso é liberado se o auth.uid()
-- for um membro válido da mesma escola_id através de membros_escola
-- ==========================================

ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrizes_curriculares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_professores ENABLE ROW LEVEL SECURITY;

-- Exemplo simplificado de policy (pode ser ajustado se preferir centralizar a checagem):
-- Disciplinas
CREATE POLICY "Acesso Disciplinas" ON public.disciplinas FOR ALL
USING (escola_id IN (SELECT escola_id FROM public.membros_escola WHERE user_id = auth.uid()));

-- Turmas
CREATE POLICY "Acesso Turmas" ON public.turmas FOR ALL
USING (escola_id IN (SELECT escola_id FROM public.membros_escola WHERE user_id = auth.uid()));

-- Matrizes
CREATE POLICY "Acesso Matrizes" ON public.matrizes_curriculares FOR ALL
USING (turma_id IN (SELECT id FROM public.turmas WHERE escola_id IN (SELECT escola_id FROM public.membros_escola WHERE user_id = auth.uid())));

-- Turma Alunos
CREATE POLICY "Acesso Turma Alunos" ON public.turma_alunos FOR ALL
USING (turma_id IN (SELECT id FROM public.turmas WHERE escola_id IN (SELECT escola_id FROM public.membros_escola WHERE user_id = auth.uid())));

-- Turma Professores
CREATE POLICY "Acesso Turma Professores" ON public.turma_professores FOR ALL
USING (turma_id IN (SELECT id FROM public.turmas WHERE escola_id IN (SELECT escola_id FROM public.membros_escola WHERE user_id = auth.uid())));
