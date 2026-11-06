-- CONFERÊNCIA FINAL (somente leitura): resume o estado depois dos 6 passos. Todas as linhas devem dizer OK.
with
tabelas_gerenciadas as (select unnest(array['perfis','membros_escola','turmas','disciplinas','turma_professores','turma_alunos','matrizes_curriculares','matriculas','notas','frequencia','periodos_letivos','financeiro_verbas','faturas','assinaturas','responsaveis_alunos']) as t),
politicas_novas as (select unnest(array['perfis_select','perfis_update_proprio','membros_select','membros_insert','membros_update','membros_delete','turmas_select','turmas_write','disciplinas_select','disciplinas_write','turma_professores_select','turma_professores_write','periodos_select','periodos_write','matrizes_select','matrizes_write','turma_alunos_select','turma_alunos_write','matriculas_select','matriculas_write','notas_select','notas_write','frequencia_select','frequencia_write','verbas_select','verbas_write','faturas_select','faturas_write','assinaturas_insert_publico','assinaturas_select_operador','assinaturas_update_operador','resp_alunos_select','resp_alunos_write']) as p),
m as (
  select 1 as o, 'perfis.metadata existe' as item, 'true' as esperado,
         (count(*) > 0)::text as valor
  from information_schema.columns where table_schema = 'public' and table_name = 'perfis' and column_name = 'metadata'
  union all
  select 2, 'papel Responsavel no enum', 'true',
         (count(*) > 0)::text from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'perfil_papel' and e.enumlabel = 'Responsavel'
  union all
  select 3, 'tabela responsaveis_alunos com RLS', 'true',
         coalesce((select relrowsecurity::text from pg_class where oid = to_regclass('public.responsaveis_alunos')), 'false')
  union all
  select 4, 'funcoes novas (7 do passo 2 + 4 do passo 4)', '11',
         count(*)::text from pg_proc where pronamespace = 'public'::regnamespace and proname in
         ('tem_papel','professor_leciona','professor_leciona_matricula','matricula_e_minha','matricula_na_escola','membro_e_meu','pode_ver_perfil',
          'responsavel_do_aluno','responsavel_da_matricula','responsavel_do_membro','vinculo_responsavel_valido')
  union all
  select 5, 'politicas antigas ainda presentes nas tabelas gerenciadas', '0',
         count(*)::text from pg_policies where schemaname = 'public' and tablename in (select t from tabelas_gerenciadas) and policyname not in (select p from politicas_novas)
  union all
  select 6, 'politicas novas presentes', '33',
         count(*)::text from pg_policies where schemaname = 'public' and policyname in (select p from politicas_novas)
  union all
  select 7, 'indices novos', '13',
         count(*)::text from pg_indexes where schemaname = 'public' and indexname in (
           'membros_escola_user_id_idx','matriculas_escola_id_idx','matriculas_aluno_id_idx','notas_matricula_id_idx','notas_escola_id_idx',
           'frequencia_matricula_data_idx','frequencia_escola_id_idx','faturas_aluno_id_idx','faturas_escola_status_idx','turma_professores_prof_idx',
           'turmas_escola_id_idx','financeiro_verbas_escola_idx','audit_logs_escola_idx')
  union all
  select 8, 'privilegios do anon (so INSERT em assinaturas e contatos)', '2',
         count(*)::text from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'
  union all
  select 9, 'privilegios TRUNCATE/TRIGGER/REFERENCES restantes (anon ou authenticated)', '0',
         count(*)::text from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon','authenticated') and privilege_type in ('TRUNCATE','TRIGGER','REFERENCES')
  union all
  select 10, 'tabelas do schema public SEM RLS', '0',
         count(*)::text from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity
)
select item, esperado, valor, case when valor = esperado then 'OK' else 'DIFERENTE' end as status
from m order by o;
