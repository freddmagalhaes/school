import React from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import type { EscolaSimples } from '../hooks/useEscolaAtual';

interface Props {
  escolas: EscolaSimples[];
  escolaRootId: string | null;
  setEscolaRootId: (id: string) => void;
  loading?: boolean;
}

/**
 * Exibido apenas para o Root quando ele não tem escolaAtiva (sem vínculo em membros_escola).
 * Permite escolher manualmente a escola que será gerenciada.
 */
export const RootEscolaSelector: React.FC<Props> = ({ escolas, escolaRootId, setEscolaRootId, loading }) => {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
          <Building2 size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-800">Acesso Root ativo</p>
          <p className="text-xs text-amber-700">Selecione a escola que deseja gerenciar:</p>
        </div>
      </div>

      <div className="relative flex-1 w-full sm:max-w-xs">
        {loading ? (
          <div className="text-sm text-amber-700">Carregando escolas...</div>
        ) : (
          <>
            <select
              value={escolaRootId || ''}
              onChange={e => setEscolaRootId(e.target.value)}
              className="w-full appearance-none pl-3 pr-9 py-2 border border-amber-300 rounded-lg text-sm font-medium text-gray-900 bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
            >
              <option value="">— Selecione uma escola —</option>
              {escolas.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </>
        )}
      </div>
    </div>
  );
};
