import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { FileDown, Award } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props { escolaId: string | null; }
interface Turma { id: string; nome: string; ano_letivo: number; }
interface AlunoResultado {
  nome: string;
  medias: Record<string, number>;
  mediaFinal: number;
  situacao: string;
  percentualFreq: number;
}

const situacao = (media: number, freq: number): string => {
  if (freq < 75) return 'Reprovado por Falta';
  if (media >= 5) return 'Aprovado';
  if (media >= 3) return 'Em Recuperação';
  return 'Reprovado';
};

export const AtaResultados: React.FC<Props> = ({ escolaId }) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState('');
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());
  const [diretor, setDiretor] = useState('');
  const [resultados, setResultados] = useState<AlunoResultado[]>([]);
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
    setLoading(true); setGerado(false);

    const { data: matr } = await supabase
      .from('matriculas').select('id, perfis:aluno_id (nome)')
      .eq('turma_id', turmaId).eq('status', 'Ativo');

    const lista: AlunoResultado[] = [];

    for (const m of (matr || []) as any[]) {
      const { data: notas } = await supabase
        .from('notas').select('valor, disciplinas:disciplina_id (nome)')
        .eq('matricula_id', m.id);

      const { data: freq } = await supabase
        .from('frequencia').select('presente').eq('matricula_id', m.id);

      // Agrupa por disciplina e calcula média
      const porDisc: Record<string, number[]> = {};
      (notas || []).forEach((n: any) => {
        const d = n.disciplinas?.nome || 'Geral';
        if (!porDisc[d]) porDisc[d] = [];
        porDisc[d].push(n.valor);
      });
      const medias: Record<string, number> = {};
      Object.entries(porDisc).forEach(([d, vals]) => {
        medias[d] = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
      });
      const mediaFinal = Object.values(medias).length > 0
        ? parseFloat((Object.values(medias).reduce((a, b) => a + b, 0) / Object.values(medias).length).toFixed(1))
        : 0;

      const total = (freq || []).length;
      const presencas = (freq || []).filter((f: any) => f.presente).length;
      const percentualFreq = total > 0 ? parseFloat(((presencas / total) * 100).toFixed(1)) : 0;

      lista.push({ nome: m.perfis?.nome || '—', medias, mediaFinal, situacao: situacao(mediaFinal, percentualFreq), percentualFreq });
    }

    setResultados(lista.sort((a, b) => a.nome.localeCompare(b.nome)));
    setLoading(false); setGerado(true);
  };

  const exportarPDF = () => {
    const turma = turmas.find(t => t.id === turmaId);
    const doc = new jsPDF('landscape');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('ATA DE RESULTADOS FINAIS', 148, 18, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Turma: ${turma?.nome || ''} — Ano Letivo: ${anoLetivo}`, 14, 30);
    doc.text(`Emitida em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 37);

    const disciplinas = resultados.length > 0 ? Object.keys(resultados[0].medias) : [];
    const colunas = ['Nº', 'Aluno', ...disciplinas, 'Média Final', 'Freq. (%)', 'Situação'];
    const linhas = resultados.map((r, i) => [
      i + 1, r.nome,
      ...disciplinas.map(d => r.medias[d]?.toFixed(1) || '—'),
      r.mediaFinal.toFixed(1),
      `${r.percentualFreq}%`,
      r.situacao,
    ]);

    autoTable(doc, {
      head: [colunas], body: linhas, startY: 44,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === colunas.length - 1) {
          const v = data.cell.raw as string;
          if (v === 'Aprovado') data.cell.styles.textColor = [22, 163, 74];
          else if (v.includes('Reprovado')) data.cell.styles.textColor = [220, 38, 38];
          else data.cell.styles.textColor = [217, 119, 6];
        }
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    const resumo = {
      aprovados: resultados.filter(r => r.situacao === 'Aprovado').length,
      reprovados: resultados.filter(r => r.situacao.includes('Reprovado')).length,
      recuperacao: resultados.filter(r => r.situacao === 'Em Recuperação').length,
    };
    doc.setFontSize(9);
    doc.text(`Total: ${resultados.length} alunos | Aprovados: ${resumo.aprovados} | Em Recuperação: ${resumo.recuperacao} | Reprovados: ${resumo.reprovados}`, 14, finalY);
    doc.line(14, finalY + 20, 130, finalY + 20);
    doc.text(`${diretor || 'Diretor(a)'}`, 14, finalY + 26);
    doc.text('Assinatura e Carimbo do Diretor(a)', 14, finalY + 31);
    doc.save(`ata_resultados_${turma?.nome?.replace(/ /g, '_')}_${anoLetivo}.pdf`);
  };

  const aprovados = resultados.filter(r => r.situacao === 'Aprovado').length;
  const reprovados = resultados.filter(r => r.situacao.includes('Reprovado')).length;
  const recuperacao = resultados.filter(r => r.situacao === 'Em Recuperação').length;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="font-bold text-gray-900">Configurar Ata</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Ano Letivo</label>
            <input type="number" value={anoLetivo} onChange={e => setAnoLetivo(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Turma</label>
            <select value={turmaId} onChange={e => { setTurmaId(e.target.value); setGerado(false); }}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white appearance-none">
              <option value="">Selecione...</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Nome do(a) Diretor(a) (para o PDF)</label>
            <input type="text" value={diretor} onChange={e => setDiretor(e.target.value)}
              placeholder="Prof. ..."
              className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white" />
          </div>
        </div>
        <button onClick={gerar} disabled={!turmaId || loading}
          className="py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm disabled:opacity-50">
          {loading ? 'Gerando...' : 'Gerar Ata'}
        </button>
      </div>

      {gerado && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Award size={18} className="text-indigo-600" /> Ata de Resultados Finais</h2>
              <div className="flex gap-4 mt-1 text-xs font-medium">
                <span className="text-emerald-600">✓ Aprovados: {aprovados}</span>
                <span className="text-amber-600">⟳ Recuperação: {recuperacao}</span>
                <span className="text-red-600">✗ Reprovados: {reprovados}</span>
              </div>
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
                  <th className="px-4 py-3 w-8">Nº</th>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3 text-center">Média Final</th>
                  <th className="px-4 py-3 text-center">Frequência</th>
                  <th className="px-4 py-3 text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resultados.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.nome}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">{r.mediaFinal.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold ${r.percentualFreq < 75 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {r.percentualFreq}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        r.situacao === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                        r.situacao.includes('Reprovado') ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{r.situacao}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="p-3 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
            Reprovação por Falta: frequência abaixo de 75% (LDBEN Art. 24 §VI)
          </p>
        </div>
      )}
    </div>
  );
};
