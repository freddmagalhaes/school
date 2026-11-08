-- REVERTE o passo 6: devolve os privilégios padrão do Supabase (o estado de antes).
grant all on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
