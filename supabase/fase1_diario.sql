-- Fase 1.5: Diário de Classe (Frequências e Notas)

CREATE TABLE IF NOT EXISTS public.frequencia (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    matricula_id uuid NOT NULL REFERENCES public.turma_alunos(id) ON DELETE CASCADE,
    data date NOT NULL,
    presente boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(matricula_id, data)
);

CREATE TABLE IF NOT EXISTS public.notas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    matricula_id uuid NOT NULL REFERENCES public.turma_alunos(id) ON DELETE CASCADE,
    disciplina_id uuid NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
    data date NOT NULL,
    valor numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(matricula_id, disciplina_id, data)
);

ALTER TABLE public.frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso Frequencia" ON public.frequencia FOR ALL
USING (escola_id IN (SELECT escola_id FROM public.membros_escola WHERE user_id = auth.uid()));

CREATE POLICY "Acesso Notas" ON public.notas FOR ALL
USING (escola_id IN (SELECT escola_id FROM public.membros_escola WHERE user_id = auth.uid()));
