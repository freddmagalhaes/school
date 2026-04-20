import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileUp, CheckCircle, XCircle } from 'lucide-react';

const mockChartData = [
  { name: 'Jan', Entradas: 4000, Saidas: 2400 },
  { name: 'Fev', Entradas: 3000, Saidas: 1398 },
  { name: 'Mar', Entradas: 2000, Saidas: 4800 },
  { name: 'Abr', Entradas: 2780, Saidas: 3908 },
  { name: 'Mai', Entradas: 1890, Saidas: 4800 },
  { name: 'Jun', Entradas: 2390, Saidas: 3800 },
];

const MOCK_PAGAMENTOS = [
  { id: 1, descricao: 'Manutenção Rede Elétrica', valor: 850.00, status: 'Pendente', data: '2023-05-18' },
  { id: 2, descricao: 'Compra de Materiais Didáticos', valor: 1200.50, status: 'Pendente', data: '2023-05-19' },
  { id: 3, descricao: 'Merenda (Fornecedor X)', valor: 3400.00, status: 'Aprovado', data: '2023-05-10' },
];

export const FinanceiroDashboard: React.FC = () => {
  const { escolaAtiva } = useAuth();
  const podeAprovar = escolaAtiva?.papel === 'Diretor' || escolaAtiva?.papel === 'Admin';

  const aprovarPendencia = (id: number) => {
    alert(`Pagamento ${id} aprovado com sucesso. Liberação para o banco efetuada.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h2>
          <p className="text-sm text-gray-500">Gestão de Verbas e Entradas</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
          <FileUp size={18} />
          Nova Receita/Despesa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Comparativo Receitas x Despesas</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" />
                <Bar dataKey="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saidas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-1 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Aprovações Pendentes</h3>
          <p className="text-xs text-gray-500 mb-4">Pagamentos necessitam do aval da Diretoria.</p>
          
          <div className="space-y-4">
            {MOCK_PAGAMENTOS.filter(p => p.status === 'Pendente').map(pag => (
              <div key={pag.id} className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-gray-900 text-sm">{pag.descricao}</p>
                  <p className="font-bold text-red-600 font-mono">R$ {pag.valor.toFixed(2)}</p>
                </div>
                <p className="text-xs text-gray-500 mb-3">Emitido em {pag.data}</p>
                
                {podeAprovar ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => aprovarPendencia(pag.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 py-1.5 rounded text-xs font-semibold transition-colors"
                    >
                      <CheckCircle size={14} /> Autorizar
                    </button>
                    <button className="flex items-center justify-center gap-1 bg-white border border-red-300 text-red-700 hover:bg-red-50 px-3 py-1.5 rounded text-xs font-semibold transition-colors">
                      <XCircle size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                    Aguardando Diretor
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
