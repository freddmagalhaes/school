import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SchoolSelector } from './SchoolSelector';
import { 
  GraduationCap, Users, UserPlus, UserCog, PiggyBank, 
  Settings, LogOut, LayoutDashboard, UsersRound, BarChart3, ShieldCheck
} from 'lucide-react';
import { TermosAceiteModal } from './LGPD/TermosAceiteModal';

export const AppShell: React.FC = () => {
  const { escolaAtiva, isSystemRoot, user, perfil, signOut, membros, loading } = useAuth();
  const papel = escolaAtiva?.papel;
  const podeSelecionarEscola = membros.length > 1;

  // Hierarquia de acesso:
  // Root       → tudo, sem restrição
  // Admin      → tudo dentro da escola
  // Diretor/Subdiretor → Dashboard, RH (leitura), Acadêmico (leitura+relat.), Financeiro (leitura)
  // Secretaria → Dashboard, Enturmação, RH, Acadêmico, Usuários
  // Professor  → Dashboard (mínimo), Acadêmico (Diário)
  const menus = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/app',
      roles: ['Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor'],
    },
    {
      name: 'Enturmação',
      icon: Users,
      path: '/app/enturmacao',
      roles: ['Admin', 'Secretaria'],
    },
    {
      name: 'Cadastro de Alunos',
      icon: UserPlus,
      path: '/app/cadastro-alunos',
      roles: ['Admin', 'Secretaria'],
    },
    {
      name: 'Gestão de RH',
      icon: UserCog,
      path: '/app/rh',
      roles: ['Admin', 'Diretor', 'Subdiretor', 'Secretaria'],
    },
    {
      name: 'Acadêmico',
      icon: GraduationCap,
      path: '/app/academico',
      roles: ['Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor'],
    },
    {
      name: 'Relatórios',
      icon: BarChart3,
      path: '/app/relatorios',
      roles: ['Admin', 'Diretor', 'Subdiretor', 'Secretaria'],
    },
    {
      name: 'Financeiro',
      icon: PiggyBank,
      path: '/app/financeiro',
      roles: ['Admin', 'Diretor', 'Subdiretor'],
    },
    {
      name: 'Usuários',
      icon: UsersRound,
      path: '/app/usuarios',
      roles: ['Admin', 'Secretaria'],
    },
    {
      name: 'Configurações',
      icon: Settings,
      path: '/app/configuracoes',
      roles: ['Admin'],
    },
    {
      name: 'Backoffice',
      icon: ShieldCheck,
      path: '/ops/dashboard',
      roles: ['Admin'],
    },
  ];

  // Root vê todos os menus; demais filtram pelo papel
  const visibleMenus = isSystemRoot
    ? menus
    : menus.filter(m => !papel || m.roles.includes(papel));


  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-20">
        <div className="p-5 bg-slate-950/50 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <GraduationCap size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-tight">EduGestão <span className="text-indigo-400">Pro</span></h1>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Gestão Escolar</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {visibleMenus.map((menu) => (
            <NavLink
              key={menu.path}
              to={menu.path}
              className={({ isActive }) => 
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive 
                  ? 'active bg-indigo-600 text-white shadow-md font-medium translate-x-1' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <menu.icon size={18} className="group-[.active]:text-white text-inherit" />
              {menu.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button 
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            <LogOut size={18} />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        {/* Top Header */}
        <header className="h-[72px] glass-panel border-b border-gray-200 flex items-center justify-between px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
          {loading ? (
            <div className="text-gray-400 text-sm font-medium animate-pulse">Carregando contexto...</div>
          ) : (
            <div className="flex items-center gap-4">
              {podeSelecionarEscola && (
                <div className="bg-white rounded-xl p-1 shadow-sm border border-gray-100">
                  <SchoolSelector />
                </div>
              )}

              {escolaAtiva ? (
                <>
                  <div className="h-6 w-px bg-gray-200" />
                  <div className="text-sm bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm flex items-center gap-2">
                    <span className="text-gray-500">Perfil:</span>
                    <span className="font-bold text-indigo-600">{escolaAtiva.papel}</span>
                  </div>
                </>
              ) : isSystemRoot ? (
                <div className="rounded-full bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 flex items-center gap-3 shadow-sm">
                  <ShieldCheck size={18} className="text-amber-500" />
                  <div>
                    <span className="font-bold mr-2">Root Access</span>
                    <Link to="/ops/dashboard" className="text-amber-700 font-medium underline hover:text-amber-800">
                      Ir para Backoffice
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-full bg-slate-100 border border-slate-200 px-4 py-2 text-sm text-slate-500 font-medium">
                  Selecione uma escola para iniciar
                </div>
              )}
            </div>
          )}
        </div>
          
          <div className="flex items-center gap-4">
            {isSystemRoot && (
              <Link
                to="/ops/dashboard"
                className="hidden sm:inline-flex items-center gap-2 rounded-full border-2 border-amber-400 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-600 hover:bg-amber-400 hover:text-white transition-all duration-300 shadow-sm"
              >
                <ShieldCheck size={14} /> Backoffice
              </Link>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{user?.email}</p>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Online</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm ring-2 ring-indigo-50">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8 bg-slate-50/50 animate-fade-in custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Modal de LGPD */}
      {perfil && !perfil.aceitou_termos_em && <TermosAceiteModal />}
    </div>
  );
};
