-- O banco de produção só tem índices de chave primária/única. As políticas de RLS e as telas filtram
-- sempre por estas colunas; sem índice, cada consulta varre a tabela inteira (piora com o crescimento).
-- Idempotente e sem bloqueio de leitura relevante em tabelas pequenas; em tabelas grandes use CREATE INDEX CONCURRENTLY.
CREATE INDEX IF NOT EXISTS membros_escola_user_id_idx      ON public.membros_escola (user_id);
CREATE INDEX IF NOT EXISTS matriculas_escola_id_idx        ON public.matriculas (escola_id);
CREATE INDEX IF NOT EXISTS matriculas_aluno_id_idx         ON public.matriculas (aluno_id);
CREATE INDEX IF NOT EXISTS notas_matricula_id_idx          ON public.notas (matricula_id, disciplina_id, data);
CREATE INDEX IF NOT EXISTS notas_escola_id_idx             ON public.notas (escola_id);
CREATE INDEX IF NOT EXISTS frequencia_matricula_data_idx   ON public.frequencia (matricula_id, data);
CREATE INDEX IF NOT EXISTS frequencia_escola_id_idx        ON public.frequencia (escola_id);
CREATE INDEX IF NOT EXISTS faturas_aluno_id_idx            ON public.faturas (aluno_id);
CREATE INDEX IF NOT EXISTS faturas_escola_status_idx       ON public.faturas (escola_id, status);
CREATE INDEX IF NOT EXISTS turma_professores_prof_idx      ON public.turma_professores (professor_id);
CREATE INDEX IF NOT EXISTS turmas_escola_id_idx            ON public.turmas (escola_id);
CREATE INDEX IF NOT EXISTS financeiro_verbas_escola_idx    ON public.financeiro_verbas (escola_id, data_registro);
CREATE INDEX IF NOT EXISTS audit_logs_escola_idx           ON public.audit_logs (escola_id, created_at);
