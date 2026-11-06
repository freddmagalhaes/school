-- Passo 4. Esperado:
--   tabela ................ responsaveis_alunos
--   politicas ............. resp_alunos_select, resp_alunos_write
--   funcoes do responsavel  4
--   rls ativo ............. true
select 'tabela' as item, coalesce(to_regclass('public.responsaveis_alunos')::text, 'NÃO EXISTE') as valor
union all select 'politicas', coalesce(string_agg(policyname, ', ' order by policyname), 'NENHUMA') from pg_policies where schemaname = 'public' and tablename = 'responsaveis_alunos'
union all select 'funcoes do responsavel', count(*)::text from pg_proc where pronamespace = 'public'::regnamespace
  and proname in ('responsavel_do_aluno','responsavel_da_matricula','responsavel_do_membro','vinculo_responsavel_valido')
union all select 'rls ativo', relrowsecurity::text from pg_class where oid = 'public.responsaveis_alunos'::regclass;
