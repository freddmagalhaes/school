import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

// Mock data
const RECEITA_MENSAL = [
  { mes: 'Out', mrr: 5200, novos: 3 },
  { mes: 'Nov', mrr: 6890, novos: 5 },
  { mes: 'Dez', mrr: 7240, novos: 4 },
  { mes: 'Jan', mrr: 7680, novos: 6 },
  { mes: 'Fev', mrr: 8120, novos: 5 },
  { mes: 'Mar', mrr: 8750, novos: 7 },
  { mes: 'Abr', mrr: 9331, novos: 4 },
];

const DIST_PLANO = [
  { name: 'Profissional', value: 15, color: '#6366f1' },
  { name: 'Básico',       value: 5,  color: '#3b82f6' },
  { name: 'Enterprise',   value: 3,  color: '#f59e0b' },
];

const DIST_METODO = [
  { name: 'PIX',    value: 12 },
  { name: 'Cartão', value: 8 },
  { name: 'Boleto', value: 3 },
];

const DIST_CICLO = [
  { name: 'Mensal', value: 14 },
  { name: 'Anual',  value: 9 },
];

export const FinanceiroRoot = () => {
  const { isDark } = useTheme();
  const [stats, setStats] = useState({
    mrr: 9331, arr: 111972, crescimento: 21.3, totalReceita: 58920,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('assinaturas')
          .select('status, valor_total, ciclo');

        if (data && data.length > 0) {
          const ativos = data.filter(a => a.status === 'ativo');
          const mrr = ativos.reduce((acc, a) =>
            acc + (a.ciclo === 'anual' ? a.valor_total / 12 : a.valor_total), 0
          );
          setStats({
            mrr: Math.round(mrr),
            arr: Math.round(mrr * 12),
            crescimento: 21.3,
            totalReceita: data.reduce((acc, a) => acc + a.valor_total, 0),
          });
        }
      } catch { /* usa mock */ } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const kpis = [
    { label: 'MRR', valor: `R$ ${stats.mrr.toLocaleString('pt-BR')}`, sub: 'Receita Mensal Recorrente', cor: 'amber', tendencia: 21.3 },
    { label: 'ARR', valor: `R$ ${stats.arr.toLocaleString('pt-BR')}`, sub: 'Receita Anual Projetada', cor: 'indigo', tendencia: 21.3 },
    { label: 'Crescimento MoM', valor: `+${stats.crescimento}%`, sub: 'Mês sobre mês', cor: 'emerald', tendencia: stats.crescimento },
    { label: 'Receita Total', valor: `R$ ${stats.totalReceita.toLocaleString('pt-BR')}`, sub: 'Acumulado do período', cor: 'violet' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <DollarSign size={22} className="text-amber-500 dark:text-amber-400" /> Financeiro
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Visão consolidada da receita do sistema</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-5 shadow-sm dark:shadow-none transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-center justify-center">
                <TrendingUp size={16} className="text-amber-500 dark:text-amber-400" />
              </div>
              {k.tendencia !== undefined && (
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-500 dark:text-emerald-400">
                  <ArrowUpRight size={12} />
                  {k.tendencia}%
                </div>
              )}
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{loading ? '—' : k.valor}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{k.label}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de área — MRR ao longo do tempo */}
      <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-6 shadow-sm dark:shadow-none transition-colors">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 dark:text-white text-sm">Evolução do MRR</h2>
          <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            <Calendar size={11} />
            Últimos 7 meses
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={RECEITA_MENSAL}>
            <defs>
              <linearGradient id="mrr-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
            <Tooltip
              contentStyle={{ 
                background: isDark ? '#141c2e' : '#ffffff', 
                border: isDark ? '1px solid #1e2d4a' : '1px solid #f1f5f9', 
                borderRadius: 12, 
                fontSize: 12,
                color: isDark ? '#ffffff' : '#0f172a'
              }}
              labelStyle={{ color: isDark ? '#e2e8f0' : '#64748b' }}
              formatter={(v) => [`R$ ${Number(v).toLocaleString('pt-BR')}`, 'MRR']}
            />
            <Area
              type="monotone"
              dataKey="mrr"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#mrr-grad)"
              dot={{ fill: '#f59e0b', strokeWidth: 0, r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gráficos secundários */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Por plano */}
        <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-5 shadow-sm dark:shadow-none transition-colors">
          <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Por Plano</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={DIST_PLANO} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3}>
                {DIST_PLANO.map((e) => <Cell key={e.name} fill={e.color} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-gray-500 dark:text-[#94a3b8] text-[11px]">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Por método de pagamento */}
        <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-5 shadow-sm dark:shadow-none transition-colors">
          <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Por Método</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={DIST_METODO} barSize={28} layout="vertical">
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={{ 
                background: isDark ? '#141c2e' : '#ffffff', 
                border: isDark ? '1px solid #1e2d4a' : '1px solid #f1f5f9', 
                borderRadius: 12, 
                fontSize: 12,
                color: isDark ? '#ffffff' : '#0f172a'
              }} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mensal vs Anual */}
        <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-5 shadow-sm dark:shadow-none transition-colors">
          <h2 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Ciclo de Cobrança</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={DIST_CICLO} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3}>
                <Cell fill="#10b981" />
                <Cell fill="#3b82f6" />
              </Pie>
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-gray-500 dark:text-[#94a3b8] text-[11px]">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
