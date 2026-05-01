import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppShell } from './components/AppShell';
import { DashboardResumo } from './features/Dashboard/DashboardResumo';
import { RHDashboard } from './features/Secretaria/RHDashboard';
import { AlunosEnturmacao } from './features/Secretaria/AlunosEnturmacao';
import { CadastroAlunos } from './features/Secretaria/CadastroAlunos';
import { FinanceiroDashboard } from './features/Financeiro/FinanceiroDashboard';
import { Login } from './pages/Login';
import { EsqueciSenha } from './pages/EsqueciSenha';
import { ResetPassword } from './pages/ResetPassword';
import { Configuracoes } from './features/Configuracoes/Configuracoes';

// ---- Painel Root (BackOffice) ----
import { RootAuthProvider } from './contexts/RootAuthContext';
import { RootProtectedRoute } from './root/layout/RootProtectedRoute';
import { RootShell } from './root/layout/RootShell';
import { RootLogin } from './root/pages/RootLogin';
import { RootDashboard } from './root/pages/RootDashboard';
import { ClientesRoot } from './root/pages/ClientesRoot';
import { ClienteDetalhe } from './root/pages/ClienteDetalhe';
import { FinanceiroRoot } from './root/pages/FinanceiroRoot';
import { EquipeRoot } from './root/pages/EquipeRoot';
import { ConfiguracoesRoot } from './root/pages/ConfiguracoesRoot';

import { AcademicoDashboard } from './features/Academico/AcademicoDashboard';
import { GestaoUsuarios } from './features/Usuarios/GestaoUsuarios';
import { RelatoriosDashboard } from './features/Relatorios/RelatoriosDashboard';

// Nosso guarda de rotas (HOC): se o componente ainda tiver dando loading ele mostra o texto,
// e se não tiver 'user' ele manda logo pro /login usando o Navigate pra proteger a rota
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const App = () => {
  return (
    <BrowserRouter>
      {/*
       * ThemeProvider envolve o site púublico e o sistema dos clientes.
       * O BackOffice (/ops) tem design dark fixo e NÃO herda este tema.
       */}
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<DashboardResumo />} />
              <Route path="enturmacao"   element={<AlunosEnturmacao />} />
              <Route path="cadastro-alunos" element={<CadastroAlunos />} />
              <Route path="rh"           element={<RHDashboard />} />
              <Route path="academico"    element={<AcademicoDashboard />} />
              <Route path="relatorios"   element={<RelatoriosDashboard />} />
              <Route path="financeiro"   element={<FinanceiroDashboard />} />
              <Route path="usuarios"     element={<GestaoUsuarios />} />
              <Route path="configuracoes" element={<Configuracoes />} />
            </Route>

            {/*
             * =====================================================
             * PAINEL ROOT — BACKOFFICE (rota oculta: /ops)
             * NÃO há nenhum link público apontando para esta rota.
             * Acesso exclusivo para operadores cadastrados em root_admins.
             * Design SEMPRE dark — isolado do ThemeProvider.
             * =====================================================
             */}
            <Route path="/ops" element={<RootAuthProvider><Outlet /></RootAuthProvider>}>
              <Route path="login" element={<RootLogin />} />
              <Route element={<RootProtectedRoute />}>
                <Route element={<RootShell />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard"    element={<RootDashboard />} />
                  <Route path="clientes"     element={<ClientesRoot />} />
                  <Route path="clientes/:id" element={<ClienteDetalhe />} />
                  <Route path="financeiro"   element={<FinanceiroRoot />} />
                  <Route path="equipe"       element={<EquipeRoot />} />
                  <Route path="configuracoes" element={<ConfiguracoesRoot />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
