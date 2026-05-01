import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useEscolaAtual } from '../../../hooks/useEscolaAtual';
import { RootEscolaSelector } from '../../../components/RootEscolaSelector';
import { Calendar, Save, CheckCircle2, XCircle, BookOpen } from 'lucide-react';

interface TurmaVinculo {
  turma_id: string;
  disciplina_id: string;
  disciplina_nome: string;
  turma_nome: string;
}

interface Aluno {
  id: string;
  nome: string;
  matricula_id: string;
}

export const DiarioClasse: React.FC = () => {
  const { user } = useAuth();
  const {
    escolaId,
    isSystemRoot,
    precisaSelecionarEscola,
    escolas,
    escolaRootId,
    setEscolaRootId,
    loadingEscolas,
  } = useEscolaAtual();
  const papel = useAuth().escolaAtiva?.papel;

  const [turmas, setTurmas] = useState<TurmaVinculo[]>([]);
  const [loading, setLoading] = useState(true);

  const [turmaSelecionada, setTurmaSelecionada] = useState<TurmaVinculo | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);

  const [dataDiario, setDataDiario] = useState(new Date().toISOString().split('T')[0]);
  const [frequencias, setFrequencias] = useState<Record<string, boolean>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [msgStatus, setMsgStatus] = useState('');

  useEffect(() => {
    if (escolaId && user) {
      carregarTurmasPermitidas();
    } else {
      setLoading(false);
    }
  }, [escolaId, user]);

  const carregarTurmasPermitidas = async () => {
    setLoading(true);
    const podeVerTudo = isSystemRoot || ['Admin', 'Diretor', 'Secretaria'].includes(papel || '');

    const query = supabase
      .from('turma_professores')
      .select(`
        turma_id, disciplina_id,
        turmas:turma_id (nome),
        disciplinas:disciplina_id (nome)
      `)
      .eq('escola_id', escolaId!);

    if (!podeVerTudo) {
      query.eq('professor_id', user?.id);
    }

    const { data } = await query;

    if (data) {
      const formatado = (data as any[]).map(d => ({
        turma_id: d.turma_id,
        disciplina_id: d.disciplina_id,
        disciplina_nome: d.disciplinas?.nome || '',
        turma_nome: d.turmas?.nome || '',
      }));
      setTurmas(formatado);
    }
    setLoading(false);
  };

  const selecionarTurma = async (t: TurmaVinculo) => {
    setTurmaSelecionada(t);
    setMsgStatus('');

    const { data: matriculasData } = await supabase
      .from('matriculas')
      .select('id, perfis:aluno_id (id, nome)')
      .eq('turma_id', t.turma_id)
      .eq('status', 'Ativo');

    if (matriculasData) {
      const formatado = (matriculasData as any[])
        .map(m => ({ id: m.perfis.id, nome: m.perfis.nome, matricula_id: m.id }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
      setAlunos(formatado);
      carregarDiarioDoDia(formatado, t, dataDiario);
    }
  };

  const carregarDiarioDoDia = async (listaAlunos: Aluno[], t: TurmaVinculo, data: string) => {
    const matriculasIds = listaAlunos.map(a => a.matricula_id);
    if (matriculasIds.length === 0) return;

    // Frequência
    const { data: freqData } = await supabase
      .from('frequencia')
      .select('matricula_id, presente')
      .in('matricula_id', matriculasIds)
      .eq('data', data);

    const freqMap: Record<string, boolean> = {};
    if (freqData && freqData.length > 0) {
      freqData.forEach(f => { freqMap[f.matricula_id] = f.presente; });
    } else {
      listaAlunos.forEach(a => { freqMap[a.matricula_id] = true; });
    }
    setFrequencias(freqMap);

    // Notas
    const { data: notasData } = await supabase
      .from('notas')
      .select('matricula_id, valor')
      .in('matricula_id', matriculasIds)
      .eq('disciplina_id', t.disciplina_id)
      .eq('data', data);

    const notasMap: Record<string, string> = {};
    if (notasData) {
      notasData.forEach((n: any) => { notasMap[n.matricula_id] = n.valor.toString(); });
    }
    setNotas(notasMap);
  };

  useEffect(() => {
    if (turmaSelecionada && alunos.length > 0) {
      carregarDiarioDoDia(alunos, turmaSelecionada, dataDiario);
    }
  }, [dataDiario]);

  const handleSalvarDiario = async () => {
    if (!turmaSelecionada || !escolaId) return;
    setSalvando(true);
    setMsgStatus('');

    try {
      const matriculasIds = alunos.map(a => a.matricula_id);

      // Limpa e reinsere Frequência
      await supabase.from('frequencia').delete().in('matricula_id', matriculasIds).eq('data', dataDiario);
      const insertsFreq = alunos.map(a => ({
        escola_id: escolaId,
        matricula_id: a.matricula_id,
        data: dataDiario,
        presente: frequencias[a.matricula_id] ?? true
      }));
      await supabase.from('frequencia').insert(insertsFreq);

      // Limpa e reinsere Notas (somente as preenchidas)
      await supabase.from('notas').delete()
        .in('matricula_id', matriculasIds)
        .eq('disciplina_id', turmaSelecionada.disciplina_id)
        .eq('data', dataDiario);

      const insertsNotas = alunos
        .filter(a => notas[a.matricula_id] !== undefined && notas[a.matricula_id] !== '')
        .map(a => ({
          escola_id: escolaId,
          matricula_id: a.matricula_id,
          disciplina_id: turmaSelecionada.disciplina_id,
          valor: parseFloat(notas[a.matricula_id].replace(',', '.')),
          data: dataDiario
        }));

      if (insertsNotas.length > 0) {
        await supabase.from('notas').insert(insertsNotas);
      }

      setMsgStatus('Diário salvo com sucesso!');
      setTimeout(() => setMsgStatus(''), 3000);
    } catch (e) {
      setMsgStatus('Erro ao salvar o diário.');
      console.error(e);
    } finally {
      setSalvando(false);
    }
  };

  if (!escolaId) {
    return (
      <div className="space-y-4">
        {(precisaSelecionarEscola || (!escolaId && escolas.length > 0)) && (
          <RootEscolaSelector
            escolas={escolas}
            escolaRootId={escolaRootId}
            setEscolaRootId={setEscolaRootId}
            loading={loadingEscolas}
          />
        )}
        {!loadingEscolas && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
            Selecione uma escola acima para acessar o diário.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-6 items-start">
      {/* Sidebar de Turmas */}
      <div className="w-60 shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sticky top-6">
        <h2 className="font-bold text-gray-900 mb-4 px-2 text-sm uppercase tracking-wide">Suas Disciplinas</h2>

        {loading ? (
          <div className="text-sm text-gray-400 px-2">Carregando...</div>
        ) : turmas.length === 0 ? (
          <div className="text-sm text-gray-500 px-2">Nenhuma turma ou disciplina vinculada a você.</div>
        ) : (
          <div className="space-y-1">
            {turmas.map(t => (
              <button
                key={`${t.turma_id}-${t.disciplina_id}`}
                onClick={() => selecionarTurma(t)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  turmaSelecionada?.turma_id === t.turma_id && turmaSelecionada?.disciplina_id === t.disciplina_id
                    ? 'bg-indigo-50 text-indigo-700 font-bold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="truncate font-medium">{t.turma_nome}</div>
                <div className="text-xs opacity-70 truncate mt-0.5">{t.disciplina_nome}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conteúdo do Diário */}
      <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {!turmaSelecionada ? (
          <div className="p-12 text-center text-gray-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-40" />
            <p className="font-medium">Selecione uma turma ao lado para iniciar o diário.</p>
          </div>
        ) : (
          <div>
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{turmaSelecionada.turma_nome}</h2>
                <p className="text-sm text-indigo-600 font-semibold">{turmaSelecionada.disciplina_nome}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                  <Calendar size={18} className="text-gray-400" />
                  <input
                    type="date"
                    value={dataDiario}
                    onChange={e => setDataDiario(e.target.value)}
                    className="text-sm font-medium text-gray-700 focus:outline-none bg-transparent"
                  />
                </div>
                <button
                  onClick={handleSalvarDiario}
                  disabled={salvando || alunos.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar Diário'}
                </button>
              </div>
            </div>

            {msgStatus && (
              <div className={`px-6 py-3 text-sm font-medium ${msgStatus.includes('Erro') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                {msgStatus}
              </div>
            )}

            <div className="p-6 overflow-auto">
              <table className="w-full text-left">
                <thead className="text-xs uppercase text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="pb-3 font-bold w-12 text-center">Nº</th>
                    <th className="pb-3 font-bold">Aluno</th>
                    <th className="pb-3 font-bold w-44 text-center">Frequência</th>
                    <th className="pb-3 font-bold w-32 text-center">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {alunos.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-gray-500">Nenhum aluno matriculado nesta turma.</td></tr>
                  ) : (
                    alunos.map((aluno, idx) => (
                      <tr key={aluno.id} className="hover:bg-gray-50/50">
                        <td className="py-3 text-center text-gray-400 font-medium">{idx + 1}</td>
                        <td className="py-3 font-medium text-gray-900">{aluno.nome}</td>
                        <td className="py-3">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => setFrequencias({ ...frequencias, [aluno.matricula_id]: true })}
                              title="Presente"
                              className={`p-1.5 rounded-md transition-colors ${frequencias[aluno.matricula_id] !== false ? 'bg-emerald-100 text-emerald-700' : 'text-gray-300 hover:bg-gray-100'}`}
                            >
                              <CheckCircle2 size={20} />
                            </button>
                            <button
                              onClick={() => setFrequencias({ ...frequencias, [aluno.matricula_id]: false })}
                              title="Falta"
                              className={`p-1.5 rounded-md transition-colors ${frequencias[aluno.matricula_id] === false ? 'bg-red-100 text-red-700' : 'text-gray-300 hover:bg-gray-100'}`}
                            >
                              <XCircle size={20} />
                            </button>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-center">
                            <input
                              type="number" step="0.1" min="0" max="10"
                              value={notas[aluno.matricula_id] || ''}
                              onChange={e => setNotas({ ...notas, [aluno.matricula_id]: e.target.value })}
                              placeholder="—"
                              className="w-16 text-center py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
