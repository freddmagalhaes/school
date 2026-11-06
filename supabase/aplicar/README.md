# Aplicar as correções no Supabase de produção (passo a passo)

Projeto: `wbvsgmlbenuijulpkpzv`. Tempo estimado: 40 a 60 minutos, com calma. **Faça fora do horário de uso** (as escolas não devem estar lançando notas).

Cada passo tem **um arquivo para colar**, **uma conferência** (`verificar/`) com o resultado esperado e **como desfazer** (`reverter/`). Todos os arquivos e as conferências foram testados num banco com o esquema real de produção: aplicar, conferir, reverter e voltar exatamente ao estado inicial.

## Antes de começar
1. **Backup.** Painel do Supabase → *Database → Backups*. Confirme que existe um backup recente. Se o plano não tiver backup automático, gere um (*Database → Backups → Create backup*, ou `supabase db dump` no seu computador). **Sem backup, não continue.**
2. **Tenha em mãos** este conteúdo e o acesso ao painel como dono do projeto.
3. Abra **SQL Editor → New query**. Para cada arquivo: abra o `.sql`, copie **tudo**, cole, clique em **Run** (não em "Run selected").
4. O editor mostra **só o resultado da última instrução**. Por isso as conferências devolvem tudo numa consulta só.
5. O editor pode avisar "destructive operation" (por causa de `DROP POLICY`/`REVOKE`): é esperado nos passos 2 e 6. Confirme com *Run this query*.
6. **Um arquivo por vez.** Não cole dois passos juntos (o passo 3 em especial precisa rodar sozinho).

## Passo 0: foto do estado atual (só leitura)
Cole `00_antes.sql` e anote. Valores esperados hoje:

| item | valor |
|---|---|
| tabelas | 20 |
| politicas | 33 |
| indices | 31 |
| funcoes do app | 8 |
| perfis.metadata existe | false |
| valores do enum perfil_papel | Admin, Diretor, Secretaria, Professor, Aluno, Subdiretor |
| privilegios do anon (linhas) | 140 |

Se algum número for diferente, **pare**: o banco mudou desde o dump de 2026-11-06 e precisamos refazer a comparação.

---

## Passo 1: coluna `perfis.metadata`  (`01_perfis_metadata.sql`)
**O que faz:** cria a coluna que a função de convite grava. Sem ela, criar usuário falha. Risco: nenhum.
**Conferir:** cole `verificar/01.sql`. Esperado: `metadata | jsonb`.
**Desfazer:** `reverter/reverter_01_metadata.sql`.

## Passo 2: permissões por papel  (`02_politicas_por_papel.sql`)  ← o mais importante
**O que faz:** troca as políticas de acesso. A partir daqui: aluno só vê o que é dele, professor só lança nas próprias turmas e disciplinas, financeiro só para Admin/Diretor/Subdiretor, e passam a funcionar a remoção de usuário e o aceite dos termos.
**Risco:** médio. Deploy do site novo logo depois (veja "Depois dos passos").
**Conferir:**
1. `verificar/02.sql`. Esperado: `funcoes novas = 7` e as políticas por tabela listadas no próprio arquivo (nenhuma "Acesso ..." antiga).
2. `verificar/02b_teste_comportamento.sql` (sozinho, sem editar nada). Esperado: o aluno enxerga só as **próprias** notas e faturas (os números dependem dos seus dados, mas devem ser **bem menores que o total da escola**; um aluno com 4 disciplinas vê 4 notas, não as de todos), **0** linhas do financeiro e **1** perfil. Antes deste passo ele via tudo.
**Desfazer:** `reverter/reverter_02_04_politicas.sql` (volta às políticas originais).

## Passo 3: papel "Responsável"  (`03_papel_responsavel.sql`)
**O que faz:** acrescenta `Responsavel` aos papéis possíveis. Rode **sozinho** (o Postgres não deixa usar o valor novo na mesma execução em que ele nasce). Risco: nenhum.
**Conferir:** `verificar/03.sql`. Esperado: `Admin, Diretor, Secretaria, Professor, Aluno, Subdiretor, Responsavel`.
**Desfazer:** não é possível remover um valor de enum, e é inofensivo deixá-lo.

