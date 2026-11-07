-- Apaga a grade de horários e a carga horária (os dados lançados nelas SÃO perdidos).
DROP TRIGGER IF EXISTS trg_horarios_aula_limpa ON public.turma_professores;
DROP FUNCTION IF EXISTS public.horarios_aula_limpa();
DROP TABLE IF EXISTS public.horarios_aula;
DROP FUNCTION IF EXISTS public.horarios_aula_valida();
ALTER TABLE public.membros_escola DROP COLUMN IF EXISTS carga_horaria_semanal;
