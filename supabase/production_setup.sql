-- Migração incremental para atualizar o schema de produção
-- Execute este arquivo em bancos já existentes antes de subir a nova versão do frontend.

ALTER TABLE public.escolas
  ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

ALTER TABLE public.escolas
  ADD COLUMN IF NOT EXISTS formato_avaliacao VARCHAR(50) NOT NULL DEFAULT 'Bimestral';

ALTER TABLE public.escolas
  ADD COLUMN IF NOT EXISTS bloquear_notas BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Se desejar, descomente e ajuste as limpezas abaixo para remover dados de teste específicos.
-- DELETE FROM public.matriculas WHERE aluno_id IS NULL;
-- DELETE FROM public.financeiro_verbas WHERE categoria ILIKE '%teste%';
-- DELETE FROM public.membros_escola WHERE papel = 'Aluno' AND data_inicio IS NULL;
