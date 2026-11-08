-- Backoffice: o dono do sistema cria a escola de um cliente (assinatura) e liga as duas (assinaturas.escola_id).
-- Hoje nenhum fluxo cria escolas. Só o dono (is_root_owner) pode inserir; suporte e usuários de escola não.
DROP POLICY IF EXISTS root_cria_escola ON public.escolas;
CREATE POLICY root_cria_escola ON public.escolas FOR INSERT WITH CHECK (public.is_root_owner());
