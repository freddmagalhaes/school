-- Passo 11. Esperado: rls_ativo = true, politicas = 3.
select
  (select relrowsecurity from pg_class where oid = 'public.periodos_aula'::regclass) as rls_ativo,
  (select count(*) from pg_policies where tablename = 'periodos_aula') as politicas;
