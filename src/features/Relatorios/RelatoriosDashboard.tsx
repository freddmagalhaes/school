import React, { useState } from 'react';
import { BarChart3, FileText, ClipboardList, Award } from 'lucide-react';
import { useEscolaAtual } from '../../hooks/useEscolaAtual';
import { RootEscolaSelector } from '../../components/RootEscolaSelector';
import { BoletimAluno } from './components/BoletimAluno';
import { RelatorioFrequencia } from './components/RelatorioFrequencia';
import { AtaResultados } from './components/AtaResultados';

type Tab = 'boletim' | 'frequencia' | 'ata';

export const RelatoriosDashboard: React.FC = () => {
  const { escolaId, precisaSelecionarEscola, escolas, escolaRootId, setEscolaRootId, loadingEscolas } = useEscolaAtual();

  const [activeTab, setActiveTab] = useState<Tab>('boletim');

  const tabs = [
    { id: 'boletim'    as Tab, label: 'Boletim do Aluno',       icon: FileText      },
    { id: 'frequencia' as Tab, label: 'Relatório de Frequência', icon: ClipboardList },
    { id: 'ata'        as Tab, label: 'Ata de Resultados Finais', icon: Award         },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <BarChart3 size={28} className="text-indigo-600" /> Relatórios Acadêmicos
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Gere boletins, relatórios de frequência e atas de resultados conforme a LDBEN e o regimento da escola.
        </p>
      </div>

      {/* Seletor Root */}
      {(precisaSelecionarEscola || (!escolaId && escolas.length > 0)) && (
        <RootEscolaSelector escolas={escolas} escolaRootId={escolaRootId} setEscolaRootId={setEscolaRootId} loading={loadingEscolas} />
      )}

      {/* Tabs */}
      <div className="bg-white p-1 rounded-xl border border-gray-200 inline-flex shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div>
        {activeTab === 'boletim'    && <BoletimAluno escolaId={escolaId} />}
        {activeTab === 'frequencia' && <RelatorioFrequencia escolaId={escolaId} />}
        {activeTab === 'ata'        && <AtaResultados escolaId={escolaId} />}
      </div>
    </div>
  );
};
