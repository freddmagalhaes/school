import { useEffect, useState } from 'react';
import { LifeBuoy, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Escola = { id: string; nome: string; cnpj: string };
type Usuario = { user_id: string; nome: string; papel: string; tipo_vinculo: string; carga_horaria_semanal: number | null; data_fim: string | null; email: string };

const NIVEL_NOME: Record<number, string> = { 1: 'N1 — atendimento', 2: 'N2 — analista', 3: 'N3 — especialista', 4: 'Dono do sistema' };
const caixa = 'bg-white dark:bg-[#0e1425] border border-gray-100 dark:border-[#1e2d4a] rounded-2xl p-5 shadow-sm dark:shadow-none';
const campo = 'w-full px-3 py-2 bg-white dark:bg-[#141c2e] border border-gray-200 dark:border-[#1e2d4a] rounded-xl text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:border-amber-400/40';
const botao = 'px-4 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white';

/** Consulta de dados das escolas pela equipe de suporte. Tudo passa por funções que conferem o nível e gravam auditoria. */
export const SuporteEscolas = () => {
  const [nivel, setNivel] = useState(0);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [escolaId, setEscolaId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [resumo, setResumo] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [estrutura, setEstrutura] = useState<any>(null);
  const [aluno, setAluno] = useState<any>(null);
  const [alunoId, setAlunoId] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const motivoOk = motivo.trim().length >= 10;
  const msg = (e: { message?: string } | null) => e?.message || 'Não foi possível concluir a consulta.';

  useEffect(() => {
    (async () => {
      const [n, e] = await Promise.all([supabase.rpc('suporte_nivel'), supabase.rpc('suporte_escolas')]);
      setNivel(Number(n.data) || 0);
      setEscolas((e.data || []) as Escola[]);
    })();
  }, []);

  const limpar = () => { setResumo(null); setUsuarios([]); setEstrutura(null); setAluno(null); setAlunoId(''); setErro(''); };

  const abrirEscola = async (id: string) => {
    setEscolaId(id); limpar();
    if (!id) return;
    setCarregando(true);
    const [r, u] = await Promise.all([
      supabase.rpc('suporte_escola_resumo', { p_escola: id }),
      supabase.rpc('suporte_usuarios', { p_escola: id, p_motivo: null }),
    ]);
    if (r.error) setErro(msg(r.error)); else setResumo(r.data);
    if (!u.error) setUsuarios((u.data || []) as Usuario[]);
    setCarregando(false);
  };

  const emailCompleto = async () => {
    setErro('');
    const { data, error } = await supabase.rpc('suporte_usuarios', { p_escola: escolaId, p_motivo: motivo });
    if (error) setErro(msg(error)); else setUsuarios((data || []) as Usuario[]);
  };
  const verEstrutura = async () => {
    setErro('');
    const { data, error } = await supabase.rpc('suporte_estrutura', { p_escola: escolaId, p_motivo: motivo });
    if (error) setErro(msg(error)); else setEstrutura(data);
  };
  const verAluno = async () => {
    setErro('');
    const { data, error } = await supabase.rpc('suporte_aluno', { p_escola: escolaId, p_aluno: alunoId, p_motivo: motivo });
    if (error) setErro(msg(error)); else setAluno(data);
  };

  const alunos = usuarios.filter(u => u.papel === 'Aluno');

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <LifeBuoy className="text-amber-400" />
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Suporte às escolas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Seu nível: <strong className="text-amber-500">{NIVEL_NOME[nivel] || 'sem acesso'}</strong>. Cada consulta fica registrada na auditoria.</p>
        </div>
      </div>

      {nivel === 0 ? (
        <div className={caixa}>Seu usuário não tem acesso a dados de escolas.</div>
      ) : (
        <>
          <div className={`${caixa} grid md:grid-cols-2 gap-4`}>
            <label className="text-xs text-gray-500 space-y-1">Escola
              <select value={escolaId} onChange={e => abrirEscola(e.target.value)} className={campo}>
                <option value="">— Escolha a escola —</option>
                {escolas.map(e => <option key={e.id} value={e.id}>{e.nome} · {e.cnpj}</option>)}
              </select>
            </label>
            {nivel >= 2 && (
              <label className="text-xs text-gray-500 space-y-1">Motivo do acesso (nº do chamado) — obrigatório para N2 e N3
                <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex.: Chamado 1234, dúvida sobre notas" className={campo} />
              </label>
            )}
          </div>

          {erro && <div className="flex items-start gap-2 p-3 rounded-xl border text-sm bg-rose-400/10 border-rose-400/20 text-rose-400"><AlertCircle size={16} className="mt-0.5" /> {erro}</div>}
          {carregando && <p className="text-sm text-gray-500">Carregando...</p>}

          {resumo && (
            <div className={`${caixa} space-y-2`}>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Resumo (N1)</h2>
              <p className="text-gray-900 dark:text-white font-semibold">{resumo.escola?.nome} <span className="text-gray-500 font-normal">· {resumo.escola?.cnpj}</span></p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {resumo.turmas} turmas · {resumo.alunos_matriculados} alunos matriculados ·{' '}
                {Object.entries(resumo.usuarios_por_papel || {}).map(([p, n]) => `${n} ${p}`).join(', ') || 'sem usuários'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Assinatura: {(resumo.assinaturas || []).length === 0 ? 'não ligada a esta escola' : (resumo.assinaturas as any[]).map(a => `${a.plano} (${a.status})`).join(', ')}
              </p>
            </div>
          )}

          {usuarios.length > 0 && (
            <div className={caixa}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Usuários (sem CPF)</h2>
                {nivel >= 2 && <button className={botao} disabled={!motivoOk} onClick={emailCompleto}>Mostrar e-mail completo</button>}
              </div>
              <div className="overflow-x-auto"><table className="w-full text-sm text-left">
                <thead><tr className="text-gray-500 text-xs uppercase"><th className="py-2 pr-4">Nome</th><th className="pr-4">Papel</th><th className="pr-4">Vínculo</th><th className="pr-4">Carga</th><th>E-mail</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1e2d4a] text-gray-800 dark:text-gray-200">
                  {usuarios.map(u => (
                    <tr key={u.user_id + u.papel}><td className="py-2 pr-4">{u.nome}</td><td className="pr-4">{u.papel}</td><td className="pr-4">{u.tipo_vinculo}</td>
                      <td className="pr-4">{u.carga_horaria_semanal != null ? `${u.carga_horaria_semanal}h` : '—'}</td><td className="text-gray-500">{u.email}</td></tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}

          {escolaId && (
            <div className={`${caixa} space-y-3`}>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">Estrutura da escola (N2) {nivel < 2 && <Lock size={14} />}</h2>
              {nivel < 2 ? <p className="text-sm text-gray-500">Disponível a partir do N2.</p> : (
                <>
                  <button className={botao} disabled={!motivoOk} onClick={verEstrutura}>Ver turmas, professores e disciplinas</button>
                  {estrutura && (
                    <div className="text-sm text-gray-800 dark:text-gray-200 space-y-2">
                      {(estrutura.turmas as any[]).map((t, i) => (
                        <div key={i} className="border border-gray-100 dark:border-[#1e2d4a] rounded-xl p-3">
                          <strong>{t.nome}</strong> · {t.turno} · {t.ano_letivo} — {t.alunos_ativos} alunos, {t.aulas_na_grade} aulas na grade
                          <div className="text-gray-500 text-xs mt-1">{(t.professores as any[]).map(p => `${p.disciplina}: ${p.professor}`).join(' · ') || 'sem professores atribuídos'}</div>
                        </div>
                      ))}
                      <p className="text-xs text-gray-500">Disciplinas: {(estrutura.disciplinas as string[]).join(', ') || '—'}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {escolaId && (
            <div className={`${caixa} space-y-3`}>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">Dados de um aluno (N3) {nivel < 3 && <Lock size={14} />}</h2>
              {nivel < 3 ? <p className="text-sm text-gray-500">Disponível a partir do N3.</p> : (
                <>
                  <div className="flex flex-wrap gap-3">
                    <select value={alunoId} onChange={e => setAlunoId(e.target.value)} className={`${campo} max-w-sm`}>
                      <option value="">— Escolha o aluno —</option>
                      {alunos.map(a => <option key={a.user_id} value={a.user_id}>{a.nome}</option>)}
                    </select>
                    <button className={botao} disabled={!motivoOk || !alunoId} onClick={verAluno}>Ver notas, frequência e faturas</button>
                  </div>
                  {aluno && (
                    <div className="text-sm text-gray-800 dark:text-gray-200 space-y-2">
                      <p className="font-semibold">{aluno.nome} · {(aluno.matriculas as any[]).map(m => `${m.turma} (${m.status})`).join(', ')}</p>
                      <p>Frequência: {aluno.frequencia?.presencas ?? 0} presenças, {aluno.frequencia?.faltas ?? 0} faltas</p>
                      <p>Notas: {(aluno.notas as any[]).map(n => `${n.disciplina} ${n.valor}`).join(' · ') || '—'}</p>
                      <p>Faturas: {(aluno.faturas as any[]).map(f => `${f.mes} R$ ${f.valor} (${f.status})`).join(' · ') || '—'}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 flex items-center gap-2"><ShieldCheck size={14} /> CPF nunca é exibido. A escola vê no registro dela quem do suporte acessou os dados.</p>
        </>
      )}
    </div>
  );
};
