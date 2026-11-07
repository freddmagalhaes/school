import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useEscolaAtual } from '../../../hooks/useEscolaAtual';
import { RootEscolaSelector } from '../../../components/RootEscolaSelector';
import { Plus, Search, Edit2, Trash2, Users, GraduationCap } from 'lucide-react';
import type { Disciplina } from './GestaoDisciplinas';
import { AlunosTurma } from './AlunosTurma';

interface Turma {
  id: string;
  nome: string;
  ano_letivo: number;
  turno: string;
}

interface Professor {
  id: string;
  nome: string;
}

interface TurmaProfessor {
  id: string;
  professor_id: string;
  disciplina_id: string;
  perfis: { nome: string };
  disciplinas: { nome: string };
}

const TURNOS = ['Matutino', 'Vespertino', 'Noturno', 'Integral'];

export const GestaoTurmas: React.FC = () => {
  const {
    escolaId,
    precisaSelecionarEscola,
    escolas,
    escolaRootId,
    setEscolaRootId,
    loadingEscolas,
  } = useEscolaAtual();

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const [showModalTurma, setShowModalTurma] = useState(false);
  const [formTurma, setFormTurma] = useState({ id: '', nome: '', ano_letivo: new Date().getFullYear(), turno: 'Matutino' });

  const [showModalProf, setShowModalProf] = useState(false);
  const [abaModal, setAbaModal] = useState<'professores' | 'alunos'>('professores');
  const [turmaSelecionada, setTurmaSelecionada] = useState<Turma | null>(null);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [turmaProfessores, setTurmaProfessores] = useState<TurmaProfessor[]>([]);
  const [formProf, setFormProf] = useState({ professor_id: '', disciplina_id: '' });
  const [salvandoProf, setSalvandoProf] = useState(false);
  const [erroProf, setErroProf] = useState('');
  const [erroTurma, setErroTurma] = useState('');

  useEffect(() => {
    if (escolaId) {
      carregarTurmas();
      carregarListaProfessores();
      carregarDisciplinas();
    }
  }, [escolaId]);

  const carregarTurmas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('turmas').select('*').eq('escola_id', escolaId!).order('nome');
    setTurmas(data || []);
    setLoading(false);
  };

  const carregarListaProfessores = async () => {
    const { data } = await supabase
      .from('membros_escola')
      .select('perfis:user_id (id, nome)')
      .eq('escola_id', escolaId!)
      .eq('papel', 'Professor');
    setProfessores(((data || []) as any[]).map(d => d.perfis).filter(Boolean));
  };

  const carregarDisciplinas = async () => {
    const { data } = await supabase
      .from('disciplinas').select('id, nome').eq('escola_id', escolaId!).order('nome');
    setDisciplinas(data || []);
  };

  const carregarProfessoresDaTurma = async (turmaId: string) => {
    const { data } = await supabase
      .from('turma_professores')
      .select('id, professor_id, disciplina_id, perfis:professor_id (nome), disciplinas:disciplina_id (nome)')
      .eq('turma_id', turmaId);
    setTurmaProfessores((data || []) as unknown as TurmaProfessor[]);
  };

  const handleSalvarTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaId) return;
    setErroTurma('');
    // .select() devolve as linhas gravadas: se vier vazio, o banco recusou (permissão) e nada foi salvo
    const { data, error } = formTurma.id
      ? await supabase.from('turmas').update({
          nome: formTurma.nome, ano_letivo: formTurma.ano_letivo, turno: formTurma.turno
        }).eq('id', formTurma.id).select('id')
      : await supabase.from('turmas').insert({
          escola_id: escolaId,
          nome: formTurma.nome, ano_letivo: formTurma.ano_letivo, turno: formTurma.turno
        }).select('id');
    if (error || !data || data.length === 0) {
      setShowModalTurma(false);
      setErroTurma(error?.code === '23505'
        ? 'Já existe uma turma com este nome neste ano letivo.'
        : 'Não foi possível salvar a turma. Você pode não ter permissão nesta escola.');
      return;
    }
    setShowModalTurma(false);
    carregarTurmas();
  };

  const handleExcluirTurma = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta turma? Matrículas, notas e frequências também serão removidas!')) return;
    setErroTurma('');
    const { data, error } = await supabase.from('turmas').delete().eq('id', id).select('id');
    if (error || !data || data.length === 0) setErroTurma('Não foi possível excluir a turma. Você pode não ter permissão nesta escola.');
    carregarTurmas();
  };

  const handleSalvarProfTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turmaSelecionada || !escolaId) return;
    setErroProf('');
    setSalvandoProf(true);
    const { error } = await supabase.from('turma_professores').insert({
      escola_id: escolaId,
      turma_id: turmaSelecionada.id,
      professor_id: formProf.professor_id,
      disciplina_id: formProf.disciplina_id
    });
    setSalvandoProf(false);
    if (error) {
      if (error.code === '23505') setErroProf('Este professor já está vinculado a esta disciplina nesta turma.');
      else setErroProf('Erro ao vincular. Tente novamente.');
      return;
    }
    carregarProfessoresDaTurma(turmaSelecionada.id);
    setFormProf({ professor_id: '', disciplina_id: '' });
  };

  const handleExcluirProfTurma = async (id: string) => {
    await supabase.from('turma_professores').delete().eq('id', id);
    if (turmaSelecionada) carregarProfessoresDaTurma(turmaSelecionada.id);
  };

  const openProfModal = (turma: Turma, aba: 'professores' | 'alunos' = 'professores') => {
    setTurmaSelecionada(turma);
    setAbaModal(aba);
    setFormProf({ professor_id: '', disciplina_id: '' });
    setErroProf('');
    carregarProfessoresDaTurma(turma.id);
    setShowModalProf(true);
  };

  const turmasFiltradas = turmas.filter(t =>
    t.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Seletor de escola para o Root sem vínculo */}
      {(precisaSelecionarEscola || (!escolaId && escolas.length > 0)) && (
        <RootEscolaSelector
          escolas={escolas}
          escolaRootId={escolaRootId}
          setEscolaRootId={setEscolaRootId}
          loading={loadingEscolas}
        />
      )}

      {erroTurma && (
        <div className="p-3 rounded-lg border text-sm bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30">{erroTurma}</div>
      )}

      {!escolaId ? (
        !loadingEscolas && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            Selecione uma escola acima para gerenciar turmas.
          </div>
        )
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text" placeholder="Buscar turma..."
                value={busca} onChange={e => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
              />
            </div>
            <button
              onClick={() => { setFormTurma({ id: '', nome: '', ano_letivo: new Date().getFullYear(), turno: 'Matutino' }); setShowModalTurma(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              <Plus size={18} /> Nova Turma
            </button>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? null : turmasFiltradas.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                {busca ? `Nenhuma turma encontrada para "${busca}".` : 'Nenhuma turma cadastrada. Clique em "Nova Turma" para começar.'}
              </div>
            ) : (
              turmasFiltradas.map(turma => (
                <div key={turma.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{turma.nome}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{turma.turno} • {turma.ano_letivo}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setFormTurma(turma); setShowModalTurma(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleExcluirTurma(turma.id)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openProfModal(turma, 'professores')} className="flex-1 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-slate-700 flex justify-center items-center gap-1.5 transition-colors">
                      <GraduationCap size={15} /> Professores
                    </button>
                    <button onClick={() => openProfModal(turma, 'alunos')} className="flex-1 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 py-2 rounded-lg text-sm font-medium border border-indigo-200 dark:border-indigo-500/30 flex justify-center items-center gap-1.5 transition-colors">
                      <Users size={15} /> Alunos
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Modal Criar/Editar Turma */}
      {showModalTurma && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">{formTurma.id ? 'Editar Turma' : 'Nova Turma'}</h2>
              <button onClick={() => setShowModalTurma(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSalvarTurma} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nome da Turma</label>
                <input
                  required type="text" value={formTurma.nome}
                  onChange={e => setFormTurma({ ...formTurma, nome: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                  placeholder="Ex: 5º Ano A"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ano Letivo</label>
                  <input
                    required type="number" value={formTurma.ano_letivo}
                    onChange={e => setFormTurma({ ...formTurma, ano_letivo: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Turno</label>
                  <select
                    value={formTurma.turno}
                    onChange={e => setFormTurma({ ...formTurma, turno: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800 appearance-none"
                  >
                    {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModalTurma(false)} className="flex-1 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-900 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Salvar Turma</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Professores da Turma */}
      {showModalProf && turmaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">{turmaSelecionada.nome}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{turmaSelecionada.turno} • {turmaSelecionada.ano_letivo}</p>
              </div>
              <button onClick={() => setShowModalProf(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>
            <div className="flex border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
              {(['professores', 'alunos'] as const).map(aba => (
                <button key={aba} onClick={() => setAbaModal(aba)}
                  className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    abaModal === aba ? 'border-b-2 border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
                >
                  {aba === 'professores' ? <GraduationCap size={15} /> : <Users size={15} />}
                  {aba === 'professores' ? 'Professores e Disciplinas' : 'Alunos Matriculados'}
                </button>
              ))}
            </div>

            <div className="p-6 flex-1 overflow-auto bg-gray-50 dark:bg-slate-900">
              {abaModal === 'professores' && (
                <>
                  {disciplinas.length === 0 && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                      Nenhuma disciplina cadastrada. Acesse a aba <strong>Disciplinas</strong> para cadastrá-las primeiro.
                    </div>
                  )}
                  <form onSubmit={handleSalvarProfTurma} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 mb-6 space-y-3 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Vincular Professor à Disciplina</p>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Professor</label>
                        <select required value={formProf.professor_id} onChange={e => setFormProf({...formProf, professor_id: e.target.value})} className="w-full p-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 appearance-none">
                          <option value="">Selecione...</option>
                          {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Disciplina</label>
                        <select required value={formProf.disciplina_id} onChange={e => setFormProf({...formProf, disciplina_id: e.target.value})} className="w-full p-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 appearance-none">
                          <option value="">Selecione...</option>
                          {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                        </select>
                      </div>
                      <button type="submit" disabled={salvandoProf||disciplinas.length===0} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 h-[38px] disabled:opacity-50">
                        <Plus size={16}/> {salvandoProf?'...':'Adicionar'}
                      </button>
                    </div>
                    {erroProf && <p className="text-xs text-red-600 dark:text-red-300">{erroProf}</p>}
                  </form>
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300">
                        <tr>
                          <th className="px-4 py-3 font-medium">Disciplina</th>
                          <th className="px-4 py-3 font-medium">Professor</th>
                          <th className="px-4 py-3 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {turmaProfessores.length===0
                          ? <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Nenhum professor vinculado ainda.</td></tr>
                          : turmaProfessores.map(tp => (
                            <tr key={tp.id} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{tp.disciplinas?.nome}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{tp.perfis?.nome}</td>
                              <td className="px-4 py-3 text-right"><button onClick={()=>handleExcluirProfTurma(tp.id)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"><Trash2 size={16}/></button></td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {abaModal === 'alunos' && escolaId && (
                <AlunosTurma turmaId={turmaSelecionada.id} turmaNome={turmaSelecionada.nome} escolaId={escolaId} anoLetivo={turmaSelecionada.ano_letivo} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
