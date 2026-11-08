-- Passo 1: esperado = 1 linha: metadata | jsonb
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'perfis' and column_name = 'metadata';
