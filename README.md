# EduGestão Pro 🎓

Bem-vindo ao repositório do **EduGestão Pro**, uma plataforma moderna e completa para a gestão de escolas públicas e particulares!

## 🚀 Sobre o Projeto

O EduGestão Pro é um sistema **multi-tenant** focado em agilizar o trabalho administrativo e pedagógico nas escolas. Com isolamento total de dados, um único professor ou diretor pode alternar facilmente entre diferentes escolas mantendo a segurança e foco na gestão.

O sistema é dividido em dois ambientes distintos:
- **Painel do Cliente** (`/app`) — Acesso da escola (Admin, Diretor, Subdiretor, Secretaria, Professor).
- **Painel Root / BackOffice** (`/ops`) — Acesso exclusivo da equipe interna (Root, Super Admin, Suporte, Financeiro, Operacional).

---

## 🛠 Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Estilização | Tailwind CSS v4 |
| Rotas | React Router DOM v6 |
| Gráficos | Recharts |
| Relatórios PDF | jsPDF + jspdf-autotable |
| Backend / Banco | Supabase (PostgreSQL + RLS + Auth) |
| Edge Functions | Deno (Supabase Functions) |

---

## 📌 Funcionalidades Principais

### Painel do Cliente (`/app`)

1. **Gestão Multitenant**
   - Login único para múltiplas escolas e cargos diferentes (ex: Professor na Escola A e Subdiretor na Escola B).
   - Hook `useEscolaAtual` e componente `RootEscolaSelector` permitem ao Root selecionar e gerenciar qualquer escola sem vínculo direto.

2. **Dashboard** — Resumo visual com métricas de alunos, turmas e situação financeira.

3. **Gestão de RH** — Profissionais Efetivos e Designados com alertas de vencimento de contrato.

4. **Enturmação** — Matrícula de alunos com geração de documentos em PDF (Atas, Termos de Transferência).

5. **Módulo Acadêmico**
   - **Gestão de Turmas:** CRUD completo com dois botões por card: `Professores e Disciplinas` e `Alunos Matriculados`.
   - **Gestão de Disciplinas:** CRUD do catálogo de disciplinas da escola (Admin/Secretaria).
   - **Diário de Classe:** Professor lança presença e notas filtrando apenas suas próprias turmas.
   - **Enturmação de Alunos:** Vinculação direta de alunos a turmas com validação de duplicidade por ano letivo, e registro de saída com motivo (Transferido / Evadido / Expulso) preservando o histórico.

6. **Relatórios Acadêmicos** *(novo)*
   - **Boletim do Aluno:** Notas por período com exportação em PDF, calculando média e situação (Aprovado / Recuperação / Reprovado) conforme LDBEN Art. 24.
   - **Relatório de Frequência:** Por turma e período, com alerta visual ⚠️ para alunos abaixo de **75%** (mínimo legal — LDBEN Art. 24 §VI).
   - **Ata de Resultados Finais:** Documento oficial em PDF (paisagem) com média final, frequência, situação de cada aluno e campo de assinatura do Diretor.

7. **Gestão de Usuários** *(novo)*
   - Admin e Secretaria podem criar usuários da escola diretamente pelo painel.
   - A criação utiliza uma **Supabase Edge Function** (`create-school-user`) com `service_role` para segurança máxima.
   - O usuário recebe e-mail automático de primeiro acesso para definir sua senha.
   - Secretaria só cria Professor e Aluno; Admin cria qualquer papel.

8. **Financeiro** — Fluxo de caixa com autorização de pendências pelo Diretor/Subdiretor.

9. **Configurações**
   - Dados da instituição, controle de acessos e preferências.
   - **Períodos Letivos** *(novo):* Admin configura os períodos do ano letivo (Bimestral padrão, Trimestral ou Semestral) com datas editáveis por período.

### Painel Root / BackOffice (`/ops`)
- **Clientes:** Listagem de todas as escolas assinantes com filtros por plano e status.
- **Financeiro:** Visão consolidada da receita do produto.
- **Equipe Interna:** CRUD de operadores do BackOffice com controle de roles.
- **Configurações do Sistema:** Parâmetros globais. Operadores não-Root têm acesso apenas de leitura.

