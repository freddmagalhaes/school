-- A Edge Function create-school-user grava perfis.metadata, mas o banco de produção não tem essa coluna
-- (ela só existia em production_setup.sql, que não foi aplicado). Sem ela, criar usuário falha.
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
