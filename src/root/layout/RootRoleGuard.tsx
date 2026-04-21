import type { ReactNode } from 'react';
import { ShieldX } from 'lucide-react';
import { useRootAuth } from '../../contexts/RootAuthContext';
import type { RootRole } from '../../contexts/RootAuthContext';

// ============================================================
// RootRoleGuard
// Envolve seções ou botões que só devem aparecer para determinados roles.
//
// Uso:
//   <RootRoleGuard roles={['root']}>
//     <BotaoCriarOperador />
//   </RootRoleGuard>
//
// fallback='hidden'  → não renderiza nada (padrão, uso em botões/colunas)
// fallback='blocked' → exibe tela de "Acesso Restrito" (uso em páginas inteiras)
// ============================================================
interface RootRoleGuardProps {
  roles: RootRole[];
  children: ReactNode;
  fallback?: 'hidden' | 'blocked';
}

export const RootRoleGuard = ({
  roles,
  children,
  fallback = 'hidden',
}: RootRoleGuardProps) => {
  const { hasPermission } = useRootAuth();

  if (hasPermission(roles)) {
    return <>{children}</>;
  }

  if (fallback === 'blocked') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-5">
          <ShieldX size={36} className="text-red-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Acesso Restrito</h3>
        <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
          Você não tem permissão para acessar este módulo.
          Entre em contato com o administrador root.
        </p>
      </div>
    );
  }

  return null; // 'hidden' — invisível, sem ocupar espaço
};
