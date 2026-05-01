import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Search, UserX, UserCheck, AlertCircle } from 'lucide-react';

interface Props {
  turmaId: string;
  turmaNome: string;
  escolaId: string;
  anoLetivo: number;
}

interface AlunoMatricula {
  matricula_id: string;
  aluno_id: string;
  nome: string;
  status: string;
}

interface AlunoBusca {
  id: string;
  nome: string;
  cpf: string;
}

const MOTIVOS_SAIDA = ['Transferido', 'Evadido', 'Expulso', 'Outro'];

export const AlunosTurma: React.FC<Props> = ({ turmaId, turmaNome, escolaId, anoLetivo }) => {
  const [alunos, setAlunos] = useState<AlunoMatricula[]>([]);
  const [loading, setLoading] = useState(false);

  // Busca para adicionar aluno
  const [showBusca, setShowBusca] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState<AlunoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [erroBusca, setErroBusca] = useState('');

  // Modal de saída
  const [alunoSaida, setAlunoSaida] = useState<AlunoMatricula | null>(null);
  const [motivoSaida, setMotivoSaida] = useState('Transferido');
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  const carregarAlunos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('matriculas')
      .select('id, status, perfis:aluno_id (id, nome)')
      .eq('turma_id', turmaId)
      .order('status');
    setAlunos(
      ((data || []) as any[]).map(m => ({
        matricula_id: m.id,
        aluno_id: m.perfis?.id || '',
        nome: m.perfis?.nome || '—',
        status: m.status,
      }))
    );
    setLoading(false);
  }, [turmaId]);

  useEffect(() => { carregarAlunos(); }, [carregarAlunos]);

  const buscarAlunos = async () => {
    if (termoBusca.length < 2) return;
    setBuscando(true);
    setErroBusca('');
    // Busca perfis com papel Aluno na escola
    const { data } = await supabase
      .from('membros_escola')
      .select('perfis:user_id (id, nome, cpf)')
      .eq('escola_id', escolaId)
      .eq('papel', 'Aluno')
      .ilike('perfis.nome', `%${termoBusca}%`);
    setResultadosBusca(((data || []) as any[]).map(d => d.perfis).filter(Boolean));
    setBuscando(false);
  };

  const handleAdicionarAluno = async (aluno: AlunoBusca) => {
    setAdicionando(true);
    setErroBusca('');

    // Verifica se o aluno já tem matrícula ativa em outra turma do mesmo ano/escola
    const { data: outraMatricula } = await supabase
      .from('matriculas')
      .select('id, turmas:turma_id (nome, ano_letivo)')
      .eq('aluno_id', aluno.id)
      .eq('escola_id', escolaId)
      .eq('status', 'Ativo')
      .single();

    if (outraMatricula) {
      const outraTurma = (outraMatricula as any).turmas;
      if (outraTurma?.ano_letivo === anoLetivo) {
        setErroBusca(`"${aluno.nome}" já está matriculado na turma "${outraTurma.nome}" (${anoLetivo}).`);
        setAdicionando(false);
        return;
      }
    }

    const { error } = await supabase.from('matriculas').insert({
      escola_id: escolaId,
      turma_id: turmaId,
      aluno_id: aluno.id,
      status: 'Ativo',
    });

    if (error) {
      if (error.code === '23505') {
        setErroBusca(`"${aluno.nome}" já consta nesta turma.`);
      } else {
        setErroBusca('Erro ao matricular. Tente novamente.');
      }
    } else {
      setShowBusca(false);
      setTermoBusca('');
      setResultadosBusca([]);
      carregarAlunos();
    }
    setAdicionando(false);
  };

  const handleConfirmarSaida = async () => {
    if (!alunoSaida) return;
    setConfirmandoSaida(true);
    await supabase.from('matriculas').update({
      status: motivoSaida,
      motivo_saida: motivoSaida,
      data_saida: new Date().toISOString().split('T')[0],
    }).eq('id', alunoSaida.matricula_id);
    setAlunoSaida(null);
    setConfirmandoSaida(false);
    carregarAlunos();
  };

  const ativos = alunos.filter(a => a.status === 'Ativo');
  const inativos = alunos.filter(a => a.status !== 'Ativo');

  return (
    <div className="space-y-4">
      {/* Header da aba */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          <span className="font-bold text-indigo-700">{ativos.length}</span> aluno(s) ativo(s) em {turmaNome}
        </p>
        <button
          onClick={() => { setShowBusca(!showBusca); setErroBusca(''); setResultadosBusca([]); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
        >
          <Plus size={14} /> Adicionar Aluno
        </button>
      </div>

      {/* Painel de busca */}
      {showBusca && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-indigo-700 uppercase">Buscar Aluno para Matricular</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text" placeholder="Digite o nome do aluno..."
                value={termoBusca} onChange={e => setTermoBusca(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarAlunos()}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={buscarAlunos} disabled={buscando || termoBusca.length < 2}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {buscando ? '...' : 'Buscar'}
            </button>
          </div>

          {erroBusca && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2">
              <AlertCircle size={14} /> {erroBusca}
            </div>
          )}

          {resultadosBusca.length > 0 && (
            <ul className="divide-y divide-indigo-100 bg-white rounded-lg border border-indigo-200 overflow-hidden">
              {resultadosBusca.map(a => (
                <li key={a.id} className="flex justify-between items-center px-3 py-2 hover:bg-indigo-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.nome}</p>
                    <p className="text-xs text-gray-500">{a.cpf || 'CPF não informado'}</p>
                  </div>
                  <button
                    onClick={() => handleAdicionarAluno(a)}
                    disabled={adicionando}
                    className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Matricular
                  </button>
                </li>
              ))}
            </ul>
          )}

          {resultadosBusca.length === 0 && termoBusca.length >= 2 && !buscando && (
            <p className="text-xs text-gray-500 text-center py-2">
              Nenhum aluno encontrado. Verifique se o aluno está cadastrado no sistema com papel "Aluno".
            </p>
          )}
        </div>
      )}

      {/* Lista de alunos ativos */}
      {loading ? (
        <div className="text-center py-6 text-gray-400 text-sm">Carregando...</div>
      ) : ativos.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-xl border border-gray-200">
          Nenhum aluno matriculado nesta turma ainda.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {ativos.map((a, i) => (
            <li key={a.matricula_id} className="flex justify-between items-center px-4 py-2.5 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-xs w-5 text-right">{i + 1}</span>
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                  {a.nome.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">{a.nome}</span>
              </div>
              <button
                onClick={() => { setAlunoSaida(a); setMotivoSaida('Transferido'); }}
                title="Registrar saída"
                className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
              >
                <UserX size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Alunos inativos (histórico) */}
      {inativos.length > 0 && (
        <details className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
          <summary className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100">
            Histórico de Saídas ({inativos.length})
          </summary>
          <ul className="divide-y divide-gray-100">
            {inativos.map(a => (
              <li key={a.matricula_id} className="flex items-center gap-3 px-4 py-2.5 opacity-60">
                <UserCheck size={15} className="text-gray-400" />
                <span className="text-sm text-gray-700">{a.nome}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                  a.status === 'Transferido' ? 'bg-blue-100 text-blue-700' :
                  a.status === 'Evadido'     ? 'bg-amber-100 text-amber-700' :
                                               'bg-red-100 text-red-700'
                }`}>{a.status}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Modal Registrar Saída */}
      {alunoSaida && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <UserX size={18} className="text-red-500" /> Registrar Saída
            </h3>
            <p className="text-sm text-gray-600">
              Registrar saída de <strong>{alunoSaida.nome}</strong> da turma <strong>{turmaNome}</strong>?
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Motivo</label>
              <select
                value={motivoSaida} onChange={e => setMotivoSaida(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white appearance-none focus:ring-2 focus:ring-indigo-500"
              >
                {MOTIVOS_SAIDA.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              ⚠️ O registro histórico da matrícula é preservado conforme a LDBEN.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAlunoSaida(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">
                Cancelar
              </button>
              <button onClick={handleConfirmarSaida} disabled={confirmandoSaida}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50">
                {confirmandoSaida ? 'Registrando...' : 'Confirmar Saída'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
