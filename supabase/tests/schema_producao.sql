-- SNAPSHOT DA ESTRUTURA do banco de PRODUÇÃO (projeto wbvsgmlbenuijulpkpzv), exportado em 2026-11-06
-- pelo SQL Editor (colunas, restrições, enums, funções, gatilhos e políticas). Sem dados.
-- Serve para rodar os testes de RLS contra o esquema REAL (RLS_BASE=producao).
-- Atualize quando o banco mudar. Não aplicar em produção.

CREATE TYPE public.assinatura_plano AS ENUM ('basico', 'profissional', 'enterprise');
CREATE TYPE public.perfil_papel AS ENUM ('Admin', 'Diretor', 'Secretaria', 'Professor', 'Aluno', 'Subdiretor');
CREATE TYPE public.vinculo_tipo AS ENUM ('Efetivo', 'Designado');
CREATE TYPE public.status_matricula AS ENUM ('Ativo', 'Inativo', 'Transferido', 'Expulso', 'Evadido');
CREATE TYPE public.financeiro_tipo AS ENUM ('Entrada', 'Saida');
CREATE TYPE public.financeiro_status AS ENUM ('Pendente', 'Aprovado', 'Rejeitado');
CREATE TYPE public.assinatura_ciclo AS ENUM ('mensal', 'anual');
CREATE TYPE public.assinatura_metodo AS ENUM ('pix', 'cartao', 'boleto');
CREATE TYPE public.assinatura_status AS ENUM ('pendente', 'ativo', 'cancelado', 'inadimplente');
CREATE TYPE public.root_role AS ENUM ('root', 'super_admin', 'suporte', 'financeiro', 'operacional');

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.escolas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome varchar NOT NULL,
  cnpj varchar NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  telefone varchar,
  formato_avaliacao varchar NOT NULL DEFAULT 'Bimestral',
  bloquear_notas boolean NOT NULL DEFAULT false
);
CREATE TABLE public.perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome varchar NOT NULL,
  cpf varchar NOT NULL UNIQUE,
  foto_url text,
  created_at timestamptz DEFAULT now(),
  aceitou_termos_em timestamptz
);
CREATE TABLE public.membros_escola (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  papel public.perfil_papel NOT NULL,
  tipo_vinculo public.vinculo_tipo NOT NULL,
  data_inicio date,
  data_fim date,
  created_at timestamptz DEFAULT now(),
  UNIQUE (escola_id, user_id, papel)
);
CREATE TABLE public.turmas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  nome varchar NOT NULL,
  ano_letivo integer NOT NULL,
  turno varchar NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.disciplinas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  nome varchar NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (escola_id, nome)
);
CREATE TABLE public.turma_professores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  disciplina_id uuid NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (turma_id, professor_id, disciplina_id)
);
CREATE TABLE public.matriculas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  status public.status_matricula DEFAULT 'Ativo',
  created_at timestamptz DEFAULT now(),
  motivo_saida varchar,
  data_saida date,
  UNIQUE (turma_id, aluno_id)
);
CREATE TABLE public.notas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  matricula_id uuid NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  disciplina_id uuid NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  valor numeric NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  arquivada boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.frequencia (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  matricula_id uuid NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  presente boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.turma_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.membros_escola(id) ON DELETE CASCADE,
  data_matricula timestamptz DEFAULT now(),
  status text DEFAULT 'Ativo',
  UNIQUE (turma_id, aluno_id)
);
CREATE TABLE public.matrizes_curriculares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  disciplina_id uuid NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  carga_horaria integer NOT NULL,
  UNIQUE (turma_id, disciplina_id)
);
CREATE TABLE public.periodos_letivos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  nome varchar NOT NULL,
  ordem smallint NOT NULL,
  ano_letivo integer NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (escola_id, ano_letivo, ordem)
);
CREATE TABLE public.financeiro_verbas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  categoria varchar NOT NULL,
  valor numeric NOT NULL,
  tipo public.financeiro_tipo NOT NULL,
  data_registro date NOT NULL DEFAULT CURRENT_DATE,
  status_aprovacao public.financeiro_status DEFAULT 'Pendente',
  comprovante_url text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.membros_escola(id) ON DELETE CASCADE,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  valor numeric NOT NULL,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status text DEFAULT 'Pendente' CHECK (status = ANY (ARRAY['Pendente', 'Pago', 'Atrasado', 'Cancelado'])),
  mes_referencia text NOT NULL,
  link_pagamento text,
  linha_digitavel text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.assinaturas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome varchar NOT NULL,
  email varchar NOT NULL,
  documento varchar,
  telefone varchar,
  nome_escola varchar NOT NULL,
  plano public.assinatura_plano NOT NULL,
  ciclo public.assinatura_ciclo NOT NULL,
  metodo_pgto public.assinatura_metodo NOT NULL,
  valor_total numeric NOT NULL,
  status public.assinatura_status NOT NULL DEFAULT 'pendente',
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  escola_id uuid REFERENCES public.escolas(id)
);
CREATE TABLE public.root_admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome varchar NOT NULL,
  email varchar NOT NULL UNIQUE,
  role public.root_role NOT NULL DEFAULT 'suporte',
  is_root boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.root_admins(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  maintenance_mode boolean DEFAULT false,
  support_email varchar DEFAULT 'suporte@edugestao.com',
  default_trial_days integer DEFAULT 14,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  nome text NOT NULL,
  email text NOT NULL,
  mensagem text NOT NULL,
  lida boolean DEFAULT false
);
CREATE TABLE public.crm_leads_escolas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_inep varchar NOT NULL UNIQUE,
  nome_escola varchar NOT NULL,
  uf varchar NOT NULL,
  municipio varchar NOT NULL,
  dependencia_adm varchar NOT NULL,
  localizacao varchar NOT NULL,
  status varchar DEFAULT 'Pendente',
  escola_id uuid REFERENCES public.escolas(id),
  telefone varchar,
  endereco text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  escola_id uuid REFERENCES public.escolas(id) ON DELETE CASCADE,
  acao text NOT NULL,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Funções
