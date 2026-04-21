import { Navigate, Outlet } from 'react-router-dom';
import { useRootAuth } from '../../contexts/RootAuthContext';
import { ShieldCheck } from 'lucide-react';

// ============================================================
// RootProtectedRoute
// Guarda de rota para o painel root — redireciona para o login
// caso não haja um operador autenticado e ativo.
// ============================================================
export const RootProtectedRoute = () => {
  const { operador, loading } = useRootAuth();

  // Aguarda a verificação de sessão antes de decidir o que renderizar
  if (loading) {
    return (
      <div className="h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <ShieldCheck size={14} className="text-amber-400" />
            Verificando credenciais...
          </div>
        </div>
      </div>
    );
  }

  // Sem operador autenticado → vai para o login root
  if (!operador) {
    return <Navigate to="/ops/login" replace />;
  }

  // Operador autenticado e ativo → renderiza a rota filha
  return <Outlet />;
};
