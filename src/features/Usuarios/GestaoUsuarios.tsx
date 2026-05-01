import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth, PAPEIS_GESTAO } from '../../contexts/AuthContext';
import type { PerfilPapel } from '../../contexts/AuthContext';
import { useEscolaAtual } from '../../hooks/useEscolaAtual';
import { RootEscolaSelector } from '../../components/RootEscolaSelector';
import {
  UsersRound, Plus, Search, Edit2, UserX, UserCheck, Shield, Mail, User
} from 'lucide-react';

type VinculoTipo = 'Efetivo' | 'Designado';

interface MembroLista {
  id: string;
  papel: PerfilPapel;
  tipo_vinculo: VinculoTipo;
  ativo: boolean;
  perfis: { id: string; nome: string; cpf: string } | null;
}

interface FormUsuario {
  nome: string;
  email: string;
  cpf: string;
  papel: PerfilPapel;
  tipo_vinculo: VinculoTipo;
}

const PAPEIS_DISPONIVEIS: PerfilPapel[] = ['Diretor', 'Subdiretor', 'Secretaria', 'Professor', 'Aluno'];
const PAPEIS_SO_ADMIN: PerfilPapel[] = ['Diretor', 'Subdiretor', 'Secretaria'];

const PAPEL_CONFIG: Record<string, { label: string; color: string }> = {
  Admin:      { label: 'Administrador',  color: 'bg-purple-100 text-purple-800' },
  Diretor:    { label: 'Diretor',        color: 'bg-blue-100 text-blue-800' },
  Subdiretor: { label: 'Subdiretor',     color: 'bg-sky-100 text-sky-800' },
  Secretaria: { label: 'Secretaria',     color: 'bg-indigo-100 text-indigo-800' },
  Professor:  { label: 'Professor',      color: 'bg-emerald-100 text-emerald-800' },
  Aluno:      { label: 'Aluno',          color: 'bg-amber-100 text-amber-800' },
};

