-- Canal de atendimento dentro do sistema: a equipe da escola abre uma conversa com o suporte sem sair da aplicação.
--   Cliente = Admin, Diretor, Subdiretor, Secretaria e Professor da escola. Vê só as próprias conversas
--             (o Admin da escola vê também as dos colegas, só para ler).
--   Suporte (N1, N2, N3 e dono) vê todas as conversas e responde; N1 atende primeiro e pode escalar para N2 ou N3.
-- Quem é o autor ("cliente" ou "suporte") e o nome vêm do servidor, nunca do navegador.
-- Idempotente.
CREATE TABLE IF NOT EXISTS public.atendimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  aberto_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  autor_nome text NOT NULL DEFAULT '',
  assunto text NOT NULL CHECK (length(btrim(assunto)) BETWEEN 3 AND 120),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_atendimento', 'resolvido')),
  nivel_atual smallint NOT NULL DEFAULT 1 CHECK (nivel_atual BETWEEN 1 AND 3),
  atendente_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  atendente_nome text,
  ultimo_autor text CHECK (ultimo_autor IN ('cliente', 'suporte')),
  created_at timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  resolvido_em timestamptz,
  lido_cliente_em timestamptz,
  lido_suporte_em timestamptz
);
CREATE TABLE IF NOT EXISTS public.atendimento_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id uuid NOT NULL REFERENCES public.atendimentos(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_tipo text NOT NULL DEFAULT 'cliente' CHECK (autor_tipo IN ('cliente', 'suporte')),
  autor_nome text NOT NULL DEFAULT '',
  texto text NOT NULL CHECK (length(btrim(texto)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_atendimentos_escola ON public.atendimentos (escola_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_aberto_por ON public.atendimentos (aberto_por);
CREATE INDEX IF NOT EXISTS idx_atendimentos_fila ON public.atendimentos (status, atualizado_em DESC);
CREATE INDEX IF NOT EXISTS idx_atend_msgs ON public.atendimento_mensagens (atendimento_id, created_at);

-- Nome de quem está logado (perfil da escola ou operador do suporte)
CREATE OR REPLACE FUNCTION public.atendimento_nome_de(p_user uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT nome FROM public.perfis WHERE id = p_user), (SELECT nome FROM public.root_admins WHERE id = p_user), 'Usuário')::text;
$$;

CREATE OR REPLACE FUNCTION public.atendimentos_antes_inserir() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.aberto_por := COALESCE(auth.uid(), NEW.aberto_por);   -- no app, sempre quem está logado
  NEW.autor_nome := public.atendimento_nome_de(NEW.aberto_por);
  NEW.status := 'aberto'; NEW.nivel_atual := 1; NEW.atendente_id := NULL; NEW.atendente_nome := NULL; NEW.resolvido_em := NULL;
  NEW.lido_cliente_em := now(); NEW.lido_suporte_em := NULL;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_atend_antes_inserir ON public.atendimentos;
CREATE TRIGGER trg_atend_antes_inserir BEFORE INSERT ON public.atendimentos FOR EACH ROW EXECUTE FUNCTION public.atendimentos_antes_inserir();

CREATE OR REPLACE FUNCTION public.atendimento_msg_antes_inserir() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.autor_id := auth.uid();
    NEW.autor_tipo := CASE WHEN public.suporte_nivel() > 0 THEN 'suporte' ELSE 'cliente' END;
  END IF;
  NEW.autor_nome := public.atendimento_nome_de(NEW.autor_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_atend_msg_antes ON public.atendimento_mensagens;
CREATE TRIGGER trg_atend_msg_antes BEFORE INSERT ON public.atendimento_mensagens FOR EACH ROW EXECUTE FUNCTION public.atendimento_msg_antes_inserir();

-- Depois de cada mensagem: atualiza a conversa (quem falou por último, status, atendente, lido)
CREATE OR REPLACE FUNCTION public.atendimento_msg_depois_inserir() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.autor_tipo = 'cliente' THEN
    UPDATE public.atendimentos SET ultimo_autor = 'cliente', atualizado_em = now(), lido_cliente_em = now(),
      status = CASE WHEN status = 'resolvido' THEN 'aberto' ELSE status END,
      resolvido_em = CASE WHEN status = 'resolvido' THEN NULL ELSE resolvido_em END
    WHERE id = NEW.atendimento_id;
  ELSE
    UPDATE public.atendimentos SET ultimo_autor = 'suporte', atualizado_em = now(), lido_suporte_em = now(),
      status = CASE WHEN status = 'aberto' THEN 'em_atendimento' ELSE status END,
      atendente_id = COALESCE(atendente_id, NEW.autor_id),
      atendente_nome = COALESCE(atendente_nome, NEW.autor_nome)
    WHERE id = NEW.atendimento_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_atend_msg_depois ON public.atendimento_mensagens;
CREATE TRIGGER trg_atend_msg_depois AFTER INSERT ON public.atendimento_mensagens FOR EACH ROW EXECUTE FUNCTION public.atendimento_msg_depois_inserir();

-- Quem pode mudar o quê numa conversa já aberta
CREATE OR REPLACE FUNCTION public.atendimentos_antes_atualizar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_suporte boolean := public.suporte_nivel() > 0;
BEGIN
  -- Manutenção pelo banco e atualizações feitas pelos gatilhos das mensagens (profundidade > 1) não passam por aqui;
  -- o usuário só dispara este gatilho no nível 1, com o UPDATE dele.
  IF auth.uid() IS NULL OR pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  -- Campos que nunca mudam por aqui
  IF NEW.escola_id IS DISTINCT FROM OLD.escola_id OR NEW.aberto_por IS DISTINCT FROM OLD.aberto_por
     OR NEW.assunto IS DISTINCT FROM OLD.assunto OR NEW.autor_nome IS DISTINCT FROM OLD.autor_nome
     OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.ultimo_autor IS DISTINCT FROM OLD.ultimo_autor
     OR NEW.atualizado_em IS DISTINCT FROM OLD.atualizado_em THEN
    RAISE EXCEPTION 'Este campo da conversa não pode ser alterado.' USING ERRCODE = '42501';
  END IF;
  IF v_suporte THEN
    -- Suporte: status, nível, atendente; "lido" sempre com a hora do servidor
    IF NEW.lido_suporte_em IS DISTINCT FROM OLD.lido_suporte_em THEN NEW.lido_suporte_em := now(); END IF;
    IF NEW.lido_cliente_em IS DISTINCT FROM OLD.lido_cliente_em THEN NEW.lido_cliente_em := OLD.lido_cliente_em; END IF;
    IF NEW.status = 'resolvido' AND OLD.status <> 'resolvido' THEN NEW.resolvido_em := now(); END IF;
    IF NEW.status <> 'resolvido' THEN NEW.resolvido_em := NULL; END IF;
  ELSE
    -- Cliente: só marca como lida e encerra a própria conversa
    IF NEW.nivel_atual IS DISTINCT FROM OLD.nivel_atual OR NEW.atendente_id IS DISTINCT FROM OLD.atendente_id
       OR NEW.atendente_nome IS DISTINCT FROM OLD.atendente_nome OR NEW.lido_suporte_em IS DISTINCT FROM OLD.lido_suporte_em
       OR NEW.resolvido_em IS DISTINCT FROM OLD.resolvido_em THEN
      RAISE EXCEPTION 'Você só pode marcar como lida ou encerrar a conversa.' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status <> 'resolvido' THEN RAISE EXCEPTION 'Você só pode encerrar a conversa.' USING ERRCODE = '42501'; END IF;
      NEW.resolvido_em := now();
    END IF;
    IF NEW.lido_cliente_em IS DISTINCT FROM OLD.lido_cliente_em THEN NEW.lido_cliente_em := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_atend_antes_atualizar ON public.atendimentos;
CREATE TRIGGER trg_atend_antes_atualizar BEFORE UPDATE ON public.atendimentos FOR EACH ROW EXECUTE FUNCTION public.atendimentos_antes_atualizar();

-- Permissões
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimento_mensagens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atendimentos, public.atendimento_mensagens FROM anon;
REVOKE ALL ON public.atendimentos, public.atendimento_mensagens FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.atendimentos TO authenticated;
GRANT SELECT, INSERT ON public.atendimento_mensagens TO authenticated;

DROP POLICY IF EXISTS atend_select ON public.atendimentos;
CREATE POLICY atend_select ON public.atendimentos FOR SELECT
  USING (aberto_por = auth.uid() OR public.tem_papel(escola_id, 'Admin') OR public.suporte_nivel() >= 1);
DROP POLICY IF EXISTS atend_insert ON public.atendimentos;
CREATE POLICY atend_insert ON public.atendimentos FOR INSERT
  WITH CHECK (aberto_por = auth.uid() AND public.tem_papel(escola_id, 'Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor'));
DROP POLICY IF EXISTS atend_update ON public.atendimentos;
CREATE POLICY atend_update ON public.atendimentos FOR UPDATE
  USING (aberto_por = auth.uid() OR public.suporte_nivel() >= 1)
  WITH CHECK (aberto_por = auth.uid() OR public.suporte_nivel() >= 1);

DROP POLICY IF EXISTS atend_msg_select ON public.atendimento_mensagens;
CREATE POLICY atend_msg_select ON public.atendimento_mensagens FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.atendimentos a WHERE a.id = atendimento_id));   -- herda a visibilidade da conversa
DROP POLICY IF EXISTS atend_msg_insert ON public.atendimento_mensagens;
CREATE POLICY atend_msg_insert ON public.atendimento_mensagens FOR INSERT
  WITH CHECK (autor_id = auth.uid() AND (
    public.suporte_nivel() >= 1
    OR EXISTS (SELECT 1 FROM public.atendimentos a WHERE a.id = atendimento_id AND a.aberto_por = auth.uid())));
