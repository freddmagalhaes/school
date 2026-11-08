-- Passo 9. Esperado: rls_ativo = true, politicas = 3 (4 se o passo 10 já foi aplicado: ele soma root_gerencia_horarios_aula), gatilhos = 2, coluna_carga = 1.
select
  (select relrowsecurity from pg_class where oid = 'public.horarios_aula'::regclass) as rls_ativo,
  (select count(*) from pg_policies where tablename = 'horarios_aula') as politicas,
  (select count(*) from pg_trigger where tgname in ('trg_horarios_aula_valida', 'trg_horarios_aula_limpa') and not tgisinternal) as gatilhos,
  (select count(*) from information_schema.columns where table_name = 'membros_escola' and column_name = 'carga_horaria_semanal') as coluna_carga;
