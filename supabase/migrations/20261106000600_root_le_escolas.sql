-- O dono do sistema (root_admins.is_root = true) não é membro de nenhuma escola, então as políticas
-- "só membros" deixavam as listas dele vazias (não conseguia escolher a escola em Usuários, Turmas etc.).
-- Políticas permissivas somadas às existentes: leitura (e remoção de vínculo) só para o dono, não para suporte.
DROP POLICY IF EXISTS root_le_escolas ON public.escolas;
CREATE POLICY root_le_escolas ON public.escolas FOR SELECT USING (public.is_root_owner());

DROP POLICY IF EXISTS root_le_membros ON public.membros_escola;
CREATE POLICY root_le_membros ON public.membros_escola FOR SELECT USING (public.is_root_owner());

DROP POLICY IF EXISTS root_remove_membros ON public.membros_escola;
CREATE POLICY root_remove_membros ON public.membros_escola FOR DELETE USING (public.is_root_owner());

DROP POLICY IF EXISTS root_le_perfis ON public.perfis;
CREATE POLICY root_le_perfis ON public.perfis FOR SELECT USING (public.is_root_owner());

DROP POLICY IF EXISTS root_le_turmas ON public.turmas;
CREATE POLICY root_le_turmas ON public.turmas FOR SELECT USING (public.is_root_owner());

DROP POLICY IF EXISTS root_le_disciplinas ON public.disciplinas;
CREATE POLICY root_le_disciplinas ON public.disciplinas FOR SELECT USING (public.is_root_owner());

DROP POLICY IF EXISTS root_le_matriculas ON public.matriculas;
CREATE POLICY root_le_matriculas ON public.matriculas FOR SELECT USING (public.is_root_owner());
