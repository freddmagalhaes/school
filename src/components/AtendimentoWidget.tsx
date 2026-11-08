import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LifeBuoy, X, Send, Plus, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  COLUNAS, STATUS_NOME, TEXTO_MAX, naoLidaCliente, carregarMensagens, enviarMensagem, hora,
  type Atendimento, type Mensagem,
} from '../lib/atendimento';

const PAPEIS_CLIENTE = ['Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor'];
const campo = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500';

/** Botão "Ajuda" fixo no canto: abre o chat com o suporte sem sair do sistema. */
export const AtendimentoWidget: React.FC = () => {
  const { user, escolaAtiva, isSystemRoot } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState<Atendimento[]>([]);
  const [tela, setTela] = useState<'lista' | 'nova' | 'conversa'>('lista');
  const [atual, setAtual] = useState<Atendimento | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [nova, setNova] = useState({ assunto: '', texto: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  const permitido = !!user && !!escolaAtiva && !isSystemRoot && PAPEIS_CLIENTE.includes(escolaAtiva.papel);
  const escolaId = escolaAtiva?.escola_id;

  const carregarLista = useCallback(async () => {
    if (!user || !escolaId) return;
    const { data } = await supabase.from('atendimentos').select(COLUNAS)
      .eq('aberto_por', user.id).eq('escola_id', escolaId).order('atualizado_em', { ascending: false }).limit(30);
    setLista((data || []) as Atendimento[]);
  }, [user, escolaId]);

  const abrirConversa = useCallback(async (a: Atendimento) => {
    setAtual(a); setTela('conversa'); setErro('');
    setMensagens(await carregarMensagens(a.id));
    if (naoLidaCliente(a)) { await supabase.from('atendimentos').update({ lido_cliente_em: new Date().toISOString() }).eq('id', a.id); carregarLista(); }
  }, [carregarLista]);

  // Busca periódica: a cada 30 s para o aviso de não lida; a cada 6 s com o chat aberto
  useEffect(() => {
    if (!permitido) return;
    carregarLista();
    const t = setInterval(() => {
      carregarLista();
      if (aberto && tela === 'conversa' && atual) carregarMensagens(atual.id).then(setMensagens);
    }, aberto ? 6000 : 30000);
    return () => clearInterval(t);
  }, [permitido, aberto, tela, atual, carregarLista]);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens.length, tela]);

  if (!permitido) return null;
  const naoLidas = lista.filter(naoLidaCliente).length;
  const conversaAtual = atual ? lista.find(l => l.id === atual.id) || atual : null;

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (nova.assunto.trim().length < 3) { setErro('Escreva um assunto com ao menos 3 letras.'); return; }
    if (!nova.texto.trim()) { setErro('Descreva a sua dúvida.'); return; }
    setEnviando(true);
    const { data, error } = await supabase.from('atendimentos')
      .insert({ escola_id: escolaId, aberto_por: user!.id, assunto: nova.assunto.trim() }).select(COLUNAS).single();
    if (error || !data) { setEnviando(false); setErro('Não foi possível abrir a conversa. Tente novamente.'); return; }
    const m = await enviarMensagem(data.id, user!.id, nova.texto);
    setEnviando(false);
    if (m.error) { setErro('A conversa foi aberta, mas a mensagem não foi enviada. Escreva de novo dentro dela.'); }
    setNova({ assunto: '', texto: '' });
    await carregarLista();
    abrirConversa(data as Atendimento);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atual || !texto.trim()) return;
    setErro(''); setEnviando(true);
    const r = await enviarMensagem(atual.id, user!.id, texto);
    setEnviando(false);
    if (r.error) { setErro('Não foi possível enviar. Tente novamente.'); return; }
    setTexto('');
    setMensagens(await carregarMensagens(atual.id));
    carregarLista();
  };

  const encerrar = async () => {
    if (!atual || !confirm('Encerrar esta conversa? Se precisar, é só escrever de novo para reabrir.')) return;
    const { error } = await supabase.from('atendimentos').update({ status: 'resolvido' }).eq('id', atual.id);
    if (error) setErro('Não foi possível encerrar.');
    carregarLista();
  };

  return (
    <>
      <button type="button" onClick={() => setAberto(v => !v)} aria-label="Ajuda e suporte"
        className="fixed bottom-5 right-5 z-40 h-14 px-5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl flex items-center gap-2 font-bold">
        {aberto ? <X size={20} /> : <LifeBuoy size={20} />} {aberto ? 'Fechar' : 'Ajuda'}
        {!aberto && naoLidas > 0 && <span className="ml-1 bg-rose-500 text-white text-xs rounded-full px-2 py-0.5">{naoLidas}</span>}
      </button>

      {aberto && (
        <div className="fixed bottom-24 right-5 z-40 w-[380px] max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[calc(100vh-8rem)] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-indigo-600 text-white flex items-center gap-2">
            {tela !== 'lista' && <button type="button" onClick={() => { setTela('lista'); setErro(''); carregarLista(); }} aria-label="Voltar"><ArrowLeft size={18} /></button>}
            <div className="min-w-0">
              <p className="font-bold leading-tight truncate">{tela === 'conversa' && conversaAtual ? conversaAtual.assunto : 'Ajuda e suporte'}</p>
              <p className="text-xs text-indigo-100">{tela === 'conversa' && conversaAtual
                ? `${STATUS_NOME[conversaAtual.status]}${conversaAtual.atendente_nome ? ` · ${conversaAtual.atendente_nome}` : ''}`
                : 'Fale com a nossa equipe sem sair do sistema'}</p>
            </div>
          </div>

          {erro && <p className="px-4 py-2 text-xs bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300">{erro}</p>}

          {tela === 'lista' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <button type="button" onClick={() => { setTela('nova'); setErro(''); }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg">
                <Plus size={16} /> Nova conversa
              </button>
              {lista.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Você ainda não abriu nenhuma conversa. Dúvidas, problemas ou sugestões: é só escrever.</p>}
              {lista.map(a => (
                <button key={a.id} type="button" onClick={() => abrirConversa(a)}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{a.assunto}</span>
                    {naoLidaCliente(a) && <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-rose-500" title="Resposta nova" />}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{STATUS_NOME[a.status]} · {hora(a.atualizado_em)}</div>
                </button>
              ))}
            </div>
          )}

          {tela === 'nova' && (
            <form onSubmit={criar} className="flex-1 overflow-y-auto p-4 space-y-3">
              <label className="block text-xs text-gray-500 dark:text-gray-400 space-y-1">Assunto
                <input value={nova.assunto} maxLength={120} onChange={e => setNova({ ...nova, assunto: e.target.value })} placeholder="Ex.: Não consigo lançar notas" className={campo} />
              </label>
              <label className="block text-xs text-gray-500 dark:text-gray-400 space-y-1">Descreva a sua dúvida
                <textarea value={nova.texto} maxLength={TEXTO_MAX} rows={7} onChange={e => setNova({ ...nova, texto: e.target.value })} className={campo} />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Não envie senhas. Nossa equipe vê o nome da escola e o seu nome.</p>
              <button type="submit" disabled={enviando} className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg">
                {enviando ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          )}

          {tela === 'conversa' && conversaAtual && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-slate-900">
                {mensagens.map(m => (
                  <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.autor_tipo === 'cliente'
                    ? 'ml-auto bg-indigo-600 text-white' : 'mr-auto bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-600'}`}>
                    {m.autor_tipo === 'suporte' && <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300">{m.autor_nome} · Suporte</p>}
                    <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                    <p className={`text-[10px] mt-1 ${m.autor_tipo === 'cliente' ? 'text-indigo-100' : 'text-gray-400'}`}>{hora(m.created_at)}</p>
                  </div>
                ))}
                <div ref={fim} />
              </div>
              {conversaAtual.status === 'resolvido' ? (
                <p className="px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Conversa encerrada. Escreva abaixo para reabrir.
                </p>
              ) : null}
              <form onSubmit={enviar} className="p-3 border-t border-gray-200 dark:border-slate-700 flex gap-2 items-end">
                <textarea value={texto} maxLength={TEXTO_MAX} rows={2} onChange={e => setTexto(e.target.value)} placeholder="Escreva sua mensagem"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }}
                  className={`${campo} resize-none`} />
                <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar" className="h-10 w-10 shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center"><Send size={16} /></button>
              </form>
              {conversaAtual.status !== 'resolvido' && (
                <button type="button" onClick={encerrar} className="text-xs text-gray-500 dark:text-gray-400 hover:text-emerald-600 py-2 border-t border-gray-100 dark:border-slate-700">Encerrar esta conversa</button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};
