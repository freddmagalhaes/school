-- Menor privilégio nas tabelas. Hoje anon e authenticated têm TODOS os privilégios em todas as tabelas
-- (padrão do Supabase). O RLS cobre SELECT/INSERT/UPDATE/DELETE, mas NÃO cobre TRUNCATE, e anon não deveria
-- nem tentar. Mantém só o que o app usa:
--   anon:          INSERT em assinaturas (checkout público) e contatos (formulário do site)
--   authenticated: SELECT/INSERT/UPDATE/DELETE (o RLS decide quem pode o quê); sem TRUNCATE, TRIGGER, REFERENCES
-- Rode DEPOIS das demais migrations (inclui tabelas criadas por elas, como responsaveis_alunos).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM authenticated;
-- (contatos só existe em produção: concede apenas nas tabelas que existirem)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['assinaturas', 'contatos'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('GRANT INSERT ON public.%I TO anon', t);
    END IF;
  END LOOP;
END $$;
-- Tabelas futuras criadas por este papel já nascem sem privilégios para anon e sem TRUNCATE/TRIGGER/REFERENCES.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM authenticated;
