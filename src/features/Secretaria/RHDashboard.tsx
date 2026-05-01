import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { StatusBadge } from '../../components/StatusBadge';
import { Search, Filter, Edit2, Plus, Trash2 } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

type ProfissionalPapel = 'Admin' | 'Diretor' | 'Subdiretor' | 'Secretaria' | 'Professor';

type VinculoTipo = 'Efetivo' | 'Designado';

interface Profissional {
  id: string;
  nome: string;
  cpf: string;
  papel: ProfissionalPapel;
  tipo_vinculo: VinculoTipo;
  data_fim: string | null;
}

 export const RHDashboard: React.FC = () => {
   const { escolaAtiva } = useAuth();
   const [filtroVinculo, setFiltroVinculo] = useState<string>('Todos');
   const [busca, setBusca] = useState<string>('');
   const [profissionais, setProfissionais] = useState<Profissional[]>([]);
   const [loading, setLoading] = useState(false);
   const [showModal, setShowModal] = useState(false);
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null);
   const [dataFimEdicao, setDataFimEdicao] = useState('');
   const [tipoVinculoEdicao, setTipoVinculoEdicao] = useState<VinculoTipo>('Efetivo');
   const [salvandoProfissional, setSalvandoProfissional] = useState(false);
   const [erroProfissional, setErroProfissional] = useState('');
   const [salvandoNovoProfissional, setSalvandoNovoProfissional] = useState(false);
   const [createError, setCreateError] = useState('');
   const [feedback, setFeedback] = useState('');
   const [novoProfissional, setNovoProfissional] = useState({
     nome: '',
     email: '',
     cpf: '',
     papel: 'Professor' as ProfissionalPapel,
     tipo_vinculo: 'Efetivo' as VinculoTipo,
     data_fim: '',
   });

  useEffect(() => {
    if (!escolaAtiva) return;
    carregarProfissionais();
  }, [escolaAtiva]);

  const carregarProfissionais = async () => {
    if (!escolaAtiva) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('membros_escola')
      .select('id, papel, tipo_vinculo, data_fim, perfis:perfis (nome, cpf)')
      .eq('escola_id', escolaAtiva.escola_id)
      .in('papel', ['Admin', 'Diretor', 'Subdiretor', 'Secretaria', 'Professor'])
      .order('papel', { ascending: true });

    if (!error && data) {
      setProfissionais(
        (data as any[]).map((item) => ({
          id: item.id,
          nome: item.perfis?.nome || 'Sem nome',
          cpf: item.perfis?.cpf || 'N/A',
          papel: item.papel,
          tipo_vinculo: item.tipo_vinculo,
          data_fim: item.data_fim,
        }))
      );
    } else {
      setProfissionais([]);
    }

    setLoading(false);
  };

  const canEditRH = escolaAtiva?.papel === 'Admin' || escolaAtiva?.papel === 'Secretaria';

  const abrirModalEditarProfissional = (prof: Profissional) => {
    setSelectedProfissional(prof);
    setTipoVinculoEdicao(prof.tipo_vinculo);
    setDataFimEdicao(prof.data_fim || '');
    setErroProfissional('');
    setShowModal(true);
  };

  const abrirModalNovoProfissional = () => {
    setNovoProfissional({
      nome: '',
      email: '',
      cpf: '',
      papel: 'Professor',
      tipo_vinculo: 'Efetivo',
      data_fim: '',
    });
    setCreateError('');
    setShowCreateModal(true);
  };

  const handleSalvarProfissional = async () => {
    if (!selectedProfissional || !escolaAtiva) return;
    setSalvandoProfissional(true);
    const { error } = await supabase
      .from('membros_escola')
      .update({ tipo_vinculo: tipoVinculoEdicao, data_fim: dataFimEdicao || null })
      .eq('id', selectedProfissional.id);

    setSalvandoProfissional(false);
    if (error) {
      setErroProfissional('Erro ao salvar. Tente novamente.');
      return;
    }

    setShowModal(false);
    setSelectedProfissional(null);
    carregarProfissionais();
  };

  const handleCriarProfissional = async () => {
    if (!escolaAtiva) return;
    setSalvandoNovoProfissional(true);
    setCreateError('');

    try {
      const { data, error } = await supabase.functions.invoke('create-school-user', {
        body: {
          escola_id: escolaAtiva.escola_id,
          nome: novoProfissional.nome,
          email: novoProfissional.email,
          cpf: novoProfissional.cpf,
          papel: novoProfissional.papel,
          tipo_vinculo: novoProfissional.tipo_vinculo,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setFeedback(`Profissional ${novoProfissional.nome} criado com sucesso.`);
      setShowCreateModal(false);
      carregarProfissionais();
    } catch (err: any) {
      setCreateError(err.message || 'Erro ao criar profissional.');
    } finally {
      setSalvandoNovoProfissional(false);
    }
  };

  const handleRemoverProfissional = async (id: string) => {
    if (!confirm('Remover o vínculo deste profissional da escola?')) return;
    await supabase.from('membros_escola').delete().eq('id', id);
    carregarProfissionais();
  };

  const dadosFiltrados = profissionais.filter((prof) => {
    const matchBusca = prof.nome.toLowerCase().includes(busca.toLowerCase()) || prof.cpf.includes(busca);
    const matchVinculo = filtroVinculo === 'Todos' || prof.tipo_vinculo === filtroVinculo;
    return matchBusca && matchVinculo;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Equipe (RH)</h2>
          <p className="text-sm text-gray-500">Unidade Escolar: {escolaAtiva?.escola.nome}</p>
        </div>
        <button
          type="button"
          onClick={abrirModalNovoProfissional}
          disabled={!canEditRH}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-60"
        >
          <Plus size={16} /> Novo Profissional
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={18} className="text-gray-400" />
          <select
            value={filtroVinculo}
            onChange={(e) => setFiltroVinculo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 flex-1 sm:flex-none appearance-none"
          >
            <option value="Todos">Todos os Vínculos</option>
            <option value="Efetivo">Efetivos</option>
            <option value="Designado">Designados</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-3 font-medium">Profissional</th>
                <th className="px-6 py-3 font-medium">Cargo</th>
                <th className="px-6 py-3 font-medium">Vínculo</th>
                <th className="px-6 py-3 font-medium">Vencimento Contrato</th>
                <th className="px-6 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Carregando profissionais...
                  </td>
                </tr>
              ) : dadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhum profissional encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                dadosFiltrados.map((prof) => {
                  let diasParaVencer: number | undefined;
                  if (prof.tipo_vinculo === 'Designado' && prof.data_fim) {
                    diasParaVencer = differenceInDays(parseISO(prof.data_fim), new Date());
                  }

                  return (
                    <tr key={prof.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex flex-shrink-0 items-center justify-center font-bold text-xs ring-2 ring-white">
                            {prof.nome.charAt(0)}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{prof.nome}</p>
                            <p className="text-xs text-gray-500">{prof.cpf}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{prof.papel}</td>
                      <td className="px-6 py-4">
                        <StatusBadge tipo={prof.tipo_vinculo as any} diasAteVencimento={diasParaVencer} />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {prof.tipo_vinculo === 'Efetivo' ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <span className={diasParaVencer !== undefined && diasParaVencer <= 30 ? 'text-red-600 font-semibold flex items-center gap-1' : 'text-gray-600'}>
                            {diasParaVencer} dias
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center gap-3">
                          <button
                            type="button"
                            onClick={() => abrirModalEditarProfissional(prof)}
                            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            <Edit2 size={16} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoverProfissional(prof.id)}
                            className="inline-flex items-center gap-2 text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            <Trash2 size={16} />
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {feedback}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Novo Profissional</h2>
                <p className="text-sm text-gray-500">Crie um novo usuário de RH e vincule-o à escola.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome completo</label>
                <input
                  value={novoProfissional.nome}
                  onChange={(e) => setNovoProfissional((prev) => ({ ...prev, nome: e.target.value }))}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nome do profissional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">E-mail</label>
                <input
                  type="email"
                  value={novoProfissional.email}
                  onChange={(e) => setNovoProfissional((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  placeholder="usuario@escola.com"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">CPF</label>
                  <input
                    value={novoProfissional.cpf}
                    onChange={(e) => setNovoProfissional((prev) => ({ ...prev, cpf: e.target.value }))}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cargo</label>
                  <select
                    value={novoProfissional.papel}
                    onChange={(e) => setNovoProfissional((prev) => ({ ...prev, papel: e.target.value as ProfissionalPapel }))}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Diretor">Diretor</option>
                    <option value="Subdiretor">Subdiretor</option>
                    <option value="Secretaria">Secretaria</option>
                    <option value="Professor">Professor</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de vínculo</label>
                  <select
                    value={novoProfissional.tipo_vinculo}
                    onChange={(e) => setNovoProfissional((prev) => ({ ...prev, tipo_vinculo: e.target.value as VinculoTipo }))}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Efetivo">Efetivo</option>
                    <option value="Designado">Designado</option>
                  </select>
                </div>
                {novoProfissional.tipo_vinculo === 'Designado' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data fim do vínculo</label>
                    <input
                      type="date"
                      value={novoProfissional.data_fim}
                      onChange={(e) => setNovoProfissional((prev) => ({ ...prev, data_fim: e.target.value }))}
                      className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCriarProfissional}
                disabled={salvandoNovoProfissional}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {salvandoNovoProfissional ? 'Criando...' : 'Criar profissional'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && selectedProfissional && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Editar vínculo de {selectedProfissional.nome}</h2>
                <p className="text-sm text-gray-500">Atualize tipo de vínculo e data de encerramento.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Fechar
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de vínculo</label>
                <select
                  value={tipoVinculoEdicao}
                  onChange={(e) => setTipoVinculoEdicao(e.target.value as VinculoTipo)}
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Efetivo">Efetivo</option>
                  <option value="Designado">Designado</option>
                </select>
              </div>
              {tipoVinculoEdicao === 'Designado' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data fim do vínculo</label>
                  <input
                    type="date"
                    value={dataFimEdicao}
                    onChange={(e) => setDataFimEdicao(e.target.value)}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              {erroProfissional && <p className="text-sm text-red-600">{erroProfissional}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarProfissional}
                disabled={salvandoProfissional}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {salvandoProfissional ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
