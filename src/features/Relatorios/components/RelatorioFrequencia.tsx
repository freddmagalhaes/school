import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { FileDown, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props { escolaId: string | null; }
interface Turma { id: string; nome: string; ano_letivo: number; }
interface AlunoFreq {
  nome: string;
  matricula_id: string;
  totalAulas: number;
  presencas: number;
  faltas: number;
  percentual: number;
}

const FREQUENCIA_MINIMA = 75; // LDBEN Art. 24 §VI

export const RelatorioFrequencia: React.FC<Props> = ({ escolaId }) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState('');
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());
  const [dataInicio, setDataInicio] = useState(`${new Date().getFullYear()}-02-01`);
  const [dataFim, setDataFim] = useState(`${new Date().getFullYear()}-12-15`);
  const [relatorio, setRelatorio] = useState<AlunoFreq[]>([]);
  const [loading, setLoading] = useState(false);
  const [gerado, setGerado] = useState(false);

  useEffect(() => {
    if (!escolaId) return;
    supabase.from('turmas').select('id, nome, ano_letivo')
      .eq('escola_id', escolaId).eq('ano_letivo', anoLetivo)
      .order('nome').then(({ data }) => setTurmas(data || []));
  }, [escolaId, anoLetivo]);

  const gerar = async () => {
    if (!turmaId || !escolaId) return;
    setLoading(true);
    setGerado(false);

    // Busca matrículas ativas da turma
    const { data: matr } = await supabase
      .from('matriculas')
      .select('id, perfis:aluno_id (nome)')
      .eq('turma_id', turmaId)
      .eq('status', 'Ativo');

    const resultados: AlunoFreq[] = [];

    for (const m of (matr || []) as any[]) {
      const { data: freq } = await supabase
        .from('frequencia')
        .select('presente')
        .eq('matricula_id', m.id)
        .gte('data', dataInicio)
        .lte('data', dataFim);

      const total = (freq || []).length;
      const presencas = (freq || []).filter(f => f.presente).length;
      const faltas = total - presencas;
      const percentual = total > 0 ? parseFloat(((presencas / total) * 100).toFixed(1)) : 0;

      resultados.push({
        nome: m.perfis?.nome || '—',
        matricula_id: m.id,
        totalAulas: total,
        presencas,
        faltas,
        percentual,
      });
    }

    setRelatorio(resultados.sort((a, b) => a.nome.localeCompare(b.nome)));
    setLoading(false);
    setGerado(true);
  };

  const exportarPDF = () => {
    const turma = turmas.find(t => t.id === turmaId);
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE FREQUÊNCIA', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Turma: ${turma?.nome || ''} — Período: ${dataInicio} a ${dataFim}`, 14, 32);
    doc.text(`Frequência mínima obrigatória: ${FREQUENCIA_MINIMA}% (LDBEN Art. 24)`, 14, 39);

    autoTable(doc, {
      head: [['Nº', 'Aluno', 'Total Aulas', 'Presenças', 'Faltas', 'Frequência (%)', 'Situação']],
      body: relatorio.map((a, i) => [
        i + 1,
        a.nome,
        a.totalAulas,
        a.presencas,
        a.faltas,
        `${a.percentual}%`,
        a.percentual >= FREQUENCIA_MINIMA ? 'Regular' : '⚠ Risco Reprovação',
      ]),
      startY: 48,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const v = data.cell.raw as string;
          if (v.includes('Risco')) data.cell.styles.textColor = [220, 38, 38];
          else data.cell.styles.textColor = [22, 163, 74];
        }
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(8);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 14, finalY);
    doc.line(14, finalY + 12, 100, finalY + 12);
    doc.text('Assinatura do Diretor(a)', 14, finalY + 17);

    doc.save(`frequencia_${turma?.nome?.replace(/ /g, '_')}_${anoLetivo}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-4">Configurar Relatório</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Ano Letivo</label>
            <input type="number" value={anoLetivo} onChange={e => setAnoLetivo(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Turma</label>
            <select value={turmaId} onChange={e => { setTurmaId(e.target.value); setGerado(false); }}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 appearance-none">
              <option value="">Selecione...</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Data Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Data Fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <button
          onClick={gerar}
          disabled={!turmaId || loading}
          className="mt-4 py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm disabled:opacity-50"
        >
          {loading ? 'Gerando...' : 'Gerar Relatório'}
        </button>
      </div>

      {/* Resultado */}
      {gerado && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-gray-900">Frequência da Turma</h2>
              <p className="text-sm text-gray-500">
                {relatorio.filter(a => a.percentual < FREQUENCIA_MINIMA).length} aluno(s) abaixo de {FREQUENCIA_MINIMA}%
              </p>
            </div>
            <button onClick={exportarPDF}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <FileDown size={16} /> Exportar PDF
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-indigo-600 text-white text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 w-10">Nº</th>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3 text-center">Total Aulas</th>
                  <th className="px-4 py-3 text-center">Presenças</th>
                  <th className="px-4 py-3 text-center">Faltas</th>
                  <th className="px-4 py-3 text-center">Frequência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {relatorio.map((a, i) => {
                  const abaixo = a.percentual < FREQUENCIA_MINIMA;
                  return (
                    <tr key={a.matricula_id} className={`hover:bg-gray-50 ${abaixo ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                        {abaixo && <AlertTriangle size={15} className="text-red-500 shrink-0" />}
                        {a.nome}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{a.totalAulas}</td>
                      <td className="px-4 py-3 text-center text-emerald-700 font-medium">{a.presencas}</td>
                      <td className="px-4 py-3 text-center text-red-600 font-medium">{a.faltas}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          abaixo ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {a.percentual}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            ⚠ Alunos com frequência abaixo de {FREQUENCIA_MINIMA}% estão em risco de reprovação por falta — LDBEN Art. 24
          </div>
        </div>
      )}
    </div>
  );
};