## Passo 4: vínculo responsável × aluno  (`04_vinculos_responsavel.sql`)
**O que faz:** cria a tabela `responsaveis_alunos` e dá ao responsável acesso **somente leitura** aos dados do filho. Risco: baixo (tabela nova). Os avisos `policy ... does not exist, skipping` são normais.
**Conferir:** `verificar/04.sql`. Esperado: tabela `responsaveis_alunos`, políticas `resp_alunos_select, resp_alunos_write`, `funcoes do responsavel = 4`, `rls ativo = true`.
**Desfazer:** `reverter/reverter_02_04_politicas.sql` (desfaz 2 e 4 juntos).

## Passo 5: índices  (`05_indices.sql`)
**O que faz:** cria 13 índices para as consultas que o RLS e as telas fazem. Risco: baixo; em tabelas pequenas leva segundos.
**Conferir:** `verificar/05.sql`. Esperado: `13`.
**Desfazer:** `reverter/reverter_05_indices.sql`.

## Passo 6: menor privilégio  (`06_privilegios.sql`)  ← só depois do deploy do site
**O que faz:** o visitante (`anon`) passa a poder apenas **enviar contato e criar assinatura pendente**; ninguém consegue `TRUNCATE`. O RLS não cobria o `TRUNCATE`.
**Atenção:** se algum outro site ou app seu usa a chave pública (`anon`) para **ler** alguma tabela, ele deixa de funcionar. Se não tiver certeza, deixe este passo por último, depois de conferir tudo.
**Conferir:**
1. `verificar/06.sql`. Esperado: `anon | INSERT | 2` e `authenticated | DELETE/INSERT/SELECT/UPDATE | 21` cada (sem TRUNCATE/TRIGGER/REFERENCES).
2. `verificar/06b_teste_visitante.sql`. Esperado: enviar contato **PERMITIDO**, criar assinatura **PERMITIDO**, ler escolas/notas **NEGADO**, TRUNCATE **NEGADO**.
**Desfazer:** `reverter/reverter_06_privilegios.sql`.

---

## Depois dos passos 1 a 5 (e antes do 6)
1. **Função de convite.** No seu computador, na pasta do projeto:
   ```bash
   npx supabase login
   npx supabase secrets set SITE_URL=https://SEU-DOMINIO --project-ref wbvsgmlbenuijulpkpzv
   npx supabase functions deploy create-school-user --project-ref wbvsgmlbenuijulpkpzv
   ```
2. **Painel → Authentication → URL Configuration:** *Site URL* = o endereço do sistema; em *Redirect URLs* inclua `https://SEU-DOMINIO/reset-password` (senão o link do e-mail de primeiro acesso não redireciona certo).
3. **E-mail:** o remetente padrão do Supabase tem limite baixíssimo de envios por hora. Para convidar uma escola inteira, configure um SMTP próprio (*Authentication → Emails → SMTP Settings*). Sem isso, convites ficam sem chegar.
4. **Site novo.** Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e rode `./deploy.sh <IP> <CHAVE.pem> ubuntu <DOMINIO> <EMAIL>`. O deploy guarda a versão anterior em `school.prev`.
5. **Passo 6** (privilégios) e a sua conferência.

## Teste manual depois de tudo (use uma escola de teste, com dados fictícios)
| Quem | O que fazer | Esperado |
|---|---|---|
| Secretaria | Cadastro de Alunos → cadastrar; Enturmação → matricular numa turma | o aluno recebe e-mail de convite |
| Secretaria | Usuários → novo **Responsável** com um aluno | e-mail chega; ao entrar vê o **Portal da Família** |
| Professor | Acadêmico → Diário → turma → marcar falta, digitar nota, **Salvar**, recarregar a página | os dados voltam |
| Aluno | primeiro acesso | aparece o modal de **Termos de Uso**; depois o portal mostra só os dados dele |
| Admin | Usuários → remover um usuário de teste | some da lista e continua sumido ao recarregar |
| Professor | tentar abrir Financeiro | não aparece no menu |

## Se algo der errado
Reverta **na ordem inversa**: 6 → 5 → (4 e 2) → 1, com os arquivos de `reverter/`. Depois do último, rode `00_antes.sql` de novo: os números devem ser os do Passo 0. Se precisar, restaure o backup.

## Mapa dos arquivos
`NN_*.sql` = cópia exata de `supabase/migrations/2026110600NNNN_*` (a fonte de verdade é a pasta `migrations`; os testes de RLS e a pilha local usam essas). `verificar/` = consultas somente leitura (os testes de comportamento não gravam nada). `reverter/` = como voltar.
