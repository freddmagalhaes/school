import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// ============================================================
// ThemeContext — gerencia o modo claro/escuro do site público
// e do sistema dos clientes.
// O painel BackOffice (Root) é SEMPRE escuro — não usa este contexto.
// ============================================================

type Tema = 'light' | 'dark';

interface ThemeContextType {
  tema: Tema;
  toggleTema: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Lê a preferência salva ou usa a preferência do sistema operacional
  const [tema, setTema] = useState<Tema>(() => {
    const salvo = localStorage.getItem('edugp-tema') as Tema | null;
    if (salvo) return salvo;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Aplica a classe 'dark' no <html> para ativar os seletores .dark do Tailwind
  useEffect(() => {
    const html = document.documentElement;
    if (tema === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('edugp-tema', tema);
  }, [tema]);

  const toggleTema = () =>
    setTema(prev => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ tema, toggleTema, isDark: tema === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
};
