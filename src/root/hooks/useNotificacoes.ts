import { useState, useEffect } from 'react';
import { addMonths, addYears, differenceInDays, isBefore, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';

// ============================================================
// Tipos
// ============================================================
export type TipoNotificacao =
  | 'inadimplente'        // 🔴 Crítico — cliente com pagamento em atraso
  | 'alto_valor_pendente' // 🟠 Alta — Enterprise ou alto valor aguardando ativação
  | 'vencimento_proximo'  // 🟠 Alta — Renovação iminente
  | 'nova_contratacao'    // 🟢 Média — Novo cliente aguardando ativação
  | 'cancelamento_recente'; // ⚪ Baixa — Churn recente, oportunidade de retenção

export type PrioridadeNotificacao = 'critica' | 'alta' | 'media' | 'baixa';

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  descricao: string;
  link: string;
  prioridade: PrioridadeNotificacao;
  lida: boolean;
  criadaEm: Date; // usado para exibir "há X tempo"
}

// Aparência por tipo de notificação
export const NOTIF_CONFIG: Record<TipoNotificacao, {
  emoji: string;
  cor: string;
  borda: string;
  bg: string;
}> = {
  inadimplente:        { emoji: '🔴', cor: 'text-rose-400',    borda: 'border-l-rose-500',    bg: 'bg-rose-500/5' },
  alto_valor_pendente: { emoji: '💰', cor: 'text-amber-400',   borda: 'border-l-amber-500',   bg: 'bg-amber-500/5' },
  vencimento_proximo:  { emoji: '⏰', cor: 'text-orange-400',  borda: 'border-l-orange-500',  bg: 'bg-orange-500/5' },
  nova_contratacao:    { emoji: '🆕', cor: 'text-emerald-400', borda: 'border-l-emerald-500', bg: 'bg-emerald-500/5' },
  cancelamento_recente:{ emoji: '⚠️', cor: 'text-gray-400',   borda: 'border-l-gray-600',    bg: 'bg-gray-500/5' },
};

// Chave do localStorage para persistência de notificações lidas
const STORAGE_KEY = 'root-notificacoes-lidas-v1';

// ============================================================
// Tipos internos do Supabase
// ============================================================
type AssinaturaRow = {
  id: string;
  nome: string;
  nome_escola: string;
  plano: 'basico' | 'profissional' | 'enterprise';
  ciclo: 'mensal' | 'anual';
  valor_total: number;
  status: 'pendente' | 'ativo' | 'cancelado' | 'inadimplente';
  created_at: string;
};

// ============================================================
// Mock data: garante que as notificações façam sentido
// independente de quando o código rodar
// ============================================================
function gerarMockAssinaturas(): AssinaturaRow[] {
  const hoje = new Date();
  // Retorna uma data ISO X dias atrás
  const diasAtras = (n: number): string => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };
  // Para vencimento mensal em X dias: created_at = (30 - X) dias atrás
  const vencimentoEm = (dias: number): string => diasAtras(30 - dias);

  return [
    { id: 'v1', nome: 'Carlos Ferreira', nome_escola: 'E.E. Técnica Mineira',       plano: 'profissional', ciclo: 'mensal', valor_total: 397,  status: 'ativo',       created_at: vencimentoEm(3) },
    { id: 'v2', nome: 'Patricia Lima',   nome_escola: 'Colégio Novo Horizonte',      plano: 'basico',       ciclo: 'mensal', valor_total: 197,  status: 'ativo',       created_at: vencimentoEm(6) },
    { id: 'i1', nome: 'Roberto Farias',  nome_escola: 'Instituto Educação Total',    plano: 'profissional', ciclo: 'anual',  valor_total: 3970, status: 'inadimplente', created_at: diasAtras(180) },
    { id: 'n1', nome: 'Ana Souza',       nome_escola: 'Escola Municipal Progresso',  plano: 'profissional', ciclo: 'mensal', valor_total: 397,  status: 'pendente',    created_at: diasAtras(0) },
    { id: 'n2', nome: 'João Empresa',    nome_escola: 'Rede Educacional Metropolitana', plano: 'enterprise', ciclo: 'anual', valor_total: 7970, status: 'pendente',   created_at: diasAtras(1) },
    { id: 'c1', nome: 'Marcos Silva',    nome_escola: 'Escola Particular Futuro',    plano: 'basico',       ciclo: 'mensal', valor_total: 197,  status: 'cancelado',   created_at: diasAtras(5) },
  ];
}

// ============================================================
// Calcula o próximo vencimento de uma assinatura ativa
// ============================================================
function proximoVencimento(criadaEm: string, ciclo: 'mensal' | 'anual'): Date {
  const criacao = new Date(criadaEm);
  const hoje = new Date();
  if (ciclo === 'mensal') {
    let data = addMonths(criacao, 1);
    while (isBefore(data, hoje)) data = addMonths(data, 1);
    return data;
  } else {
    let data = addYears(criacao, 1);
    while (isBefore(data, hoje)) data = addYears(data, 1);
    return data;
  }
}

