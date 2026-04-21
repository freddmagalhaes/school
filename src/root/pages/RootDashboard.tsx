import { useState, useEffect } from 'react';
import {
  Users, DollarSign, TrendingUp, Clock, CheckCircle2,
  ArrowUpRight, AlertCircle, BarChart2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useRootAuth } from '../../contexts/RootAuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Link } from 'react-router-dom';

// ============================================================
// Tipos e dados mock (substituir por queries reais depois)
// ============================================================
type Assinatura = {
  id: string;
  nome: string;
  nome_escola: string;
  plano: string;
  ciclo: string;
  valor_total: number;
  status: string;
  created_at: string;
};

// Dados mock de receita mensal (últimos 6 meses)
const RECEITA_MOCK = [
  { mes: 'Nov', receita: 6890 },
  { mes: 'Dez', receita: 7240 },
  { mes: 'Jan', receita: 7680 },
  { mes: 'Fev', receita: 8120 },
  { mes: 'Mar', receita: 8750 },
  { mes: 'Abr', receita: 9331 },
];

// Distribuição por plano (mock)
const PLANO_DIST_MOCK = [
  { name: 'Profissional', value: 15, color: '#6366f1' },
  { name: 'Básico',       value: 5,  color: '#3b82f6' },
  { name: 'Enterprise',   value: 3,  color: '#f59e0b' },
];

// ============================================================
// Componente KPI Card
// ============================================================
type KpiCardProps = {
  titulo: string;
  valor: string;
  sub?: string;
  icon: React.ElementType;
  cor: 'amber' | 'indigo' | 'emerald' | 'rose';
  tendencia?: number; // positivo = crescimento
};

const COR_MAP = {
  amber:   { bg: 'bg-amber-400/10',   border: 'border-amber-400/20',   icon: 'text-amber-400',   text: 'text-amber-400' },
  indigo:  { bg: 'bg-indigo-400/10',  border: 'border-indigo-400/20',  icon: 'text-indigo-400',  text: 'text-indigo-400' },
  emerald: { bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: 'text-emerald-400', text: 'text-emerald-400' },
  rose:    { bg: 'bg-rose-400/10',    border: 'border-rose-400/20',    icon: 'text-rose-400',    text: 'text-rose-400' },
};

