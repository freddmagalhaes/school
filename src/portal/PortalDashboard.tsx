import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BookOpen, Calendar, CreditCard, Award, Bell } from 'lucide-react';

interface NotaDisciplina {
  disciplina_id: string;
  disciplina: string;
  bim1: string | number;
  bim2: string | number;
  bim3: string | number;
  bim4: string | number;
  faltas: number;
}

interface Fatura {
  id: string;
  mes: string;
  vencimento: string;
  valor: number;
  status: string;
}

export const PortalDashboard: React.FC = () => {
  const { escolaAtiva, perfil } = useAuth();

  const [loading, setLoading] = useState(true);
  const [turmaNome, setTurmaNome] = useState<string>('Turma não alocada');
  const [frequenciaGeral, setFrequenciaGeral] = useState(100);
  const [notasAgrupadas, setNotasAgrupadas] = useState<NotaDisciplina[]>([]);
  const [boletos, setBoletos] = useState<Fatura[]>([]);

  useEffect(() => {
    if (escolaAtiva) {
      carregarDadosPortal();
    }
  }, [escolaAtiva]);

  const carregarDadosPortal = async () => {
    if (!escolaAtiva) return;
    setLoading(true);

    try {
      // 1. Pega a matrícula do aluno
      const { data: matriculas } = await supabase
        .from('turma_alunos')
        .select('id, turmas (id, nome)')
        .eq('aluno_id', escolaAtiva.id)
        .eq('status', 'Ativo')
        .order('data_matricula', { ascending: false })
        .limit(1);

      let matriculaId = null;
      let turmaId = null;

      if (matriculas && matriculas.length > 0) {
        matriculaId = matriculas[0].id;
        const turma: any = matriculas[0].turmas;
        turmaId = turma?.id;
        setTurmaNome(turma?.nome || 'Turma Desconhecida');
      }

      // 2. Faturas
      const { data: faturasData } = await supabase
        .from('faturas')
        .select('id, mes_referencia, data_vencimento, valor, status')
        .eq('aluno_id', escolaAtiva.id)
        .order('data_vencimento', { ascending: false });

      if (faturasData) {
        setBoletos(faturasData.map(f => ({
          id: f.id,
          mes: f.mes_referencia,
          vencimento: new Date(f.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
          valor: Number(f.valor),
          status: f.status
        })));
      }

      // 3. Notas e Frequencia (somente se estiver matriculado)
      if (matriculaId && turmaId) {
        // Pega as disciplinas da turma
        const { data: matriz } = await supabase
          .from('matrizes_curriculares')
          .select('disciplina_id, disciplinas (nome)')
          .eq('turma_id', turmaId);

        const mapNotas: Record<string, NotaDisciplina> = {};

        if (matriz) {
          matriz.forEach((m: any) => {
            mapNotas[m.disciplina_id] = {
              disciplina_id: m.disciplina_id,
              disciplina: m.disciplinas?.nome || 'Desconhecida',
              bim1: '-', bim2: '-', bim3: '-', bim4: '-', faltas: 0
            };
          });
        }

        // Faltas (Total por matricula)
        const { data: frequenciasData } = await supabase
          .from('frequencia')
          .select('presente')
          .eq('matricula_id', matriculaId);

        let faltasCount = 0;
        let totalAulas = 0;
        if (frequenciasData) {
          totalAulas = frequenciasData.length;
          frequenciasData.forEach(f => {
            if (!f.presente) faltasCount++;
          });
          const perc = totalAulas > 0 ? ((totalAulas - faltasCount) / totalAulas) * 100 : 100;
          setFrequenciaGeral(Math.round(perc));
        }

        // Distribui faltas aleatoriamente pelas disciplinas so para visualizacao se houver, 
        // já que o diário de frequencia atual não separa por disciplina no banco 
        // (ele vincula à matricula na data, o que significa falta no dia todo).
        // Então colocamos a falta total em uma linha separada ou espalhada.
        // Como o design pede na disciplina, vamos deixar 0 ou espalhar. Para simplificar, 0.

        // Notas
        const { data: notasData } = await supabase
          .from('notas')
          .select('disciplina_id, valor, data')
          .eq('matricula_id', matriculaId);

        if (notasData) {
          // Vamos agrupar no bim1 provisoriamente, já que não temos conceito de bimestre na tabela de notas ainda
          notasData.forEach(n => {
            if (mapNotas[n.disciplina_id]) {
              mapNotas[n.disciplina_id].bim1 = Number(n.valor).toFixed(1);
            }
          });
        }

        setNotasAgrupadas(Object.values(mapNotas));
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 shadow-lg text-white">
        <h2 className="text-3xl font-bold mb-2">Bem-vindo(a) ao seu Portal, {perfil?.nome.split(' ')[0]}!</h2>
        <p className="text-indigo-100 max-w-2xl">
          Aqui você encontra seu boletim, avisos importantes e a situação financeira.
          Turma atual: <strong>{turmaNome}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Principal: Boletim */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="text-indigo-600" size={24} />
                <h3 className="text-lg font-bold text-gray-900">Boletim Escolar</h3>
              </div>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">Ano Atual</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-white border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Disciplina</th>
                    <th className="px-6 py-4 font-semibold text-center">Nota / Média</th>
                    <th className="px-6 py-4 font-semibold text-center">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">Carregando boletim...</td></tr>
                  ) : notasAgrupadas.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">Nenhuma nota lançada para a turma {turmaNome}.</td></tr>
                  ) : (
                    notasAgrupadas.map((nota, idx) => {
                      const valorNumerico = parseFloat(nota.bim1 as string);
                      const isAbaixo = !isNaN(valorNumerico) && valorNumerico < 6.0;

                      return (
                        <tr key={idx} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{nota.disciplina}</td>
                          <td className={`px-6 py-4 text-center font-bold ${isAbaixo ? 'text-red-600' : 'text-indigo-600'}`}>
                            {nota.bim1}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {nota.bim1 === '-' ? (
                              <span className="text-gray-400">-</span>
                            ) : isAbaixo ? (
                              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">Abaixo da Média</span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-medium">Na Média</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Quadro de Avisos (Simulado) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="text-amber-500" size={24} />
              <h3 className="text-lg font-bold text-gray-900">Mural de Avisos</h3>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50 rounded-r-lg">
                <p className="text-sm font-bold text-gray-900">Bem-vindo ao novo Portal!</p>
                <p className="text-sm text-gray-600">Acompanhe suas notas e situação financeira de forma simples e rápida.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Financeiro e Atalhos */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="text-rose-500" size={24} />
              <h3 className="text-lg font-bold text-gray-900">Financeiro</h3>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-gray-400">Carregando faturas...</p>
              ) : boletos.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma fatura encontrada.</p>
              ) : (
                boletos.map((boleto, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">{boleto.mes}</p>
                      <p className="text-xs text-gray-500">Venc: {boleto.vencimento}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">R$ {boleto.valor.toFixed(2)}</p>
                      {boleto.status === 'Pago' ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">PAGO</span>
                      ) : (
                        <button className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1 rounded-full transition-colors shadow-sm">
                          Pagar Pix
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cards de Desempenho */}
          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500 p-3 rounded-full text-white">
                <Award size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Presença Geral</p>
                <p className="text-2xl font-bold text-emerald-900">{loading ? '...' : `${frequenciaGeral}%`}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500 p-3 rounded-full text-white">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Dias Letivos</p>
                <p className="text-2xl font-bold text-blue-900">200</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

