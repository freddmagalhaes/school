-- Passo 5. Esperado: 13
select count(*) as indices_novos from pg_indexes
where schemaname = 'public' and indexname in (
  'membros_escola_user_id_idx','matriculas_escola_id_idx','matriculas_aluno_id_idx','notas_matricula_id_idx','notas_escola_id_idx',
  'frequencia_matricula_data_idx','frequencia_escola_id_idx','faturas_aluno_id_idx','faturas_escola_status_idx','turma_professores_prof_idx',
  'turmas_escola_id_idx','financeiro_verbas_escola_idx','audit_logs_escola_idx');