const KpiCard = ({ titulo, valor, sub, icon: Icon, cor, tendencia }: KpiCardProps) => {
  const c = COR_MAP[cor];
  return (
    <div className={`bg-white dark:bg-[#0e1425] border border-gray-100 dark:${c.border} rounded-2xl p-5 hover:border-amber-400/30 transition-all shadow-sm dark:shadow-none`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 ${c.bg} border border-gray-100 dark:${c.border} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className={c.icon} />
        </div>
        {tendencia !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${tendencia >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            <ArrowUpRight size={12} className={tendencia < 0 ? 'rotate-90' : ''} />
            {Math.abs(tendencia)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{valor}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{titulo}</p>
      {sub && <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
};

// ============================================================
// Dashboard principal
// ============================================================
export const RootDashboard = () => {
  const { operador } = useRootAuth();
  const { isDark } = useTheme();
  const [pendentes, setPendentes] = useState<Assinatura[]>([]);
  const [stats, setStats] = useState({
    ativos: 23, pendentesCount: 6, mrr: 9331, novosMes: 4,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Busca assinaturas pendentes de ativação
        const { data } = await supabase
          .from('assinaturas')
          .select('id, nome, nome_escola, plano, ciclo, valor_total, status, created_at')
          .eq('status', 'pendente')
          .order('created_at', { ascending: false })
          .limit(5);

        if (data) setPendentes(data);

        // Calcula KPIs reais
        const { data: todos } = await supabase
          .from('assinaturas')
          .select('status, valor_total, ciclo, created_at');

        if (todos) {
          const ativos = todos.filter(a => a.status === 'ativo').length;
          const pendCount = todos.filter(a => a.status === 'pendente').length;
          const mrr = todos
            .filter(a => a.status === 'ativo')
            .reduce((acc, a) => acc + (a.ciclo === 'anual' ? a.valor_total / 12 : a.valor_total), 0);
          const agora = new Date();
          const novosMes = todos.filter(a => {
            const d = new Date(a.created_at);
            return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
          }).length;
          setStats({ ativos, pendentesCount: pendCount, mrr: Math.round(mrr), novosMes });
        }
      } catch {
        // Usa dados mock se Supabase não estiver configurado
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            {saudacao}, {operador?.nome.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Visão executiva do sistema · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full font-semibold">
          <BarChart2 size={12} />
          Dados ao vivo
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Clientes Ativos"
          valor={loading ? '—' : String(stats.ativos)}
          sub="assinaturas ativas"
          icon={Users}
          cor="indigo"
          tendencia={21}
        />
        <KpiCard
          titulo="MRR"
          valor={loading ? '—' : `R$ ${stats.mrr.toLocaleString('pt-BR')}`}
          sub="Receita Mensal Recorrente"
          icon={DollarSign}
          cor="emerald"
          tendencia={14}
        />
        <KpiCard
          titulo="Novos este mês"
          valor={loading ? '—' : String(stats.novosMes)}
          sub={`ARR ≈ R$ ${(stats.mrr * 12).toLocaleString('pt-BR')}`}
          icon={TrendingUp}
          cor="amber"
          tendencia={8}
        />
        <KpiCard
          titulo="Aguardando Ativação"
          valor={loading ? '—' : String(stats.pendentesCount)}
          sub="assinaturas pendentes"
          icon={Clock}
          cor="rose"
        />
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Receita mensal — coluna 2/3 */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Receita Mensal (MRR)</h2>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Últimos 6 meses</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={RECEITA_MOCK} barSize={28}>
              <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `R$${(v/1000).toFixed(1)}k`} />
              <Tooltip
                contentStyle={{ 
                  background: isDark ? '#141c2e' : '#ffffff', 
                  border: isDark ? '1px solid #1e2d4a' : '1px solid #f1f5f9', 
                  borderRadius: 12, 
                  fontSize: 12,
                  color: isDark ? '#ffffff' : '#0f172a'
                }}
                labelStyle={{ color: isDark ? '#e2e8f0' : '#64748b' }}
                formatter={(v) => [`R$ ${Number(v).toLocaleString('pt-BR')}`, 'Receita']}
              />
              <Bar dataKey="receita" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição por plano — coluna 1/3 */}
        <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-5 shadow-sm dark:shadow-none">
          <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-5">Distribuição por Plano</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={PLANO_DIST_MOCK}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
              >
                {PLANO_DIST_MOCK.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-gray-500 dark:text-[#94a3b8] text-[11px]">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fila de ativações pendentes */}
      <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-5 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-500 dark:text-rose-400" />
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Aguardando Ativação</h2>
          </div>
          <Link to="/ops/clientes" className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors">
            Ver todos →
          </Link>
        </div>

        {pendentes.length === 0 && !loading ? (
          <div className="text-center py-8">
            <CheckCircle2 size={32} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma assinatura pendente!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left pb-3 font-medium">Cliente</th>
                  <th className="text-left pb-3 font-medium">Escola</th>
                  <th className="text-left pb-3 font-medium">Plano</th>
                  <th className="text-left pb-3 font-medium">Valor</th>
                  <th className="text-left pb-3 font-medium">Data</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1e2d4a]">
                {(pendentes.length > 0 ? pendentes : [
                  { id: '1', nome: 'Cliente Exemplo 1', nome_escola: 'Escola Modelo A', plano: 'profissional', ciclo: 'mensal', valor_total: 397, status: 'pendente', created_at: '2026-04-20' },
                  { id: '2', nome: 'Cliente Exemplo 2', nome_escola: 'Colégio Padrão B', plano: 'basico', ciclo: 'anual', valor_total: 1970, status: 'pendente', created_at: '2026-04-19' },
                  { id: '3', nome: 'Cliente Exemplo 3', nome_escola: 'Instituto Referência', plano: 'enterprise', ciclo: 'anual', valor_total: 7970, status: 'pendente', created_at: '2026-04-18' },
                ] as Assinatura[]).map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                    <td className="py-3 text-gray-700 dark:text-gray-200 font-medium">{a.nome}</td>
                    <td className="py-3 text-gray-500 dark:text-gray-400">{a.nome_escola}</td>
                    <td className="py-3">
                      <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-400/10 text-indigo-400 border border-indigo-400/20">
                        {a.plano}
                      </span>
                    </td>
                    <td className="py-3 text-gray-700 dark:text-gray-200">R$ {a.valor_total.toLocaleString('pt-BR')}</td>
                    <td className="py-3 text-gray-500 text-xs">
                      {new Date(a.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/ops/clientes/${a.id}`}
                        className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 px-3 py-1 rounded-lg font-medium transition-colors"
                      >
                        Ativar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
