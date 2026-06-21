-- Fase 2: Módulo Financeiro
-- Criação de tabelas para contas a pagar/receber e mensalidades dos alunos

-- 1. Movimentações Gerais (Já existe parcialmente no código como financeiro_verbas, mas vamos recriar de forma robusta se não existir)
CREATE TABLE IF NOT EXISTS public.financeiro_verbas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    categoria text NOT NULL,
    valor numeric(10,2) NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('Entrada', 'Saida')),
    status_aprovacao text DEFAULT 'Pendente' CHECK (status_aprovacao IN ('Pendente', 'Aprovado', 'Rejeitado')),
    data_registro date NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Faturas / Mensalidades (Cobrança recorrente vinculada aos alunos)
CREATE TABLE IF NOT EXISTS public.faturas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
    aluno_id uuid NOT NULL REFERENCES public.membros_escola(id) ON DELETE CASCADE,
    turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
    valor numeric(10,2) NOT NULL,
    data_vencimento date NOT NULL,
    data_pagamento date,
    status text DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago', 'Atrasado', 'Cancelado')),
    mes_referencia text NOT NULL, -- Ex: "Maio/2026"
    link_pagamento text,
    linha_digitavel text,
    created_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ==========================================

ALTER TABLE public.financeiro_verbas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

-- Verbas: Somente usuários da escola podem acessar
CREATE POLICY "Acesso Financeiro Verbas" ON public.financeiro_verbas FOR ALL
USING (escola_id IN (SELECT escola_id FROM public.membros_escola WHERE user_id = auth.uid()));

-- Faturas: Membros operacionais/diretoria podem acessar as da escola.
-- Futuramente o Portal do Aluno usará RLS específico para o aluno ver a própria fatura (aluno_id = auth.uid())
CREATE POLICY "Acesso Faturas Escola" ON public.faturas FOR ALL
USING (escola_id IN (SELECT escola_id FROM public.membros_escola WHERE user_id = auth.uid()));