CREATE OR REPLACE FUNCTION public.archive_notas_on_student_leave() RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
    IF NEW.status IN ('Transferido', 'Expulso') AND OLD.status = 'Ativo' THEN
        UPDATE public.notas SET arquivada = TRUE WHERE matricula_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.is_operator_active() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (SELECT 1 FROM public.root_admins WHERE id = auth.uid() AND is_active = TRUE);
$function$;
CREATE OR REPLACE FUNCTION public.is_root_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (SELECT 1 FROM public.root_admins WHERE id = auth.uid() AND is_root = TRUE AND is_active = TRUE);
$function$;
CREATE OR REPLACE FUNCTION public.is_root_owner() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (SELECT 1 FROM public.root_admins WHERE id = auth.uid() AND is_root = TRUE AND is_active = TRUE);
$function$;
CREATE OR REPLACE FUNCTION public.log_audit(p_escola_id uuid, p_acao text, p_detalhes jsonb DEFAULT '{}'::jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
    INSERT INTO public.audit_logs (user_id, escola_id, acao, detalhes) VALUES (auth.uid(), p_escola_id, p_acao, p_detalhes);
END;
$function$;
CREATE OR REPLACE FUNCTION public.root_has_role(roles root_role[]) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.root_admins WHERE id = auth.uid() AND is_active = TRUE AND role = ANY(roles));
END;
$function$;
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.user_in_escola(escola_uuid uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.membros_escola WHERE escola_id = escola_uuid AND user_id = auth.uid());
END;
$function$;

-- Gatilhos (o snapshot traz só a função; evento e momento seguem o schema.sql do repositório)
CREATE TRIGGER on_matricula_status_change AFTER UPDATE OF status ON public.matriculas FOR EACH ROW EXECUTE FUNCTION archive_notas_on_student_leave();
CREATE TRIGGER trg_assinaturas_updated_at BEFORE UPDATE ON public.assinaturas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_root_admins_updated_at BEFORE UPDATE ON public.root_admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.root_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_letivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads_escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrizes_curriculares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_escola ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_verbas ENABLE ROW LEVEL SECURITY;

