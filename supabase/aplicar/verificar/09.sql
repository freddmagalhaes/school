-- Passo 9. Esperado: tabela horarios_aula com rls = true, 3 políticas, 2 gatilhos e a coluna carga_horaria_semanal.
select
  (select relrowsecurity from pg_class where oid = 'public.horarios_aula'::regclass) as rls_ativo,
  (select count(*) from pg_policies where tablename = 'horarios_aula') as politicas,
  (select count(*) from pg_trigger where tgname in ('trg_horarios_aula_valida', 'trg_horarios_aula_limpa') and not tgisinternal) as gatilhos,
  (select count(*) from information_schema.columns where table_name = 'membros_escola' and column_name = 'carga_horaria_semanal') as coluna_carga;
