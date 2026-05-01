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

## 🚀 Produção AWS

Para publicar em produção na AWS usando o deploy script incluído:

1. Configure a instância EC2 com Ubuntu e abra a porta 80.
2. Ajuste o IP da EC2, o caminho da chave e o domínio no comando:

```bash
./deploy.sh <IP_DA_EC2> <CAMINHO_CHAVE_PEM> [EC2_USER] [DOMINIO] [EMAIL_CERTBOT]
```

Exemplo com HTTPS:

```bash
./deploy.sh 52.2.205.190 ~/.ssh/edugestao.pem ubuntu example.com admin@example.com
```

3. O script gera o build localmente, envia `dist/` para o servidor e configura o Nginx com fallback para React Router.
4. Se o domínio for informado e já apontar para o servidor, o script tenta configurar HTTPS automaticamente com Certbot.
5. Após o deploy, a aplicação ficará disponível em `http://<IP_DA_EC2>` ou `https://<DOMINIO>` se o Certbot for configurado com sucesso.

### Observações importantes

- O `deploy.sh` serve os arquivos estáticos da pasta `/var/www/edugestao/school`.
- O Nginx é configurado para aplicar `try_files $uri $uri/ /index.html;`, essencial para o `BrowserRouter` do React.
- O backend de autenticação e dados deve estar configurado no Supabase; essa aplicação é somente frontend estático.
- A Edge Function `create-school-user` deve estar implantada no Supabase para criar usuários com segurança.
- Caso o domínio não esteja apontado ainda, execute o script sem o parâmetro `DOMINIO` e configure o DNS antes de ativar o HTTPS.
---

## 🎯 Por que este update importa

Este release entrega dois avanços estratégicos:

1. **Capacidade operacional de ponta à ponta** para escolas: cadastro de alunos, gestão de RH e enturmação no mesmo painel.
2. **Visibilidade administrativa** para o time Root, permitindo acompanhar assinaturas, clientes e acessar o ambiente do cliente sem perder o contexto do backoffice.
