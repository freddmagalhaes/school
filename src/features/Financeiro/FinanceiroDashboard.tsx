import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileUp, CheckCircle, AlertOctagon, Send, Copy, QrCode } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { GeradorBoletos } from './GeradorBoletos';
import type { DadosCobranca, FaturaGerada } from './GeradorBoletos';

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
  const [activeTab, setActiveTab] = useState<'geral' | 'inadimplentes'>('geral');
  const [faturaGerada, setFaturaGerada] = useState<FaturaGerada | null>(null);
  const [gerandoId, setGerandoId] = useState<string | null>(null);

  const [inadimplentes, setInadimplentes] = useState<DadosCobranca[]>([]);

  const carregarInadimplentes = async () => {
    if (!escolaAtiva) return;
    const { data } = await supabase
      .from('faturas')
      .select(`
        aluno_id,
        valor,
        mes_referencia,
        membros_escola:aluno_id (
          perfis:user_id (nome, telefone)
        )
      `)
      .eq('escola_id', escolaAtiva.escola_id)
      .neq('status', 'Pago');

    if (data) {
      const lista = (data as any[]).map(f => {
        const perfil = f.membros_escola?.perfis;
        return {
          id_aluno: f.aluno_id,
          nome_responsavel: perfil?.nome || 'Responsável',
          telefone_responsavel: perfil?.telefone || '',
          valor_pendente: Number(f.valor),
          mes_referencia: f.mes_referencia
        };
      });
      setInadimplentes(lista);
    }
  };

  const handleGerarCobranca = async (dados: DadosCobranca) => {
    setGerandoId(dados.id_aluno);
    try {
      const fatura = await GeradorBoletos.gerarCobranca(dados);
      const linkWa = GeradorBoletos.formatarMensagemWhatsApp(dados, fatura);
      window.open(linkWa, '_blank');
      setFaturaGerada(fatura);
    } catch (e) {
      alert('Erro ao gerar cobrança.');
    } finally {
      setGerandoId(null);
    }
  };

  const handleMarcarPago = async (idAluno: string, mesReferencia: string) => {
    if (!escolaAtiva || !confirm('Confirmar o recebimento deste valor?')) return;
    setLoading(true);
    
    // Procura a fatura exata desse aluno nesse mes
    const { data: fatura } = await supabase
      .from('faturas')
      .select('id, valor')
      .eq('aluno_id', idAluno)
      .eq('mes_referencia', mesReferencia)
      .neq('status', 'Pago')
      .single();

    if (fatura) {
      // 1. Atualiza o status para Pago
      await supabase.from('faturas').update({ status: 'Pago', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', fatura.id);
      
      // 2. Lança automaticamente uma receita no financeiro_verbas
      await supabase.from('financeiro_verbas').insert({
        escola_id: escolaAtiva.escola_id,
        categoria: `Mensalidade ${mesReferencia} - Aluno`,
        valor: fatura.valor,
        tipo: 'Entrada',
        status_aprovacao: 'Aprovado',
        data_registro: new Date().toISOString().split('T')[0]
      });

      alert('Pagamento registrado e receita adicionada ao caixa!');
      carregarInadimplentes();
      carregarMovimentacoes();
    } else {
      alert('Fatura não encontrada ou já paga.');
    }
    setLoading(false);
  };

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

  const handleGerarMassa = async () => {
    if (!escolaAtiva) return;
    if (!confirm('Gerar fatura de R$ 500,00 para todos os alunos ativos da escola neste mês?')) return;
    setLoading(true);
    
    // Pega os alunos matriculados
    const { data: matriculas } = await supabase
      .from('turma_alunos')
      .select('aluno_id, turma_id, turmas!inner(escola_id)')
      .eq('status', 'Ativo')
      .eq('turmas.escola_id', escolaAtiva.escola_id);
      
    if (matriculas && matriculas.length > 0) {
      const mesAtual = format(new Date(), 'MMMM/yyyy');
      
      const faturas = matriculas.map(m => ({
        escola_id: escolaAtiva.escola_id,
        aluno_id: m.aluno_id,
        turma_id: m.turma_id,
        valor: 500.00,
        data_vencimento: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 10).toISOString().split('T')[0], // dia 10 do prox mes
        status: 'Pendente',
        mes_referencia: mesAtual
      }));

      await supabase.from('faturas').insert(faturas);
      alert(`${faturas.length} faturas geradas com sucesso!`);
      carregarInadimplentes();
    } else {
      alert('Nenhum aluno ativo encontrado nas turmas.');
    }
    
    setLoading(false);
  };

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
    carregarInadimplentes();
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

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('geral')}
          className={`pb-4 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'geral' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('inadimplentes')}
          className={`pb-4 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'inadimplentes' ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <AlertOctagon size={16} />
          Inadimplentes
        </button>
      </div>

      {activeTab === 'inadimplentes' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Painel de Inadimplência e Cobrança</h3>
                <p className="text-sm text-gray-500">Identifique parcelas atrasadas e gere PIX ou Boletos com envio automático via WhatsApp.</p>
              </div>
              <button 
                onClick={handleGerarMassa}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                Gerar Faturas do Mês (Teste)
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Responsável</th>
                    <th className="px-6 py-4 font-semibold text-center">Referência</th>
                    <th className="px-6 py-4 font-semibold text-right">Valor Pendente</th>
                    <th className="px-6 py-4 font-semibold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {inadimplentes.map(ind => (
                    <tr key={ind.id_aluno} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{ind.nome_responsavel}</td>
                      <td className="px-6 py-4 text-center text-rose-600 font-semibold">{ind.mes_referencia}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">R$ {ind.valor_pendente.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleGerarCobranca(ind)}
                            disabled={gerandoId === ind.id_aluno}
                            className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            <Send size={14} />
                            {gerandoId === ind.id_aluno ? 'Gerando...' : 'Cobrar WhatsApp'}
                          </button>
                          <button
                            onClick={() => handleMarcarPago(ind.id_aluno, ind.mes_referencia)}
                            className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                            title="Confirmar pagamento manual"
                          >
                            <CheckCircle size={14} />
                            Baixa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {faturaGerada && (
            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex gap-6 items-start animate-fade-in">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <QrCode size={100} className="text-gray-800" />
              </div>
              <div>
                <h4 className="text-emerald-800 font-bold text-lg mb-2">Fatura e PIX Gerados com Sucesso!</h4>
                <p className="text-sm text-emerald-700 mb-4">O WhatsApp Web foi aberto com o texto de cobrança. Você também pode copiar os dados abaixo:</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-emerald-200 truncate max-w-md">{faturaGerada.chave_pix_copia_cola}</span>
                  <button className="text-emerald-600 hover:text-emerald-800" title="Copiar PIX"><Copy size={16} /></button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-emerald-200 truncate max-w-md">{faturaGerada.link_pagamento}</span>
                  <button className="text-emerald-600 hover:text-emerald-800" title="Copiar Link"><Copy size={16} /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'geral' && (
        <>
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
        </>
      )}

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
