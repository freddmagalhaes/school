import React, { useEffect, useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Registro { id: string; acao: string; detalhes: { nivel?: number; motivo?: string; email_completo?: boolean } | null; created_at: string }

const O_QUE_VIU: Record<string, string> = {
  SUPORTE_VER_RESUMO: 'Resumo da escola (turmas, alunos e usuários, em números)',
  SUPORTE_VER_USUARIOS: 'Lista de usuários (sem CPF)',
  SUPORTE_VER_ESTRUTURA: 'Turmas, professores, disciplinas e grade',
  SUPORTE_VER_ALUNO: 'Notas, frequência e faturas de um aluno',
};

/** Transparência: quando a equipe de suporte consulta dados desta escola, o Admin vê aqui quando, o quê e por quê. */
export const AcessosSuporte: React.FC = () => {
  const { escolaAtiva } = useAuth();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!escolaAtiva) return;
    setCarregando(true);
    supabase.from('audit_logs').select('id, acao, detalhes, created_at')
      .eq('escola_id', escolaAtiva.escola_id).like('acao', 'SUPORTE_%')
      .order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setRegistros((data || []) as Registro[]); setCarregando(false); });
  }, [escolaAtiva]);

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <LifeBuoy className="text-indigo-600 dark:text-indigo-300 mt-0.5" size={20} />
        <div>
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Acessos do suporte aos dados da escola</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sempre que a nossa equipe consulta dados desta escola para atender um chamado, o acesso fica registrado aqui, com o motivo. O CPF nunca é exibido ao suporte.
          </p>
        </div>
      </div>
      {carregando ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : registros.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum acesso do suporte registrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead><tr className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
              <th className="py-2 pr-4">Quando</th><th className="pr-4">O que foi consultado</th><th>Motivo informado</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-gray-800 dark:text-gray-200">
              {registros.map(r => (
                <tr key={r.id}>
                  <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                  <td className="pr-4">{O_QUE_VIU[r.acao] || r.acao}{r.detalhes?.email_completo ? ' (e-mail completo)' : ''}</td>
                  <td className="text-gray-500 dark:text-gray-400">{r.detalhes?.motivo || 'não exigido neste nível'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
