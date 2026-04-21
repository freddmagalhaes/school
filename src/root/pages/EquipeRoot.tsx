import { useState, useEffect } from 'react';
import { Shield, Plus, X, Check, AlertCircle, UserCheck, UserX } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRootAuth, ROLE_CONFIG } from '../../contexts/RootAuthContext';
import type { RootAdmin, RootRole } from '../../contexts/RootAuthContext';
import { RootRoleGuard } from '../layout/RootRoleGuard';

// Mock data para quando Supabase não estiver configurado
const MOCK_EQUIPE: RootAdmin[] = [
  { id: '1', nome: 'Administrador Root', email: 'root@edugp.com.br', role: 'root', is_root: true, is_active: true, created_at: '2026-01-01' },
  { id: '2', nome: 'Operador Suporte', email: 'suporte@edugp.com.br', role: 'suporte', is_root: false, is_active: true, created_at: '2026-03-10' },
  { id: '3', nome: 'Analista Financeiro', email: 'financeiro@edugp.com.br', role: 'financeiro', is_root: false, is_active: true, created_at: '2026-02-15' },
];

type NovoOperador = {
  nome: string;
  email: string;
  senha: string;
  role: RootRole;
};

const ROLES_DISPONIVEIS: RootRole[] = ['super_admin', 'suporte', 'financeiro', 'operacional'];