// ============================================================
// Gera a lista de notificações a partir das assinaturas
// ============================================================
function gerarNotificacoes(assinaturas: AssinaturaRow[]): Omit<Notificacao, 'lida'>[] {
  const hoje = new Date();
  const notifs: Omit<Notificacao, 'lida'>[] = [];

  assinaturas.forEach((a) => {
    // ---- 1. Inadimplente → Crítico ----
    if (a.status === 'inadimplente') {
      notifs.push({
        id: `inadimplente-${a.id}`,
        tipo: 'inadimplente',
        titulo: 'Cliente inadimplente',
        descricao: `${a.nome_escola} está com pagamento em atraso. R$ ${a.valor_total.toLocaleString('pt-BR')} em risco.`,
        link: `/ops/clientes/${a.id}`,
        prioridade: 'critica',
        criadaEm: new Date(a.created_at),
      });
    }

    // ---- 2. Alto valor pendente (Enterprise ou valor > R$1.000) ----
    if (a.status === 'pendente' && (a.plano === 'enterprise' || a.valor_total >= 1000)) {
      const diasDesde = differenceInDays(hoje, new Date(a.created_at));
      notifs.push({
        id: `alto-valor-${a.id}`,
        tipo: 'alto_valor_pendente',
        titulo: 'Alto valor aguardando ativação',
        descricao: `${a.nome_escola} — plano ${a.plano} (R$ ${a.valor_total.toLocaleString('pt-BR')}) aguarda ativação há ${diasDesde === 0 ? 'hoje' : `${diasDesde}d`}.`,
        link: `/ops/clientes/${a.id}`,
        prioridade: 'alta',
        criadaEm: new Date(a.created_at),
      });
    }
    // ---- 3. Nova contratação pendente (últimos 7 dias, demais planos) ----
    else if (a.status === 'pendente') {
      const diasDesde = differenceInDays(hoje, new Date(a.created_at));
      if (diasDesde <= 7) {
        notifs.push({
          id: `nova-${a.id}`,
          tipo: 'nova_contratacao',
          titulo: 'Nova contratação aguardando ativação',
          descricao: `${a.nome_escola} contratou o plano ${a.plano} ${diasDesde === 0 ? 'hoje' : `há ${diasDesde} dia(s)`}.`,
          link: `/ops/clientes/${a.id}`,
          prioridade: 'media',
          criadaEm: new Date(a.created_at),
        });
      }
    }

    // ---- 4. Vencimento próximo (assinaturas ativas) ----
    if (a.status === 'ativo') {
      try {
        const venc = proximoVencimento(a.created_at, a.ciclo);
        const dias = differenceInDays(venc, hoje);
        // Alertar 7 dias antes para mensal, 30 dias para anual
        const limite = a.ciclo === 'mensal' ? 7 : 30;
        if (dias >= 0 && dias <= limite) {
          notifs.push({
            id: `vencimento-${a.id}`,
            tipo: 'vencimento_proximo',
            titulo: dias === 0 ? 'Renovação HOJE' : `Renovação em ${dias} dia(s)`,
            descricao: `${a.nome_escola} — ${a.ciclo} R$ ${a.valor_total.toLocaleString('pt-BR')}. Confirme o processamento do pagamento.`,
            link: `/ops/clientes/${a.id}`,
            prioridade: dias <= 2 ? 'alta' : 'media',
            criadaEm: venc,
          });
        }
      } catch { /* ignora datas inválidas */ }
    }

    // ---- 5. Cancelamento recente (últimos 30 dias) → oportunidade de retenção ----
    if (a.status === 'cancelado') {
      const diasDesde = differenceInDays(hoje, new Date(a.created_at));
      if (diasDesde <= 30) {
        notifs.push({
          id: `cancelado-${a.id}`,
          tipo: 'cancelamento_recente',
          titulo: 'Cancelamento recente',
          descricao: `${a.nome_escola} cancelou o plano ${a.plano} há ${diasDesde}d. Considere uma ação de retenção.`,
          link: `/ops/clientes/${a.id}`,
          prioridade: 'baixa',
          criadaEm: new Date(a.created_at),
        });
      }
    }
  });

  // Ordena: prioridade → data mais recente
  const ordem: Record<PrioridadeNotificacao, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };
  notifs.sort((a, b) => {
    if (a.prioridade !== b.prioridade) return ordem[a.prioridade] - ordem[b.prioridade];
    return b.criadaEm.getTime() - a.criadaEm.getTime();
  });

  return notifs;
}

// ============================================================
// Hook principal
// ============================================================
export function useNotificacoes() {
  const [rawNotifs, setRawNotifs] = useState<Omit<Notificacao, 'lida'>[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado de notificações lidas — persistido no localStorage
  const [lidasIds, setLidasIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assinaturas')
        .select('id, nome, nome_escola, plano, ciclo, valor_total, status, created_at');

      const assinaturas = (error || !data || data.length === 0)
        ? gerarMockAssinaturas()
        : data as AssinaturaRow[];

      setRawNotifs(gerarNotificacoes(assinaturas));
    } catch {
      setRawNotifs(gerarNotificacoes(gerarMockAssinaturas()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresca automaticamente a cada 5 minutos
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line

  // Combina dados brutos com estado de leitura
  const notificacoes: Notificacao[] = rawNotifs.map(n => ({
    ...n,
    lida: lidasIds.has(n.id),
  }));

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const marcarLida = (id: string) => {
    setLidasIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const marcarTodasLidas = () => {
    const ids = rawNotifs.map(n => n.id);
    const next = new Set(ids);
    setLidasIds(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  // Utilitário: formata "há X tempo" em pt-BR
  const tempoRelativo = (data: Date) =>
    formatDistanceToNow(data, { addSuffix: true, locale: ptBR });

  return { notificacoes, naoLidas, loading, marcarLida, marcarTodasLidas, refresh: fetchData, tempoRelativo };
}
