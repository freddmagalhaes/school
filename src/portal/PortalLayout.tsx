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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      {/* Header do Portal */}
      <header className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm border border-white/20 shadow-inner">
                <GraduationCap className="text-white h-7 w-7" />
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Portal do Aluno
                {escolaAtiva && <span className="font-medium text-indigo-200 ml-3 text-lg opacity-80">| {escolaAtiva.escola.nome}</span>}
              </h1>
            </div>
            
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex flex-col items-end text-indigo-100">
                <span className="text-sm font-bold text-white">{user.email}</span>
                <span className="text-xs text-indigo-300 font-medium uppercase tracking-widest">Área do Aluno</span>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border border-white/20 hover:border-white/40 hover-lift"
              >
                <LogOut size={18} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
};
