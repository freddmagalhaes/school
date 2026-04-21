import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, DollarSign, Shield, Settings,
  LogOut, ChevronLeft, ChevronRight, GraduationCap, Wrench,
} from 'lucide-react';
import { useRootAuth, ROLE_CONFIG, ROLE_PERMISSIONS } from '../../contexts/RootAuthContext';
import type { RootRole } from '../../contexts/RootAuthContext';
import { NotificacaoPainel } from '../components/NotificacaoPainel';

// ============================================================
// Itens da sidebar — filtrados por role do operador logado
// ============================================================
const NAV_ITEMS = [
  {
    path: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ROLE_PERMISSIONS.dashboard,
  },
  {
    path: 'clientes',
    label: 'Clientes',
    icon: Users,
    roles: ROLE_PERMISSIONS.clientes,
  },
  {
    path: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    roles: ROLE_PERMISSIONS.financeiro,
  },
  {
    path: 'equipe',
    label: 'Equipe',
    icon: Shield,
    roles: ROLE_PERMISSIONS.equipe,
  },
  {
    path: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    roles: ROLE_PERMISSIONS.configuracoes,
  },
];

// ============================================================
// RootShell — layout principal do painel backoffice
// ============================================================
export const RootShell = () => {
  const { operador, signOut } = useRootAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/ops/login', { replace: true });
  };

  const roleConfig = operador ? ROLE_CONFIG[operador.role] : null;

  // Filtra os itens da sidebar de acordo com o role do operador
  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.includes(operador?.role as RootRole)
  );

  return (
    <div className="flex h-screen bg-[#0a0f1e] text-gray-100 overflow-hidden">

      {/* ===== SIDEBAR ===== */}
      <aside
        className={`flex flex-col border-r border-[#1e2d4a] bg-[#0e1425] transition-all duration-300 flex-shrink-0 ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {/* Logo / Branding */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[#1e2d4a]">
          <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
            <GraduationCap size={18} className="text-gray-900" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold text-white text-sm leading-none">EduGestão</p>
              <p className="text-[10px] text-amber-400 font-semibold tracking-widest uppercase mt-0.5">
                BackOffice
              </p>
            </div>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
          {visibleItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/ops/${path}`}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-400/15 text-amber-400 border border-amber-400/20'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Perfil + Sair */}
        <div className="p-3 border-t border-[#1e2d4a]">
          {!collapsed && operador && (
            <div className="px-3 py-2.5 mb-2 rounded-xl bg-white/5">
              <p className="text-xs font-semibold text-white truncate">{operador.nome}</p>
              {roleConfig && (
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${roleConfig.bg} ${roleConfig.color}`}>
                  {roleConfig.label}
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleSignOut}
            title="Sair"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut size={16} className="flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>

        {/* Botão de colapsar */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-20 -right-3 w-6 h-6 bg-[#1e2d4a] border border-[#2a3f5f] rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors shadow-lg"
          style={{ position: 'absolute', left: collapsed ? '56px' : '252px' }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* ===== CONTEÚDO PRINCIPAL ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-[#1e2d4a] bg-[#0e1425] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Wrench size={14} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 tracking-widest uppercase">
              Sistema · Backoffice
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Painel de notificações com campainha e dropdown */}
            <NotificacaoPainel />

            {/* Avatar do operador */}
            {operador && (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center font-bold text-gray-900 text-sm">
                  {operador.nome.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-white leading-none">{operador.nome}</p>
                  {roleConfig && (
                    <p className={`text-[10px] font-bold mt-0.5 ${roleConfig.color}`}>
                      {roleConfig.label}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Área de conteúdo com scroll */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
