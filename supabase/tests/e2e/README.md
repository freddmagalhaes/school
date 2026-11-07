# Validação ponta a ponta contra uma pilha Supabase real (local)

Dois roteiros que usam Auth, PostgREST, Edge Function e e-mail de teste **reais** (Docker), com o esquema de produção como base:

| Roteiro | O que valida |
|---|---|
| `fluxos-locais.mjs` (57 verificações) | as mesmas consultas das telas (Diário, Gestão de Turmas, Enturmação, Financeiro, Portal do Aluno e da Família), a Edge Function `create-school-user` (inclusive o e-mail de primeiro acesso) e o RLS com tokens verdadeiros |
| `horarios-ui.mjs` (10 verificações) | no navegador: tempos de aula, aula em vários dias, montagem pela visão do professor, cópia de dia, conflito e a escolha única de escola do Root |
| `ui.mjs` (18 verificações) | o app aberto num navegador: Termos de Uso, Diário (salvar e reabrir), Portal do Aluno, Portal da Família |

## Como rodar
```bash
# 1. Projeto local fora do repositório: baseline do esquema real + as migrations
mkdir /tmp/sb && cd /tmp/sb && npx supabase init
cp <repo>/supabase/tests/schema_producao.sql supabase/migrations/20260101000000_baseline_producao.sql
cp <repo>/supabase/migrations/*.sql supabase/migrations/
cp -r <repo>/supabase/functions supabase/
npx supabase start -x studio,imgproxy,vector,logflare,realtime,storage-api,supavisor,postgres-meta

# 2. Fluxos (consultas + função + e-mail)
SB_DIR=/tmp/sb node supabase/tests/e2e/fluxos-locais.mjs

# 3. Interface (precisa de playwright-core e de um Chromium)
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<ANON_KEY do `supabase status`> npx vite --port 5199 &
SB_DIR=/tmp/sb PW_CORE=<caminho>/playwright-core/index.mjs CHROME=<chromium> SHOTS=/tmp node supabase/tests/e2e/ui.mjs
SB_DIR=/tmp/sb PW_CORE=<caminho>/playwright-core/index.mjs CHROME=<chromium> SHOTS=/tmp node supabase/tests/e2e/horarios-ui.mjs
```
Usuários criados pela função não têm senha (entram pelo link do e-mail); o roteiro define uma por fora só para testar o portal.
Cada execução cria dados novos (CPFs únicos): pode rodar várias vezes.
