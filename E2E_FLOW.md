# Validação de Fluxo Completo — E2E

Este documento lista os principais cenários de ponta a ponta para validar o sistema em produção.

## 1. Autenticação e seleção de unidade
- Acessar `/login` e fazer login com usuário válido.
- Selecionar escola ativa quando o usuário tiver múltiplos vínculos.
- Verificar navegação até o Dashboard principal (`/app`).

## 2. Gestão de RH
- Abrir o menu `Gestão de RH`.
- Confirmar a listagem real de profissionais cadastrados.
- Pesquisar por nome ou CPF.
- Validar que contratos designados com vencimento em até 30 dias aparecem com alerta.

## 3. Enturmação
- Acessar `Enturmação`.
- Selecionar um aluno ativo retornado do banco.
- Inserir motivo de saída e gerar termo de transferência.
- Verificar que o status do aluno foi atualizado no Supabase.

## 4. Financeiro
- Abrir `Financeiro`.
- Verificar gráfico de receitas e despesas com dados reais.
- Confirmar lista de pagamentos pendentes.
- Validar aprovação de pendência quando usuário for `Diretor` ou `Admin`.

## 5. Configurações
- Abrir `Configurações` e navegar entre as abas:
  - Dados da Instituição
  - Controle de Acessos
  - Preferências
  - Períodos Letivos
- Alterar telefone e preferências de avaliação.
- Gerar períodos letivos para o ano atual.
- Confirmar persistência dos dados.

## 6. Acadêmico
- Abrir `Acadêmico`.
- Validar acesso às abas:
  - Gestão de Turmas
  - Disciplinas
  - Diário de Classe
- Criar, editar e excluir turma.
- Cadastrar disciplina.
- Acessar o diário e validar lançamentos com turmas do professor.

## 7. Dashboard por papel
- Verificar que o `DashboardResumo` mostra métricas adaptadas ao papel do usuário.
- Para `Professor`, confirmar cartões de turmas vinculadas.
- Para `Admin`/`Diretor`, validar saldo e contratos próximos.

## 8. Ambiente de produção
- Executar o script `supabase/production_setup.sql` antes de publicar.
- Confirmar que todos os dados de mock foram removidos das telas.
- Validar que operações reais são gravadas no banco e exibidas corretamente.
