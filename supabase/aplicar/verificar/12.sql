-- Passo 12. Esperado: coluna_nivel = 1, funcoes_suporte = 7, politica_auditoria = 1 e audit_imutavel = true.
select
  (select count(*) from information_schema.columns where table_name = 'root_admins' and column_name = 'nivel_suporte') as coluna_nivel,
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname like 'suporte\_%') as funcoes_suporte,
  (select count(*) from pg_policies where tablename = 'audit_logs' and policyname = 'audit_owner_select') as politica_auditoria,
  not has_table_privilege('authenticated', 'public.audit_logs', 'UPDATE') and not has_table_privilege('authenticated', 'public.audit_logs', 'DELETE') as audit_imutavel;
