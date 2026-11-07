import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Registro = { id: string; user_id: string | null; escola_id: string | null; acao: string; detalhes: any; created_at: string };

const ACOES: Record<string, string> = {
  SUPORTE_VER_RESUMO: 'Resumo da escola',
  SUPORTE_VER_USUARIOS: 'Lista de usuários',
  SUPORTE_VER_ESTRUTURA: 'Estrutura da escola',
  SUPORTE_VER_ALUNO: 'Dados de aluno',
};

/** Quem da equipe consultou dados de quais escolas, quando e por qual motivo. Só o dono do sistema vê. */
export const AuditoriaRoot = () => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [operadores, setOperadores] = useState<Record<string, string>>({});
  const [escolas, setEscolas] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      const [l, o, e] = await Promise.all([
        supabase.from('audit_logs').select('id, user_id, escola_id, acao, detalhes, created_at').like('acao', 'SUPORTE_%').order('created_at', { ascending: false }).limit(300),
        supabase.from('root_admins').select('id, nome'),
        supabase.from('escolas').select('id, nome'),
      ]);
      setRegistros((l.data || []) as Registro[]);
      setOperadores(Object.fromEntries(((o.data || []) as any[]).map(x => [x.id, x.nome])));
      setEscolas(Object.fromEntries(((e.data || []) as any[]).map(x => [x.id, x.nome])));
      setCarregando(false);
    })();
  }, []);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center gap-3">
        <ClipboardList className="text-amber-400" />
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Auditoria de acessos do suporte</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Últimos 300 acessos a dados de escolas. Os registros não podem ser alterados nem apagados pelo sistema.</p>
        </div>
      </div>
      <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead><tr className="text-gray-500 text-xs uppercase border-b border-gray-100 dark:border-[#1e2d4a]">
            <th className="px-4 py-3">Quando</th><th className="px-4 py-3">Quem</th><th className="px-4 py-3">Nível</th><th className="px-4 py-3">Escola</th><th className="px-4 py-3">O que viu</th><th className="px-4 py-3">Motivo</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1e2d4a] text-gray-800 dark:text-gray-200">
            {carregando ? <tr><td colSpan={6} className="px-4 py-6 text-gray-500">Carregando...</td></tr>
              : registros.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-gray-500">Nenhum acesso registrado ainda.</td></tr>
              : registros.map(r => (
                <tr key={r.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3">{(r.user_id && operadores[r.user_id]) || '—'}</td>
                  <td className="px-4 py-3">{r.detalhes?.nivel ? `N${r.detalhes.nivel}` : '—'}</td>
                  <td className="px-4 py-3">{(r.escola_id && escolas[r.escola_id]) || '—'}</td>
                  <td className="px-4 py-3">{ACOES[r.acao] || r.acao}{r.detalhes?.email_completo ? ' (e-mail completo)' : ''}</td>
                  <td className="px-4 py-3 text-gray-500">{r.detalhes?.motivo || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
