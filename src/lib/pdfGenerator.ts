import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface EscolaInfo {
  nome: string;
  cnpj: string;
  endereco?: string;
}

export interface AlunoInfo {
  nome: string;
  matricula: string;
  turmaAtual: string;
}

// Configurações padrão de estilo para manter consistência corporativa
const MARGEM_ESQUERDA = 20;
const LARGURA_PAGINA = 210; // A4 portrait

export class PDFGenerator {
  private doc: jsPDF;
  private escola: EscolaInfo;

  constructor(escola: EscolaInfo) {
    this.doc = new jsPDF();
    this.escola = escola;
  }

  // --- Layout Base (Cabeçalho e Rodapé) ---
  private adicionarCabecalho() {
    this.doc.setFillColor(79, 70, 229); // bg-indigo-600
    this.doc.rect(0, 0, LARGURA_PAGINA, 30, 'F');

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(this.escola.nome, MARGEM_ESQUERDA, 15);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`CNPJ: ${this.escola.cnpj}`, MARGEM_ESQUERDA, 22);

    // Reset de cor de texto para o padrão
    this.doc.setTextColor(0, 0, 0);
  }

  private adicionarRodape() {
    const totalPages = (this.doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(9);
      this.doc.setTextColor(150, 150, 150);
      const textoRodape = `Documento Oficial — Emitido pelo EduGestão Pro`;
      this.doc.text(textoRodape, MARGEM_ESQUERDA, 285);
      
      const paginaTexto = `Página ${i} de ${totalPages}`;
      this.doc.text(paginaTexto, LARGURA_PAGINA - MARGEM_ESQUERDA - this.doc.getTextWidth(paginaTexto), 285);
    }
  }

  private adicionarAssinaturas(posY: number) {
    this.doc.setFontSize(10);
    this.doc.setTextColor(0, 0, 0);
    
    const espacoAssinatura = 20;
    const posYLinha = posY + espacoAssinatura;

    // Assinatura 1
    this.doc.setLineWidth(0.5);
    this.doc.line(MARGEM_ESQUERDA, posYLinha, 90, posYLinha);
    this.doc.text('Assinatura da Direção / Secretaria', MARGEM_ESQUERDA + 5, posYLinha + 5);

    // Assinatura 2 (opcional, p/ o aluno/responsável)
    this.doc.line(120, posYLinha, LARGURA_PAGINA - MARGEM_ESQUERDA, posYLinha);
    this.doc.text('Assinatura do Responsável', 130, posYLinha + 5);
  }

  // --- Documentos Específicos ---

  public gerarDeclaracaoMatricula(aluno: AlunoInfo, dataEmissao: string) {
    this.adicionarCabecalho();

    let y = 50;

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('DECLARAÇÃO DE MATRÍCULA E VÍNCULO', LARGURA_PAGINA / 2, y, { align: 'center' });
    y += 20;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    
    const textoDeclaro = `Declaramos para os devidos fins que o(a) aluno(a) ${aluno.nome}, portador(a) da matrícula ${aluno.matricula}, encontra-se regularmente matriculado(a) nesta instituição de ensino no ano letivo vigente, alocado(a) na turma: ${aluno.turmaAtual}.`;
    
    const linhas = this.doc.splitTextToSize(textoDeclaro, LARGURA_PAGINA - (MARGEM_ESQUERDA * 2));
    this.doc.text(linhas, MARGEM_ESQUERDA, y);
    
    y += (linhas.length * 7) + 20;

    this.doc.text(`Por ser verdade, firmamos a presente declaração.`, MARGEM_ESQUERDA, y);
    y += 15;
    
    this.doc.text(`Data de Emissão: ${dataEmissao}`, MARGEM_ESQUERDA, y);
    
    this.adicionarAssinaturas(y + 40);
    this.adicionarRodape();

    this.doc.save(`Declaracao_Matricula_${aluno.matricula}.pdf`);
  }

  public gerarTermoMovimentacao(aluno: AlunoInfo, tipo: 'Transferido' | 'Expulso', motivo: string, dataSaida: string) {
    this.adicionarCabecalho();

    let y = 50;
    const titulo = tipo === 'Transferido' ? 'TERMO DE TRANSFERÊNCIA' : 'ATA DE DESLIGAMENTO';

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(titulo, LARGURA_PAGINA / 2, y, { align: 'center' });
    y += 20;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');

    const informacoes = [
      ['Nome do Aluno:', aluno.nome],
      ['Matrícula:', aluno.matricula],
      ['Turma de Origem:', aluno.turmaAtual],
      ['Status Final:', tipo],
      ['Data de Saída:', dataSaida]
    ];

    autoTable(this.doc, {
      startY: y,
      body: informacoes,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 120 }
      },
      margin: { left: MARGEM_ESQUERDA }
    });

    y = (this.doc as any).lastAutoTable.finalY + 15;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Motivo / Observações Registradas:', MARGEM_ESQUERDA, y);
    y += 7;

    this.doc.setFont('helvetica', 'normal');
    const linhasMotivo = this.doc.splitTextToSize(motivo || 'Nenhum motivo adicional informado pela instituição.', LARGURA_PAGINA - (MARGEM_ESQUERDA * 2));
    this.doc.text(linhasMotivo, MARGEM_ESQUERDA, y);

    y += (linhasMotivo.length * 7) + 30;

    this.adicionarAssinaturas(y);
    this.adicionarRodape();

    this.doc.save(`${tipo}_${aluno.matricula}.pdf`);
  }
}
