-- Configuração inicial do Schema para EduGestão Pro

-- Extensão recomendada para o Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Criação das Tabelas
-- ==========================================

CREATE TABLE public.escolas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enumerações para garantir integridade de dados
CREATE TYPE perfil_papel AS ENUM ('Admin', 'Diretor', 'Secretaria', 'Professor', 'Aluno');
CREATE TYPE vinculo_tipo AS ENUM ('Efetivo', 'Designado');

CREATE TABLE public.membros_escola (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    papel perfil_papel NOT NULL,
    tipo_vinculo vinculo_tipo NOT NULL,
    data_inicio DATE,
    data_fim DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(escola_id, user_id, papel)
);

CREATE TABLE public.turmas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    ano_letivo INTEGER NOT NULL,
    turno VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE status_matricula AS ENUM ('Ativo', 'Inativo', 'Transferido', 'Expulso');

CREATE TABLE public.matriculas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    status status_matricula DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(turma_id, aluno_id)
);

CREATE TABLE public.notas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
    disciplina VARCHAR(100) NOT NULL,
    valor DECIMAL(5,2) NOT NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    arquivada BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.frequencia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    presente BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE financeiro_tipo AS ENUM ('Entrada', 'Saida');
CREATE TYPE financeiro_status AS ENUM ('Pendente', 'Aprovado', 'Rejeitado');

CREATE TABLE public.financeiro_verbas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    categoria VARCHAR(100) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    tipo financeiro_tipo NOT NULL,
    data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    status_aprovacao financeiro_status DEFAULT 'Pendente',
    comprovante_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. Row Level Security (RLS)
-- ==========================================
-- Habilitar RLS em todas as tabelas
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_escola ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_verbas ENABLE ROW LEVEL SECURITY;

-- Escolas: Usuário só vê as escolas que faz parte
CREATE POLICY "Visualizar próprias escolas" ON public.escolas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.membros_escola
            WHERE membros_escola.escola_id = escolas.id
            AND membros_escola.user_id = auth.uid()
        )
    );

-- Perfis: Usuário vê seu próprio perfil e perfis da mesma escola
CREATE POLICY "Visualizar perfis da mesma escola" ON public.perfis
    FOR SELECT USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM public.membros_escola m1
            JOIN public.membros_escola m2 ON m1.escola_id = m2.escola_id
            WHERE m1.user_id = auth.uid() AND m2.user_id = perfis.id
        )
    );

