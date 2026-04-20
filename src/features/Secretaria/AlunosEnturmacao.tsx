import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import { FileText, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Aluno {
  id: string;
  nome: string;
  matricula: string;
  turmaAtual: string;
  status: string;
}

const MOCK_ALUNOS: Aluno[] = [
  { id: '1', nome: 'João Pedro de Almeida', matricula: '2023001', turmaAtual: '8º Ano A', status: 'Ativo' },
  { id: '2', nome: 'Maria Clara da Silva', matricula: '2023002', turmaAtual: '8º Ano A', status: 'Ativo' },
];

export const AlunosEnturmacao: React.FC = () => {
  const { escolaAtiva } = useAuth();
  const [motivoSaida, setMotivoSaida] = useState('');
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null);
  
  const gerarTermoPDF = (aluno: Aluno, tipo: 'Transferencia' | 'Expulsao') => {
    if (!escolaAtiva) return;

    const doc = new jsPDF();
    const titulo = tipo === 'Transferencia' ? 'TERMO DE TRANSFERÊNCIA' : 'ATA DE EXPULSÃO';
    
    doc.setFontSize(18);
    doc.text(titulo, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Escola: ${escolaAtiva.escola.nome}`, 20, 40);
    doc.text(`CNPJ: ${escolaAtiva.escola.cnpj}`, 20, 50);
    
    doc.text(`Aluno(a): ${aluno.nome}`, 20, 70);
    doc.text(`Matrícula: ${aluno.matricula}`, 20, 80);
    doc.text(`Turma de Origem: ${aluno.turmaAtual}`, 20, 90);
    
    doc.text('Motivo Registrado:', 20, 110);
    
    // Auto-quebra de linha para o motivo
    const textLines = doc.splitTextToSize(motivoSaida || 'Não informado', 170);
    doc.text(textLines, 20, 120);

    const dataAtual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    doc.text(`Data: ${dataAtual}`, 20, 180);
    
    doc.text('________________________________________________', 105, 230, { align: 'center' });
    doc.text('Assinatura da Direção/Secretaria', 105, 240, { align: 'center' });

    doc.save(`${tipo}_${aluno.matricula}.pdf`);
    
    // Aqui no sistema real, chamaria a API Supabase para mudar o status do aluno e liberar a vaga
    alert(`Status alterado para ${tipo === 'Transferencia' ? 'Transferido' : 'Expulso'} e PDF gerado com sucesso!`);
    setAlunoSelecionado(null);
    setMotivoSaida('');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Enturmação e Movimentação</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-lg mb-4 text-gray-800">Alunos Ativos (Selecione para Movimentar)</h3>
          <ul className="space-y-3">
            {MOCK_ALUNOS.map(aluno => (
              <li 
                key={aluno.id}
                onClick={() => setAlunoSelecionado(aluno)}
                className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition-colors ${alunoSelecionado?.id === aluno.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
              >
                <div>
                  <p className="font-medium text-gray-900">{aluno.nome}</p>
                  <p className="text-xs text-gray-500">Mat: {aluno.matricula} • {aluno.turmaAtual}</p>
                </div>
                <ArrowRight size={18} className="text-gray-400" />
              </li>
            ))}
          </ul>
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
                   onChange={e => setMotivoSaida(e.target.value)}
                   className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                   placeholder="Informe o motivo da transferência ou expulsão..."
                 ></textarea>
               </div>
               
               <div className="flex gap-3 pt-4">
                 <button 
                   onClick={() => gerarTermoPDF(alunoSelecionado, 'Transferencia')}
                   className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg text-sm font-medium transition-colors"
                 >
                   <FileText size={18} />
                   Termo de Transferência
                 </button>
                 <button 
                   onClick={() => gerarTermoPDF(alunoSelecionado, 'Expulsao')}
                   className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg text-sm font-medium transition-colors"
                 >
                   <FileText size={18} />
                   Ata de Expulsão
                 </button>
               </div>
               <p className="text-xs text-center text-gray-500 mt-2">
                 * Ao clicar, o sistema alterará o status do aluno para desocupar a vaga e gerará o PDF.
               </p>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};
