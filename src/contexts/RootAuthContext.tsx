import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// ============================================================
// Tipos de role para a equipe interna do sistema
// ============================================================
export type RootRole =
  | 'root'        // Dono do sistema: acesso total + gerencia equipe
  | 'super_admin' // Acesso total, exceto gerenciar operadores
  | 'suporte'     // Vê e gerencia clientes, NÃO vê financeiro
  | 'financeiro'  // Dashboard + financeiro, NÃO gerencia clientes
  | 'operacional';// Provisionamento e parametrização de clientes

// Estrutura de um operador interno
export interface RootAdmin {
  id: string;
  nome: string;
  email: string;
  role: RootRole;
  is_root: boolean;
  is_active: boolean;
  created_at: string;
}

// Mapeamento de quais roles têm acesso a cada módulo do painel
export const ROLE_PERMISSIONS: Record<string, RootRole[]> = {
  dashboard:     ['root', 'super_admin', 'suporte', 'financeiro', 'operacional'],
  clientes:      ['root', 'super_admin', 'suporte', 'operacional'],
  financeiro:    ['root', 'super_admin', 'financeiro'],
  equipe:        ['root'],
  configuracoes: ['root', 'super_admin'],
};

// Rótulos e cores por role
export const ROLE_CONFIG: Record<RootRole, { label: string; color: string; bg: string }> = {
  root:        { label: 'Root',        color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/30' },
  super_admin: { label: 'Super Admin', color: 'text-violet-400',  bg: 'bg-violet-400/10 border-violet-400/30' },
  suporte:     { label: 'Suporte',     color: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/30' },
  financeiro:  { label: 'Financeiro',  color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' },
  operacional: { label: 'Operacional', color: 'text-orange-400',  bg: 'bg-orange-400/10 border-orange-400/30' },
};

// ============================================================
// Definição do contexto
// ============================================================
interface RootAuthContextType {
  user: User | null;
  operador: RootAdmin | null;
  isRoot: boolean;
  loading: boolean;
  hasPermission: (roles: RootRole[]) => boolean;
  signOut: () => Promise<void>;
}

const RootAuthContext = createContext<RootAuthContextType | undefined>(undefined);

// ============================================================
// Provider
// ============================================================
export const RootAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [operador, setOperador] = useState<RootAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuta mudanças de sessão do Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchOperador(session.user.id);
        } else {
          setOperador(null);
          setLoading(false);
        }
      }
    );

    // Verifica a sessão atual ao montar o componente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchOperador(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Busca o operador na tabela root_admins e valida se está ativo
  const fetchOperador = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('root_admins')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        // Usuário logou mas NÃO é um operador root ativo — desconectar imediatamente
        console.warn('[RootAuth] Acesso negado: usuário não é operador root ativo.');
        await supabase.auth.signOut();
        setUser(null);
        setOperador(null);
        return;
      }

      setOperador(data as RootAdmin);
    } catch {
      await supabase.auth.signOut();
      setUser(null);
      setOperador(null);
    } finally {
      setLoading(false);
    }
  };

  // Verifica se o operador logado tem um dos roles requisitados
  const hasPermission = (roles: RootRole[]): boolean => {
    if (!operador) return false;
    return roles.includes(operador.role);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOperador(null);
  };

  return (
    <RootAuthContext.Provider value={{
      user,
      operador,
      isRoot: operador?.is_root ?? false,
      loading,
      hasPermission,
      signOut,
    }}>
      {children}
    </RootAuthContext.Provider>
  );
};

// ============================================================
// Hook de acesso ao contexto
// ============================================================
export const useRootAuth = () => {
  const context = useContext(RootAuthContext);
  if (context === undefined) {
    throw new Error('useRootAuth deve ser usado dentro de um RootAuthProvider');
  }
  return context;
};
