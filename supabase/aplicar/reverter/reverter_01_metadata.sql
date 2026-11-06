-- REVERTE o passo 1. ATENÇÃO: apaga a coluna perfis.metadata e o que houver nela
-- (a Edge Function create-school-user grava nessa coluna; sem ela, criar usuário volta a falhar).
alter table public.perfis drop column if exists metadata;
