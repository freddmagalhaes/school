import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Building2, ShieldAlert, Settings, Save, 
  CheckCircle2, UserPlus, Lock, Calendar, Plus, Trash2
} from 'lucide-react';

type Tab = 'dados' | 'acessos' | 'preferencias' | 'periodos';

interface PeriodoLetivo {
  id: string;
  nome: string;
  ordem: number;
  ano_letivo: number;
  data_inicio: string;
  data_fim: string;
}

const MODELOS_PERIODO: Record<string, { nome: string; periodos: Omit<PeriodoLetivo, 'id' | 'escola_id' | 'ano_letivo'>[] }> = {
  Bimestral: {
    nome: 'Bimestral (4x)',
    periodos: [
      { nome: '1º Bimestre', ordem: 1, data_inicio: '', data_fim: '' },
      { nome: '2º Bimestre', ordem: 2, data_inicio: '', data_fim: '' },
      { nome: '3º Bimestre', ordem: 3, data_inicio: '', data_fim: '' },
      { nome: '4º Bimestre', ordem: 4, data_inicio: '', data_fim: '' },
    ]
  },
  Trimestral: {
    nome: 'Trimestral (3x)',
    periodos: [
      { nome: '1º Trimestre', ordem: 1, data_inicio: '', data_fim: '' },
      { nome: '2º Trimestre', ordem: 2, data_inicio: '', data_fim: '' },
      { nome: '3º Trimestre', ordem: 3, data_inicio: '', data_fim: '' },
    ]
  },
  Semestral: {
    nome: 'Semestral (2x)',
    periodos: [
      { nome: '1º Semestre', ordem: 1, data_inicio: '', data_fim: '' },
      { nome: '2º Semestre', ordem: 2, data_inicio: '', data_fim: '' },
    ]
  },
};