-- Políticas (exatamente as de produção)
CREATE POLICY "Checkout público pode inserir assinaturas" ON public.assinaturas FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer operador ativo pode atualizar assinaturas" ON public.assinaturas FOR UPDATE USING (is_operator_active()) WITH CHECK (is_operator_active());
CREATE POLICY "Qualquer operador ativo pode ver assinaturas" ON public.assinaturas FOR SELECT USING (is_operator_active());
CREATE POLICY "Admins podem ver seu proprio perfil" ON public.root_admins FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins podem ver seus próprios dados" ON public.root_admins FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Somente o dono pode gerenciar operadores" ON public.root_admins FOR ALL USING (is_root_owner()) WITH CHECK (is_root_owner());
CREATE POLICY "Root admins podem ver configs" ON public.system_settings FOR SELECT USING (is_operator_active());
CREATE POLICY "Somente root owner pode editar configs" ON public.system_settings FOR UPDATE USING (is_root_owner()) WITH CHECK (is_root_owner());
CREATE POLICY "Qualquer pessoa pode enviar mensagens" ON public.contatos FOR INSERT WITH CHECK (true);
CREATE POLICY "Acesso Disciplinas" ON public.disciplinas FOR ALL USING (escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid()));
CREATE POLICY "Isolamento de Disciplinas" ON public.disciplinas FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Acesso Turma Professores" ON public.turma_professores FOR ALL USING (turma_id IN (SELECT turmas.id FROM turmas WHERE turmas.escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid())));
CREATE POLICY "Isolamento de Turma Professores" ON public.turma_professores FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Acesso Notas" ON public.notas FOR ALL USING (escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid()));
CREATE POLICY "Isolamento de Notas" ON public.notas FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Isolamento de Períodos Letivos" ON public.periodos_letivos FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Root admins podem gerenciar leads" ON public.crm_leads_escolas FOR ALL USING (is_operator_active()) WITH CHECK (is_operator_active());
CREATE POLICY "Admins podem ver logs da sua escola" ON public.audit_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM membros_escola me WHERE me.escola_id = audit_logs.escola_id AND me.user_id = auth.uid() AND me.papel = 'Admin'::perfil_papel));
CREATE POLICY "Usuários podem criar logs de auditoria" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Acesso Matrizes" ON public.matrizes_curriculares FOR ALL USING (turma_id IN (SELECT turmas.id FROM turmas WHERE turmas.escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid())));
CREATE POLICY "Acesso Turma Alunos" ON public.turma_alunos FOR ALL USING (turma_id IN (SELECT turmas.id FROM turmas WHERE turmas.escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid())));
CREATE POLICY "Acesso Faturas Escola" ON public.faturas FOR ALL USING (escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid()));
CREATE POLICY "Usuários veem membros das suas escolas" ON public.membros_escola FOR SELECT USING (user_in_escola(escola_id));
CREATE POLICY "Isolamento de Matrículas" ON public.matriculas FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Root ou Admin pode atualizar escolas" ON public.escolas FOR UPDATE
  USING (is_operator_active() OR (EXISTS (SELECT 1 FROM membros_escola WHERE membros_escola.escola_id = escolas.id AND membros_escola.user_id = auth.uid() AND membros_escola.papel = 'Admin'::perfil_papel)))
  WITH CHECK (is_operator_active() OR (EXISTS (SELECT 1 FROM membros_escola WHERE membros_escola.escola_id = escolas.id AND membros_escola.user_id = auth.uid() AND membros_escola.papel = 'Admin'::perfil_papel)));
CREATE POLICY "Visualizar próprias escolas" ON public.escolas FOR SELECT USING (EXISTS (SELECT 1 FROM membros_escola WHERE membros_escola.escola_id = escolas.id AND membros_escola.user_id = auth.uid()));
CREATE POLICY "Visualizar perfis da mesma escola" ON public.perfis FOR SELECT USING ((auth.uid() = id) OR (EXISTS (SELECT 1 FROM membros_escola m1 JOIN membros_escola m2 ON m1.escola_id = m2.escola_id WHERE m1.user_id = auth.uid() AND m2.user_id = perfis.id)));
CREATE POLICY "Acesso Turmas" ON public.turmas FOR ALL USING (escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid()));
CREATE POLICY "Isolamento de Turmas" ON public.turmas FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Acesso Frequencia" ON public.frequencia FOR ALL USING (escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid()));
CREATE POLICY "Isolamento de Frequência" ON public.frequencia FOR ALL USING (user_in_escola(escola_id));
CREATE POLICY "Acesso Financeiro Verbas" ON public.financeiro_verbas FOR ALL USING (escola_id IN (SELECT membros_escola.escola_id FROM membros_escola WHERE membros_escola.user_id = auth.uid()));
CREATE POLICY "Isolamento Financeiro" ON public.financeiro_verbas FOR ALL USING (user_in_escola(escola_id) AND (EXISTS (SELECT 1 FROM membros_escola WHERE membros_escola.escola_id = financeiro_verbas.escola_id AND membros_escola.user_id = auth.uid() AND membros_escola.papel = ANY (ARRAY['Admin'::perfil_papel, 'Diretor'::perfil_papel, 'Secretaria'::perfil_papel]))));
