# EduGestão Pro 🎓

Bem-vindo ao repositório do **EduGestão Pro**, uma plataforma moderna e completa para a gestão de escolas públicas e particulares!

## 🚀 Sobre o Projeto
O EduGestão Pro é um sistema **multi-tenant** focado em agilizar o trabalho administrativo e pedagógico nas escolas. Com isolamento total de dados, um único professor ou diretor pode alternar facilmente entre diferentes escolas mantendo a segurança e foco na gestão.

O sistema é dividido em dois ambientes distintos:
- **Painel do Cliente** (`/app`) — Acesso da escola (Admin, Diretor, Secretaria, Professor).
- **Painel Root / BackOffice** (`/ops`) — Acesso exclusivo da equipe interna (Root, Super Admin, Suporte, Financeiro, Operacional).

## 🛠 Bibliotecas e Stack
- **Frontend:** React (usando Vite) + TypeScript
- **Estilização:** Tailwind CSS v4
- **Rotas:** React Router DOM
- **Gráficos e Relatórios:** Recharts + jsPDF
- **Backend/Banco:** Supabase (PostgreSQL + RLS + Auth)

## 📌 Funcionalidades Principais

### Painel do Cliente (`/app`)
1. **Gestão Multitenant:** Um único login permite atuar em múltiplas escolas com cargos diferentes (ex: Professor na Escola A e Subdiretor na Escola B).
2. **Dashboard:** Resumo visual com métricas de alunos, turmas e situação financeira.
3. **Gestão de RH:** Listagem de profissionais diferenciando *Efetivos* de *Designados*, com alertas automáticos de vencimento de contrato.
4. **Enturmação:** Matrícula e movimentação de alunos com geração nativa em PDF (Atas de Expulsão, Termos de Transferência).
5. **Módulo Acadêmico (NOVO):**
   - **Gestão de Turmas:** CRUD completo de turmas com vinculação de professores por disciplina.
   - **Gestão de Disciplinas:** CRUD completo do catálogo de disciplinas da escola.
   - **Diário de Classe:** Interface ágil para o professor lançar presença (✔/✗ por aluno) e notas diárias por disciplina. O professor vê apenas as suas turmas.
6. **Financeiro:** Acompanhamento de fluxo de caixa com autorização de pendências pelo diretor.
7. **Configurações:** Dados da instituição, controle de acessos de usuários e preferências do ano letivo.

### Painel Root / BackOffice (`/ops`)
- **Clientes:** Listagem de todas as escolas assinantes com filtros por plano e status.
- **Financeiro:** Visão consolidada da receita do produto.
- **Equipe Interna:** CRUD de operadores do BackOffice com controle de roles.
- **Configurações do Sistema:** Parâmetros globais (modo manutenção, e-mail de suporte, período de trial). Operadores não-Root têm acesso apenas de leitura.

## 🔑 Hierarquia de Acesso (Level Access)

| Perfil | Escopo | Permissões |
|---|---|---|
| `Root` | Global | Acesso irrestrito a todo o ecossistema e ao BackOffice |
| `Super Admin` | BackOffice | Acesso total ao `/ops`, exceto gerenciar outros operadores |
| `Admin` | Escola | CRUD completo dentro da escola que administra |
| `Diretor` | Escola | Acesso gerencial (sem Configurações) |
| `Secretaria` | Escola | Gestão acadêmica e RH |
| `Professor` | Escola | Apenas Diário de Classe (suas turmas) |

## 🧑‍💻 Como Rodar o Sistema Localmente

1. Clone o repositório e instale as dependências:
   ```bash
   npm install
   ```
2. Configure as variáveis de ambiente em `.env`:
   ```
   VITE_SUPABASE_URL=<sua_url>
   VITE_SUPABASE_ANON_KEY=<sua_chave>
   ```
3. Execute o script de banco de dados `supabase/schema.sql` no SQL Editor do Supabase.
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:5173`.

## 🔒 Segurança (Supabase RLS)
- O arquivo `supabase/schema.sql` configura todo o isolamento de dados via Row Level Security.
- Os dados de uma escola jamais são expostos para usuários de outra escola.
- Operadores Root têm políticas de bypass específicas para acesso global sem precisar de vínculo em `membros_escola`.
- A recuperação de senha é feita via link enviado por e-mail (Supabase Auth — `/esqueci-senha` e `/reset-password`).