export const EquipeRoot = () => {
  const { operador: operadorLogado, refreshOperador } = useRootAuth();
  const [equipe, setEquipe] = useState<RootAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [operadorEmEdicao, setOperadorEmEdicao] = useState<RootAdmin | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<string | null>(null);
  const [novoOp, setNovoOp] = useState<NovoOperador>({
    nome: '', email: '', senha: '', role: 'suporte',
  });

  useEffect(() => {
    fetchEquipe();
  }, []);

  const fetchEquipe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('root_admins')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        setFeedback({ tipo: 'erro', msg: 'Erro ao carregar equipe: ' + error.message });
        setEquipe([]);
      } else {
        setEquipe(data || []);
      }
    } catch {
      setEquipe(MOCK_EQUIPE);
    } finally {
      setLoading(false);
    }
  };

  // Cria novo operador via Supabase Admin (requer service role key no backend)
  // Por ora, insere diretamente (funciona em dev com service_role)
  const salvarOperador = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setFeedback(null);

    try {
      if (operadorEmEdicao) {
        // MODO EDIÇÃO
        const { error } = await supabase
          .from('root_admins')
          .update({
            nome: novoOp.nome,
            role: novoOp.role,
          })
          .eq('id', operadorEmEdicao.id);

        if (error) throw error;

        // Se o usuário editou a si mesmo, atualiza o contexto global para o nome mudar na Topbar
        if (operadorEmEdicao.id === operadorLogado?.id) {
          await refreshOperador();
        }

        setFeedback({ tipo: 'ok', msg: 'Operador atualizado com sucesso!' });
      } else {
        // MODO CRIAÇÃO
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: novoOp.email,
          password: novoOp.senha,
        });

        if (authError || !authData.user) {
          setFeedback({ tipo: 'erro', msg: authError?.message || 'Erro ao criar usuário.' });
          return;
        }

        const { error: insertError } = await supabase
          .from('root_admins')
          .insert({
            id: authData.user.id,
            nome: novoOp.nome,
            email: novoOp.email,
            role: novoOp.role,
            is_root: false,
            is_active: true,
            created_by: operadorLogado?.id,
          });

        if (insertError) {
          setFeedback({ tipo: 'erro', msg: 'Usuário criado no Auth, mas erro ao inserir na equipe: ' + insertError.message });
          return;
        }

        setFeedback({ tipo: 'ok', msg: `Operador "${novoOp.nome}" criado com sucesso!` });
      }

      setModalAberto(false);
      setNovoOp({ nome: '', email: '', senha: '', role: 'suporte' });
      setOperadorEmEdicao(null);
      fetchEquipe();
    } catch (err: any) {
      setFeedback({ tipo: 'erro', msg: err?.message || 'Erro inesperado. Tente novamente.' });
    } finally {
      setSalvando(false);
    }
  };

  const abrirEdicao = (op: RootAdmin) => {
    setOperadorEmEdicao(op);
    setNovoOp({
      nome: op.nome,
      email: op.email,
      senha: '', // senha não é editada por aqui por segurança
      role: op.role,
    });
    setModalAberto(true);
  };

  const abrirCriacao = () => {
    setOperadorEmEdicao(null);
    setNovoOp({ nome: '', email: '', senha: '', role: 'suporte' });
    setModalAberto(true);
  };

  const toggleAtivo = async (op: RootAdmin) => {
    if (op.is_root) return; // nunca desativa o root
    const novoStatus = !op.is_active;
    const { error } = await supabase
      .from('root_admins')
      .update({ is_active: novoStatus })
      .eq('id', op.id);
    if (!error) {
      setEquipe(prev => prev.map(o => o.id === op.id ? { ...o, is_active: novoStatus } : o));
    }
  };

  const mudarRole = async (op: RootAdmin, novoRole: RootRole) => {
    if (op.is_root) return;
    const { error } = await supabase
      .from('root_admins')
      .update({ role: novoRole })
      .eq('id', op.id);
    if (!error) {
      setEquipe(prev => prev.map(o => o.id === op.id ? { ...o, role: novoRole } : o));
    }
  };

  const deletarOperador = async (id: string) => {
    if (confirmarExclusao !== id) {
      setConfirmarExclusao(id);
      return;
    }

    try {
      const { error } = await supabase
        .from('root_admins')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEquipe(prev => prev.filter(op => op.id !== id));
      setFeedback({ tipo: 'ok', msg: 'Operador removido da equipe.' });
    } catch (err: any) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao excluir: ' + err.message });
    } finally {
      setConfirmarExclusao(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield size={22} className="text-amber-500 dark:text-amber-400" /> Equipe Interna
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Operadores com acesso ao BackOffice · {equipe.filter(o => o.is_active).length} ativos
          </p>
        </div>
        <RootRoleGuard roles={['root']}>
          <button
            id="btn-novo-operador"
            onClick={abrirCriacao}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-4 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-amber-400/10"
          >
            <Plus size={16} />
            Novo Operador
          </button>
        </RootRoleGuard>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm font-medium ${
          feedback.tipo === 'ok'
            ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
            : 'bg-rose-400/10 border-rose-400/20 text-rose-400'
        }`}>
          {feedback.tipo === 'ok' ? <Check size={16} /> : <AlertCircle size={16} />}
          {feedback.msg}
        </div>
      )}

      {/* Tabela de operadores */}
      <div className="bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl overflow-hidden shadow-sm dark:shadow-none transition-colors">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 dark:border-[#1e2d4a]">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left px-5 py-3.5 font-medium">Operador</th>
              <th className="text-left px-5 py-3.5 font-medium">Role / Acesso</th>
              <th className="text-left px-5 py-3.5 font-medium">Status</th>
              <th className="text-left px-5 py-3.5 font-medium">Desde</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2d4a]">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-5 py-4">
                    <div className="h-4 bg-gray-50 dark:bg-[#1e2d4a] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : equipe.map((op) => {
              const roleC = ROLE_CONFIG[op.role];
              const ehVoce = op.id === operadorLogado?.id;
              return (
                <tr key={op.id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center font-bold text-gray-900 text-sm flex-shrink-0">
                        {op.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {op.nome}
                          {ehVoce && <span className="ml-2 text-[10px] text-amber-500 dark:text-amber-400 font-bold">(você)</span>}
                        </p>
                        <p className="text-xs text-gray-500">{op.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {op.is_root ? (
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${roleC.bg} ${roleC.color}`}>
                        {roleC.label}
                      </span>
                    ) : (
                      <RootRoleGuard roles={['root']}>
                        <select
                          value={op.role}
                          onChange={(e) => mudarRole(op, e.target.value as RootRole)}
                          className="bg-gray-50 dark:bg-[#141c2e] border border-gray-100 dark:border-[#1e2d4a] text-gray-600 dark:text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400/40 transition-colors"
                        >
                          {ROLES_DISPONIVEIS.map((r) => (
                            <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                          ))}
                        </select>
                      </RootRoleGuard>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      op.is_active
                        ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                        : 'bg-gray-400/10 text-gray-400 border-gray-400/20'
                    }`}>
                      {op.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {new Date(op.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <RootRoleGuard roles={['root']}>
                        <button
                          onClick={() => abrirEdicao(op)}
                          className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Editar dados"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        {!op.is_root && (
                          <>
                            <button
                              onClick={() => toggleAtivo(op)}
                              title={op.is_active ? 'Desativar' : 'Ativar'}
                              className={`p-2 rounded-lg transition-colors ${
                                op.is_active
                                  ? 'text-rose-400 hover:bg-rose-400/10'
                                  : 'text-emerald-400 hover:bg-emerald-400/10'
                              }`}
                            >
                              {op.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                            </button>
                            <button
                              onClick={() => deletarOperador(op.id)}
                              title="Excluir permanentemente"
                              className={`p-2 rounded-lg transition-all ${
                                confirmarExclusao === op.id
                                  ? 'bg-rose-500 text-white animate-pulse'
                                  : 'text-gray-400 hover:text-rose-500 hover:bg-rose-500/10'
                              }`}
                            >
                              {confirmarExclusao === op.id ? <Check size={15} /> : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              )}
                            </button>
                          </>
                        )}
                      </RootRoleGuard>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Novo Operador */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0e1425] border border-gray-200 dark:border-[#1e2d4a] rounded-2xl p-8 w-full max-w-md shadow-2xl transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {operadorEmEdicao ? 'Editar Operador' : 'Novo Operador'}
              </h2>
              <button 
                onClick={() => { setModalAberto(false); setOperadorEmEdicao(null); }} 
                className="text-gray-500 hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <form id="form-operador" onSubmit={salvarOperador} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Nome*</label>
                <input
                  id="novo-op-nome"
                  type="text"
                  required
                  value={novoOp.nome}
                  onChange={(e) => setNovoOp({ ...novoOp, nome: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#141c2e] border border-gray-100 dark:border-[#1e2d4a] rounded-xl text-sm text-gray-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400/40 transition-all"
                />
              </div>
              {!operadorEmEdicao && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">E-mail*</label>
                    <input
                      id="novo-op-email"
                      type="email"
                      required
                      value={novoOp.email}
                      onChange={(e) => setNovoOp({ ...novoOp, email: e.target.value })}
                      placeholder="operador@empresa.com"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#141c2e] border border-gray-100 dark:border-[#1e2d4a] rounded-xl text-sm text-gray-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Senha inicial*</label>
                    <input
                      id="novo-op-senha"
                      type="password"
                      required
                      minLength={8}
                      value={novoOp.senha}
                      onChange={(e) => setNovoOp({ ...novoOp, senha: e.target.value })}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#141c2e] border border-gray-100 dark:border-[#1e2d4a] rounded-xl text-sm text-gray-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400/40 transition-all"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Nível de acesso*</label>
                <select
                  value={novoOp.role}
                  onChange={(e) => setNovoOp({ ...novoOp, role: e.target.value as RootRole })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#141c2e] border border-gray-100 dark:border-[#1e2d4a] rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-amber-400/40 transition-all"
                >
                  {ROLES_DISPONIVEIS.map((r) => (
                    <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-600 mt-1.5">
                  {novoOp.role === 'super_admin' && 'Acesso total, exceto gerenciar outros operadores.'}
                  {novoOp.role === 'suporte' && 'Vê e gerencia clientes. Sem acesso ao financeiro.'}
                  {novoOp.role === 'financeiro' && 'Dashboard e módulo financeiro. Sem acesso a clientes.'}
                  {novoOp.role === 'operacional' && 'Provisionamento e parametrização de clientes.'}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="flex-1 border border-gray-200 dark:border-[#1e2d4a] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 font-semibold py-2.5 rounded-xl transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirmar-operador"
                  type="submit"
                  disabled={salvando}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/40 text-gray-900 font-bold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                >
                  {salvando ? (
                    <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {operadorEmEdicao ? <Check size={14} /> : <Plus size={14} />} 
                      {operadorEmEdicao ? 'Salvar Alterações' : 'Criar Operador'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
