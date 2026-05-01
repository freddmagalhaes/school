# EduGestão Pro 🎓

Bem-vindo ao repositório do **EduGestão Pro**, a plataforma de gestão escolar preparada para atender escolas e o time administrativo central.

## 🚀 Principais Atualizações

- ✅ Nova tela de **Cadastro de Alunos** em `/app/cadastro-alunos` com formulário completo de matrícula, dados pessoais e validações básicas.
- ✅ Implementado controle de **level access** para que apenas `Admin` e `Secretaria` possam cadastrar alunos.
- ✅ Criado ambiente visível para `Root` com acesso cruzado ao **Backoffice** (`/ops/dashboard`) e ao ecossistema administrativo do cliente.
- ✅ Ajustado o fluxo para que `Root` possa navegar no painel `/app` e também ter atalho dedicado ao backoffice.
- ✅ Integrado criação de usuários via **Supabase Edge Function** segura (`create-school-user`) com `service_role`.

---

## 🌐 Ambientes do Sistema

O sistema conta com dois painéis principais:

- **Painel do Cliente** (`/app`)
  - Uso por escola: `Admin`, `Diretor`, `Subdiretor`, `Secretaria`, `Professor`.
  - Gestão acadêmica, RH, cadastro de alunos, enturmação e relatórios.

- **Painel Root / BackOffice** (`/ops`)
  - Uso interno: `Root`, `Super Admin`, `Suporte`, `Financeiro`, `Operacional`.
  - Clientes, assinaturas, financeiro consolidado, gestão de operadores e configurações do sistema.

---

## 🛠 Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Estilização | Tailwind CSS |
| Rotas | React Router DOM |
| Gráficos | Recharts |
| PDF | jsPDF + jspdf-autotable |
| Backend | Supabase Auth + PostgreSQL + RLS |
| Edge Functions | Deno (Supabase Functions) |

---

## 📌 Funcionalidades Relevantes

### Painel do Cliente (`/app`)

- **Cadastro de Alunos**: novo fluxo completo com painel visível apenas para perfis permitidos.
- **Gestão de Usuários**: criação de usuários da escola com e-mail de primeiro acesso.
- **Enturmação**: matrícula e saída de alunos com status e histórico.
- **RH**: gestão de profissionais, papéis e vínculos escolares.
- **Acadêmico**: turmas, disciplinas, diário de classe e relatórios educacionais.
- **Relatórios**: boletim, frequência e ata de resultados.
- **Configurações**: dados da instituição, controle de acessos e períodos letivos.

### Painel Root / BackOffice (`/ops`)

- **Dashboard Root**: visão executiva de assinaturas e MRR.
- **Clientes**: lista de clientes com filtros por plano, status e ações de ativação.
- **Financeiro**: KPIs de receita com receitas recorrentes e ciclos de pagamento.
- **Equipe**: controle interno de operadores e roles.
- **Configurações**: parâmetros globais e permissões.

---

## 🔑 Acesso Root e Multitenancy

- `Root` pode visualizar o painel `/app` e também acessar o backoffice em `/ops/dashboard`.
- O `AppShell` agora mostra um atalho visível para `Root` quando não há escola ativa.
- `Root` tem acesso administrativo completo, com visibilidade dos dados do cliente e gestão interna ao mesmo tempo.

---

## 🔐 Segurança e Governança

- **RLS** protege dados entre diferentes escolas.
- **Edge Function** para criação de usuários melhora a segurança e centraliza a lógica de auditoria.
- **Controle de papéis** garante que apenas perfis adequados façam alterações sensíveis.
- **LGPD**: dados de alunos são tratados com níveis de acesso estritos.

---

## 🧾 Como Rodar

```bash
npm install

# configure as variáveis de ambiente
VITE_SUPABASE_URL=<sua_url>
VITE_SUPABASE_ANON_KEY=<sua_chave>

# subir schema no Supabase
# supabase/schema.sql

# iniciar aplicação
npm run dev
```

Acesse `http://localhost:5173`.

---

## 🎯 Por que este update importa

Este release entrega dois avanços estratégicos:

1. **Capacidade operacional de ponta à ponta** para escolas: cadastro de alunos, gestão de RH e enturmação no mesmo painel.
2. **Visibilidade administrativa** para o time Root, permitindo acompanhar assinaturas, clientes e acessar o ambiente do cliente sem perder o contexto do backoffice.