-- Políticas genéricas baseadas na associação à escola (tenant isolation)
CREATE OR REPLACE FUNCTION user_in_escola(escola_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membros_escola
    WHERE escola_id = escola_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Membros Escola
CREATE POLICY "Usuários veem membros das suas escolas" ON public.membros_escola
    FOR SELECT USING (user_in_escola(escola_id));

-- Turmas
CREATE POLICY "Isolamento de Turmas" ON public.turmas
    FOR ALL USING (user_in_escola(escola_id));

-- Matrículas
CREATE POLICY "Isolamento de Matrículas" ON public.matriculas
    FOR ALL USING (user_in_escola(escola_id));

-- Notas
CREATE POLICY "Isolamento de Notas" ON public.notas
    FOR ALL USING (user_in_escola(escola_id));

-- Frequencia
CREATE POLICY "Isolamento de Frequência" ON public.frequencia
    FOR ALL USING (user_in_escola(escola_id));

-- Financeiro (Só Administradores, Diretores ou Secretaria deveriam ver, mas mantemos o básico pelo escola_id e depois filtramos UI ou via RLS mais rigoroso)
CREATE POLICY "Isolamento Financeiro" ON public.financeiro_verbas
    FOR ALL USING (
        user_in_escola(escola_id) AND
        EXISTS (
            SELECT 1 FROM public.membros_escola
            WHERE escola_id = financeiro_verbas.escola_id 
              AND user_id = auth.uid() 
              AND papel IN ('Admin', 'Diretor', 'Secretaria')
        )
    );

-- ==========================================
-- 3. Triggers e Funções Auxiliares
-- ==========================================

-- Trigger: Quando aluno for transferido/expulso, arquivar as notas em vez de perder
CREATE OR REPLACE FUNCTION archive_notas_on_student_leave()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('Transferido', 'Expulso') AND OLD.status = 'Ativo' THEN
        UPDATE public.notas
        SET arquivada = TRUE
        WHERE matricula_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_matricula_status_change
AFTER UPDATE OF status ON public.matriculas
FOR EACH ROW EXECUTE FUNCTION archive_notas_on_student_leave();

-- ==========================================
-- 4. Tabela de Assinaturas (Leads do Site)
-- ==========================================
-- Guarda todos os contatos que concluíram o checkout no site público.
-- Não exige autenticação para INSERT (qualquer visitante pode assinar),
-- mas o SELECT é restrito a usuários autenticados com papel Admin.

CREATE TYPE assinatura_plano   AS ENUM ('basico', 'profissional', 'enterprise');
CREATE TYPE assinatura_ciclo   AS ENUM ('mensal', 'anual');
CREATE TYPE assinatura_metodo  AS ENUM ('pix', 'cartao', 'boleto');
CREATE TYPE assinatura_status  AS ENUM ('pendente', 'ativo', 'cancelado', 'inadimplente');

CREATE TABLE public.assinaturas (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Dados do contato/responsável
    nome          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    documento     VARCHAR(20),            -- CPF ou CNPJ
    telefone      VARCHAR(20),
    nome_escola   VARCHAR(255) NOT NULL,

    -- Dados da assinatura
    plano         assinatura_plano  NOT NULL,
    ciclo         assinatura_ciclo  NOT NULL,
    metodo_pgto   assinatura_metodo NOT NULL,
    valor_total   DECIMAL(10,2)     NOT NULL,

    -- Controle operacional
    status        assinatura_status NOT NULL DEFAULT 'pendente',
    observacoes   TEXT,                    -- campo livre para anotações manuais

    -- Timestamps
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Atualiza updated_at automaticamente a cada UPDATE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assinaturas_updated_at
BEFORE UPDATE ON public.assinaturas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---- RLS ----
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa (anon) pode INSERIR — necessário para o checkout público funcionar sem login
CREATE POLICY "Checkout público pode inserir assinaturas" ON public.assinaturas
    FOR INSERT WITH CHECK (true);

-- Apenas usuários autenticados (futuros Admins do painel) podem LER as assinaturas
CREATE POLICY "Admins autenticados podem ver assinaturas" ON public.assinaturas
    FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas usuários autenticados podem ATUALIZAR (ex: mudar status de pendente → ativo)
CREATE POLICY "Admins autenticados podem atualizar assinaturas" ON public.assinaturas
    FOR UPDATE USING (auth.role() = 'authenticated');

-- ==========================================
-- 5. Equipe Interna / Administradores Root
-- ==========================================
-- Tabela exclusiva para o dono e operadores internos do sistema.
-- Completamente separada dos usuários de escola (clientes).
-- Nenhum cliente tem acesso ou conhecimento desta tabela.

-- Níveis de acesso dos operadores internos
CREATE TYPE root_role AS ENUM (
  'root',        -- Dono do sistema: acesso total, único que cria/remove operadores
  'super_admin', -- Acesso total, exceto gerenciar outros operadores
  'suporte',     -- Vê e gerencia clientes, NÃO vê financeiro
  'financeiro',  -- Vê dashboard e financeiro, NÃO gerencia clientes
  'operacional'  -- Parametrização e provisionamento de clientes
);

CREATE TABLE public.root_admins (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    role        root_role NOT NULL DEFAULT 'suporte',
    is_root     BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE somente para o dono
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  UUID REFERENCES public.root_admins(id), -- rastreabilidade
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Atualiza updated_at automaticamente (reutiliza a função já criada na seção 4)
CREATE TRIGGER trg_root_admins_updated_at
BEFORE UPDATE ON public.root_admins
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---- Funções Helper de Permissão ----

-- Retorna TRUE se o usuário autenticado é um operador root ativo
CREATE OR REPLACE FUNCTION is_root_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.root_admins
    WHERE id = auth.uid() AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retorna TRUE se o operador logado tem um dos roles informados
CREATE OR REPLACE FUNCTION root_has_role(roles root_role[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.root_admins
    WHERE id = auth.uid() AND is_active = TRUE AND role = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---- RLS para root_admins ----
ALTER TABLE public.root_admins ENABLE ROW LEVEL SECURITY;

-- Qualquer operador root ativo pode visualizar a equipe
CREATE POLICY "Equipe root pode ver os membros" ON public.root_admins
    FOR SELECT USING (is_root_admin());

-- Somente o root (is_root = TRUE) pode criar/editar/remover operadores
CREATE POLICY "Somente o dono pode gerenciar operadores" ON public.root_admins
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.root_admins
            WHERE id = auth.uid() AND is_root = TRUE AND is_active = TRUE
        )
    );

-- ---- Patch nas políticas de assinaturas ----
-- Substitui as políticas genéricas por políticas root-aware

DROP POLICY IF EXISTS "Admins autenticados podem ver assinaturas"      ON public.assinaturas;
DROP POLICY IF EXISTS "Admins autenticados podem atualizar assinaturas" ON public.assinaturas;

CREATE POLICY "Root admins podem ver assinaturas" ON public.assinaturas
    FOR SELECT USING (is_root_admin());

CREATE POLICY "Root admins podem atualizar assinaturas" ON public.assinaturas
    FOR UPDATE USING (is_root_admin());

-- Vincula a assinatura à escola quando root provisiona o cliente
ALTER TABLE public.assinaturas
    ADD COLUMN IF NOT EXISTS escola_id UUID REFERENCES public.escolas(id);


-- Correção policy

-- 1. Remover policies antigas (evita conflito)
DROP POLICY IF EXISTS "Equipe root pode ver os membros" ON public.root_admins;
DROP POLICY IF EXISTS "Somente o dono pode gerenciar operadores" ON public.root_admins;

DROP POLICY IF EXISTS "Root admins podem ver assinaturas" ON public.assinaturas;
DROP POLICY IF EXISTS "Root admins podem atualizar assinaturas" ON public.assinaturas;

-- 2. Criar função segura (sem RLS)
CREATE OR REPLACE FUNCTION public.is_root_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.root_admins
    WHERE id = auth.uid()
      AND is_root = TRUE
      AND is_active = TRUE
  );
$$;

-- (Opcional, mas recomendado)
REVOKE ALL ON FUNCTION public.is_root_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_root_admin() TO authenticated;

-- 3. Garantir que RLS está ativo
ALTER TABLE public.root_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

-- 4. Criar policies corrigidas para root_admins

-- SELECT
CREATE POLICY "Equipe root pode ver os membros"
ON public.root_admins
FOR SELECT
USING (public.is_root_admin());

-- INSERT, UPDATE, DELETE
CREATE POLICY "Somente o dono pode gerenciar operadores"
ON public.root_admins
FOR ALL
USING (public.is_root_admin())
WITH CHECK (public.is_root_admin());

-- 5. Policies para assinaturas

CREATE POLICY "Root admins podem ver assinaturas"
ON public.assinaturas
FOR SELECT
USING (public.is_root_admin());

CREATE POLICY "Root admins podem atualizar assinaturas"
ON public.assinaturas
FOR UPDATE
USING (public.is_root_admin())
WITH CHECK (public.is_root_admin());