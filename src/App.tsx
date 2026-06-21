import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppShell } from './components/AppShell';
import { Login } from './pages/Login';
import { PortalLayout } from './portal/PortalLayout';
import { PortalDashboard } from './portal/PortalDashboard';
import { EsqueciSenha } from './pages/EsqueciSenha';
import { ResetPassword } from './pages/ResetPassword';

// ---- Painel Root (BackOffice) ----
import { RootAuthProvider } from './contexts/RootAuthContext';
import { RootProtectedRoute } from './root/layout/RootProtectedRoute';
import { RootShell } from './root/layout/RootShell';
import { RootLogin } from './root/pages/RootLogin';

// ---- Lazy Loaded Features (App Principal) ----
const DashboardResumo = lazy(() => import('./features/Dashboard/DashboardResumo').then(m => ({ default: m.DashboardResumo })));
const RHDashboard = lazy(() => import('./features/Secretaria/RHDashboard').then(m => ({ default: m.RHDashboard })));
const AlunosEnturmacao = lazy(() => import('./features/Secretaria/AlunosEnturmacao').then(m => ({ default: m.AlunosEnturmacao })));
const CadastroAlunos = lazy(() => import('./features/Secretaria/CadastroAlunos').then(m => ({ default: m.CadastroAlunos })));
const FinanceiroDashboard = lazy(() => import('./features/Financeiro/FinanceiroDashboard').then(m => ({ default: m.FinanceiroDashboard })));
const Configuracoes = lazy(() => import('./features/Configuracoes/Configuracoes').then(m => ({ default: m.Configuracoes })));
const AcademicoDashboard = lazy(() => import('./features/Academico/AcademicoDashboard').then(m => ({ default: m.AcademicoDashboard })));
const GestaoUsuarios = lazy(() => import('./features/Usuarios/GestaoUsuarios').then(m => ({ default: m.GestaoUsuarios })));
const RelatoriosDashboard = lazy(() => import('./features/Relatorios/RelatoriosDashboard').then(m => ({ default: m.RelatoriosDashboard })));

// ---- Lazy Loaded Features (BackOffice) ----
const RootDashboard = lazy(() => import('./root/pages/RootDashboard').then(m => ({ default: m.RootDashboard })));
const ClientesRoot = lazy(() => import('./root/pages/ClientesRoot').then(m => ({ default: m.ClientesRoot })));
const LeadsINEP = lazy(() => import('./ops/pages/LeadsINEP').then(m => ({ default: m.LeadsINEP })));
const ClienteDetalhe = lazy(() => import('./root/pages/ClienteDetalhe').then(m => ({ default: m.ClienteDetalhe })));
const FinanceiroRoot = lazy(() => import('./root/pages/FinanceiroRoot').then(m => ({ default: m.FinanceiroRoot })));
const EquipeRoot = lazy(() => import('./root/pages/EquipeRoot').then(m => ({ default: m.EquipeRoot })));
const ConfiguracoesRoot = lazy(() => import('./root/pages/ConfiguracoesRoot').then(m => ({ default: m.ConfiguracoesRoot })));

// Nosso guarda de rotas (HOC): se o componente ainda tiver dando loading ele mostra o texto,
// e se não tiver 'user' ele manda logo pro /login usando o Navigate pra proteger a rota
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, escolaAtiva } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  if (escolaAtiva?.papel === 'Aluno') {
    return <Navigate to="/portal/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export default function App() {
  // Fallback de carregamento para as rotas lazy
  const SuspenseFallback = (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0f1115]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Carregando módulo...</p>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <BrowserRouter>
      {/*
       * ThemeProvider envolve o site púublico e o sistema dos clientes.
       * O BackOffice (/ops) tem design dark fixo e NÃO herda este tema.
       */}
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={SuspenseFallback}>
            <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<PortalDashboard />} />
            </Route>

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
                  <Route path="leads"        element={<LeadsINEP />} />
                  <Route path="clientes/:id" element={<ClienteDetalhe />} />
                  <Route path="financeiro"   element={<FinanceiroRoot />} />
                  <Route path="equipe"       element={<EquipeRoot />} />
                  <Route path="configuracoes" element={<ConfiguracoesRoot />} />
                </Route>
              </Route>
            </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
