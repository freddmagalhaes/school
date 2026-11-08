-- Configuração inicial do Schema para EduGestão Pro

-- ==========================================
-- 0. Extensões
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Tipos e Enums
-- ==========================================
CREATE TYPE public.perfil_papel AS ENUM ('Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor', 'Aluno');
CREATE TYPE public.vinculo_tipo AS ENUM ('Efetivo', 'Designado');
CREATE TYPE public.status_matricula AS ENUM ('Ativo', 'Inativo', 'Transferido', 'Evadido', 'Expulso');
CREATE TYPE public.financeiro_tipo AS ENUM ('Entrada', 'Saida');
CREATE TYPE public.financeiro_status AS ENUM ('Pendente', 'Aprovado', 'Rejeitado');

CREATE TYPE public.assinatura_plano AS ENUM ('basico', 'profissional', 'enterprise');
CREATE TYPE public.assinatura_ciclo AS ENUM ('mensal', 'anual');
CREATE TYPE public.assinatura_metodo AS ENUM ('pix', 'cartao', 'boleto');
CREATE TYPE public.assinatura_status AS ENUM ('pendente', 'ativo', 'cancelado', 'inadimplente');

CREATE TYPE public.root_role AS ENUM (
  'root',        -- Dono do sistema
  'super_admin', -- Acesso total, exceto gerenciar operadores
  'suporte',     -- Vê e gerencia clientes
  'financeiro',  -- Financeiro
  'operacional'  -- Provisionamento
);

-- ==========================================
-- 2. Tabelas
-- ==========================================
CREATE TABLE public.escolas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    formato_avaliacao VARCHAR(50) DEFAULT 'Bimestral',
    bloquear_notas BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    foto_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.membros_escola (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    papel public.perfil_papel NOT NULL,
    tipo_vinculo public.vinculo_tipo NOT NULL,
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

CREATE TABLE public.disciplinas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(escola_id, nome)
);

CREATE TABLE public.turma_professores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    disciplina_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(turma_id, professor_id, disciplina_id)
);

CREATE TABLE public.matriculas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    status public.status_matricula DEFAULT 'Ativo',
    motivo_saida VARCHAR(255),
    data_saida DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(turma_id, aluno_id)
);

CREATE TABLE public.notas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
    disciplina_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
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

-- Períodos Letivos: bimestral por default, configurável por escola
-- tipo_periodo: 'Bimestral' (4x), 'Trimestral' (3x), 'Semestral' (2x), 'Anual' (1x)
CREATE TABLE public.periodos_letivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,       -- Ex: '1º Bimestre', '2º Trimestre'
    ordem SMALLINT NOT NULL,         -- 1, 2, 3, 4
    ano_letivo INTEGER NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(escola_id, ano_letivo, ordem)
);

CREATE TABLE public.financeiro_verbas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    categoria VARCHAR(100) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    tipo public.financeiro_tipo NOT NULL,
    data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    status_aprovacao public.financeiro_status DEFAULT 'Pendente',
    comprovante_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.assinaturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    documento VARCHAR(20),
    telefone VARCHAR(20),
    nome_escola VARCHAR(255) NOT NULL,
    plano public.assinatura_plano NOT NULL,
    ciclo public.assinatura_ciclo NOT NULL,
    metodo_pgto public.assinatura_metodo NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    status public.assinatura_status NOT NULL DEFAULT 'pendente',
    observacoes TEXT,
    escola_id UUID REFERENCES public.escolas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.root_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role public.root_role NOT NULL DEFAULT 'suporte',
    is_root BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.root_admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_mode BOOLEAN DEFAULT false,
    support_email VARCHAR(255) DEFAULT 'suporte@edugestao.com',
    default_trial_days INTEGER DEFAULT 14,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. Funções Auxiliares
-- ==========================================

