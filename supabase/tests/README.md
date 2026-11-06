# Testes de RLS (Postgres + stub do Supabase)

Provam o isolamento entre escolas e as permissões por papel **no banco**, que é a única barreira real deste sistema (o frontend é estático).

```bash
docker run -d --name edugestao-rls-db -e POSTGRES_PASSWORD=teste-local-123 -p 127.0.0.1:5433:5432 postgres:16
npm run test:rls            # RLS_DB_URL para apontar para outro Postgres
```

- `00_supabase_stub.sql` simula `auth.users`, `auth.uid()` e os papéis `anon`/`authenticated`. **Nunca rode em produção.**
- `helpers.mjs` recria o banco `edugestao_rls`, aplica os SQL do repositório na ordem do deploy e todos os de `supabase/migrations/`, e carrega `fixtures.sql` (duas escolas fictícias).
- Cada teste roda como um usuário real, sob RLS, e desfaz tudo no fim.
- **Todo SQL novo que mexe em política precisa de teste aqui.** Prova de que um teste vale: remova a regra e ele deve falhar.

## Limite conhecido: o schema real de produção não está no repositório
Os arquivos `schema.sql` e `fase1_*.sql` definem as mesmas tabelas de formas diferentes (`CREATE TABLE IF NOT EXISTS` ignora o segundo). O app usa duas tabelas de matrícula (`matriculas` e `turma_alunos`). Antes de aplicar uma migration em produção, gere o schema real (`supabase db dump --schema public`), compare e ajuste os testes ao que existe de fato.
