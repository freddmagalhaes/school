import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus, Trash2, AlertCircle, Copy, Settings2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useEscolaAtual } from '../../../hooks/useEscolaAtual';

const DIAS = [
  { n: 1, nome: 'Segunda' }, { n: 2, nome: 'Terça' }, { n: 3, nome: 'Quarta' },
  { n: 4, nome: 'Quinta' }, { n: 5, nome: 'Sexta' }, { n: 6, nome: 'Sábado' },
];

const hhmm = (t: string) => t.slice(0, 5);
const minutos = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const horas = (min: number) => (min / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

interface Aula {
  id: string;
  turma_id: string;
  professor_id: string;
  disciplina_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  titulo: string;      // linha principal (disciplina)
  subtitulo: string;   // linha secundária (turma ou professor)
  etiqueta?: string;   // nome da escola, na agenda do próprio professor
}

/** Semana em colunas (segunda a sábado), aulas em ordem de horário. */
const Semana: React.FC<{ aulas: Aula[]; onRemover?: (a: Aula) => void; onCopiar?: (dia: number) => void }> = ({ aulas, onRemover, onCopiar }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
    {DIAS.map(d => {
      const doDia = aulas.filter(a => a.dia_semana === d.n).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
      return (
        <div key={d.n} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center justify-between">
            {d.nome}
            {onCopiar && doDia.length > 0 && (
              <button type="button" onClick={() => onCopiar(d.n)} title={`Copiar as aulas de ${d.nome} para outros dias`}
                className="normal-case font-medium text-indigo-600 dark:text-indigo-300 hover:underline inline-flex items-center gap-1">
                <Copy size={12} /> copiar
              </button>
            )}
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
interface Periodo { id: string; turno: string; ordem: number; hora_inicio: string; hora_fim: string }
/** Uma combinação que pode virar aula: turma + disciplina + professor (já atribuídos em Gestão de Turmas). */
interface Opcao { key: string; label: string; turma_id: string; turno: string; professor_id: string; disciplina_id: string }
interface Novo { turma_id: string; professor_id: string; disciplina_id: string; dia: number; inicio: string; fim: string }

type Visao = 'turma' | 'professor' | 'minha';

const TURNOS_PADRAO = ['Matutino', 'Vespertino', 'Noturno', 'Integral'];
const somar = (hhmmStr: string, min: number) => {
  const t = Number(hhmmStr.slice(0, 2)) * 60 + Number(hhmmStr.slice(3, 5)) + min;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const campo = 'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500';
const cartao = 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4';

/** Define os tempos de aula (1º, 2º, 3º horário...) de cada turno da escola. */
const PainelPeriodos: React.FC<{ escolaId: string; turnos: string[]; periodos: Periodo[]; onMudou: () => void }> = ({ escolaId, turnos, periodos, onMudou }) => {
  const [turno, setTurno] = useState(turnos[0] || 'Matutino');
  const [ger, setGer] = useState({ inicio: '07:00', duracao: '50', qtd: '5', intervalo: '0' });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const doTurno = periodos.filter(p => p.turno === turno).sort((a, b) => a.ordem - b.ordem);

  const gerar = async () => {
    setMsg(null);
    const duracao = Number(ger.duracao), qtd = Number(ger.qtd), intervalo = Number(ger.intervalo);
    if (!(duracao > 0 && duracao <= 240) || !(qtd >= 1 && qtd <= 20) || !(intervalo >= 0 && intervalo <= 120)) {
      setMsg({ ok: false, texto: 'Confira: duração de 1 a 240 min, de 1 a 20 horários e intervalo de 0 a 120 min.' });
      return;
    }
    if (doTurno.length > 0 && !confirm(`Substituir os ${doTurno.length} tempos de aula do turno ${turno}? As aulas já lançadas na grade não mudam.`)) return;
    const linhas = [];
    let ini = ger.inicio;
    for (let i = 1; i <= qtd; i++) {
      const fim = somar(ini, duracao);
      if (fim <= ini) { setMsg({ ok: false, texto: 'Os horários passaram da meia-noite. Reduza a quantidade ou comece mais cedo.' }); return; }
      linhas.push({ escola_id: escolaId, turno, ordem: i, hora_inicio: ini, hora_fim: fim });
      ini = somar(fim, intervalo);
    }
    const del = await supabase.from('periodos_aula').delete().eq('escola_id', escolaId).eq('turno', turno);
    if (del.error) { setMsg({ ok: false, texto: 'Não foi possível salvar. Você pode não ter permissão nesta escola.' }); return; }
    const ins = await supabase.from('periodos_aula').insert(linhas);
    if (ins.error) { setMsg({ ok: false, texto: 'Não foi possível salvar os tempos de aula.' }); onMudou(); return; }
    setMsg({ ok: true, texto: `${qtd} tempos de aula criados para o turno ${turno}.` });
    onMudou();
  };

  const remover = async (p: Periodo) => {
    const { error } = await supabase.from('periodos_aula').delete().eq('id', p.id);
    if (error) setMsg({ ok: false, texto: 'Não foi possível remover o horário.' });
    onMudou();
  };

  return (
    <div className={`${cartao} space-y-3`}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-bold text-gray-900 dark:text-gray-100">Tempos de aula da escola</h3>
        <select value={turno} onChange={e => { setTurno(e.target.value); setMsg(null); }} className={`${campo} max-w-[200px]`}>
          {turnos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="grid sm:grid-cols-5 gap-3 items-end">
        <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">1º horário começa às
          <input type="time" value={ger.inicio} onChange={e => setGer({ ...ger, inicio: e.target.value })} className={campo} />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">Duração da aula (min)
          <input type="number" min={1} max={240} value={ger.duracao} onChange={e => setGer({ ...ger, duracao: e.target.value })} className={campo} />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">Quantidade de horários
          <input type="number" min={1} max={20} value={ger.qtd} onChange={e => setGer({ ...ger, qtd: e.target.value })} className={campo} />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">Intervalo entre aulas (min)
          <input type="number" min={0} max={120} value={ger.intervalo} onChange={e => setGer({ ...ger, intervalo: e.target.value })} className={campo} />
        </label>
        <button type="button" onClick={gerar} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg">Gerar tempos</button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}>{msg.texto}</p>}
      {doTurno.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum tempo de aula definido para {turno}.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {doTurno.map(p => (
            <span key={p.id} className="inline-flex items-center gap-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 px-2.5 py-1.5 text-gray-800 dark:text-gray-100">
              <strong>{p.ordem}º</strong> {hhmm(p.hora_inicio)}–{hhmm(p.hora_fim)}
              <button type="button" onClick={() => remover(p)} title="Remover" className="text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/** Formulário de aula: escolhe turma/disciplina/professor, um ou vários dias e o horário (ou "1º horário"). */
const FormAula: React.FC<{ opcoes: Opcao[]; periodos: Periodo[]; salvando: boolean; aviso?: string; onSalvar: (novos: Novo[]) => void }> = ({ opcoes, periodos, salvando, aviso, onSalvar }) => {
  const [opcao, setOpcao] = useState('');
  const [dias, setDias] = useState<number[]>([1]);
  const [periodo, setPeriodo] = useState('');           // ordem do horário, ou 'outro'
  const [manual, setManual] = useState({ inicio: '07:00', fim: '07:50' });
  const [erro, setErro] = useState('');

  const op = opcoes.find(o => o.key === opcao);
  const doTurno = useMemo(() => periodos.filter(p => p.turno === op?.turno).sort((a, b) => a.ordem - b.ordem), [periodos, op?.turno]);
  useEffect(() => { if (!opcoes.some(o => o.key === opcao)) setOpcao(''); }, [opcoes, opcao]);
  useEffect(() => { setPeriodo(doTurno.length ? String(doTurno[0].ordem) : 'outro'); }, [op?.turno, doTurno.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!op) { setErro('Escolha a turma e a disciplina.'); return; }
    if (dias.length === 0) { setErro('Marque ao menos um dia da semana.'); return; }
    let inicio = manual.inicio, fim = manual.fim;
    if (periodo !== 'outro') {
      const p = doTurno.find(x => String(x.ordem) === periodo);
      if (!p) { setErro('Escolha o horário.'); return; }
      inicio = hhmm(p.hora_inicio); fim = hhmm(p.hora_fim);
    }
    if (fim <= inicio) { setErro('O horário de término deve ser depois do início.'); return; }
    onSalvar(dias.sort().map(dia => ({ turma_id: op.turma_id, professor_id: op.professor_id, disciplina_id: op.disciplina_id, dia, inicio, fim })));
  };

  return (
    <form onSubmit={enviar} className={`${cartao} grid sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end`}>
      <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1 lg:col-span-3">Aula
        <select value={opcao} onChange={e => setOpcao(e.target.value)} className={campo}>
          <option value="">— Escolha —</option>
          {opcoes.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </label>
      <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1 lg:col-span-3">Horário {op ? `(turno ${op.turno})` : ''}
        <select value={periodo} onChange={e => setPeriodo(e.target.value)} className={campo}>
          {doTurno.map(p => <option key={p.id} value={p.ordem}>{p.ordem}º horário · {hhmm(p.hora_inicio)}–{hhmm(p.hora_fim)}</option>)}
          <option value="outro">Outro horário…</option>
        </select>
      </label>
      {periodo === 'outro' && (
        <>
          <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1 lg:col-span-1">Início
            <input type="time" value={manual.inicio} onChange={e => setManual({ ...manual, inicio: e.target.value })} className={campo} />
          </label>
          <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1 lg:col-span-1">Término
            <input type="time" value={manual.fim} onChange={e => setManual({ ...manual, fim: e.target.value })} className={campo} />
          </label>
        </>
      )}
      <div className="sm:col-span-2 lg:col-span-6">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Dias da semana (marque vários para repetir o mesmo horário)</p>
        <div className="flex flex-wrap gap-2">
          {DIAS.map(d => (
            <label key={d.n} className={`cursor-pointer px-3 py-1.5 rounded-lg border text-sm ${dias.includes(d.n) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'}`}>
              <input type="checkbox" className="sr-only" checked={dias.includes(d.n)}
                onChange={() => setDias(prev => prev.includes(d.n) ? prev.filter(x => x !== d.n) : [...prev, d.n])} />
              {d.nome}
            </label>
          ))}
        </div>
      </div>
      {erro && <p className="sm:col-span-2 lg:col-span-6 text-sm text-red-600 dark:text-red-300">{erro}</p>}
      {aviso && <p className="sm:col-span-2 lg:col-span-6 text-xs text-amber-600 dark:text-amber-300">{aviso}</p>}
      <button type="submit" disabled={salvando}
        className="sm:col-span-2 lg:col-span-6 inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg">
        <Plus size={16} /> {salvando ? 'Salvando...' : dias.length > 1 ? `Adicionar aula em ${dias.length} dias` : 'Adicionar aula'}
      </button>
    </form>
  );
};

export const GradeHorarios: React.FC = () => {
  const { user, escolaAtiva, isSystemRoot } = useAuth();
  const { escolaId } = useEscolaAtual();
  const papel = escolaAtiva?.papel;
  const podeEditar = isSystemRoot || ['Admin', 'Diretor', 'Secretaria'].includes(papel || '');
  const [visao, setVisao] = useState<Visao>(podeEditar ? 'turma' : 'minha');

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState('');
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [professores, setProfessores] = useState<{ id: string; nome: string; carga: number | null }[]>([]);
  const [professorId, setProfessorId] = useState('');
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [mostrarPeriodos, setMostrarPeriodos] = useState(false);
  const [copiando, setCopiando] = useState<{ dia: number; para: number[] } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState<{ ok: number; falhas: string[] } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [cargas, setCargas] = useState<Record<string, number | null>>({});

  const carregarPeriodos = async () => {
    if (!escolaId) return;
    const { data } = await supabase.from('periodos_aula').select('id, turno, ordem, hora_inicio, hora_fim').eq('escola_id', escolaId);
    setPeriodos((data || []) as Periodo[]);
  };

  // Turmas, professores e tempos de aula da escola (visões "por turma" e "por professor")
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
    carregarPeriodos();
  }, [escolaId, podeEditar]);   // eslint-disable-line react-hooks/exhaustive-deps

  const turnos = useMemo(() => [...new Set([...TURNOS_PADRAO, ...turmas.map(t => t.turno).filter(Boolean)])], [turmas]);

  const mapAula = (a: any, extra: Partial<Aula>): Aula => ({
    id: a.id, turma_id: a.turma_id, professor_id: a.professor_id, disciplina_id: a.disciplina_id,
    dia_semana: a.dia_semana, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim, titulo: '', subtitulo: '', ...extra,
  });

  const carregarTurma = async () => {
    if (!escolaId || !turmaId) { setAulas([]); setOpcoes([]); return; }
    setCarregando(true);
    const turma = turmas.find(t => t.id === turmaId);
    const [at, h] = await Promise.all([
      supabase.from('turma_professores').select('professor_id, disciplina_id, perfis:professor_id (nome), disciplinas:disciplina_id (nome)').eq('turma_id', turmaId),
      supabase.from('horarios_aula').select('id, turma_id, professor_id, disciplina_id, dia_semana, hora_inicio, hora_fim, perfis:professor_id (nome), disciplinas:disciplina_id (nome)').eq('turma_id', turmaId),
    ]);
    setOpcoes(((at.data || []) as any[]).map(a => ({
      key: `${a.professor_id}|${a.disciplina_id}`, label: `${a.disciplinas?.nome || '—'} — ${a.perfis?.nome || '—'}`,
      turma_id: turmaId, turno: turma?.turno || '', professor_id: a.professor_id, disciplina_id: a.disciplina_id,
    })));
    setAulas(((h.data || []) as any[]).map(a => mapAula(a, { titulo: a.disciplinas?.nome || '—', subtitulo: a.perfis?.nome || '—' })));
    setCarregando(false);
  };

  const carregarProfessor = async () => {
    if (!escolaId || !professorId) { setAulas([]); setOpcoes([]); return; }
    setCarregando(true);
    const [at, h] = await Promise.all([
      supabase.from('turma_professores').select('professor_id, disciplina_id, turma_id, turmas:turma_id (nome, turno), disciplinas:disciplina_id (nome)').eq('escola_id', escolaId).eq('professor_id', professorId),
      supabase.from('horarios_aula').select('id, turma_id, professor_id, disciplina_id, dia_semana, hora_inicio, hora_fim, turmas:turma_id (nome, turno), disciplinas:disciplina_id (nome)').eq('escola_id', escolaId).eq('professor_id', professorId),
    ]);
    setOpcoes(((at.data || []) as any[]).map(a => ({
      key: `${a.turma_id}|${a.disciplina_id}`, label: `Turma ${a.turmas?.nome || '—'} (${a.turmas?.turno || ''}) — ${a.disciplinas?.nome || '—'}`,
      turma_id: a.turma_id, turno: a.turmas?.turno || '', professor_id: a.professor_id, disciplina_id: a.disciplina_id,
    })).sort((x, y) => x.label.localeCompare(y.label, 'pt-BR')));
    setAulas(((h.data || []) as any[]).map(a => mapAula(a, { titulo: a.disciplinas?.nome || '—', subtitulo: `Turma ${a.turmas?.nome || '—'} · ${a.turmas?.turno || ''}` })));
    setCarregando(false);
  };

  // Agenda do próprio usuário, em TODAS as escolas em que atua
  const carregarMinha = async () => {
    if (!user) return;
    setCarregando(true);
    const [h, m] = await Promise.all([
      supabase.from('horarios_aula')
        .select('id, turma_id, professor_id, disciplina_id, dia_semana, hora_inicio, hora_fim, escolas:escola_id (nome), turmas:turma_id (nome, turno), disciplinas:disciplina_id (nome)')
        .eq('professor_id', user.id),
      supabase.from('membros_escola').select('escola_id, carga_horaria_semanal, escolas:escola_id (nome)').eq('user_id', user.id).eq('papel', 'Professor'),
    ]);
    setAulas(((h.data || []) as any[]).map(a => mapAula(a, {
      titulo: a.disciplinas?.nome || '—', subtitulo: `Turma ${a.turmas?.nome || '—'} · ${a.turmas?.turno || ''}`, etiqueta: a.escolas?.nome,
    })));
    const c: Record<string, number | null> = {};
    for (const x of (m.data || []) as any[]) c[x.escolas?.nome || x.escola_id] = x.carga_horaria_semanal;
    setCargas(c);
    setCarregando(false);
  };

  const recarregar = () => (visao === 'turma' ? carregarTurma() : visao === 'professor' ? carregarProfessor() : carregarMinha());

  useEffect(() => {
    setErro(''); setResultado(null); setCopiando(null);
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visao, turmaId, professorId, escolaId, user?.id, turmas.length]);

  /** Grava uma lista de aulas uma a uma (cada uma passa pela verificação de conflito) e resume o resultado. */
  const lancar = async (novos: Novo[]) => {
    setErro(''); setResultado(null); setSalvando(true);
    let ok = 0;
    const falhas: string[] = [];
    for (const n of novos) {
      const { error } = await supabase.from('horarios_aula').insert({
        escola_id: escolaId, turma_id: n.turma_id, professor_id: n.professor_id, disciplina_id: n.disciplina_id,
        dia_semana: n.dia, hora_inicio: n.inicio, hora_fim: n.fim,
      });
      if (!error) { ok++; continue; }
      const dia = DIAS.find(d => d.n === n.dia)?.nome || '';
      const motivo = ['23P01', '23514'].includes(error.code || '') ? error.message : 'não foi possível salvar';
      falhas.push(`${dia} ${n.inicio}–${n.fim}: ${motivo}`);
    }
    setSalvando(false);
    setResultado({ ok, falhas });
    await recarregar();
  };

  const copiarDia = async () => {
    if (!copiando || copiando.para.length === 0) return;
    const origem = aulas.filter(a => a.dia_semana === copiando.dia);
    const novos: Novo[] = [];
    for (const dia of copiando.para.sort()) {
      for (const a of origem) novos.push({ turma_id: a.turma_id, professor_id: a.professor_id, disciplina_id: a.disciplina_id, dia, inicio: hhmm(a.hora_inicio), fim: hhmm(a.hora_fim) });
    }
    setCopiando(null);
    await lancar(novos);
  };

  const remover = async (a: Aula) => {
    if (!confirm(`Remover a aula de ${a.titulo} (${hhmm(a.hora_inicio)}–${hhmm(a.hora_fim)})?`)) return;
    const { error } = await supabase.from('horarios_aula').delete().eq('id', a.id);
    if (error) { setErro('Não foi possível remover a aula.'); return; }
    setResultado(null);
    recarregar();
  };

  const totalMin = useMemo(() => aulas.reduce((s, a) => s + minutos(a.hora_fim) - minutos(a.hora_inicio), 0), [aulas]);
  const profSel = professores.find(p => p.id === professorId);
  const editavel = podeEditar && (visao === 'turma' || visao === 'professor');

  const visoes: { id: Visao; label: string }[] = [
    ...(podeEditar ? [{ id: 'turma' as Visao, label: 'Por turma' }, { id: 'professor' as Visao, label: 'Por professor' }] : []),
    ...(isSystemRoot ? [] : [{ id: 'minha' as Visao, label: 'Minha agenda' }]),
  ];

  const semAtribuicao = opcoes.length === 0
    ? (visao === 'turma'
        ? 'Esta turma ainda não tem professores. Atribua em Gestão de Turmas antes de montar a grade.'
        : 'Este professor ainda não está atribuído a nenhuma turma. Atribua em Gestão de Turmas antes de montar a grade.')
    : undefined;

  return (
    <div className="space-y-5">

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
        {podeEditar && escolaId && visao !== 'minha' && (
          <button type="button" onClick={() => setMostrarPeriodos(v => !v)}
            className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700">
            <Settings2 size={16} /> Tempos de aula
          </button>
        )}
      </div>

      {mostrarPeriodos && podeEditar && escolaId && (
        <PainelPeriodos escolaId={escolaId} turnos={turnos} periodos={periodos} onMudou={carregarPeriodos} />
      )}

      {erro && (
        <div className="flex items-start gap-2 p-3 rounded-lg border text-sm bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {erro}
        </div>
      )}

      {resultado && (
        <div className={`p-3 rounded-lg border text-sm space-y-1 ${resultado.falhas.length === 0
          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
          : 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-500/30'}`}>
          <p className="flex items-center gap-2 font-semibold">
            {resultado.falhas.length === 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {resultado.ok} {resultado.ok === 1 ? 'aula lançada' : 'aulas lançadas'}{resultado.falhas.length > 0 ? `; ${resultado.falhas.length} não ${resultado.falhas.length === 1 ? 'entrou' : 'entraram'}:` : '.'}
          </p>
          {resultado.falhas.map((f, i) => <p key={i} className="pl-6">• {f}</p>)}
        </div>
      )}

      {/* Lançamento: por turma (professor definido pela atribuição) ou por professor (várias turmas) */}
      {editavel && ((visao === 'turma' && turmaId) || (visao === 'professor' && professorId)) && (
        <FormAula opcoes={opcoes} periodos={periodos} salvando={salvando} aviso={semAtribuicao} onSalvar={lancar} />
      )}

      {/* Copiar o dia */}
      {copiando && (
        <div className={`${cartao} space-y-3`}>
          <p className="text-sm text-gray-800 dark:text-gray-100">
            Copiar as <strong>{aulas.filter(a => a.dia_semana === copiando.dia).length} aulas</strong> de <strong>{DIAS.find(d => d.n === copiando.dia)?.nome}</strong> para:
          </p>
          <div className="flex flex-wrap gap-2">
            {DIAS.filter(d => d.n !== copiando.dia).map(d => (
              <label key={d.n} className={`cursor-pointer px-3 py-1.5 rounded-lg border text-sm ${copiando.para.includes(d.n) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'}`}>
                <input type="checkbox" className="sr-only" checked={copiando.para.includes(d.n)}
                  onChange={() => setCopiando(c => c && ({ ...c, para: c.para.includes(d.n) ? c.para.filter(x => x !== d.n) : [...c.para, d.n] }))} />
                {d.nome}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Cada aula passa pela verificação de conflito; as que conflitarem não são copiadas e aparecem na lista.</p>
          <div className="flex gap-2">
            <button type="button" onClick={copiarDia} disabled={copiando.para.length === 0 || salvando}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg">Copiar</button>
            <button type="button" onClick={() => setCopiando(null)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-200 rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      {/* Resumo de horas */}
      {(visao === 'professor' && professorId || visao === 'minha') && !carregando && (
        <div className={`${cartao} text-sm text-gray-700 dark:text-gray-200 space-y-1`}>
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
          {visao === 'turma' ? 'Escolha uma turma para ver ou montar a grade.' : 'Escolha um professor para ver e montar a agenda dele nesta escola.'}
        </div>
      ) : (
        <Semana aulas={aulas} onRemover={editavel ? remover : undefined}
          onCopiar={editavel ? (dia) => { setResultado(null); setCopiando({ dia, para: [] }); } : undefined} />
      )}
    </div>
  );
};
