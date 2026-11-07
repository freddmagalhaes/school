import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, Users, BookOpen, Library, CalendarClock } from 'lucide-react';
import { GestaoTurmas } from './components/GestaoTurmas';
import { DiarioClasse } from './components/DiarioClasse';
import { GestaoDisciplinas } from './components/GestaoDisciplinas';
import { GradeHorarios } from './components/GradeHorarios';

type Tab = 'gestao' | 'disciplinas' | 'horarios' | 'diario';

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
    { id: 'horarios', label: 'Horários', icon: CalendarClock },
    { id: 'diario', label: 'Diário de Classe', icon: BookOpen },
  ] as { id: Tab; label: string; icon: React.ElementType }[];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <GraduationCap size={28} className="text-indigo-600 dark:text-indigo-300" /> Módulo Acadêmico
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {podeGerenciar
            ? 'Gestão de turmas, disciplinas e acompanhamento pedagógico geral.'
            : 'Bem-vindo ao seu diário de classe. Lance notas e frequências das suas turmas.'}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 inline-flex shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-900'
            }`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'gestao'      && podeGerenciar && <GestaoTurmas />}
        {activeTab === 'disciplinas' && podeGerenciar && <GestaoDisciplinas />}
        {activeTab === 'horarios'    && <GradeHorarios />}
        {activeTab === 'diario'      && <DiarioClasse />}
      </div>
    </div>
  );
};
