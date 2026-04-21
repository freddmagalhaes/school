import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, RefreshCw, X, Inbox } from 'lucide-react';
import { useNotificacoes, NOTIF_CONFIG } from '../hooks/useNotificacoes';
import type { Notificacao } from '../hooks/useNotificacoes';

// ============================================================
// NotificacaoPainel
// Componente auto-contido: inclui o botão da campainha,
// badge de não lidas e o dropdown com todas as notificações.
// ============================================================
export const NotificacaoPainel = () => {
  const { notificacoes, naoLidas, loading, marcarLida, marcarTodasLidas, refresh, tempoRelativo } = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState<'todas' | 'nao_lidas'>('todas');
  const panelRef = useRef<HTMLDivElement>(null);

  // Fecha o painel ao clicar fora
  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    if (aberto) document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [aberto]);

  const notifsFiltradas = filtro === 'nao_lidas'
    ? notificacoes.filter(n => !n.lida)
    : notificacoes;

  const handleClicarNotif = (n: Notificacao) => {
    marcarLida(n.id);
    setAberto(false);
  };

  return (
    <div className="relative" ref={panelRef}>

      {/* ===== Botão campainha ===== */}
      <button
        id="btn-notificacoes"
        onClick={() => setAberto(!aberto)}
        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all relative ${
          aberto ? 'bg-amber-400/15 text-amber-400' : 'hover:bg-white/5 text-gray-400 hover:text-white'
        }`}
        title="Notificações"
      >
        <Bell size={16} className={naoLidas > 0 && !aberto ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''} />

        {/* Badge de não lidas */}
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center px-1 shadow-lg shadow-rose-500/40 border border-[#0e1425]">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {/* ===== Painel dropdown ===== */}
      {aberto && (
        <div className="absolute right-0 top-12 w-[400px] bg-[#0e1425] border border-[#1e2d4a] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-[fadeSlideIn_0.15s_ease-out]">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#1e2d4a]">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-amber-400" />
              <h3 className="font-bold text-white text-sm">Notificações</h3>
              {naoLidas > 0 && (
                <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-full">
                  {naoLidas} nova{naoLidas > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Recarregar */}
              <button
                onClick={refresh}
                title="Recarregar"
                className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
              {/* Marcar todas como lidas */}
              {naoLidas > 0 && (
                <button
                  onClick={marcarTodasLidas}
                  title="Marcar todas como lidas"
                  className="p-1.5 text-gray-500 hover:text-emerald-400 rounded-lg hover:bg-emerald-400/10 transition-colors"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              {/* Fechar */}
              <button
                onClick={() => setAberto(false)}
                className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Tabs de filtro */}
          <div className="flex gap-1 px-4 py-2.5 border-b border-[#1e2d4a]">
            {[
              { key: 'todas', label: 'Todas', count: notificacoes.length },
              { key: 'nao_lidas', label: 'Não lidas', count: naoLidas },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFiltro(key as typeof filtro)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtro === key
                    ? 'bg-amber-400/15 text-amber-400 border border-amber-400/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className="text-[10px] min-w-[16px] h-4 bg-white/10 rounded-full inline-flex items-center justify-center px-1">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Lista de notificações */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              // Skeleton loading
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-9 h-9 bg-[#1e2d4a] rounded-xl animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-[#1e2d4a] rounded animate-pulse w-3/4" />
                      <div className="h-2.5 bg-[#1e2d4a] rounded animate-pulse w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifsFiltradas.length === 0 ? (
              // Estado vazio
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 bg-[#141c2e] border border-[#1e2d4a] rounded-2xl flex items-center justify-center mb-3">
                  <Inbox size={24} className="text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm font-medium">
                  {filtro === 'nao_lidas' ? 'Tudo lido! 🎉' : 'Nenhuma notificação'}
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  {filtro === 'nao_lidas' ? 'Você está em dia.' : 'O sistema está monitorando seus clientes.'}
                </p>
              </div>
            ) : (
              // Lista
              <div className="divide-y divide-[#1e2d4a]/50">
                {notifsFiltradas.map((n) => {
                  const cfg = NOTIF_CONFIG[n.tipo];
                  return (
                    <Link
                      key={n.id}
                      to={n.link}
                      onClick={() => handleClicarNotif(n)}
                      className={`flex gap-3 px-4 py-3.5 border-l-2 transition-all hover:bg-white/3 ${cfg.borda} ${
                        !n.lida ? cfg.bg : 'opacity-60'
                      }`}
                    >
                      {/* Ícone / Emoji */}
                      <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-lg">
                        {cfg.emoji}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold leading-snug ${n.lida ? 'text-gray-400' : 'text-white'}`}>
                            {n.titulo}
                          </p>
                          {/* Ponto de não lida */}
                          {!n.lida && (
                            <div className="w-2.5 h-2.5 bg-amber-400 rounded-full flex-shrink-0 mt-1 shadow-sm shadow-amber-400/40" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                          {n.descricao}
                        </p>
                        <p className={`text-[10px] mt-1.5 font-medium ${cfg.cor}`}>
                          {tempoRelativo(n.criadaEm)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#1e2d4a] flex items-center justify-between">
            <p className="text-[10px] text-gray-600">
              Atualizado automaticamente a cada 5 min
            </p>
            <Link
              to="/ops/clientes"
              onClick={() => setAberto(false)}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              Ver clientes →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
