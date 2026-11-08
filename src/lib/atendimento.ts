import { supabase } from './supabase';

export interface Atendimento {
  id: string;
  escola_id: string;
  aberto_por: string;
  autor_nome: string;
  assunto: string;
  status: 'aberto' | 'em_atendimento' | 'resolvido';
  nivel_atual: number;
  atendente_nome: string | null;
  ultimo_autor: 'cliente' | 'suporte' | null;
  atualizado_em: string;
  lido_cliente_em: string | null;
  lido_suporte_em: string | null;
}
export interface Mensagem {
  id: string;
  autor_tipo: 'cliente' | 'suporte';
  autor_nome: string;
  texto: string;
  created_at: string;
}

export const COLUNAS = 'id, escola_id, aberto_por, autor_nome, assunto, status, nivel_atual, atendente_nome, ultimo_autor, atualizado_em, lido_cliente_em, lido_suporte_em';
export const STATUS_NOME: Record<Atendimento['status'], string> = { aberto: 'Aberto', em_atendimento: 'Em atendimento', resolvido: 'Resolvido' };
export const TEXTO_MAX = 2000;

/** O suporte respondeu e o cliente ainda não leu. */
export const naoLidaCliente = (a: Atendimento) =>
  a.ultimo_autor === 'suporte' && (!a.lido_cliente_em || new Date(a.lido_cliente_em) < new Date(a.atualizado_em));
/** O cliente escreveu e o suporte ainda não leu. */
export const naoLidaSuporte = (a: Atendimento) =>
  a.status !== 'resolvido' && a.ultimo_autor === 'cliente' && (!a.lido_suporte_em || new Date(a.lido_suporte_em) < new Date(a.atualizado_em));

export const carregarMensagens = async (id: string): Promise<Mensagem[]> => {
  const { data } = await supabase.from('atendimento_mensagens')
    .select('id, autor_tipo, autor_nome, texto, created_at').eq('atendimento_id', id).order('created_at', { ascending: true });
  return (data || []) as Mensagem[];
};

export const enviarMensagem = async (atendimentoId: string, autorId: string, texto: string) => {
  const t = texto.trim();
  if (!t || t.length > TEXTO_MAX) return { error: { message: `A mensagem deve ter de 1 a ${TEXTO_MAX} caracteres.` } };
  return supabase.from('atendimento_mensagens').insert({ atendimento_id: atendimentoId, autor_id: autorId, texto: t });
};

export const hora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
