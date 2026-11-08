-- Passo 13. Esperado: tabelas = 2, politicas = 5, gatilhos = 4, rls_ativo = true.
select
  (select count(*) from pg_tables where schemaname = 'public' and tablename in ('atendimentos', 'atendimento_mensagens')) as tabelas,
  (select count(*) from pg_policies where tablename in ('atendimentos', 'atendimento_mensagens')) as politicas,
  (select count(*) from pg_trigger where tgname like 'trg\_atend\_%' and not tgisinternal) as gatilhos,
  (select bool_and(relrowsecurity) from pg_class where oid in ('public.atendimentos'::regclass, 'public.atendimento_mensagens'::regclass)) as rls_ativo;
