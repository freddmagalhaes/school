import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SchoolSelector } from './SchoolSelector';
import { 
  GraduationCap, Users, UserCog, PiggyBank, 
  Settings, LogOut, LayoutDashboard, UsersRound, BarChart3
} from 'lucide-react';

export const AppShell: React.FC = () => {
  const { escolaAtiva, isSystemRoot, user, signOut } = useAuth();
  const papel = escolaAtiva?.papel;

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
  ];

  // Root vê todos os menus; demais filtram pelo papel
  const visibleMenus = isSystemRoot
    ? menus
    : menus.filter(m => !papel || m.roles.includes(papel));


  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-900 text-indigo-100 flex flex-col shadow-xl">
        <div className="p-4 bg-indigo-950 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight">EduGestão Pro</h1>
            <p className="text-xs text-indigo-300">Gestão Escolar</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {visibleMenus.map((menu) => (
            <NavLink
              key={menu.path}
              to={menu.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                  ? 'bg-indigo-800 text-white font-medium' 
                  : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
                }`
              }
            >
              <menu.icon size={18} />
              {menu.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button 
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
             {/* School Selector is usually better highlighted, but since it's a structural necessity, let's put it in the header for easy access */}
             {escolaAtiva ? (
               <div className="flex items-center gap-3">
                 <div className="bg-indigo-600 rounded-lg p-1.5 shadow-sm">
                   <SchoolSelector />
                 </div>
                 <div className="h-6 w-px bg-gray-300"></div>
                 <div className="text-sm">
                   <span className="text-gray-500">Perfil de </span>
                   <span className="font-bold text-indigo-900">{escolaAtiva.papel}</span>
                 </div>
               </div>
             ) : (
               <div className="text-gray-500 text-sm">Carregando contexto...</div>
             )}
          </div>
          
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-medium text-gray-900">{user?.email}</p>
               <p className="text-xs text-gray-500">Logado</p>
             </div>
             <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
               {user?.email?.charAt(0).toUpperCase() || 'U'}
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
