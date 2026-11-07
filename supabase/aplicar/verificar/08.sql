-- Passo 8. Esperado: 1 linha, root_cria_escola | INSERT
select tablename, policyname, cmd from pg_policies where schemaname = 'public' and policyname in ('root_cria_escola');
