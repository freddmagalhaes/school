import React from 'react';
import type { VinculoTipo } from '../contexts/AuthContext';

interface StatusBadgeProps {
  tipo: VinculoTipo;
  diasAteVencimento?: number; // Para designados
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ tipo, diasAteVencimento }) => {
  const isEfetivo = tipo === 'Efetivo';
  
  // Lógica de alerta: Se designado e com menos de 30 dias de contrato, fica vermelho
  const isAlert = !isEfetivo && diasAteVencimento !== undefined && diasAteVencimento <= 30;

  let badgeColor = isEfetivo 
    ? 'bg-blue-100 text-blue-800 border-blue-200' 
    : 'bg-emerald-100 text-emerald-800 border-emerald-200';
    
  if (isAlert) {
    badgeColor = 'bg-red-100 text-red-800 border-red-200 animate-pulse';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}>
      {tipo}
      {isAlert && <span className="ml-1 font-bold">(!)</span>}
    </span>
  );
};
