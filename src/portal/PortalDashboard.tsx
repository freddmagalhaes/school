import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Calendar, CreditCard, Award, Bell } from 'lucide-react';

export const PortalDashboard: React.FC = () => {
  const { escolaAtiva } = useAuth();

  // Dados mockados para simular a visão do aluno (fase comercial)
  const notas = [
    { disciplina: 'Matemática', bim1: 8.5, bim2: 7.0, bim3: '-', bim4: '-', faltas: 2 },
    { disciplina: 'Português', bim1: 9.0, bim2: 8.5, bim3: '-', bim4: '-', faltas: 0 },
    { disciplina: 'História', bim1: 7.5, bim2: 8.0, bim3: '-', bim4: '-', faltas: 4 },
    { disciplina: 'Ciências', bim1: 6.5, bim2: 7.5, bim3: '-', bim4: '-', faltas: 1 },
  ];

  const boletos = [
    { mes: 'Maio', vencimento: '10/05/2026', valor: 450.00, status: 'Pago' },
    { mes: 'Junho', vencimento: '10/06/2026', valor: 450.00, status: 'Pendente' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 shadow-lg text-white">
        <h2 className="text-3xl font-bold mb-2">Bem-vindo(a) ao seu Portal!</h2>
        <p className="text-indigo-100 max-w-2xl">
          Aqui você encontra seu boletim em tempo real, avisos importantes e a situação financeira.
          Tudo simplificado para facilitar a sua jornada em {escolaAtiva?.escola?.nome || 'nossa escola'}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Principal: Boletim */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="text-indigo-600" size={24} />
                <h3 className="text-lg font-bold text-gray-900">Boletim Escolar</h3>
              </div>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">1º Semestre</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-white border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Disciplina</th>
                    <th className="px-6 py-4 font-semibold text-center">1º Bim</th>
                    <th className="px-6 py-4 font-semibold text-center">2º Bim</th>
                    <th className="px-6 py-4 font-semibold text-center">Faltas</th>
                    <th className="px-6 py-4 font-semibold text-center">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {notas.map((nota, idx) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{nota.disciplina}</td>
                      <td className="px-6 py-4 text-center font-semibold text-indigo-600">{nota.bim1}</td>
                      <td className="px-6 py-4 text-center font-semibold text-indigo-600">{nota.bim2}</td>
                      <td className="px-6 py-4 text-center text-gray-500">{nota.faltas}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-medium">Na Média</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Quadro de Avisos */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="text-amber-500" size={24} />
              <h3 className="text-lg font-bold text-gray-900">Avisos da Escola</h3>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-amber-500 pl-4 py-2 bg-amber-50 rounded-r-lg">
                <p className="text-sm font-bold text-gray-900">Feira de Ciências</p>
                <p className="text-sm text-gray-600">A feira de ciências ocorrerá no próximo dia 25. Não esqueçam de trazer as maquetes!</p>
              </div>
              <div className="border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50 rounded-r-lg">
                <p className="text-sm font-bold text-gray-900">Reunião de Pais</p>
                <p className="text-sm text-gray-600">Reunião agendada para sexta-feira às 19h no auditório principal.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Financeiro e Atalhos */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="text-rose-500" size={24} />
              <h3 className="text-lg font-bold text-gray-900">Financeiro</h3>
            </div>
            
            <div className="space-y-4">
              {boletos.map((boleto, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">{boleto.mes}</p>
                    <p className="text-xs text-gray-500">Venc: {boleto.vencimento}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">R$ {boleto.valor.toFixed(2)}</p>
                    {boleto.status === 'Pago' ? (
                      <span className="text-xs font-bold text-emerald-600">PAGO</span>
                    ) : (
                      <button className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded-full transition-colors">
                        Pagar Pix
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cards de Desempenho */}
          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500 p-3 rounded-full text-white">
                <Award size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Frequência Escolar</p>
                <p className="text-2xl font-bold text-emerald-900">94%</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500 p-3 rounded-full text-white">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Dias Letivos Restantes</p>
                <p className="text-2xl font-bold text-blue-900">112</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
