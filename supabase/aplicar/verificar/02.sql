-- Passo 2. O editor do Supabase mostra só o resultado da ÚLTIMA instrução: por isso tudo vem numa consulta só.
-- Esperado:
--   funcoes novas ........ 7
--   politicas ............ faturas: faturas_select, faturas_write | financeiro_verbas: verbas_select, verbas_write |
--                          frequencia: frequencia_select, frequencia_write | matriculas: matriculas_select, matriculas_write |
--                          membros_escola: membros_delete, membros_insert, membros_select, membros_update |
--                          notas: notas_select, notas_write | perfis: perfis_select, perfis_update_proprio
--   (nenhuma política antiga, como "Acesso Notas", nessas tabelas)
select 'funcoes novas' as item, count(*)::text as valor
from pg_proc where pronamespace = 'public'::regnamespace
  and proname in ('tem_papel','professor_leciona','professor_leciona_matricula','matricula_e_minha','matricula_na_escola','membro_e_meu','pode_ver_perfil')
union all
select 'politicas: ' || tablename, string_agg(policyname, ', ' order by policyname)
from pg_policies
where schemaname = 'public' and tablename in ('notas','frequencia','membros_escola','perfis','matriculas','faturas','financeiro_verbas')
group by tablename
order by 1;