---

## 🔑 Hierarquia de Acesso (RBAC)

| Perfil | Escopo | Telas Disponíveis |
|---|---|---|
| `Root` | Global — irrestrito | Tudo, incluindo seletor de escola global |
| `Super Admin` | BackOffice | `/ops` completo, exceto gerenciar Root |
| `Admin` | Escola | Dashboard, Enturmação, RH, Acadêmico, Relatórios, Financeiro, Usuários, Configurações |
| `Diretor` | Escola | Dashboard, RH, Acadêmico, Relatórios, Financeiro |
| `Subdiretor` | Escola | Idem ao Diretor |
| `Secretaria` | Escola | Dashboard, Enturmação, RH, Acadêmico, Relatórios, Usuários (limitado) |
| `Professor` | Escola | Dashboard, Acadêmico → Diário de Classe (somente suas turmas) |

> Um mesmo profissional pode ter papéis diferentes em escolas diferentes, mantendo um único login.

---

## 🗄 Estrutura do Banco de Dados

| Tabela | Descrição |
|---|---|
| `escolas` | Escolas cadastradas (multi-tenant) |
| `perfis` | Dados pessoais de todos os usuários |
| `membros_escola` | Vínculo usuário ↔ escola + papel + tipo de vínculo |
| `turmas` | Turmas com ano letivo e turno |
| `disciplinas` | Catálogo de disciplinas por escola |
| `turma_professores` | Vínculo professor ↔ turma ↔ disciplina |
| `matriculas` | Matrícula de alunos nas turmas (com motivo e data de saída) |
| `notas` | Notas lançadas por professor/disciplina/período |
| `frequencia` | Registros de presença diária |
| `periodos_letivos` | Períodos do ano letivo configuráveis por escola |
| `financeiro_verbas` | Movimentações financeiras |
| `assinaturas` | Plano de assinatura das escolas |
| `root_admins` | Operadores do BackOffice |
| `system_settings` | Configurações globais do sistema |

---

## 🔒 Segurança

- **RLS (Row Level Security):** Dados de uma escola jamais são acessíveis por usuários de outra escola.
- **Funções auxiliares:** `user_in_escola()` e `is_operator_active()` centralizam as verificações de acesso.
- **Edge Function segura:** Criação de usuários via `create-school-user` usa `service_role` server-side, sem expor chaves secretas no frontend.
- **Recuperação de senha:** Via link enviado por e-mail (Supabase Auth — `/esqueci-senha` e `/reset-password`).

---

## 📚 Base Legal

O sistema é desenvolvido em conformidade com:
- **LDBEN (Lei 9.394/96):** frequência mínima de 75%, avaliação contínua, registro obrigatório de matrículas.
- **LGPD (Lei 13.709/18):** dados de menores de idade são sensíveis; acesso estritamente controlado por papel.
- **Resoluções do CNE:** estrutura pedagógica e administrativa aderente às normas nacionais.

---

## 🧑‍💻 Como Rodar Localmente

```bash
# 1. Instale as dependências
npm install

# 2. Configure as variáveis de ambiente em .env
VITE_SUPABASE_URL=<sua_url>
VITE_SUPABASE_ANON_KEY=<sua_chave>

# 3. Execute o schema no SQL Editor do Supabase
#    → supabase/schema.sql

# 4. (Se banco já existe) Execute as migrations incrementais:
#    ALTER TYPE public.perfil_papel ADD VALUE IF NOT EXISTS 'Subdiretor';
#    ALTER TYPE public.status_matricula ADD VALUE IF NOT EXISTS 'Evadido';
#    ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS motivo_saida VARCHAR(255);
#    ALTER TABLE public.matriculas ADD COLUMN IF NOT EXISTS data_saida DATE;
#    (+ criar tabela periodos_letivos conforme schema.sql seção 7)

# 5. Deploy da Edge Function (Supabase Dashboard → Edge Functions)
#    → supabase/functions/create-school-user/index.ts

# 6. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:5173` (ou a porta indicada pelo Vite).
