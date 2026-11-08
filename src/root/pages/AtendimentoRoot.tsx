import { useCallback, useEffect, useRef, useState } from 'react';
import { MessagesSquare, Send, CheckCircle2, RotateCcw, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useRootAuth } from '../../contexts/RootAuthContext';
import {
  COLUNAS, STATUS_NOME, TEXTO_MAX, naoLidaSuporte, carregarMensagens, enviarMensagem, hora,
  type Atendimento, type Mensagem,
} from '../../lib/atendimento';

const caixa = 'bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl';
const COR_STATUS: Record<Atendimento['status'], string> = {
  aberto: 'bg-rose-400/10 text-rose-400 border-rose-400/30',
  em_atendimento: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  resolvido: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30',
};

/** Caixa de entrada do suporte: todas as conversas dos clientes, com resposta, escalonamento N1 → N2 → N3 e encerramento. */
export const AtendimentoRoot = () => {
  const { user } = useRootAuth();
  const [lista, setLista] = useState<Atendimento[]>([]);
  const [escolas, setEscolas] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<'fila' | 'resolvidas'>('fila');
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('atendimentos').select(COLUNAS).order('atualizado_em', { ascending: false }).limit(200);
    setLista((data || []) as Atendimento[]);
  }, []);

  useEffect(() => {
    supabase.rpc('suporte_escolas').then(({ data }) => setEscolas(Object.fromEntries(((data || []) as any[]).map(e => [e.id, e.nome]))));
    carregar();
    const t = setInterval(carregar, 8000);
    return () => clearInterval(t);
  }, [carregar]);

  const atual = lista.find(l => l.id === selecionada) || null;

  useEffect(() => {
    if (!selecionada) return;
    let vivo = true;
    const buscar = () => carregarMensagens(selecionada).then(m => { if (vivo) setMensagens(m); });
    buscar();
    const t = setInterval(buscar, 6000);
    return () => { vivo = false; clearInterval(t); };
  }, [selecionada]);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens.length, selecionada]);

  const abrir = async (a: Atendimento) => {
    setSelecionada(a.id); setErro(''); setTexto('');
    if (naoLidaSuporte(a)) { await supabase.from('atendimentos').update({ lido_suporte_em: new Date().toISOString() }).eq('id', a.id); carregar(); }
  };

  const atualizar = async (campos: Record<string, unknown>) => {
    if (!atual) return;
    setErro('');
    const { error } = await supabase.from('atendimentos').update(campos).eq('id', atual.id);
    if (error) setErro('Não foi possível atualizar a conversa.');
    carregar();
  };

  const responder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atual || !user || !texto.trim()) return;
    setErro(''); setEnviando(true);
    const r = await enviarMensagem(atual.id, user.id, texto);
    setEnviando(false);
    if (r.error) { setErro('Não foi possível enviar.'); return; }
    setTexto('');
    setMensagens(await carregarMensagens(atual.id));
    carregar();
  };

  const visiveis = lista.filter(a => (filtro === 'fila' ? a.status !== 'resolvido' : a.status === 'resolvido'));
  const pendentes = lista.filter(naoLidaSuporte).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <MessagesSquare className="text-amber-400" />
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Atendimento</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Conversas dos clientes. {pendentes > 0 ? <strong className="text-rose-400">{pendentes} aguardando resposta.</strong> : 'Nenhuma aguardando resposta.'}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
        <div className={`${caixa} overflow-hidden`}>
          <div className="flex border-b border-gray-100 dark:border-[#1e2d4a] text-sm">
            {(['fila', 'resolvidas'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)} className={`flex-1 py-2.5 font-semibold ${filtro === f ? 'text-amber-500 border-b-2 border-amber-400' : 'text-gray-500'}`}>
                {f === 'fila' ? 'Em aberto' : 'Resolvidas'}
              </button>
            ))}
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-gray-100 dark:divide-[#1e2d4a]">
            {visiveis.length === 0 && <p className="p-6 text-sm text-gray-500 text-center">Nenhuma conversa aqui.</p>}
            {visiveis.map(a => (
              <button key={a.id} onClick={() => abrir(a)} className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 ${selecionada === a.id ? 'bg-amber-400/5' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{a.assunto}</span>
                  {naoLidaSuporte(a) && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" title="Aguardando resposta" />}
                </div>
                <div className="text-xs text-gray-500 truncate">{escolas[a.escola_id] || 'Escola'} · {a.autor_nome}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${COR_STATUS[a.status]}`}>{STATUS_NOME[a.status]}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-300 dark:border-[#1e2d4a] text-gray-500">N{a.nivel_atual}</span>
                  <span className="text-[10px] text-gray-500 ml-auto">{hora(a.atualizado_em)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={`${caixa} flex flex-col min-h-[420px]`}>
          {!atual ? (
            <p className="m-auto text-sm text-gray-500 p-10">Escolha uma conversa à esquerda.</p>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100 dark:border-[#1e2d4a] flex flex-wrap items-center gap-3">
                <div className="min-w-0 mr-auto">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{atual.assunto}</p>
                  <p className="text-xs text-gray-500">{escolas[atual.escola_id] || 'Escola'} · {atual.autor_nome} · {atual.atendente_nome ? `atendido por ${atual.atendente_nome}` : 'sem atendente'}</p>
                </div>
                <label className="text-xs text-gray-500 flex items-center gap-1">Nível
                  <select value={atual.nivel_atual} onChange={e => atualizar({ nivel_atual: Number(e.target.value) })}
                    className="bg-white dark:bg-[#141c2e] border border-gray-200 dark:border-[#1e2d4a] rounded-lg px-2 py-1 text-gray-800 dark:text-gray-200">
                    <option value={1}>N1</option><option value={2}>N2</option><option value={3}>N3</option>
                  </select>
                </label>
                <Link to="/ops/suporte" className="text-xs text-amber-500 hover:underline inline-flex items-center gap-1">Dados da escola <ArrowUpRight size={12} /></Link>
                {atual.status === 'resolvido'
                  ? <button onClick={() => atualizar({ status: 'em_atendimento' })} className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-[#1e2d4a] text-gray-700 dark:text-gray-200"><RotateCcw size={13} /> Reabrir</button>
                  : <button onClick={() => atualizar({ status: 'resolvido' })} className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold"><CheckCircle2 size={13} /> Resolver</button>}
              </div>
              {erro && <p className="px-4 py-2 text-xs text-rose-400">{erro}</p>}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[440px]">
                {mensagens.map(m => (
                  <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.autor_tipo === 'suporte'
                    ? 'ml-auto bg-amber-500 text-white' : 'mr-auto bg-gray-100 dark:bg-[#141c2e] text-gray-900 dark:text-gray-100'}`}>
                    <p className="text-[11px] font-bold opacity-80">{m.autor_nome}{m.autor_tipo === 'suporte' ? ' · Suporte' : ''}</p>
                    <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                    <p className="text-[10px] opacity-70 mt-1">{hora(m.created_at)}</p>
                  </div>
                ))}
                <div ref={fim} />
              </div>
              <form onSubmit={responder} className="p-3 border-t border-gray-100 dark:border-[#1e2d4a] flex gap-2 items-end">
                <textarea value={texto} maxLength={TEXTO_MAX} rows={2} onChange={e => setTexto(e.target.value)} placeholder="Responder ao cliente"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }}
                  className="flex-1 px-3 py-2 bg-white dark:bg-[#141c2e] border border-gray-200 dark:border-[#1e2d4a] rounded-xl text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:border-amber-400/40" />
                <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar" className="h-10 w-10 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white flex items-center justify-center"><Send size={16} /></button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
