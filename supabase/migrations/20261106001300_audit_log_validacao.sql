-- A auditoria só vale se não puder ser falsificada. Antes, log_audit() e a política de INSERT aceitavam de qualquer usuário
-- logado qualquer escola e qualquer ação: dava para gravar registros falsos na escola de outro cliente, inclusive
-- com nome SUPORTE_*, que são reservados às funções de suporte.
-- Agora: só grava na escola de que a pessoa faz parte (ou o dono do sistema), e nunca com ação SUPORTE_*.
-- Idempotente.
CREATE OR REPLACE FUNCTION public.log_audit(p_escola_id uuid, p_acao text, p_detalhes jsonb DEFAULT '{}'::jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_acao LIKE 'SUPORTE\_%' THEN
    RAISE EXCEPTION 'Ação reservada ao suporte.' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.user_in_escola(p_escola_id) OR public.is_root_owner()) THEN
    RAISE EXCEPTION 'Você não pertence a esta escola.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.audit_logs (user_id, escola_id, acao, detalhes) VALUES (auth.uid(), p_escola_id, p_acao, COALESCE(p_detalhes, '{}'::jsonb));
END $$;

DROP POLICY IF EXISTS "Usuários podem criar logs de auditoria" ON public.audit_logs;
DROP POLICY IF EXISTS audit_insert_proprio ON public.audit_logs;
CREATE POLICY audit_insert_proprio ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND acao NOT LIKE 'SUPORTE\_%' AND (public.user_in_escola(escola_id) OR public.is_root_owner()));
