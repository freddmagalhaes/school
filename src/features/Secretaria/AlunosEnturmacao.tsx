import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { jsPDF } from 'jspdf';
import { FileText, ArrowRight, Plus } from 'lucide-react';

interface Aluno {
  id: string;
  nome: string;
  matricula: string;
  turmaAtual: string;
  status: string;
  matricula_id: string;
}

interface Turma {
  id: string;
  nome: string;
}

interface NovoAlunoForm {
  nome: string;
  email: string;
  cpf: string;
  turma_id: string;
}

export const AlunosEnturmacao: React.FC = () => {
  const { escolaAtiva } = useAuth();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(false);
  const [motivoSaida, setMotivoSaida] = useState('');
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  const [novoAluno, setNovoAluno] = useState<NovoAlunoForm>({ nome: '', email: '', cpf: '', turma_id: '' });
  const [matriculando, setMatriculando] = useState(false);
  const [matriculaFeedback, setMatriculaFeedback] = useState('');
  const [matriculaError, setMatriculaError] = useState('');
  const [showMatriculaModal, setShowMatriculaModal] = useState(false);

  useEffect(() => {
    if (!escolaAtiva) return;
    carregarAlunos();
    carregarTurmas();
  }, [escolaAtiva]);

  const carregarTurmas = async () => {
    if (!escolaAtiva) return;
    const { data } = await supabase
      .from('turmas')
      .select('id, nome')
      .eq('escola_id', escolaAtiva.escola_id)
      .order('nome');
    setTurmas((data || []) as Turma[]);
  };

  const carregarAlunos = async () => {
    if (!escolaAtiva) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('matriculas')
      .select('id, status, aluno_id, turma_id, perfis:aluno_id (nome), turmas:turma_id (nome)')
      .eq('escola_id', escolaAtiva.escola_id)
      .eq('status', 'Ativo')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAlunos(
        (data as any[]).map((item) => ({
          id: item.aluno_id,
          nome: item.perfis?.nome || 'Aluno sem nome',
          matricula: item.id.slice(0, 8).toUpperCase(),
          turmaAtual: item.turmas?.nome || 'Turma não definida',
          status: item.status,
          matricula_id: item.id,
        }))
      );
    } else {
      setAlunos([]);
    }

    setLoading(false);
  };

  const abrirModalMatricula = () => {
    setShowMatriculaModal(true);
    setMatriculaError('');
    setMatriculaFeedback('');
  };

  const fecharModalMatricula = () => {
    setShowMatriculaModal(false);
  };

  const handleMatricularAluno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaAtiva) return;
    setMatriculando(true);
    setMatriculaError('');
    setMatriculaFeedback('');

    if (!novoAluno.nome || !novoAluno.email || !novoAluno.cpf || !novoAluno.turma_id) {
      setMatriculaError('Preencha todos os dados do aluno e selecione a turma.');
      setMatriculando(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-school-user', {
        body: {
          escola_id: escolaAtiva.escola_id,
          nome: novoAluno.nome,
          email: novoAluno.email,
          cpf: novoAluno.cpf,
          papel: 'Aluno',
          tipo_vinculo: 'Efetivo',
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const alunoId = data.user_id as string || data?.user_id;
      if (!alunoId) throw new Error('ID do aluno não retornado.');

      const { error: matriculaErrorResp } = await supabase.from('matriculas').insert({
        escola_id: escolaAtiva.escola_id,
        turma_id: novoAluno.turma_id,
        aluno_id: alunoId,
        status: 'Ativo',
      });

      if (matriculaErrorResp) throw matriculaErrorResp;

      setMatriculaFeedback('Aluno matriculado com sucesso!');
      setNovoAluno({ nome: '', email: '', cpf: '', turma_id: '' });
      carregarAlunos();
    } catch (err: any) {
      setMatriculaError(err.message || 'Erro ao matricular aluno.');
    } finally {
      setMatriculando(false);
    }
  };

  const atualizarStatus = async (tipo: 'Transferido' | 'Expulso') => {
    if (!escolaAtiva || !alunoSelecionado) return;
    setLoading(true);

    const dataSaida = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('matriculas')
      .update({
        status: tipo,
        motivo_saida: motivoSaida || `Movimentação registrada: ${tipo}`,
        data_saida: dataSaida,
      })
      .eq('id', alunoSelecionado.matricula_id);

    setLoading(false);

    if (error) {
      alert('Não foi possível registrar a saída do aluno: ' + error.message);
      return;
    }

    gerarTermoPDF(alunoSelecionado, tipo, dataSaida);
    carregarAlunos();
    setAlunoSelecionado(null);
    setMotivoSaida('');
  };

  const gerarTermoPDF = (aluno: Aluno, tipo: 'Transferido' | 'Expulso', dataSaida: string) => {
    if (!escolaAtiva) return;

    const doc = new jsPDF();
    const titulo = tipo === 'Transferido' ? 'TERMO DE TRANSFERÊNCIA' : 'ATA DE EXPULSÃO';

    doc.setFontSize(18);
    doc.text(titulo, 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Escola: ${escolaAtiva.escola.nome}`, 20, 40);
    doc.text(`CNPJ: ${escolaAtiva.escola.cnpj}`, 20, 50);

    doc.text(`Aluno(a): ${aluno.nome}`, 20, 70);
    doc.text(`Matrícula: ${aluno.matricula}`, 20, 80);
    doc.text(`Turma de Origem: ${aluno.turmaAtual}`, 20, 90);

    doc.text('Motivo Registrado:', 20, 110);
    const textLines = doc.splitTextToSize(motivoSaida || 'Não informado', 170);
    doc.text(textLines, 20, 120);

    doc.text(`Data de saída: ${dataSaida}`, 20, 150);
    doc.text('________________________________________________', 105, 230, { align: 'center' });
    doc.text('Assinatura da Direção/Secretaria', 105, 240, { align: 'center' });

    doc.save(`${tipo}_${aluno.matricula}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enturmação e Movimentação</h2>
          <p className="text-sm text-gray-500">Gerencie matrículas, transferências e saídas de alunos diretamente no banco da escola.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Nova Matrícula</h3>
            <p className="text-sm text-gray-500">Cadastre um aluno novo e vincule-o a uma turma em um único fluxo.</p>
          </div>
          <button
            type="button"
            onClick={abrirModalMatricula}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={18} /> Matricular Aluno
          </button>
        </div>
        <p className="text-sm text-gray-500">Clique em "Matricular Aluno" para abrir o formulário de cadastro.</p>
      </div>

      {showMatriculaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Matricular aluno</h2>
                <p className="text-sm text-gray-500">Preencha os dados do aluno e selecione a turma.</p>
              </div>
              <button
                type="button"
                onClick={fecharModalMatricula}
                className="text-gray-500 hover:text-gray-700"
              >
                Fechar
              </button>
            </div>
            <form onSubmit={handleMatricularAluno} className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700">Nome do aluno</label>
                <input
                  value={novoAluno.nome}
                  onChange={(e) => setNovoAluno((prev) => ({ ...prev, nome: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700">E-mail</label>
                <input
                  type="email"
                  value={novoAluno.email}
                  onChange={(e) => setNovoAluno((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  placeholder="aluno@escola.com"
                  required
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700">CPF</label>
                <input
                  value={novoAluno.cpf}
                  onChange={(e) => setNovoAluno((prev) => ({ ...prev, cpf: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  placeholder="000.000.000-00"
                  required
                />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700">Turma</label>
                <select
                  value={novoAluno.turma_id}
                  onChange={(e) => setNovoAluno((prev) => ({ ...prev, turma_id: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Selecione a turma</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>{turma.nome}</option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-3 pt-2">
                {matriculaError && <p className="text-sm text-red-600">{matriculaError}</p>}
                {matriculaFeedback && <p className="text-sm text-emerald-700">{matriculaFeedback}</p>}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={fecharModalMatricula}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={matriculando}
                    className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    {matriculando ? 'Matriculando...' : 'Matricular Aluno'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-lg mb-4 text-gray-800">Alunos Ativos</h3>
          {loading ? (
            <div className="py-16 text-center text-gray-500">Carregando alunos...</div>
          ) : alunos.length === 0 ? (
            <div className="py-16 text-center text-gray-500">Nenhum aluno ativo encontrado para a turma atual.</div>
          ) : (
            <ul className="space-y-3">
              {alunos.map((aluno) => (
                <li
                  key={aluno.matricula_id}
                  onClick={() => setAlunoSelecionado(aluno)}
                  className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition-colors ${alunoSelecionado?.matricula_id === aluno.matricula_id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{aluno.nome}</p>
                    <p className="text-xs text-gray-500">Mat: {aluno.matricula} • {aluno.turmaAtual}</p>
                  </div>
                  <ArrowRight size={18} className="text-gray-400" />
                </li>
              ))}
            </ul>
          )}
        </div>

        {alunoSelecionado && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 border-t-4 border-t-indigo-500">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Registrar Saída do Aluno</h3>
            <p className="font-medium text-indigo-900 mb-6">{alunoSelecionado.nome}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo / Observações</label>
                <textarea
                  rows={4}
                  value={motivoSaida}
                  onChange={(e) => setMotivoSaida(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Informe o motivo da transferência ou expulsão..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => atualizarStatus('Transferido')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                >
                  <FileText size={18} />
                  Termo de Transferência
                </button>
                <button
                  onClick={() => atualizarStatus('Expulso')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                >
                  <FileText size={18} />
                  Ata de Expulsão
                </button>
              </div>
              <p className="text-xs text-center text-gray-500 mt-2">
                * A ação atualiza o status do aluno no Supabase e gera automaticamente o documento em PDF.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
