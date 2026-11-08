DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['turmas', 'disciplinas', 'turma_professores', 'turma_alunos', 'matriculas', 'horarios_aula'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS root_gerencia_%1$s ON public.%1$I', t);
    END IF;
  END LOOP;
END $$;
