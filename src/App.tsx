import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppShell } from './components/AppShell';
import { DashboardResumo } from './features/Dashboard/DashboardResumo';
import { RHDashboard } from './features/Secretaria/RHDashboard';
import { AlunosEnturmacao } from './features/Secretaria/AlunosEnturmacao';
import { FinanceiroDashboard } from './features/Financeiro/FinanceiroDashboard';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Contato } from './pages/Contato';
import { Checkout } from './pages/Checkout';

// Mocks rápidos pras telas que ainda vamos codar no futuro, só pra navegação não quebrar rs
const Academico = () => <div className="p-6">Módulo Acadêmico e Diário de Classe (Em Construção)</div>;
const Configuracoes = () => <div className="p-6">Configurações (Em Construção)</div>;

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
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/contato" element={<Contato />} />
          <Route path="/assinar" element={<Checkout />} />
          
          <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route index element={<DashboardResumo />} />
            <Route path="enturmacao" element={<AlunosEnturmacao />} />
            <Route path="rh" element={<RHDashboard />} />
            <Route path="academico" element={<Academico />} />
            <Route path="financeiro" element={<FinanceiroDashboard />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
