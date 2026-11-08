-- Passo 7. Esperado: 7 políticas (escolas, membros_escola x2, perfis, turmas, disciplinas, matriculas).
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and policyname like 'root\_%' order by tablename, policyname;
