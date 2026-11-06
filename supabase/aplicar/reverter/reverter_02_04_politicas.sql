-- REVERTE os passos 2 e 4 (políticas por papel e vínculos de responsável) e volta às políticas ORIGINAIS de produção.
-- Use só se algo der errado depois dos passos 2/4. Se já aplicou o passo 6, reverta-o antes (reverter_06).
-- NÃO desfaz o passo 3 (valor 'Responsavel' do enum não pode ser removido; é inofensivo).
begin;

-- 1) apaga as políticas atuais das tabelas gerenciadas e a tabela de vínculos de responsável
drop table if exists public.responsaveis_alunos cascade;
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' and tablename in ('perfis', 'membros_escola', 'turmas', 'disciplinas', 'turma_professores', 'turma_alunos', 'matrizes_curriculares', 'matriculas', 'notas', 'frequencia', 'periodos_letivos', 'financeiro_verbas', 'faturas', 'assinaturas') loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 2) apaga as funções criadas pelos passos 2 e 4
drop function if exists public.tem_papel(uuid, text[]);
drop function if exists public.professor_leciona(uuid, uuid);
drop function if exists public.professor_leciona_matricula(uuid, uuid);
drop function if exists public.matricula_e_minha(uuid);
drop function if exists public.matricula_na_escola(uuid, uuid);
drop function if exists public.membro_e_meu(uuid);
drop function if exists public.pode_ver_perfil(uuid);
drop function if exists public.responsavel_do_aluno(uuid);
drop function if exists public.responsavel_da_matricula(uuid);
drop function if exists public.responsavel_do_membro(uuid);
drop function if exists public.vinculo_responsavel_valido(uuid, uuid, uuid);

-- 3) recria as políticas originais (exatamente como estavam em produção em 2026-11-06)
CREATE POLICY "Checkout público pode inserir assinaturas" ON public.assinaturas FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer operador ativo pode atualizar assinaturas" ON public.assinaturas FOR UPDATE USING (is_operator_active()) WITH CHECK (is_operator_active());
CREATE POLICY "Qualquer operador ativo pode ver assinaturas" ON public.assinaturas FOR SELECT USING (is_operator_active());
CREATE POLICY "Acesso Disciplinas" ON public.disciplinas FOR ALL USING (escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid()));
CREATE POLICY "Isolamento de Disciplinas" ON public.disciplinas FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Acesso Turma Professores" ON public.turma_professores FOR ALL USING (turma_id IN (SELECT turmas.id FROM turmas WHERE turmas.escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid())));
CREATE POLICY "Isolamento de Turma Professores" ON public.turma_professores FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Acesso Notas" ON public.notas FOR ALL USING (escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid()));
CREATE POLICY "Isolamento de Notas" ON public.notas FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Isolamento de Períodos Letivos" ON public.periodos_letivos FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Acesso Matrizes" ON public.matrizes_curriculares FOR ALL USING (turma_id IN (SELECT turmas.id FROM turmas WHERE turmas.escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid())));
CREATE POLICY "Acesso Turma Alunos" ON public.turma_alunos FOR ALL USING (turma_id IN (SELECT turmas.id FROM turmas WHERE turmas.escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid())));
CREATE POLICY "Acesso Faturas Escola" ON public.faturas FOR ALL USING (escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid()));
CREATE POLICY "Usuários veem membros das suas escolas" ON public.membros_escola FOR SELECT USING (user_in_escola(escola_id));
CREATE POLICY "Isolamento de Matrículas" ON public.matriculas FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Visualizar perfis da mesma escola" ON public.perfis FOR SELECT USING ((auth.uid() = id) OR (EXISTS (SELECT 1 FROM membros_escola m1 JOIN membros_escola m2 ON m1.escola_id = m2.escola_id WHERE m1.user_id = auth.uid() AND m2.user_id = perfis.id)));
CREATE POLICY "Acesso Turmas" ON public.turmas FOR ALL USING (escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid()));
CREATE POLICY "Isolamento de Turmas" ON public.turmas FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Acesso Frequencia" ON public.frequencia FOR ALL USING (escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid()));
CREATE POLICY "Isolamento de Frequência" ON public.frequencia FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Acesso Financeiro Verbas" ON public.financeiro_verbas FOR ALL USING (escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid()));
CREATE POLICY "Isolamento Financeiro" ON public.financeiro_verbas FOR ALL USING (user_in_escola(escola_id) AND (EXISTS (SELECT 1 FROM membros_escola WHERE membros_escola.escola_id = financeiro_verbas.escola_id AND membros_escola.user_id = auth.uid() AND membros_escola.papel = ANY (ARRAY['Admin'::perfil_papel, 'Diretor'::perfil_papel, 'Secretaria'::perfil_papel]))));

commit;
