-- O dono do sistema (is_root_owner) gerencia a estrutura acadêmica de qualquer escola para dar suporte:
-- turmas, disciplinas, professores da turma, enturmação e grade de horários. Antes só Admin/Diretor/Secretaria
-- DA escola gravavam, e o root (que não é membro de nenhuma) via o erro de permissão sem aviso na tela.
-- Notas, frequência e financeiro NÃO entram aqui (dados de alunos): ficam para a regra de auditoria.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['turmas', 'disciplinas', 'turma_professores', 'turma_alunos', 'matriculas', 'horarios_aula'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS root_gerencia_%1$s ON public.%1$I', t);
      EXECUTE format('CREATE POLICY root_gerencia_%1$s ON public.%1$I FOR ALL USING (public.is_root_owner()) WITH CHECK (public.is_root_owner())', t);
    END IF;
  END LOOP;
END $$;
-- (turmas, disciplinas, matriculas e horarios_aula já tinham leitura do root; a política FOR ALL a inclui.)
