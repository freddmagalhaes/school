# EduGestão Pro 🎓

Bem-vindo ao repositório do **EduGestão Pro**, uma plataforma moderna e completa para a gestão de escolas públicas e particulares!

## 🚀 Sobre o Projeto
O EduGestão Pro é um sistema multi-tenant focado em agilizar o trabalho administrativo e pedagógico nas escolas. Com isolamento total de dados, um único professor ou diretor pode alternar facilmente entre diferentes escolas mantendo a segurança e foco na gestão.

## 🛠 Bibliotecas e Stack
- **Frontend:** React (usando Vite para um build super rápido) + TypeScript
- **Estilização:** Tailwind CSS v4 com base de cores do Shadcn UI
- **Rotas:** React Router DOM
- **Gráficos e Relatórios:** Recharts + jsPDF
- **Backend/Banco:** Supabase (PostgreSQL + RLS + Auth)

## 📌 Funcionalidades Principais
1. **Gestão Multitenant:** Controle de contexto da sessão (múltiplas escolas no mesmo login).
2. **Dashboard de RH:** Listagem inteligente diferenciando profissionais *Efetivos* de *Designados* (com alertas automáticos de vencimento de contratos).
3. **Controle Acadêmico (Secretaria):** Enturmação e movimentação de alunos com geração nativa em PDF de Atas de Expulsão e Termos de Transferência.
4. **Resumo Financeiro:** Acompanhamento de fluxo de caixa da verba escolar com autorização de pendências pelo diretor.

## 🧑‍💻 Como Rodar o Sistema Localmente

1. Realize o clone ou acesse o workspace com o diretório já instanciado.
2. Instale as dependências com `npm install`.
3. Configure as variáveis base: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Opcional: há um mock integrado no código).
4. Inicialize a prévia local de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Acesse http://localhost:5173 e assista a mágica acontecer!

## 🔒 Regras de Segurança (Supabase RLS)
- Um script central (`supabase/schema.sql`) configura a barreira de proteção de linhas.
- Você jamais verá dados ou matrículas de uma "Escola A" se o seu usuário não estiver registrado ativamente na tabela `membros_escola` para aquela unidade.
