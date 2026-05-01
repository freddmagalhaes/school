import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { FileDown, Search, User } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props { escolaId: string | null; }

interface Turma { id: string; nome: string; ano_letivo: number; }
interface Periodo { id: string; nome: string; ordem: number; }
interface Aluno { id: string; nome: string; matricula_id: string; }
interface NotaAluno { disciplina_nome: string; [periodo_id: string]: string | number; media?: number; situacao?: string; }

const calcularMedia = (notas: number[]): number => {
  if (notas.length === 0) return 0;
  return parseFloat((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1));
};

const situacao = (media: number): string => {
  if (media >= 5) return 'Aprovado';
  if (media >= 3) return 'Recuperação';
  return 'Reprovado';
};

export const BoletimAluno: React.FC<Props> = ({ escolaId }) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmaId, setTurmaId] = useState('');
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());
  const [alunoId, setAlunoId] = useState('');
  const [notasBoletim, setNotasBoletim] = useState<NotaAluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [gerado, setGerado] = useState(false);

  useEffect(() => {
    if (!escolaId) return;
    supabase.from('turmas').select('id, nome, ano_letivo')
      .eq('escola_id', escolaId).eq('ano_letivo', anoLetivo)
      .order('nome').then(({ data }) => setTurmas(data || []));
  }, [escolaId, anoLetivo]);

  useEffect(() => {
    if (!escolaId || !anoLetivo) return;
    supabase.from('periodos_letivos').select('id, nome, ordem')
      .eq('escola_id', escolaId).eq('ano_letivo', anoLetivo)
      .order('ordem').then(({ data }) => setPeriodos(data || []));
  }, [escolaId, anoLetivo]);

  useEffect(() => {
    if (!turmaId) { setAlunos([]); return; }
    supabase.from('matriculas')
      .select('id, perfis:aluno_id (id, nome)')
      .eq('turma_id', turmaId).eq('status', 'Ativo')
      .then(({ data }) => {
        setAlunos(((data || []) as any[]).map(m => ({
          id: m.perfis.id, nome: m.perfis.nome, matricula_id: m.id
        })).sort((a, b) => a.nome.localeCompare(b.nome)));
      });
  }, [turmaId]);

  const gerarBoletim = async () => {
    if (!alunoId || !turmaId || !escolaId) return;
    setLoading(true);
    setGerado(false);

    // Busca todas as notas do aluno para este ano
    const aluno = alunos.find(a => a.id === alunoId);
    if (!aluno) return;

    // Busca notas agrupadas por disciplina e período
    const { data: notasData } = await supabase
      .from('notas')
      .select('valor, data, disciplinas:disciplina_id (nome), periodos:periodo_letivo_id (id, nome, ordem)')
      .eq('matricula_id', aluno.matricula_id);

    // Agrupa por disciplina
    const mapa: Record<string, NotaAluno> = {};
    (notasData || []).forEach((n: any) => {
      const disc = n.disciplinas?.nome || 'Sem Disciplina';
      if (!mapa[disc]) mapa[disc] = { disciplina_nome: disc };
      // Média por período
      const pid = n.periodos?.id || 'geral';
      const cur = mapa[disc][pid] as number || 0;
      mapa[disc][pid] = Math.max(cur, n.valor); // simplificado: pega nota mais alta do período
    });

    // Calcula média
    const resultado = Object.values(mapa).map(row => {
      const notas = periodos.map(p => (row[p.id] as number) || 0);
      const media = calcularMedia(notas);
      return { ...row, media, situacao: situacao(media) };
    });

    setNotasBoletim(resultado);
    setLoading(false);
    setGerado(true);
  };

  const exportarPDF = () => {
    const aluno = alunos.find(a => a.id === alunoId);
    const turma = turmas.find(t => t.id === turmaId);
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('BOLETIM ESCOLAR', 105, 20, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Aluno: ${aluno?.nome || ''}`, 14, 35);
    doc.text(`Turma: ${turma?.nome || ''} — Ano Letivo: ${anoLetivo}`, 14, 42);

    const colunas = [
      'Disciplina',
      ...periodos.map(p => p.nome),
      'Média',
      'Situação'
    ];

    const linhas = notasBoletim.map(row => [
      row.disciplina_nome,
      ...periodos.map(p => {
        const v = row[p.id];
        return v !== undefined ? Number(v).toFixed(1) : '—';
      }),
      row.media?.toFixed(1) || '—',
      row.situacao || '—',
    ]);

    autoTable(doc, {
      head: [colunas],
      body: linhas,
      startY: 50,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === colunas.length - 1) {
          const val = data.cell.raw as string;
          if (val === 'Reprovado') data.cell.styles.textColor = [220, 38, 38];
          if (val === 'Aprovado') data.cell.styles.textColor = [22, 163, 74];
          if (val === 'Recuperação') data.cell.styles.textColor = [217, 119, 6];
        }
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 14, finalY);
    doc.line(14, finalY + 15, 100, finalY + 15);
    doc.text('Assinatura do Diretor(a)', 14, finalY + 20);

    doc.save(`boletim_${aluno?.nome?.replace(/ /g, '_')}_${anoLetivo}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-4 text-base">Selecione o Aluno</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Ano Letivo</label>
            <input type="number" value={anoLetivo} onChange={e => setAnoLetivo(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Turma</label>
            <select value={turmaId} onChange={e => { setTurmaId(e.target.value); setAlunoId(''); setGerado(false); }}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 appearance-none">
              <option value="">Selecione...</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Aluno</label>
            <select value={alunoId} onChange={e => { setAlunoId(e.target.value); setGerado(false); }}
              disabled={!turmaId}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 appearance-none disabled:opacity-50">
              <option value="">Selecione...</option>
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={gerarBoletim}
              disabled={!alunoId || !turmaId || loading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Search size={16} /> {loading ? 'Gerando...' : 'Gerar Boletim'}
            </button>
          </div>
        </div>
      </div>

      {/* Boletim */}
      {gerado && notasBoletim.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-gray-900">Boletim Escolar</h2>
              <p className="text-sm text-gray-500">{alunos.find(a => a.id === alunoId)?.nome} — {turmas.find(t => t.id === turmaId)?.nome} — {anoLetivo}</p>
            </div>
            <button
              onClick={exportarPDF}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <FileDown size={16} /> Exportar PDF
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-indigo-600 text-white text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Disciplina</th>
                  {periodos.map(p => <th key={p.id} className="px-4 py-3 text-center">{p.nome}</th>)}
                  <th className="px-4 py-3 text-center font-bold">Média</th>
                  <th className="px-4 py-3 text-center font-bold">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {notasBoletim.map(row => (
                  <tr key={row.disciplina_nome} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.disciplina_nome}</td>
                    {periodos.map(p => (
                      <td key={p.id} className="px-4 py-3 text-center text-gray-600">
                        {row[p.id] !== undefined ? Number(row[p.id]).toFixed(1) : '—'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-bold text-gray-900">{row.media?.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        row.situacao === 'Aprovado'    ? 'bg-emerald-100 text-emerald-700' :
                        row.situacao === 'Reprovado'   ? 'bg-red-100 text-red-700' :
                                                         'bg-amber-100 text-amber-700'
                      }`}>{row.situacao}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            * Aprovação: Média ≥ 5,0 | Recuperação: Média ≥ 3,0 | Reprovado: Média &lt; 3,0 — conforme LDBEN Art. 24
          </div>
        </div>
      )}

      {gerado && notasBoletim.length === 0 && (
        <div className="text-center py-10 text-gray-500 bg-white rounded-2xl border border-gray-200">
          Nenhuma nota lançada para este aluno ainda.
        </div>
      )}
    </div>
  );
};