CREATE OR REPLACE FUNCTION public.user_in_escola(escola_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.membros_escola
    WHERE escola_id = escola_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_operator_active()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.root_admins
    WHERE id = auth.uid()
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_root_owner()
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

REVOKE ALL ON FUNCTION public.is_operator_active() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_root_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_operator_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_root_owner() TO authenticated;

CREATE OR REPLACE FUNCTION public.archive_notas_on_student_leave()
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. Triggers
-- ==========================================

CREATE TRIGGER on_matricula_status_change
AFTER UPDATE OF status ON public.matriculas
FOR EACH ROW EXECUTE FUNCTION public.archive_notas_on_student_leave();

CREATE TRIGGER trg_assinaturas_updated_at
BEFORE UPDATE ON public.assinaturas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_root_admins_updated_at
BEFORE UPDATE ON public.root_admins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 5. Row Level Security (RLS)
-- ==========================================
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_escola ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_letivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_verbas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.root_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Escolas
CREATE POLICY "Visualizar próprias escolas" ON public.escolas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.membros_escola
            WHERE membros_escola.escola_id = escolas.id
            AND membros_escola.user_id = auth.uid()
        )
    );

CREATE POLICY "Root ou Admin pode atualizar escolas" ON public.escolas
    FOR UPDATE USING (
        public.is_operator_active() 
        OR
        EXISTS (
            SELECT 1 FROM public.membros_escola
            WHERE membros_escola.escola_id = escolas.id
            AND membros_escola.user_id = auth.uid()
            AND membros_escola.papel = 'Admin'
        )
    ) WITH CHECK (
        public.is_operator_active() 
        OR
        EXISTS (
            SELECT 1 FROM public.membros_escola
            WHERE membros_escola.escola_id = escolas.id
            AND membros_escola.user_id = auth.uid()
            AND membros_escola.papel = 'Admin'
        )
    );

-- Perfis
CREATE POLICY "Visualizar perfis da mesma escola" ON public.perfis
    FOR SELECT USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM public.membros_escola m1
            JOIN public.membros_escola m2 ON m1.escola_id = m2.escola_id
            WHERE m1.user_id = auth.uid() AND m2.user_id = perfis.id
        )
    );

-- Membros Escola
CREATE POLICY "Usuários veem membros das suas escolas" ON public.membros_escola
    FOR SELECT USING (public.user_in_escola(escola_id));

-- Isolamento Generico Tenant
CREATE POLICY "Isolamento de Turmas" ON public.turmas
    FOR ALL USING (public.user_in_escola(escola_id));

CREATE POLICY "Isolamento de Disciplinas" ON public.disciplinas
    FOR ALL USING (public.user_in_escola(escola_id));

CREATE POLICY "Isolamento de Turma Professores" ON public.turma_professores
    FOR ALL USING (public.user_in_escola(escola_id));

CREATE POLICY "Isolamento de Matrículas" ON public.matriculas
    FOR ALL USING (public.user_in_escola(escola_id));

CREATE POLICY "Isolamento de Notas" ON public.notas
    FOR ALL USING (public.user_in_escola(escola_id));

CREATE POLICY "Isolamento de Frequência" ON public.frequencia
    FOR ALL USING (public.user_in_escola(escola_id));

CREATE POLICY "Isolamento de Períodos Letivos" ON public.periodos_letivos
    FOR ALL USING (public.user_in_escola(escola_id));

CREATE POLICY "Isolamento Financeiro" ON public.financeiro_verbas
    FOR ALL USING (
        public.user_in_escola(escola_id) AND
        EXISTS (
            SELECT 1 FROM public.membros_escola
            WHERE escola_id = financeiro_verbas.escola_id 
              AND user_id = auth.uid() 
              AND papel IN ('Admin', 'Diretor', 'Subdiretor', 'Secretaria')
        )
    );

-- Assinaturas
CREATE POLICY "Checkout público pode inserir assinaturas" ON public.assinaturas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Root admins podem ver assinaturas" ON public.assinaturas
    FOR SELECT USING (public.is_operator_active());

CREATE POLICY "Root admins podem atualizar assinaturas" ON public.assinaturas
    FOR UPDATE USING (public.is_operator_active())
    WITH CHECK (public.is_operator_active());

-- Root Admins
CREATE POLICY "Operadores ativos podem ver a equipe" ON public.root_admins
    FOR SELECT USING (public.is_operator_active());

