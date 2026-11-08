import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useEscolaAtual } from '../../../hooks/useEscolaAtual';
import { Plus, Search, Edit2, Trash2, BookOpen } from 'lucide-react';

export interface Disciplina {
  id: string;
  nome: string;
}

export const GestaoDisciplinas: React.FC = () => {
  const {
    escolaId,
    loadingEscolas,
  } = useEscolaAtual();

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
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
    setErro('');
    const { data, error } = form.id
      ? await supabase.from('disciplinas').update({ nome: form.nome }).eq('id', form.id).select('id')
      : await supabase.from('disciplinas').insert({ escola_id: escolaId, nome: form.nome }).select('id');
    setShowModal(false);
    if (error || !data || data.length === 0) {
      setErro(error?.code === '23505'
        ? 'Já existe uma disciplina com este nome nesta escola.'
        : 'Não foi possível salvar a disciplina. Você pode não ter permissão nesta escola.');
      return;
    }
    carregarDisciplinas();
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta disciplina? Isso removerá os vínculos de professores e notas associadas!')) return;
    setErro('');
    const { data, error } = await supabase.from('disciplinas').delete().eq('id', id).select('id');
    if (error || !data || data.length === 0) setErro('Não foi possível excluir a disciplina. Você pode não ter permissão nesta escola.');
    carregarDisciplinas();
  };

  const disciplinasFiltradas = disciplinas.filter(d =>
    d.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {erro && (
        <div className="p-3 rounded-lg border text-sm bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30">{erro}</div>
      )}

      {!escolaId ? (
        !loadingEscolas && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            Selecione uma escola acima para gerenciar disciplinas.
          </div>
        )
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar disciplina..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
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
              <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                {busca ? `Nenhuma disciplina encontrada para "${busca}".` : 'Nenhuma disciplina cadastrada. Clique em "Nova Disciplina" para começar.'}
              </div>
            ) : (
              disciplinasFiltradas.map(disc => (
                <div key={disc.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-32">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0">
                      <BookOpen size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">{disc.nome}</h3>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-slate-700 pt-3 mt-auto">
                    <button onClick={() => { setForm(disc); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleExcluir(disc.id)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">{form.id ? 'Editar Disciplina' : 'Nova Disciplina'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSalvar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nome da Disciplina</label>
                <input
                  required type="text" value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                  placeholder="Ex: Matemática"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-900 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
