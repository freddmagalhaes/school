-- Adiciona campo de aceite da LGPD aos perfis
ALTER TABLE public.perfis 
ADD COLUMN IF NOT EXISTS aceitou_termos_em timestamp with time zone;

-- Criação da Tabela de Logs de Auditoria (LGPD Accountability)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    escola_id uuid REFERENCES public.escolas(id) ON DELETE CASCADE,
    acao text NOT NULL,
    detalhes jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS na tabela audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Politica 1: Usuários autenticados podem inserir logs
CREATE POLICY "Usuários podem criar logs de auditoria"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Politica 2: Apenas admins podem ler logs da sua própria escola
CREATE POLICY "Admins podem ver logs da sua escola"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.membros_escola me
        WHERE me.escola_id = audit_logs.escola_id
        AND me.user_id = auth.uid()
        AND me.papel = 'Admin'
    )
);

-- Politica 3: Ninguém pode alterar ou deletar logs (Imutabilidade)
-- (Sem políticas de UPDATE ou DELETE)

-- (Opcional) Criação de Função RPC para inserir logs mais facilmente caso o RLS seja restritivo
CREATE OR REPLACE FUNCTION log_audit(p_escola_id uuid, p_acao text, p_detalhes jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, escola_id, acao, detalhes)
    VALUES (auth.uid(), p_escola_id, p_acao, p_detalhes);
END;
$$;