export const Configuracoes: React.FC = () => {
  const { escolaAtiva, isSystemRoot } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dados');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Estados Form: Dados da Instituição
  const [escolaNome, setEscolaNome] = useState(escolaAtiva?.escola.nome || '');
  const [escolaCnpj, setEscolaCnpj] = useState(escolaAtiva?.escola.cnpj || '');
  const [escolaTelefone, setEscolaTelefone] = useState('(00) 0000-0000');
  
  // Estados Form: Preferências
  const [formatoAvaliacao, setFormatoAvaliacao] = useState('Bimestral');
  const [bloquearNotas, setBloquearNotas] = useState(false);

  // Estados: Períodos Letivos
  const [periodos, setPeriodos] = useState<PeriodoLetivo[]>([]);
  const [anoLetivoP, setAnoLetivoP] = useState(new Date().getFullYear());
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [modeloSelecionado, setModeloSelecionado] = useState('Bimestral');
  const [gerando, setGerando] = useState(false);

  // Verificação de Acesso (Level Access)
  // O AppShell já restringe a rota para 'Admin', mas por precaução e para mostrar o "level access":
  const isAdmin = escolaAtiva?.papel === 'Admin';
  const podeEditar = isAdmin || isSystemRoot; 

  const [usuariosAcesso, setUsuariosAcesso] = useState<any[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  useEffect(() => {
    if (activeTab === 'acessos' && escolaAtiva) {
      carregarUsuarios();
    }
    if (activeTab === 'periodos' && escolaAtiva) {
      carregarPeriodos();
    }
  }, [activeTab, escolaAtiva, anoLetivoP]);

  const carregarUsuarios = async () => {
    setLoadingUsuarios(true);
    const { data, error } = await supabase
      .from('membros_escola')
      .select(`
        id, papel,
        perfil:perfis (nome, cpf)
      `)
      .eq('escola_id', escolaAtiva.escola_id);
      
    if (!error && data) {
      setUsuariosAcesso(data);
    }
    setLoadingUsuarios(false);
  };

  const carregarPeriodos = async () => {
    if (!escolaAtiva) return;
    setLoadingPeriodos(true);
    const { data } = await supabase
      .from('periodos_letivos')
      .select('*')
      .eq('escola_id', escolaAtiva.escola_id)
      .eq('ano_letivo', anoLetivoP)
      .order('ordem');
    setPeriodos((data || []) as PeriodoLetivo[]);
    setLoadingPeriodos(false);
  };

  const handleGerarPeriodos = async () => {
    if (!escolaAtiva || !podeEditar) return;
    setGerando(true);
    // Remove periodos existentes do ano
    await supabase.from('periodos_letivos')
      .delete()
      .eq('escola_id', escolaAtiva.escola_id)
      .eq('ano_letivo', anoLetivoP);
    // Insere o modelo selecionado
    const modelo = MODELOS_PERIODO[modeloSelecionado];
    const inserts = modelo.periodos.map(p => ({
      escola_id: escolaAtiva.escola_id,
      nome: p.nome,
      ordem: p.ordem,
      ano_letivo: anoLetivoP,
      data_inicio: `${anoLetivoP}-02-01`,
      data_fim: `${anoLetivoP}-12-15`,
    }));
    await supabase.from('periodos_letivos').insert(inserts);
    setGerando(false);
    carregarPeriodos();
  };

  const handleExcluirPeriodo = async (id: string) => {
    await supabase.from('periodos_letivos').delete().eq('id', id);
    carregarPeriodos();
  };

  const handleUpdatePeriodo = async (id: string, field: string, value: string) => {
    await supabase.from('periodos_letivos').update({ [field]: value }).eq('id', id);
    carregarPeriodos();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeEditar || !escolaAtiva) return;
    
    setSaving(true);
    setSuccessMsg('');
    
    const { error } = await supabase
      .from('escolas')
      .update({ nome: escolaNome, cnpj: escolaCnpj })
      .eq('id', escolaAtiva.escola_id);

    if (error) {
      alert('Erro ao atualizar configurações: ' + error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccessMsg('Configurações atualizadas com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h2>
        <p className="text-sm text-gray-500">Gerencie as preferências e dados da unidade: {escolaAtiva?.escola.nome}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('dados')}
          className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'dados' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Building2 size={18} />
          Dados da Instituição
        </button>
        <button
          onClick={() => setActiveTab('acessos')}
          className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'acessos' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <ShieldAlert size={18} />
          Controle de Acessos
        </button>
        <button
          onClick={() => setActiveTab('preferencias')}
          className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'preferencias' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Settings size={18} />
          Preferências
        </button>
        <button
          onClick={() => setActiveTab('periodos')}
          className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'periodos'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Calendar size={18} />
          Períodos Letivos
        </button>
      </div>

      {/* Success Feedback */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-600" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Warning Acesso Negado (caso um usuário sem permissão chegasse aqui) */}
      {!podeEditar && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 flex items-center gap-3">
          <Lock size={20} className="text-amber-600" />
          <p className="text-sm font-medium">Você possui permissão apenas de visualização. Apenas Administradores podem alterar os dados.</p>
        </div>
      )}

      {/* Conteúdo das Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* TAB: DADOS DA INSTITUIÇÃO */}
        {activeTab === 'dados' && (
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Informações Cadastrais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Escola</label>
                <input
                  type="text"
                  value={escolaNome}
                  onChange={e => setEscolaNome(e.target.value)}
                  disabled={!podeEditar}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                <input
                  type="text"
                  value={escolaCnpj}
                  onChange={e => setEscolaCnpj(e.target.value)}
                  disabled={!podeEditar}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone de Contato</label>
                <input
                  type="text"
                  value={escolaTelefone}
                  onChange={e => setEscolaTelefone(e.target.value)}
                  disabled={!podeEditar}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>

            {podeEditar && (
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {saving ? 'Salvando...' : <><Save size={18} /> Salvar Alterações</>}
                </button>
              </div>
            )}
          </form>
        )}

        {/* TAB: CONTROLE DE ACESSOS */}
        {activeTab === 'acessos' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Usuários com Acesso ao Sistema</h3>
                <p className="text-sm text-gray-500">Gerencie quem pode acessar o sistema da sua escola.</p>
              </div>
              {podeEditar && (
                <button className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <UserPlus size={18} /> Convidar Usuário
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3 font-medium">Usuário</th>
                    <th className="px-6 py-3 font-medium">Nível de Acesso</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    {podeEditar && <th className="px-6 py-3 font-medium text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loadingUsuarios ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        Carregando usuários...
                      </td>
                    </tr>
                  ) : usuariosAcesso.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : usuariosAcesso.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                            {user.perfil?.nome?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.perfil?.nome || 'Usuário Desconhecido'}</p>
                            <p className="text-xs text-gray-500">CPF: {user.perfil?.cpf || 'Não informado'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.papel === 'Admin' ? 'bg-purple-100 text-purple-800' :
                          user.papel === 'Diretor' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.papel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          Ativo
                        </span>
                      </td>
                      {podeEditar && (
                        <td className="px-6 py-4 text-sm text-right">
                          <button className="text-indigo-600 hover:text-indigo-900 font-medium mr-3">Editar Papel</button>
                          <button className="text-red-600 hover:text-red-900 font-medium">Remover</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: PREFERÊNCIAS */}
        {activeTab === 'preferencias' && (
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">Parâmetros do Ano Letivo</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Formato de Avaliação</label>
                <select
                  value={formatoAvaliacao}
                  onChange={e => setFormatoAvaliacao(e.target.value)}
                  disabled={!podeEditar}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 appearance-none"
                >
                  <option value="Bimestral">Bimestral (4 Etapas)</option>
                  <option value="Trimestral">Trimestral (3 Etapas)</option>
                  <option value="Semestral">Semestral (2 Etapas)</option>
                </select>
              </div>

              <div className="flex items-center h-full pt-6">
                <div className="flex items-center">
                  <input
                    id="bloquear-notas"
                    type="checkbox"
                    checked={bloquearNotas}
                    onChange={e => setBloquearNotas(e.target.checked)}
                    disabled={!podeEditar}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <label htmlFor="bloquear-notas" className={`ml-2 block text-sm ${!podeEditar ? 'text-gray-500' : 'text-gray-900'}`}>
                    Bloquear lançamento de notas retroativas (Professores)
                  </label>
                </div>
              </div>
            </div>

            {podeEditar && (
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {saving ? 'Salvando...' : <><Save size={18} /> Salvar Preferências</>}
                </button>
              </div>
            )}
          </form>
        )}

        {/* ========== ABA: PERÍODOS LETIVOS ========== */}
        {activeTab === 'periodos' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Calendar size={18} className="text-indigo-600" /> Configurar Períodos Letivos</h2>
              <p className="text-sm text-gray-500">Defina os períodos do ano letivo (Bimestral, Trimestral ou Semestral). O padrão é Bimestral conforme a maioria das redes de ensino.</p>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Ano Letivo</label>
                  <input type="number" value={anoLetivoP} onChange={e => setAnoLetivoP(Number(e.target.value))}
                    className="w-28 p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Modelo de Período</label>
                  <select value={modeloSelecionado} onChange={e => setModeloSelecionado(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 appearance-none">
                    {Object.entries(MODELOS_PERIODO).map(([k, v]) => (
                      <option key={k} value={k}>{v.nome}</option>
                    ))}
                  </select>
                </div>
                {podeEditar && (
                  <button onClick={handleGerarPeriodos} disabled={gerando}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                    <Plus size={16} /> {gerando ? 'Gerando...' : `Gerar Períodos ${anoLetivoP}`}
                  </button>
                )}
              </div>
            </div>

            {loadingPeriodos ? (
              <div className="text-center py-6 text-gray-400 text-sm">Carregando...</div>
            ) : periodos.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-200">
                Nenhum período cadastrado para {anoLetivoP}. Gere acima.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 w-8">#</th>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Início</th>
                      <th className="px-4 py-3">Término</th>
                      {podeEditar && <th className="px-4 py-3 w-16"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {periodos.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 font-medium">{p.ordem}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{p.nome}</td>
                        <td className="px-4 py-3">
                          <input type="date" defaultValue={p.data_inicio}
                            onBlur={e => handleUpdatePeriodo(p.id, 'data_inicio', e.target.value)}
                            disabled={!podeEditar}
                            className="border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-900 bg-white disabled:opacity-50" />
                        </td>
                        <td className="px-4 py-3">
                          <input type="date" defaultValue={p.data_fim}
                            onBlur={e => handleUpdatePeriodo(p.id, 'data_fim', e.target.value)}
                            disabled={!podeEditar}
                            className="border border-gray-300 rounded-md px-2 py-1 text-xs text-gray-900 bg-white disabled:opacity-50" />
                        </td>
                        {podeEditar && (
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleExcluirPeriodo(p.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
