-- Novo papel: Responsável (pai, mãe ou responsável legal de um ou mais alunos).
-- Fica em arquivo separado: o Postgres não deixa usar o valor novo do enum na mesma transação em que ele nasce.
ALTER TYPE public.perfil_papel ADD VALUE IF NOT EXISTS 'Responsavel';
