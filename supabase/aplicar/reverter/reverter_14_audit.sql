DROP POLICY IF EXISTS audit_insert_proprio ON public.audit_logs;
CREATE POLICY "Usuários podem criar logs de auditoria" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.log_audit(p_escola_id uuid, p_acao text, p_detalhes jsonb DEFAULT '{}'::jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
    INSERT INTO public.audit_logs (user_id, escola_id, acao, detalhes) VALUES (auth.uid(), p_escola_id, p_acao, p_detalhes);
END;
$function$;
