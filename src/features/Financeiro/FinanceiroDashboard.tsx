import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileUp, CheckCircle } from 'lucide-react';
import { format, subMonths } from 'date-fns';

interface Movimentacao {
  id: string;
  categoria: string;
  valor: number;
  tipo: 'Entrada' | 'Saida';
  status_aprovacao: 'Pendente' | 'Aprovado' | 'Rejeitado';
  data_registro: string;
}

export const FinanceiroDashboard: React.FC = () => {
  const { escolaAtiva } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [chartData, setChartData] = useState<Array<{ name: string; Entradas: number; Saidas: number }>>([]);
  const [pendencias, setPendencias] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formMovimentacao, setFormMovimentacao] = useState({
    id: '',
    categoria: '',
    valor: '',
    tipo: 'Entrada' as 'Entrada' | 'Saida',
    status_aprovacao: 'Pendente' as 'Pendente' | 'Aprovado' | 'Rejeitado',
    data_registro: new Date().toISOString().split('T')[0],
  });

  const podeAprovar = escolaAtiva?.papel === 'Diretor' || escolaAtiva?.papel === 'Admin';

  const abrirModalMovimentacao = (mov?: Movimentacao) => {
    if (mov) {
      setFormMovimentacao({
        id: mov.id,
        categoria: mov.categoria,
        valor: mov.valor.toString(),
        tipo: mov.tipo,
        status_aprovacao: mov.status_aprovacao,
        data_registro: mov.data_registro,
      });
    } else {
      setFormMovimentacao({
        id: '',
        categoria: '',
        valor: '',
        tipo: 'Entrada',
        status_aprovacao: 'Pendente',
        data_registro: new Date().toISOString().split('T')[0],
      });
    }
    setShowModal(true);
  };

  const fecharModalMovimentacao = () => setShowModal(false);

  const handleSalvarMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaAtiva) return;
    setLoading(true);
    const payload = {
      escola_id: escolaAtiva.escola_id,
      categoria: formMovimentacao.categoria,
      valor: parseFloat(formMovimentacao.valor.replace(',', '.')) || 0,
      tipo: formMovimentacao.tipo,
      status_aprovacao: formMovimentacao.status_aprovacao,
      data_registro: formMovimentacao.data_registro,
    };

    if (formMovimentacao.id) {
      await supabase.from('financeiro_verbas').update(payload).eq('id', formMovimentacao.id);
    } else {
      await supabase.from('financeiro_verbas').insert(payload);
    }

    setShowModal(false);
    carregarMovimentacoes();
  };

  const handleExcluirMovimentacao = async (id: string) => {
    if (!confirm('Deseja excluir esta movimentação? Esta ação não pode ser desfeita.')) return;
    await supabase.from('financeiro_verbas').delete().eq('id', id);
    carregarMovimentacoes();
  };

  const handleEditarMovimentacao = (mov: Movimentacao) => abrirModalMovimentacao(mov);

  useEffect(() => {
    if (!escolaAtiva) return;
    carregarMovimentacoes();
  }, [escolaAtiva]);

  const carregarMovimentacoes = async () => {
    if (!escolaAtiva) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('financeiro_verbas')
      .select('id, categoria, valor, tipo, status_aprovacao, data_registro')
      .eq('escola_id', escolaAtiva.escola_id)
      .order('data_registro', { ascending: true });

    if (!error && data) {
      const lista = (data as Movimentacao[]).map((item) => ({
        ...item,
        valor: Number(item.valor),
      }));

      setMovimentacoes(lista);
      setPendencias(lista.filter((item) => item.status_aprovacao === 'Pendente'));
      setChartData(gerarDadosGrafico(lista));
    } else {
      setMovimentacoes([]);
      setPendencias([]);
      setChartData(gerarDadosGrafico([]));
    }

    setLoading(false);
  };

  const gerarDadosGrafico = (lista: Movimentacao[]) => {
    const meses = Array.from({ length: 6 }).map((_, index) => {
      const data = subMonths(new Date(), 5 - index);
      return format(data, 'MMM');
    });

    const mapa = meses.reduce((acc, mes) => {
      acc[mes] = { name: mes, Entradas: 0, Saidas: 0 };
      return acc;
    }, {} as Record<string, { name: string; Entradas: number; Saidas: number }>);

    lista.forEach((item) => {
      if (item.status_aprovacao !== 'Aprovado') return;
      const mes = format(new Date(item.data_registro), 'MMM');
      if (!mapa[mes]) return;
      if (item.tipo === 'Entrada') mapa[mes].Entradas += item.valor;
      else mapa[mes].Saidas += item.valor;
    });

    return meses.map((mes) => mapa[mes]);
  };

  const saldoAprovado = movimentacoes.reduce((acum, item) => {
    if (item.status_aprovacao !== 'Aprovado') return acum;
    return acum + (item.tipo === 'Entrada' ? item.valor : -item.valor);
  }, 0);

  const aprovarPendencia = async (id: string) => {
    const { error } = await supabase
      .from('financeiro_verbas')
      .update({ status_aprovacao: 'Aprovado' })
      .eq('id', id);

    if (!error) {
      carregarMovimentacoes();
      alert('Pagamento aprovado com sucesso.');
    } else {
      alert('Erro ao aprovar o pagamento: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h2>
          <p className="text-sm text-gray-500">Gestão de Verbas, aprovações e fluxo de caixa.</p>
        </div>
        <button onClick={() => abrirModalMovimentacao()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
          <FileUp size={18} />
          Nova Receita/Despesa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Comparativo Receitas x Despesas</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" />
                <Bar dataKey="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saidas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {loading && <p className="text-sm text-gray-500 mt-4">Atualizando dados financeiros...</p>}
        </div>

        <div className="col-span-1 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Aprovações Pendentes</h3>
          <p className="text-xs text-gray-500 mb-4">Pagamentos aguardando validação do gestor.</p>

          <div className="space-y-4">
            {pendencias.length === 0 ? (
              <div className="p-6 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
                Nenhuma pendência financeira no momento.
              </div>
            ) : (
              pendencias.map((pag) => (
                <div key={pag.id} className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{pag.categoria}</p>
                      <p className="text-xs text-gray-500">Registrado em {format(new Date(pag.data_registro), 'dd/MM/yyyy')}</p>
                    </div>
                    <p className="font-bold text-red-600 font-mono">R$ {pag.valor.toFixed(2)}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {podeAprovar ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => aprovarPendencia(pag.id)}
                          className="flex items-center justify-center gap-1 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 py-1.5 rounded text-xs font-semibold transition-colors"
                        >
                          <CheckCircle size={14} /> Autorizar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditarMovimentacao(pag)}
                          className="flex items-center justify-center gap-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-1.5 rounded text-xs font-semibold transition-colors"
                        >
                          Editar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                        Aguardando Diretor
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleExcluirMovimentacao(pag.id)}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold self-start"
                    >
                      Excluir movimentação
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center gap-4">
          <div>
            <p className="text-sm text-gray-500">Saldo líquido aprovado</p>
            <p className="text-3xl font-bold text-gray-900">R$ {saldoAprovado.toFixed(2)}</p>
          </div>
          <div className="text-sm text-gray-500">Esse valor considera apenas receitas e despesas aprovadas.</div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{formMovimentacao.id ? 'Editar Movimentação' : 'Nova Movimentação'}</h2>
                <p className="text-sm text-gray-500">Registre entradas e saídas de recursos da escola.</p>
              </div>
              <button onClick={fecharModalMovimentacao} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSalvarMovimentacao} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <input
                    value={formMovimentacao.categoria}
                    onChange={e => setFormMovimentacao({ ...formMovimentacao, categoria: e.target.value })}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Ex: Mensalidade, Contrato, Manutenção"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                  <input
                    value={formMovimentacao.valor}
                    onChange={e => setFormMovimentacao({ ...formMovimentacao, valor: e.target.value })}
                    required
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={formMovimentacao.tipo}
                    onChange={e => setFormMovimentacao({ ...formMovimentacao, tipo: e.target.value as 'Entrada' | 'Saida' })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="Entrada">Entrada</option>
                    <option value="Saida">Saída</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Situação</label>
                  <select
                    value={formMovimentacao.status_aprovacao}
                    onChange={e => setFormMovimentacao({ ...formMovimentacao, status_aprovacao: e.target.value as 'Pendente' | 'Aprovado' | 'Rejeitado' })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Rejeitado">Rejeitado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Registro</label>
                <input
                  type="date"
                  value={formMovimentacao.data_registro}
                  onChange={e => setFormMovimentacao({ ...formMovimentacao, data_registro: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <button type="button" onClick={fecharModalMovimentacao} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-70">{loading ? 'Salvando...' : 'Salvar Movimentação'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
