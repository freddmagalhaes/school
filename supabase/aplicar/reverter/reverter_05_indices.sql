-- REVERTE o passo 5 (apaga só os índices criados por ele; inofensivo, só deixa as consultas mais lentas)
drop index if exists public.membros_escola_user_id_idx;
drop index if exists public.matriculas_escola_id_idx;
drop index if exists public.matriculas_aluno_id_idx;
drop index if exists public.notas_matricula_id_idx;
drop index if exists public.notas_escola_id_idx;
drop index if exists public.frequencia_matricula_data_idx;
drop index if exists public.frequencia_escola_id_idx;
drop index if exists public.faturas_aluno_id_idx;
drop index if exists public.faturas_escola_status_idx;
drop index if exists public.turma_professores_prof_idx;
drop index if exists public.turmas_escola_id_idx;
drop index if exists public.financeiro_verbas_escola_idx;
drop index if exists public.audit_logs_escola_idx;
