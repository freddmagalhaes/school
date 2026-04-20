import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Tipos base de nossa aplicação
export type PerfilPapel = 'Admin' | 'Diretor' | 'Secretaria' | 'Professor' | 'Aluno';
export type VinculoTipo = 'Efetivo' | 'Designado';

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
  setEscolaAtiva: (membro: MembroEscola) => void;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [, setUser] = useState<User | null>(null);
  const [membros, setMembros] = useState<MembroEscola[]>([]);
  const [escolaAtiva, setEscolaAtiva] = useState<MembroEscola | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escutando mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchMembros(session.user.id);
        } else {
          setMembros([]);
          setEscolaAtiva(null);
          setLoading(false);
        }
      }
    );

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchMembros(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchMembros = async (userId: string) => {
    try {
      setLoading(true);
      // Simulação para quando testar sem Supabase conectado 
      // Quando for pro banco real será a query abaixo:
      /*
      const { data, error } = await supabase
        .from('membros_escola')
        .select(`
          id, escola_id, user_id, papel, tipo_vinculo,
          escola:escolas (id, nome, cnpj)
        `)
        .eq('user_id', userId);
      */
      
      const mockMembros: MembroEscola[] = [
        {
          id: 'vinc-1',
          escola_id: 'esc-1',
          user_id: userId,
          papel: 'Secretaria',
          tipo_vinculo: 'Efetivo',
          escola: { id: 'esc-1', nome: 'Escola Modelo Nacional', cnpj: '00.000.000/0001-00' }
        },
        {
          id: 'vinc-2',
          escola_id: 'esc-2',
          user_id: userId,
          papel: 'Professor',
          tipo_vinculo: 'Designado',
          escola: { id: 'esc-2', nome: 'Instituto Educacional Avançado', cnpj: '11.111.111/0001-11' }
        }
      ];

      setMembros(mockMembros);
      
      const savedEscolaId = localStorage.getItem('escola_ativa_id');
      if (savedEscolaId) {
        const found = mockMembros.find(m => m.escola_id === savedEscolaId);
        setEscolaAtiva(found || mockMembros[0] || null);
      } else if (mockMembros.length > 0) {
        setEscolaAtiva(mockMembros[0]); // Seleciona a primeira se só tiver uma (ou se não salvou antes)
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
  };

  return (
    <AuthContext.Provider value={{
      user: { id: 'mock-user', email: 'secretaria@edu.com' } as User, // Mock para teste
      membros,
      escolaAtiva,
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
