-- Apaga o canal de atendimento e TODAS as conversas.
DROP TABLE IF EXISTS public.atendimento_mensagens;
DROP TABLE IF EXISTS public.atendimentos;
DROP FUNCTION IF EXISTS public.atendimento_msg_depois_inserir();
DROP FUNCTION IF EXISTS public.atendimento_msg_antes_inserir();
DROP FUNCTION IF EXISTS public.atendimentos_antes_atualizar();
DROP FUNCTION IF EXISTS public.atendimentos_antes_inserir();
DROP FUNCTION IF EXISTS public.atendimento_nome_de(uuid);
