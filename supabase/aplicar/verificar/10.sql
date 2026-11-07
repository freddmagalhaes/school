-- Passo 10. Esperado: 6 políticas root_gerencia_* (turmas, disciplinas, turma_professores, turma_alunos, matriculas, horarios_aula).
select tablename, policyname, cmd from pg_policies where schemaname = 'public' and policyname like 'root\_gerencia\_%' order by tablename;
