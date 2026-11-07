import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useEscolaAtual } from '../../../hooks/useEscolaAtual';
import { RootEscolaSelector } from '../../../components/RootEscolaSelector';

const DIAS = [
  { n: 1, nome: 'Segunda' }, { n: 2, nome: 'Terça' }, { n: 3, nome: 'Quarta' },
  { n: 4, nome: 'Quinta' }, { n: 5, nome: 'Sexta' }, { n: 6, nome: 'Sábado' },
];

const hhmm = (t: string) => t.slice(0, 5);
const minutos = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const horas = (min: number) => (min / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

interface Aula {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  titulo: string;      // linha principal (disciplina)
  subtitulo: string;   // linha secundária (turma ou professor)
  etiqueta?: string;   // nome da escola, na agenda do próprio professor
}

/** Semana em colunas (segunda a sábado), aulas em ordem de horário. */
const Semana: React.FC<{ aulas: Aula[]; onRemover?: (a: Aula) => void }> = ({ aulas, onRemover }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
    {DIAS.map(d => {
      const doDia = aulas.filter(a => a.dia_semana === d.n).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
      return (
        <div key={d.n} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {d.nome}
          </div>
          <div className="p-2 space-y-2 min-h-[72px]">
            {doDia.length === 0 && <p className="text-xs text-gray-400 px-1 py-2">Sem aulas</p>}
            {doDia.map(a => (
              <div key={a.id} className="rounded-lg border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-2 text-sm">
                <div className="flex items-start justify-between gap-1">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">{hhmm(a.hora_inicio)}–{hhmm(a.hora_fim)}</span>
                  {onRemover && (
                    <button type="button" onClick={() => onRemover(a)} title="Remover aula" className="text-gray-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{a.titulo}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{a.subtitulo}</div>
                {a.etiqueta && <div className="mt-1 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600">{a.etiqueta}</div>}
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

interface Turma { id: string; nome: string; turno: string; ano_letivo: number }
interface Atribuicao { professor_id: string; disciplina_id: string; professor: string; disciplina: string }

type Visao = 'turma' | 'professor' | 'minha';

export const GradeHorarios: React.FC = () => {
  const { user, escolaAtiva, isSystemRoot } = useAuth();
  const { escolaId, precisaSelecionarEscola, escolas, escolaRootId, setEscolaRootId, loadingEscolas } = useEscolaAtual();
  const papel = escolaAtiva?.papel;
  const podeEditar = isSystemRoot || ['Admin', 'Diretor', 'Secretaria'].includes(papel || '');
  const [visao, setVisao] = useState<Visao>(podeEditar ? 'turma' : 'minha');

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState('');
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [professores, setProfessores] = useState<{ id: string; nome: string; carga: number | null }[]>([]);
  const [professorId, setProfessorId] = useState('');
  const [form, setForm] = useState({ dia: '1', inicio: '07:00', fim: '07:50', atribuicao: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [cargas, setCargas] = useState<Record<string, number | null>>({});

  // Turmas e professores da escola (visões "por turma" e "por professor")
  useEffect(() => {
    if (!escolaId || !podeEditar) return;
    (async () => {
      const [t, p] = await Promise.all([
        supabase.from('turmas').select('id, nome, turno, ano_letivo').eq('escola_id', escolaId).order('nome'),
        supabase.from('membros_escola').select('carga_horaria_semanal, perfis:user_id (id, nome)').eq('escola_id', escolaId).eq('papel', 'Professor'),
      ]);
      setTurmas((t.data || []) as Turma[]);
      setProfessores(((p.data || []) as any[]).filter(x => x.perfis).map(x => ({ id: x.perfis.id, nome: x.perfis.nome, carga: x.carga_horaria_semanal })));
    })();
  }, [escolaId, podeEditar]);

  const carregarTurma = async () => {
    if (!escolaId || !turmaId) { setAulas([]); setAtribuicoes([]); return; }
    setCarregando(true);
    const [at, h] = await Promise.all([
      supabase.from('turma_professores').select('professor_id, disciplina_id, perfis:professor_id (nome), disciplinas:disciplina_id (nome)').eq('turma_id', turmaId),
      supabase.from('horarios_aula').select('id, dia_semana, hora_inicio, hora_fim, perfis:professor_id (nome), disciplinas:disciplina_id (nome)').eq('turma_id', turmaId),
    ]);
    const lista = ((at.data || []) as any[]).map(a => ({
      professor_id: a.professor_id, disciplina_id: a.disciplina_id, professor: a.perfis?.nome || '—', disciplina: a.disciplinas?.nome || '—',
    }));
    setAtribuicoes(lista);
    setForm(f => ({ ...f, atribuicao: lista.some(l => `${l.professor_id}|${l.disciplina_id}` === f.atribuicao) ? f.atribuicao : '' }));
    setAulas(((h.data || []) as any[]).map(a => ({
      id: a.id, dia_semana: a.dia_semana, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim,
      titulo: a.disciplinas?.nome || '—', subtitulo: a.perfis?.nome || '—',
    })));
    setCarregando(false);
  };

  const carregarProfessor = async () => {
    if (!escolaId || !professorId) { setAulas([]); return; }
    setCarregando(true);
    const { data } = await supabase.from('horarios_aula')
      .select('id, dia_semana, hora_inicio, hora_fim, turmas:turma_id (nome, turno), disciplinas:disciplina_id (nome)')
      .eq('escola_id', escolaId).eq('professor_id', professorId);
    setAulas(((data || []) as any[]).map(a => ({
      id: a.id, dia_semana: a.dia_semana, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim,
      titulo: a.disciplinas?.nome || '—', subtitulo: `Turma ${a.turmas?.nome || '—'} · ${a.turmas?.turno || ''}`,
    })));
    setCarregando(false);
  };

  // Agenda do próprio usuário, em TODAS as escolas em que atua
  const carregarMinha = async () => {
    if (!user) return;
    setCarregando(true);
    const [h, m] = await Promise.all([
      supabase.from('horarios_aula')
        .select('id, dia_semana, hora_inicio, hora_fim, escolas:escola_id (nome), turmas:turma_id (nome, turno), disciplinas:disciplina_id (nome)')
        .eq('professor_id', user.id),
      supabase.from('membros_escola').select('escola_id, carga_horaria_semanal, escolas:escola_id (nome)').eq('user_id', user.id).eq('papel', 'Professor'),
    ]);
    setAulas(((h.data || []) as any[]).map(a => ({
      id: a.id, dia_semana: a.dia_semana, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim,
      titulo: a.disciplinas?.nome || '—', subtitulo: `Turma ${a.turmas?.nome || '—'} · ${a.turmas?.turno || ''}`,
      etiqueta: a.escolas?.nome,
    })));
    const c: Record<string, number | null> = {};
    for (const x of (m.data || []) as any[]) c[x.escolas?.nome || x.escola_id] = x.carga_horaria_semanal;
    setCargas(c);
    setCarregando(false);
  };

  useEffect(() => {
    setErro('');
    if (visao === 'turma') carregarTurma();
    else if (visao === 'professor') carregarProfessor();
    else carregarMinha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visao, turmaId, professorId, escolaId, user?.id]);

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    const [professor_id, disciplina_id] = form.atribuicao.split('|');
    if (!professor_id || !disciplina_id) { setErro('Escolha a disciplina e o professor.'); return; }
    if (form.fim <= form.inicio) { setErro('O horário de término deve ser depois do início.'); return; }
    setSalvando(true);
    const { error } = await supabase.from('horarios_aula').insert({
      escola_id: escolaId, turma_id: turmaId, professor_id, disciplina_id,
      dia_semana: Number(form.dia), hora_inicio: form.inicio, hora_fim: form.fim,
    });
    setSalvando(false);
    if (error) {
      // As mensagens de conflito vêm prontas do banco (em português); as demais ganham um texto simples.
      setErro(['23P01', '23514'].includes(error.code || '') ? error.message : 'Não foi possível salvar a aula. Tente novamente.');
      return;
    }
    carregarTurma();
  };

  const remover = async (a: Aula) => {
    if (!confirm(`Remover a aula de ${a.titulo} (${hhmm(a.hora_inicio)}–${hhmm(a.hora_fim)})?`)) return;
    const { error } = await supabase.from('horarios_aula').delete().eq('id', a.id);
    if (error) { setErro('Não foi possível remover a aula.'); return; }
    if (visao === 'turma') carregarTurma(); else carregarProfessor();
  };

  const totalMin = useMemo(() => aulas.reduce((s, a) => s + minutos(a.hora_fim) - minutos(a.hora_inicio), 0), [aulas]);
  const profSel = professores.find(p => p.id === professorId);

  const visoes: { id: Visao; label: string }[] = [
    ...(podeEditar ? [{ id: 'turma' as Visao, label: 'Por turma' }, { id: 'professor' as Visao, label: 'Por professor' }] : []),
    ...(isSystemRoot ? [] : [{ id: 'minha' as Visao, label: 'Minha agenda' }]),
  ];

  const campo = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-5">
      {(precisaSelecionarEscola || (!escolaId && escolas.length > 0)) && visao !== 'minha' && (
        <RootEscolaSelector escolas={escolas} escolaRootId={escolaRootId} setEscolaRootId={setEscolaRootId} loading={loadingEscolas} />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 inline-flex">
          {visoes.map(v => (
            <button key={v.id} onClick={() => setVisao(v.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${visao === v.id ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
              {v.label}
            </button>
          ))}
        </div>

        {visao === 'turma' && (
          <select value={turmaId} onChange={e => setTurmaId(e.target.value)} className={`${campo} max-w-xs`}>
            <option value="">— Escolha a turma —</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} · {t.turno} · {t.ano_letivo}</option>)}
          </select>
        )}
        {visao === 'professor' && (
          <select value={professorId} onChange={e => setProfessorId(e.target.value)} className={`${campo} max-w-xs`}>
            <option value="">— Escolha o professor —</option>
            {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        )}
      </div>

      {erro && (
        <div className="flex items-start gap-2 p-3 rounded-lg border text-sm bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {erro}
        </div>
      )}

      {/* Formulário de nova aula (só por turma) */}
      {visao === 'turma' && podeEditar && turmaId && (
        <form onSubmit={adicionar} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1 lg:col-span-2">Disciplina — professor
            <select value={form.atribuicao} onChange={e => setForm({ ...form, atribuicao: e.target.value })} className={campo}>
              <option value="">— Escolha —</option>
              {atribuicoes.map(a => <option key={`${a.professor_id}|${a.disciplina_id}`} value={`${a.professor_id}|${a.disciplina_id}`}>{a.disciplina} — {a.professor}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">Dia
            <select value={form.dia} onChange={e => setForm({ ...form, dia: e.target.value })} className={campo}>
              {DIAS.map(d => <option key={d.n} value={d.n}>{d.nome}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">Início
            <input type="time" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} className={campo} />
          </label>
          <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">Término
            <input type="time" value={form.fim} onChange={e => setForm({ ...form, fim: e.target.value })} className={campo} />
          </label>
          <button type="submit" disabled={salvando}
            className="sm:col-span-2 lg:col-span-5 inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg">
            <Plus size={16} /> {salvando ? 'Salvando...' : 'Adicionar aula'}
          </button>
          {atribuicoes.length === 0 && (
            <p className="sm:col-span-2 lg:col-span-5 text-xs text-amber-600 dark:text-amber-300">
              Esta turma ainda não tem professores. Atribua em <strong>Gestão de Turmas</strong> (botão de professores da turma) antes de montar a grade.
            </p>
          )}
        </form>
      )}

      {/* Resumo de horas */}
      {(visao === 'professor' && professorId || visao === 'minha') && !carregando && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-200 space-y-1">
          <p><strong>{horas(totalMin)}h</strong> de aula por semana{visao === 'minha' ? ', somando todas as escolas' : ''}.</p>
          {visao === 'professor' && profSel && (
            <p className={profSel.carga != null && totalMin / 60 > profSel.carga ? 'text-red-600 dark:text-red-300 font-semibold' : 'text-gray-500 dark:text-gray-400'}>
              {profSel.carga != null ? `Carga contratada nesta escola: ${profSel.carga}h por semana.` : 'Carga contratada não definida (Secretaria → RH → Editar).'}
              {profSel.carga != null && totalMin / 60 > profSel.carga && ' A grade passa da carga contratada.'}
            </p>
          )}
          {visao === 'minha' && Object.entries(cargas).map(([escola, c]) => (
            <p key={escola} className="text-gray-500 dark:text-gray-400">
              {escola}: {horas(aulas.filter(a => a.etiqueta === escola).reduce((s, a) => s + minutos(a.hora_fim) - minutos(a.hora_inicio), 0))}h na grade
              {c != null ? ` · ${c}h contratadas` : ''}
            </p>
          ))}
        </div>
      )}

      {carregando ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">Carregando...</div>
      ) : (visao === 'turma' && !turmaId) || (visao === 'professor' && !professorId) ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <CalendarClock className="mx-auto mb-2 text-gray-300" size={32} />
          {visao === 'turma' ? 'Escolha uma turma para ver ou montar a grade.' : 'Escolha um professor para ver a agenda dele nesta escola.'}
        </div>
      ) : (
        <Semana aulas={aulas} onRemover={visao === 'turma' && podeEditar ? remover : undefined} />
      )}
    </div>
  );
};
