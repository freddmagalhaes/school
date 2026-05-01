import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Users, RefreshCw, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ============================================================
// Tipos
// ============================================================
type Assinatura = {
  id: string;
  nome: string;
  email: string;
  nome_escola: string;
  plano: 'basico' | 'profissional' | 'enterprise';
  ciclo: 'mensal' | 'anual';
  metodo_pgto: 'pix' | 'cartao' | 'boleto';
  valor_total: number;
  status: 'pendente' | 'ativo' | 'cancelado' | 'inadimplente';
  created_at: string;
};

// ============================================================
// Config de cores por status e plano
// ============================================================
const STATUS_CONFIG = {
  ativo:        { label: 'Ativo',        classes: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  pendente:     { label: 'Pendente',     classes: 'bg-rose-400/10    text-rose-400    border-rose-400/20' },
  cancelado:    { label: 'Cancelado',    classes: 'bg-gray-400/10    text-gray-400    border-gray-400/20' },
  inadimplente: { label: 'Inadimplente', classes: 'bg-orange-400/10  text-orange-400  border-orange-400/20' },
};

const PLANO_CONFIG = {
  basico:        { label: 'Básico',        classes: 'bg-blue-400/10    text-blue-400    border-blue-400/20' },
  profissional:  { label: 'Profissional',  classes: 'bg-indigo-400/10  text-indigo-400  border-indigo-400/20' },
  enterprise:    { label: 'Enterprise',    classes: 'bg-amber-400/10   text-amber-400   border-amber-400/20' },
};

// Mock data para quando Supabase não estiver conectado
const MOCK_CLIENTES: Assinatura[] = [
  { id: '1', nome: 'Cliente Exemplo 1', email: 'cliente1@exemplo.com', nome_escola: 'Escola Modelo A', plano: 'profissional', ciclo: 'mensal', metodo_pgto: 'pix', valor_total: 397, status: 'ativo', created_at: '2026-01-15' },
  { id: '2', nome: 'Cliente Exemplo 2', email: 'cliente2@exemplo.com', nome_escola: 'Colégio Padrão B', plano: 'basico', ciclo: 'anual', metodo_pgto: 'boleto', valor_total: 1970, status: 'ativo', created_at: '2026-02-03' },
  { id: '3', nome: 'Cliente Exemplo 3', email: 'cliente3@exemplo.com', nome_escola: 'Instituto Referência', plano: 'enterprise', ciclo: 'anual', metodo_pgto: 'cartao', valor_total: 7970, status: 'pendente', created_at: '2026-04-18' },
  { id: '4', nome: 'Cliente Exemplo 4', email: 'cliente4@exemplo.com', nome_escola: 'Escola Municipal de Teste', plano: 'profissional', ciclo: 'mensal', metodo_pgto: 'pix', valor_total: 397, status: 'pendente', created_at: '2026-04-19' },
  { id: '5', nome: 'Cliente Exemplo 5', email: 'cliente5@exemplo.com', nome_escola: 'Colégio Alpha', plano: 'basico', ciclo: 'mensal', metodo_pgto: 'boleto', valor_total: 197, status: 'cancelado', created_at: '2026-03-10' },
  { id: '6', nome: 'Cliente Exemplo 6', email: 'cliente6@exemplo.com', nome_escola: 'Centro de Ensino Ômega', plano: 'profissional', ciclo: 'anual', metodo_pgto: 'pix', valor_total: 3970, status: 'ativo', created_at: '2026-02-28' },
];

// ============================================================
// Página principal de gestão de clientes
// ============================================================
export const ClientesRoot = () => {
  const [clientes, setClientes] = useState<Assinatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroPlano, setFiltroPlano] = useState<string>('todos');

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assinaturas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        setClientes(MOCK_CLIENTES);
      } else {
        setClientes(data);
      }
    } catch {
      setClientes(MOCK_CLIENTES);
    } finally {
      setLoading(false);
    }
  };

  // Aplica filtros locais
  const clientesFiltrados = clientes.filter((c) => {
    const matchBusca = busca === '' ||
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.email.toLowerCase().includes(busca.toLowerCase()) ||
      c.nome_escola.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus;
    const matchPlano = filtroPlano === 'todos' || c.plano === filtroPlano;
    return matchBusca && matchStatus && matchPlano;
  });

  // Ativa um cliente diretamente na listagem
  const ativar = async (id: string) => {
    const { error } = await supabase
      .from('assinaturas')
      .update({ status: 'ativo' })
      .eq('id', id);
    if (!error) {
      setClientes(prev => prev.map(c => c.id === id ? { ...c, status: 'ativo' } : c));
    }
  };

  // Desativa um cliente
  const desativar = async (id: string) => {
    const { error } = await supabase
      .from('assinaturas')
      .update({ status: 'cancelado' })
      .eq('id', id);
    if (!error) {
      setClientes(prev => prev.map(c => c.id === id ? { ...c, status: 'cancelado' } : c));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={22} className="text-amber-400" /> Clientes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {clientes.length} assinaturas · {clientes.filter(c => c.status === 'ativo').length} ativas ·{' '}
            {clientes.filter(c => c.status === 'pendente').length} pendentes
          </p>
        </div>
        <button
          onClick={fetchClientes}
          className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
          title="Recarregar"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-4 flex flex-wrap gap-3 shadow-sm dark:shadow-none">
        {/* Busca */}
        <div className="flex-1 min-w-48 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            id="busca-clientes"
            type="text"
            placeholder="Buscar por nome, e-mail ou escola..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-gray-50 dark:bg-[#141c2e] border border-gray-100 dark:border-[#1e2d4a] rounded-xl text-sm text-gray-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400/40 transition-all"
          />
        </div>

        {/* Filtro Status */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-white dark:bg-[#141c2e] border border-gray-200 dark:border-[#1e2d4a] text-gray-800 dark:text-gray-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400/40 appearance-none"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="pendente">Pendente</option>
            <option value="cancelado">Cancelado</option>
            <option value="inadimplente">Inadimplente</option>
          </select>
        </div>

        {/* Filtro Plano */}
        <select
          value={filtroPlano}
          onChange={(e) => setFiltroPlano(e.target.value)}
          className="bg-white dark:bg-[#141c2e] border border-gray-200 dark:border-[#1e2d4a] text-gray-800 dark:text-gray-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400/40 appearance-none"
        >
          <option value="todos">Todos os planos</option>
          <option value="basico">Básico</option>
          <option value="profissional">Profissional</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 dark:border-[#1e2d4a]">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3.5 font-medium">Cliente / Escola</th>
                <th className="text-left px-5 py-3.5 font-medium">Plano</th>
                <th className="text-left px-5 py-3.5 font-medium">Pagamento</th>
                <th className="text-left px-5 py-3.5 font-medium">Valor</th>
                <th className="text-left px-5 py-3.5 font-medium">Status</th>
                <th className="text-left px-5 py-3.5 font-medium">Desde</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1e2d4a]">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-4 bg-gray-50 dark:bg-[#1e2d4a] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    Nenhum cliente encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => {
                  const statusC = STATUS_CONFIG[c.status] || STATUS_CONFIG.pendente;
                  const planoC = PLANO_CONFIG[c.plano] || PLANO_CONFIG.basico;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors group text-left">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{c.nome}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{c.nome_escola}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-600">{c.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${planoC.classes}`}>
                          {planoC.label}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-1 capitalize">{c.ciclo}</p>
                      </td>
                      <td className="px-5 py-4 capitalize text-gray-500 dark:text-gray-400 text-xs">{c.metodo_pgto}</td>
                      <td className="px-5 py-4 text-gray-700 dark:text-gray-200 font-medium">
                        R$ {c.valor_total.toLocaleString('pt-BR')}
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">/{c.ciclo === 'anual' ? 'ano' : 'mês'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusC.classes}`}>
                          {statusC.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs">
                        {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {c.status === 'pendente' && (
                            <button
                              onClick={() => ativar(c.id)}
                              className="text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20 px-2.5 py-1 rounded-lg font-medium transition-colors"
                            >
                              Ativar
                            </button>
                          )}
                          {c.status === 'ativo' && (
                            <button
                              onClick={() => desativar(c.id)}
                              className="text-xs bg-rose-400/10 text-rose-400 border border-rose-400/20 hover:bg-rose-400/20 px-2.5 py-1 rounded-lg font-medium transition-colors"
                            >
                              Desativar
                            </button>
                          )}
                          <Link
                            to={`/ops/clientes/${c.id}`}
                            className="text-gray-500 hover:text-white transition-colors"
                          >
                            <ChevronRight size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
