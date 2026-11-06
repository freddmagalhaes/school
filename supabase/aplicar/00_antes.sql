-- ANTES DE TUDO (somente leitura): anote estes números para comparar no fim.
select 'tabelas' as item, count(*)::text as valor from pg_tables where schemaname = 'public'
union all select 'politicas', count(*)::text from pg_policies where schemaname = 'public'
union all select 'indices', count(*)::text from pg_indexes where schemaname = 'public'
union all select 'funcoes do app', count(*)::text from pg_proc where pronamespace = 'public'::regnamespace and proname in ('archive_notas_on_student_leave','is_operator_active','is_root_admin','is_root_owner','log_audit','root_has_role','update_updated_at_column','user_in_escola')
union all select 'perfis.metadata existe', (count(*) > 0)::text from information_schema.columns where table_schema = 'public' and table_name = 'perfis' and column_name = 'metadata'
union all select 'valores do enum perfil_papel', string_agg(enumlabel, ', ' order by enumsortorder) from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'perfil_papel'
union all select 'privilegios do anon (linhas)', count(*)::text from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'
union all select 'escolas', count(*)::text from public.escolas
union all select 'perfis', count(*)::text from public.perfis;
