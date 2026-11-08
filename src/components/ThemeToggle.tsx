import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

/** Alterna entre modo claro e escuro (a preferência fica salva no navegador). */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isDark, toggleTema } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTema}
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      className={`h-10 w-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-300 transition-colors ${className}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};
