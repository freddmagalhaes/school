-- Passo 2, teste de COMPORTAMENTO. Não grava nada e não precisa de nenhum id: pega sozinho um aluno real
-- e consulta COMO se fosse ele (o RLS é aplicado).
-- Esperado: o aluno vê só as PRÓPRIAS notas/faturas, 0 linhas do financeiro e 1 perfil (o dele).
-- Antes do passo 2 isso devolvia TODAS as notas e faturas da escola, o financeiro e todos os perfis (com CPF).
create or replace function pg_temp.teste_aluno() returns table(item text, valor bigint)
language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.membros_escola where papel = 'Aluno' limit 1;
  if uid is null then raise exception 'nenhum aluno cadastrado para testar'; end if;
  perform set_config('request.jwt.claim.sub', uid::text, true);
  set local role authenticated;
  return query
    select 'notas que o aluno enxerga (esperado: só as dele)'::text, (select count(*) from public.notas)
    union all select 'faturas que o aluno enxerga (esperado: só as dele)', (select count(*) from public.faturas)
    union all select 'linhas do financeiro (esperado: 0)', (select count(*) from public.financeiro_verbas)
    union all select 'perfis que o aluno enxerga (esperado: 1)', (select count(*) from public.perfis);
end $$;
select * from pg_temp.teste_aluno();
