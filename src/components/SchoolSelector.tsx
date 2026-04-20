import React from 'react';
import type { MembroEscola } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import { BuildingIcon } from 'lucide-react';

export const SchoolSelector: React.FC = () => {
  const { membros, escolaAtiva, setEscolaAtiva } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  // Se o usuário só pertence a uma escola ou nenhuma, não precisa exibir seletor complexo
  if (!membros || membros.length <= 1) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-md transition-colors"
      >
        <BuildingIcon size={18} />
        <span className="text-sm font-medium">
          {escolaAtiva?.escola.nome || 'Selecione uma Escola'}
        </span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute top-12 left-0 w-64 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="p-3 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
              Minhas Escolas
            </div>
            <div className="max-h-64 overflow-y-auto">
              {membros.map((membro: MembroEscola) => (
                <button
                  key={membro.id}
                  onClick={() => {
                    setEscolaAtiva(membro);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col gap-1 transition-colors ${
                    escolaAtiva?.escola_id === membro.escola_id ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'pl-5 border-l-4 border-transparent'
                  }`}
                >
                  <span className="font-medium text-gray-900 text-sm">{membro.escola.nome}</span>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{membro.papel}</span>
                    <span className="px-1.5 py-0.5 bg-gray-200 rounded">{membro.tipo_vinculo}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
