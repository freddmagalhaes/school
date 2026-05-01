import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, Users, BookOpen, Library } from 'lucide-react';
import { GestaoTurmas } from './components/GestaoTurmas';
import { DiarioClasse } from './components/DiarioClasse';
import { GestaoDisciplinas } from './components/GestaoDisciplinas';

type Tab = 'gestao' | 'disciplinas' | 'diario';

export const AcademicoDashboard: React.FC = () => {
  const { escolaAtiva, isSystemRoot } = useAuth();
  const papel = escolaAtiva?.papel;
  
  const podeGerenciar = isSystemRoot || ['Admin', 'Diretor', 'Secretaria'].includes(papel || '');
  const [activeTab, setActiveTab] = useState<Tab>(podeGerenciar ? 'gestao' : 'diario');

  const tabs = [
    ...(podeGerenciar ? [
      { id: 'gestao',       label: 'Gestão de Turmas',  icon: Users    },
      { id: 'disciplinas',  label: 'Disciplinas',        icon: Library  },
    ] : []),
    { id: 'diario', label: 'Diário de Classe', icon: BookOpen },
  ] as { id: Tab; label: string; icon: React.ElementType }[];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <GraduationCap size={28} className="text-indigo-600" /> Módulo Acadêmico
        </h1>
        <p className="text-gray-500 mt-1">
          {podeGerenciar
            ? 'Gestão de turmas, disciplinas e acompanhamento pedagógico geral.'
            : 'Bem-vindo ao seu diário de classe. Lance notas e frequências das suas turmas.'}
        </p>
      </div>

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
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'gestao'      && podeGerenciar && <GestaoTurmas />}
        {activeTab === 'disciplinas' && podeGerenciar && <GestaoDisciplinas />}
        {activeTab === 'diario'      && <DiarioClasse />}
      </div>
    </div>
  );
};
