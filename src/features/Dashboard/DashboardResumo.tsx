import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, PiggyBank, GraduationCap, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';

export const DashboardResumo: React.FC = () => {
  const { escolaAtiva, user } = useAuth();
  const papel = escolaAtiva?.papel;
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [turmasAtivas, setTurmasAtivas] = useState(0);
  const [contratosProximos, setContratosProximos] = useState(0);
  const [saldoCaixa, setSaldoCaixa] = useState(0);
  const [turmasVinculadas, setTurmasVinculadas] = useState(0);
  const [chartData, setChartData] = useState<Array<{ name: string; Entradas: number; Saidas: number }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!escolaAtiva) return;

    const carregarResumo = async () => {
      setLoading(true);
      const escolaId = escolaAtiva.escola_id;
      const hoje = new Date().toISOString().split('T')[0];
      const daqui30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      const [turmasRes, alunosRes, contratosRes, financeiroRes] = await Promise.all([
        supabase.from('turmas').select('id', { count: 'exact', head: true }).eq('escola_id', escolaId),
        supabase.from('matriculas').select('id', { count: 'exact', head: true }).eq('escola_id', escolaId).eq('status', 'Ativo'),
        supabase.from('membros_escola').select('id', { count: 'exact', head: true }).eq('escola_id', escolaId).not('data_fim', 'is', null).gte('data_fim', hoje).lte('data_fim', daqui30),
        supabase.from('financeiro_verbas').select('valor, tipo, status_aprovacao, data_registro').eq('escola_id', escolaId).order('data_registro', { ascending: true }),
      ]);

      setTurmasAtivas(turmasRes.count || 0);
      setTotalAlunos(alunosRes.count || 0);
      setContratosProximos(contratosRes.count || 0);

      const financeiro = (financeiroRes.data as any[] | null) || [];
      const saldo = financeiro.reduce((acc, item) => {
        if (item.status_aprovacao !== 'Aprovado') return acc;
        return acc + (item.tipo === 'Entrada' ? Number(item.valor) : -Number(item.valor));
      }, 0);
      setSaldoCaixa(saldo);

      setChartData(gerarDadosGrafico(financeiro));

      if (papel === 'Professor' && user) {
        const turmasProf = await supabase.from('turma_professores').select('id', { count: 'exact', head: true }).eq('professor_id', user.id);
        setTurmasVinculadas(turmasProf.count || 0);
      }

      setLoading(false);
    };

    carregarResumo();
  }, [escolaAtiva, papel, user]);

  const gerarDadosGrafico = (lista: any[]) => {
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
      if (item.tipo === 'Entrada') mapa[mes].Entradas += Number(item.valor);
      else mapa[mes].Saidas += Number(item.valor);
    });

    return meses.map((mes) => mapa[mes]);
  };

  const cards = [
    {
      title: 'Total de Alunos',
      value: totalAlunos,
      icon: Users,
      visible: true,
    },
    {
      title: 'Turmas Ativas',
      value: turmasAtivas,
      icon: GraduationCap,
      visible: true,
    },
    {
      title: 'Contratos Próximos',
      value: contratosProximos,
      icon: AlertCircle,
      visible: ['Admin', 'Diretor', 'Subdiretor', 'Secretaria'].includes(papel || ''),
    },
    {
      title: 'Saldo em Caixa',
      value: `R$ ${saldoCaixa.toFixed(2)}`,
      icon: PiggyBank,
      visible: ['Admin', 'Diretor', 'Subdiretor'].includes(papel || ''),
    },
    {
      title: 'Turmas Vinculadas',
      value: turmasVinculadas,
      icon: GraduationCap,
      visible: papel === 'Professor',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard de {papel}</h2>
        <p className="text-sm text-gray-500">Unidade Escolar: {escolaAtiva?.escola.nome}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.filter((card) => card.visible).map((card) => (
          <div key={card.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4 transition-transform hover:-translate-y-1">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <card.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm min-h-[340px]">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800">{['Admin', 'Diretor', 'Subdiretor'].includes(papel || '') ? 'Receitas x Despesas' : 'Atividade Financeira'}</h3>
              <p className="text-sm text-gray-500">Últimos 6 meses de movimentação aprovada.</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saidas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {loading && <p className="text-sm text-gray-500 mt-4">Atualizando dados...</p>}
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Avisos de Gestão</h3>
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
              <span className="text-xs font-bold text-indigo-600 mb-1 block">SISTEMA</span>
              <p className="text-sm text-gray-700">Verifique os próximos períodos letivos e atualize os prazos de encerramento de notas.</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-sm text-amber-700">{saldoCaixa < 0 ? 'Saldo negativo detectado. Reveja despesas aprovadas.' : 'Fluxo de caixa saudável no período atual.'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
