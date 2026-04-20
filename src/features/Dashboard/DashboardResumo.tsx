import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, PiggyBank, GraduationCap, AlertCircle } from 'lucide-react';

export const DashboardResumo: React.FC = () => {
  const { escolaAtiva } = useAuth();
  const papel = escolaAtiva?.papel;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard de {papel}</h2>
        <p className="text-sm text-gray-500">Unidade Escolar: {escolaAtiva?.escola.nome}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4 transition-transform hover:-translate-y-1">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total de Alunos</p>
            <p className="text-2xl font-bold text-gray-900">1,248</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4 transition-transform hover:-translate-y-1">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Turmas Ativas</p>
            <p className="text-2xl font-bold text-gray-900">32</p>
          </div>
        </div>

        {['Admin', 'Diretor', 'Secretaria'].includes(papel || '') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4 transition-transform hover:-translate-y-1">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Contratos Próximos</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
        )}

        {['Admin', 'Diretor'].includes(papel || '') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4 transition-transform hover:-translate-y-1">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <PiggyBank size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Saldo em Caixa</p>
              <p className="text-2xl font-bold text-gray-900">R$ 14.500</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Aqui virão gráficos futuramente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm min-h-[300px]">
           <h3 className="text-lg font-bold text-gray-800 mb-4">Avisos Recentes</h3>
           <div className="space-y-4">
             <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
               <span className="text-xs font-bold text-indigo-600 mb-1 block">SISTEMA</span>
               <p className="text-sm text-gray-700">O prazo para lançamento de notas do 1º Bimestre encerra dia 15/05.</p>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
};
