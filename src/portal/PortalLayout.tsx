import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, GraduationCap, User } from 'lucide-react';

export const PortalLayout: React.FC = () => {
  const { user, escolaAtiva, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Se não estiver logado, manda pro login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header do Portal */}
      <header className="bg-indigo-600 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <GraduationCap className="text-white h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Portal do Aluno
                {escolaAtiva && <span className="font-medium text-indigo-200 ml-2">| {escolaAtiva.escola.nome}</span>}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-indigo-100">
                <User size={18} />
                <span className="text-sm font-medium">{user.email}</span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
