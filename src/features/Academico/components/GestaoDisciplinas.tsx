import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useEscolaAtual } from '../../../hooks/useEscolaAtual';
import { RootEscolaSelector } from '../../../components/RootEscolaSelector';
import { Plus, Search, Edit2, Trash2, BookOpen } from 'lucide-react';

export interface Disciplina {
  id: string;
  nome: string;
}

export const GestaoDisciplinas: React.FC = () => {
  const {
    escolaId,
    precisaSelecionarEscola,
    escolas,
    escolaRootId,
    setEscolaRootId,
    loadingEscolas,
  } = useEscolaAtual();

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: '', nome: '' });

  useEffect(() => {
    if (escolaId) carregarDisciplinas();
  }, [escolaId]);

  const carregarDisciplinas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('disciplinas')
      .select('*')
      .eq('escola_id', escolaId!)
      .order('nome');
    setDisciplinas(data || []);
    setLoading(false);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaId) return;
    if (form.id) {
      await supabase.from('disciplinas').update({ nome: form.nome }).eq('id', form.id);
    } else {
      await supabase.from('disciplinas').insert({ escola_id: escolaId, nome: form.nome });
    }
    setShowModal(false);
    carregarDisciplinas();
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta disciplina? Isso removerá os vínculos de professores e notas associadas!')) return;
    await supabase.from('disciplinas').delete().eq('id', id);
    carregarDisciplinas();
  };

  const disciplinasFiltradas = disciplinas.filter(d =>
    d.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Seletor de escola para o Root sem vínculo */}
      {precisaSelecionarEscola || (!escolaId && escolas.length > 0) ? (
        <RootEscolaSelector
          escolas={escolas}
          escolaRootId={escolaRootId}
          setEscolaRootId={setEscolaRootId}
          loading={loadingEscolas}
        />
      ) : null}

      {!escolaId ? (
        !loadingEscolas && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
            Selecione uma escola acima para gerenciar disciplinas.
          </div>
        )
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar disciplina..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
              />
            </div>
            <button
              onClick={() => { setForm({ id: '', nome: '' }); setShowModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              <Plus size={18} /> Nova Disciplina
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {loading ? null : disciplinasFiltradas.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
                {busca ? `Nenhuma disciplina encontrada para "${busca}".` : 'Nenhuma disciplina cadastrada. Clique em "Nova Disciplina" para começar.'}
              </div>
            ) : (
              disciplinasFiltradas.map(disc => (
                <div key={disc.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-32">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <BookOpen size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{disc.nome}</h3>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 mt-auto">
                    <button onClick={() => { setForm(disc); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleExcluir(disc.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-900">{form.id ? 'Editar Disciplina' : 'Nova Disciplina'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSalvar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Disciplina</label>
                <input
                  required type="text" value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                  placeholder="Ex: Matemática"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
