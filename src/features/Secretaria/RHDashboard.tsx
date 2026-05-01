import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { Search, Filter } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

// Mock data para exibição
const MOCK_PROFISSIONAIS = [
  { id: 1, nome: 'Ana Maria Silva', cpf: '111.222.333-44', papel: 'Professor', tipo_vinculo: 'Efetivo', data_fim: null },
  { id: 2, nome: 'Carlos Eduardo Souza', cpf: '222.333.444-55', papel: 'Professor', tipo_vinculo: 'Designado', data_fim: new Date(Date.now() + 15 * 86400000).toISOString() }, // Vence em 15 dias
  { id: 3, nome: 'Fernanda Lima', cpf: '333.444.555-66', papel: 'Secretaria', tipo_vinculo: 'Efetivo', data_fim: null },
  { id: 4, nome: 'João Pedro Rocha', cpf: '444.555.666-77', papel: 'Professor', tipo_vinculo: 'Designado', data_fim: new Date(Date.now() + 60 * 86400000).toISOString() }, // Vence em 60 dias
];

export const RHDashboard: React.FC = () => {
  const { escolaAtiva } = useAuth();
  const [filtroVinculo, setFiltroVinculo] = useState<string>('Todos');
  const [busca, setBusca] = useState<string>('');

  const dadosFiltrados = MOCK_PROFISSIONAIS.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) || p.cpf.includes(busca);
    const matchVinculo = filtroVinculo === 'Todos' || p.tipo_vinculo === filtroVinculo;
    return matchBusca && matchVinculo;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Equipe (RH)</h2>
          <p className="text-sm text-gray-500">Unidade Escolar: {escolaAtiva?.escola.nome}</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          + Novo Profissional
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CPF..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={18} className="text-gray-400" />
            <select 
              value={filtroVinculo}
              onChange={(e) => setFiltroVinculo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 flex-1 sm:flex-none appearance-none"
            >
              <option value="Todos">Todos os Vínculos</option>
              <option value="Efetivo">Efetivos</option>
              <option value="Designado">Designados</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-3 font-medium">Profissional</th>
                <th className="px-6 py-3 font-medium">Cargo</th>
                <th className="px-6 py-3 font-medium">Vínculo</th>
                <th className="px-6 py-3 font-medium">Vencimento Contrato</th>
                <th className="px-6 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dadosFiltrados.map((prof) => {
                let diasParaVencer = undefined;
                if (prof.tipo_vinculo === 'Designado' && prof.data_fim) {
                  const dias = differenceInDays(parseISO(prof.data_fim), new Date());
                  diasParaVencer = dias;
                }

                return (
                  <tr key={prof.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex flex-shrink-0 items-center justify-center font-bold text-xs ring-2 ring-white">
                          {prof.nome.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{prof.nome}</p>
                          <p className="text-xs text-gray-500">{prof.cpf}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{prof.papel}</td>
                    <td className="px-6 py-4">
                      <StatusBadge tipo={prof.tipo_vinculo as any} diasAteVencimento={diasParaVencer} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {prof.tipo_vinculo === 'Efetivo' ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <span className={diasParaVencer !== undefined && diasParaVencer <= 30 ? 'text-red-600 font-semibold flex items-center gap-1' : 'text-gray-600'}>
                          {diasParaVencer} dias
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Editar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {dadosFiltrados.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              Nenhum profissional encontrado com os filtros atuais.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
