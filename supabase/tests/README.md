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

## Esquema real de produção
`schema_producao.sql` é um snapshot da **estrutura** do banco real (exportado em 2026-11-06 pelo SQL Editor do Supabase: colunas, restrições, enums, funções, gatilhos e políticas; sem dados).
`RLS_BASE=producao npm run test:rls` roda a mesma suíte contra ele; o CI roda os dois modos. Atualize o snapshot sempre que o banco mudar.

O que o snapshot revelou (e já está corrigido no app ou nas migrations):
- `notas` e `frequencia` só aceitam `id` de `matriculas`; o app usava `turma_alunos` (diário, portal, gestão de turmas, faturas em massa), então **o diário não gravava nada** e mostrava "salvo com sucesso". O app agora usa `matriculas` e confere o erro de cada gravação.
- `perfis` não tem a coluna `metadata` (a Edge Function grava nela): migration `20261106000050`.
- Só existia política de leitura em `membros_escola` e nenhuma de atualização em `perfis`: remover usuário e gravar o aceite dos termos falhavam em silêncio.

Ordem para aplicar em produção (cada arquivo como uma execução separada no SQL Editor): `migrations/20261106000050_*`, `...000100_*`, `...000200_*`, `...000300_*`.
