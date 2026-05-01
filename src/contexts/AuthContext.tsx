import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Tipos base de nossa aplicação
export type PerfilPapel = 'Admin' | 'Diretor' | 'Subdiretor' | 'Secretaria' | 'Professor' | 'Aluno';
export type VinculoTipo = 'Efetivo' | 'Designado';

// Helpers de permissão reutilizáveis
export const PAPEIS_GESTAO = ['Admin', 'Diretor', 'Subdiretor', 'Secretaria'] as const;
export const PAPEIS_DIRECAO = ['Admin', 'Diretor', 'Subdiretor'] as const;
export const PAPEIS_ADMIN = ['Admin'] as const;

export interface Escola {
  id: string;
  nome: string;
  cnpj: string;
}

export interface MembroEscola {
  id: string;
  escola_id: string;
  user_id: string;
  papel: PerfilPapel;
  tipo_vinculo: VinculoTipo;
  escola: Escola;
}

interface AuthContextType {
  user: User | null;
  membros: MembroEscola[];
  escolaAtiva: MembroEscola | null;
  isSystemRoot: boolean;
  setEscolaAtiva: (membro: MembroEscola) => void;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [membros, setMembros] = useState<MembroEscola[]>([]);
  const [escolaAtiva, setEscolaAtiva] = useState<MembroEscola | null>(null);
  const [isSystemRoot, setIsSystemRoot] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escutando mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkSystemRoot(session.user.id);
          fetchMembros(session.user.id);
        } else {
          setMembros([]);
          setEscolaAtiva(null);
          setIsSystemRoot(false);
          setLoading(false);
        }
      }
    );

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkSystemRoot(session.user.id);
        fetchMembros(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSystemRoot = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('root_admins')
        .select('is_root, role')
        .eq('id', userId)
        .eq('is_active', true)
        .single();
      
      if (data && (data.is_root || data.role === 'root' || data.role === 'super_admin')) {
        setIsSystemRoot(true);
      } else {
        setIsSystemRoot(false);
      }
    } catch (e) {
      setIsSystemRoot(false);
    }
  };

  const fetchMembros = async (userId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('membros_escola')
        .select(`
          id, escola_id, user_id, papel, tipo_vinculo,
          escola:escolas (id, nome, cnpj)
        `)
        .eq('user_id', userId);
        
      if (error) {
        console.error("Erro ao buscar vínculos no Supabase:", error);
        setMembros([]);
        return;
      }
      
      const realMembros = (data as unknown) as MembroEscola[];
      setMembros(realMembros);
      
      const savedEscolaId = localStorage.getItem('escola_ativa_id');
      if (savedEscolaId) {
        const found = realMembros.find(m => m.escola_id === savedEscolaId);
        setEscolaAtiva(found || realMembros[0] || null);
      } else if (realMembros.length > 0) {
        setEscolaAtiva(realMembros[0]); 
      }
      
    } catch (error) {
      console.error("Erro ao buscar vínculos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetEscolaAtiva = (membro: MembroEscola) => {
    setEscolaAtiva(membro);
    localStorage.setItem('escola_ativa_id', membro.escola_id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('escola_ativa_id');
    setIsSystemRoot(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      membros,
      escolaAtiva,
      isSystemRoot,
      setEscolaAtiva: handleSetEscolaAtiva,
      loading,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