export const GestaoUsuarios: React.FC = () => {
  const { escolaAtiva, isSystemRoot } = useAuth();
  const { escolaId, precisaSelecionarEscola, escolas, escolaRootId, setEscolaRootId, loadingEscolas } = useEscolaAtual();

  const papel = escolaAtiva?.papel;
  // Admin cria qualquer papel; Secretaria só pode criar Professores e Alunos
  const podeGerenciarGestao = isSystemRoot || papel === 'Admin';

  const [membros, setMembros] = useState<MembroLista[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroPapel, setFiltroPapel] = useState<string>('Todos');

  const [showModal, setShowModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackTipo, setFeedbackTipo] = useState<'ok' | 'erro'>('ok');
  const [form, setForm] = useState<FormUsuario>({
    nome: '', email: '', cpf: '', papel: 'Professor', tipo_vinculo: 'Efetivo',
  });

  const carregarMembros = useCallback(async () => {
    if (!escolaId) return;
    setLoading(true);
    const { data } = await supabase
      .from('membros_escola')
      .select(`
        id, papel, tipo_vinculo,
        perfis:user_id (id, nome, cpf)
      `)
      .eq('escola_id', escolaId)
      .order('papel');
    setMembros((data || []) as unknown as MembroLista[]);
    setLoading(false);
  }, [escolaId]);

  useEffect(() => {
    carregarMembros();
  }, [carregarMembros]);

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaId) return;

    setSalvando(true);
    setFeedback('');

    try {
      // Chama a Edge Function que usa service_role internamente
      const { data, error } = await supabase.functions.invoke('create-school-user', {
        body: {
          escola_id: escolaId,
          nome: form.nome,
          email: form.email,
          cpf: form.cpf,
          papel: form.papel,
          tipo_vinculo: form.tipo_vinculo,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setFeedbackTipo('ok');
      setFeedback(`Usuário "${form.nome}" criado! Um e-mail de acesso foi enviado para ${form.email}.`);
      setShowModal(false);
      setForm({ nome: '', email: '', cpf: '', papel: 'Professor', tipo_vinculo: 'Efetivo' });
      carregarMembros();
    } catch (err: any) {
      setFeedbackTipo('erro');
      setFeedback(err.message || 'Erro ao criar usuário. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleAtivo = async (membro: MembroLista) => {
    if (!podeGerenciarGestao) return;
    // Toggle: se ativo, desativa; se inativo, reativa
    // Por segurança, nunca removemos de membros_escola — apenas sinalizamos inativo
    // Na tabela não há campo 'ativo'; implementamos via exclusão reversível (soft-delete via campo)
    // Por ora, remove o vínculo com confirmação
    if (!confirm(`Deseja remover o acesso de "${membro.perfis?.nome}" desta escola?`)) return;
    await supabase.from('membros_escola').delete().eq('id', membro.id);
    carregarMembros();
  };

  const papeisFiltradosPorPermissao = PAPEIS_DISPONIVEIS.filter(p => {
    if (podeGerenciarGestao) return true;
    return !PAPEIS_SO_ADMIN.includes(p);
  });

  const membrosFiltrados = membros.filter(m => {
    const nomeMatch = m.perfis?.nome?.toLowerCase().includes(busca.toLowerCase()) ?? false;
    const papelMatch = filtroPapel === 'Todos' || m.papel === filtroPapel;
    return nomeMatch && papelMatch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <UsersRound size={28} className="text-indigo-600" /> Gestão de Usuários
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {podeGerenciarGestao
            ? 'Crie e gerencie todos os usuários vinculados a esta escola.'
            : 'Visualize e cadastre professores e alunos da escola.'}
        </p>
      </div>

      {/* Seletor Root */}
      {(precisaSelecionarEscola || (!escolaId && escolas.length > 0)) && (
        <RootEscolaSelector escolas={escolas} escolaRootId={escolaRootId} setEscolaRootId={setEscolaRootId} loading={loadingEscolas} />
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${feedbackTipo === 'ok' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {feedback}
        </div>
      )}

      {escolaId && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text" placeholder="Buscar por nome..."
                  value={busca} onChange={e => setBusca(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={filtroPapel} onChange={e => setFiltroPapel(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                <option value="Todos">Todos os Perfis</option>
                {Object.entries(PAPEL_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => { setShowModal(true); setFeedback(''); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors"
            >
              <Plus size={18} /> Novo Usuário
            </button>
          </div>

          {/* Tabela */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Usuário</th>
                  <th className="px-5 py-3.5 font-medium">CPF</th>
                  <th className="px-5 py-3.5 font-medium">Papel</th>
                  <th className="px-5 py-3.5 font-medium">Vínculo</th>
                  {podeGerenciarGestao && <th className="px-5 py-3.5 font-medium text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : membrosFiltrados.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>
                ) : (
                  membrosFiltrados.map(m => {
                    const cfg = PAPEL_CONFIG[m.papel] || PAPEL_CONFIG.Aluno;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                              {m.perfis?.nome?.charAt(0)?.toUpperCase() || <User size={14} />}
                            </div>
                            <span className="font-medium text-gray-900">{m.perfis?.nome || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">{m.perfis?.cpf || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">{m.tipo_vinculo}</td>
                        {podeGerenciarGestao && (
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => handleToggleAtivo(m)}
                              title="Remover acesso"
                              className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-red-50"
                            >
                              <UserX size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal Novo Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Shield size={20} className="text-indigo-600" /> Novo Usuário
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCriarUsuario} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Nome Completo *</label>
                  <input required type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nome do usuário" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">E-mail *</label>
                  <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="email@escola.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">CPF</label>
                  <input type="text" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="000.000.000-00" maxLength={14} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Papel / Função *</label>
                  <select required value={form.papel} onChange={e => setForm({ ...form, papel: e.target.value as PerfilPapel })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 appearance-none">
                    {papeisFiltradosPorPermissao.map(p => (
                      <option key={p} value={p}>{PAPEL_CONFIG[p]?.label || p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Tipo de Vínculo</label>
                  <select value={form.tipo_vinculo} onChange={e => setForm({ ...form, tipo_vinculo: e.target.value as VinculoTipo })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 appearance-none">
                    <option value="Efetivo">Efetivo</option>
                    <option value="Designado">Designado</option>
                  </select>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                <Mail size={14} className="shrink-0 mt-0.5" />
                <span>O usuário receberá um e-mail com o link de primeiro acesso para definir sua senha.</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm disabled:opacity-50">
                  {salvando ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
