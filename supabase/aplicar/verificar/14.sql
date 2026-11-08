-- Passo 14. Esperado: politica_antiga = 0, politica_nova = 1, funcao_valida = true.
select
  (select count(*) from pg_policies where tablename = 'audit_logs' and policyname = 'Usuários podem criar logs de auditoria') as politica_antiga,
  (select count(*) from pg_policies where tablename = 'audit_logs' and policyname = 'audit_insert_proprio') as politica_nova,
  (select prosrc like '%Ação reservada ao suporte%' from pg_proc where proname = 'log_audit' and pronamespace = 'public'::regnamespace) as funcao_valida;