CREATE POLICY "Somente o dono pode gerenciar operadores" ON public.root_admins
    FOR ALL USING (public.is_root_owner()) WITH CHECK (public.is_root_owner());

-- System Settings
CREATE POLICY "Root admins podem ver configs" ON public.system_settings
    FOR SELECT USING (public.is_operator_active());

CREATE POLICY "Somente root owner pode editar configs" ON public.system_settings
    FOR UPDATE USING (public.is_root_owner()) WITH CHECK (public.is_root_owner());

-- ==========================================
-- 6. Initial Seed Data
-- ==========================================
INSERT INTO public.system_settings (maintenance_mode, support_email, default_trial_days)
VALUES (false, 'suporte@edugestao.com', 14);

-- ==========================================
-- 7. Scripts úteis (rodar manualmente)
-- ==========================================

-- Adiciona 'Subdiretor' ao enum (se já existe o enum, use ALTER TYPE):
-- ALTER TYPE public.perfil_papel ADD VALUE IF NOT EXISTS 'Subdiretor';
-- ALTER TYPE public.status_matricula ADD VALUE IF NOT EXISTS 'Evadido';

-- Popular períodos letivos padrão (Bimestral) para uma escola específica:
-- Substitua '<ESCOLA_ID>' pelo UUID real da escola e '<ANO>' pelo ano letivo.
-- INSERT INTO public.periodos_letivos (escola_id, nome, ordem, ano_letivo, data_inicio, data_fim) VALUES
--   ('<ESCOLA_ID>', '1º Bimestre', 1, <ANO>, '<ANO>-02-01', '<ANO>-04-30'),
--   ('<ESCOLA_ID>', '2º Bimestre', 2, <ANO>, '<ANO>-05-01', '<ANO>-07-15'),
--   ('<ESCOLA_ID>', '3º Bimestre', 3, <ANO>, '<ANO>-08-01', '<ANO>-10-15'),
--   ('<ESCOLA_ID>', '4º Bimestre', 4, <ANO>, '<ANO>-10-16', '<ANO>-12-15');

-- Adicionar valores novos nos enums existentes
ALTER TYPE public.perfil_papel ADD VALUE IF NOT EXISTS 'Subdiretor';
ALTER TYPE public.status_matricula ADD VALUE IF NOT EXISTS 'Evadido';

-- Adicionar colunas novas em matriculas (caso já exista a tabela)
ALTER TABLE public.matriculas 
  ADD COLUMN IF NOT EXISTS motivo_saida VARCHAR(255),
  ADD COLUMN IF NOT EXISTS data_saida DATE;

-- Criar tabela periodos_letivos (caso não exista)
CREATE TABLE IF NOT EXISTS public.periodos_letivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    ordem SMALLINT NOT NULL,
    ano_letivo INTEGER NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(escola_id, ano_letivo, ordem)
);

ALTER TABLE public.periodos_letivos ENABLE ROW LEVEL SECURITY;

-- Politica RLS para periodos_letivos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'periodos_letivos' 
    AND policyname = 'Isolamento de Períodos Letivos'
  ) THEN
    CREATE POLICY "Isolamento de Períodos Letivos" ON public.periodos_letivos
      FOR ALL USING (public.user_in_escola(escola_id));
  END IF;
END $$;

-- ==========================================
-- 8. CRM Leads INEP
-- ==========================================

CREATE TABLE IF NOT EXISTS public.crm_leads_escolas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_inep VARCHAR(20) UNIQUE NOT NULL,
    nome_escola VARCHAR(255) NOT NULL,
    uf VARCHAR(2) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    dependencia_adm VARCHAR(50) NOT NULL,
    localizacao VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pendente', -- Pendente, Convertido, Descartado
    escola_id UUID REFERENCES public.escolas(id), -- Vinculo quando convertido
    telefone VARCHAR(50),
    endereco TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.crm_leads_escolas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'crm_leads_escolas' 
    AND policyname = 'Root admins podem gerenciar leads'
  ) THEN
    CREATE POLICY "Root admins podem gerenciar leads" ON public.crm_leads_escolas
      FOR ALL USING (public.is_operator_active()) WITH CHECK (public.is_operator_active());
  END IF;
END $$;
