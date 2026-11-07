// Valida, contra uma pilha Supabase REAL local (Auth + PostgREST + Edge Function + e-mail de teste),
// as MESMAS consultas que as telas fazem (Diário, Gestão de Turmas, Enturmação, Financeiro, Portal) e a
// Edge Function create-school-user. Uso: veja supabase/tests/e2e/README.md
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

const env = Object.fromEntries(
  execSync('npx supabase status -o env', { cwd: process.env.SB_DIR, encoding: 'utf8' })
    .split('\n').filter((l) => l.includes('=')).map((l) => { const [k, ...v] = l.split('='); return [k, v.join('=').replace(/^"|"$/g, '')]; }));
const URL = env.API_URL, ANON = env.ANON_KEY, SERVICE = env.SERVICE_ROLE_KEY;
const MAIL = (env.INBUCKET_URL || 'http://127.0.0.1:54324').replace(/\/$/, '');
const mk = (key) => createClient(URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = mk(SERVICE);
const senha = 'Senha-teste-123';
const sufixo = Date.now().toString(36);

let ok = 0, falhas = [];
const check = (nome, cond, detalhe = '') => { if (cond) { ok++; console.log('  ✔', nome); } else { falhas.push(nome); console.log('  ✖', nome, detalhe); } };
const secao = (t) => console.log(`\n${t}`);

async function criarUsuario(nome, email, cpf) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  const { error: e2 } = await admin.from('perfis').insert({ id: data.user.id, nome, cpf });
  if (e2) throw new Error(`perfis ${nome}: ${e2.message}`);
  return data.user.id;
}
async function vincular(escola_id, user_id, papel) {
  const { data, error } = await admin.from('membros_escola').insert({ escola_id, user_id, papel, tipo_vinculo: 'Efetivo' }).select('id').single();
  if (error) throw new Error(`membro ${papel}: ${error.message}`);
  return data.id;
}
async function como(email) {
  const c = mk(ANON);
  const { error } = await c.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}
const emailsPara = async (email) => {
  for (let i = 0; i < 15; i++) {
    const r = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent('to:' + email)}`).then((x) => x.json()).catch(() => null);
    if (r?.messages?.length) return r.messages;
    await new Promise((r2) => setTimeout(r2, 1000));
  }
  return [];
};

// ---------- cenário ----------
// CPF é único no banco: o número da execução entra no CPF para o roteiro poder rodar várias vezes.
const rodada = String(Date.now() % 1e6).padStart(6, '0');
const cpf = (n) => `${rodada.slice(0, 3)}.${rodada.slice(3)}.${String(n).padStart(3, '0')}-00`;
const { data: escA } = await admin.from('escolas').insert({ nome: 'Escola A ' + sufixo, cnpj: `A${sufixo}`.slice(0, 18) }).select().single();
const { data: escB } = await admin.from('escolas').insert({ nome: 'Escola B ' + sufixo, cnpj: `B${sufixo}`.slice(0, 18) }).select().single();
const em = (n) => `${n}.${sufixo}@teste.local`;
const U = {};
for (const [k, nome, n] of [['adminA', 'Admin A', 1], ['secA', 'Secretaria A', 2], ['profA', 'Professor A', 3], ['al1', 'Aluno Um', 4], ['al2', 'Aluno Dois', 5], ['adminB', 'Admin B', 6], ['alB', 'Aluno B', 7]]) {
  U[k] = await criarUsuario(nome, em(k), cpf(n));
}
const M = {};
M.adminA = await vincular(escA.id, U.adminA, 'Admin');
await vincular(escA.id, U.secA, 'Secretaria');
await vincular(escA.id, U.profA, 'Professor');
M.al1 = await vincular(escA.id, U.al1, 'Aluno');
M.al2 = await vincular(escA.id, U.al2, 'Aluno');
await vincular(escB.id, U.adminB, 'Admin');
M.alB = await vincular(escB.id, U.alB, 'Aluno');

// ---------- Edge Function: convite ----------
secao('Edge Function create-school-user');
const adminA = await como(em('adminA'));
const novoProf = em('novoprof');
let r = await adminA.functions.invoke('create-school-user', { body: { escola_id: escA.id, nome: 'Prof Novo', email: novoProf, cpf: cpf(901), papel: 'Professor', tipo_vinculo: 'Efetivo' } });
check('Admin cria Professor', !r.error && r.data?.success === true, JSON.stringify(r.error?.message ?? r.data));
check('resposta informa que o e-mail foi enviado', r.data?.email_enviado === true, JSON.stringify(r.data));
const msgs = await emailsPara(novoProf);
check('e-mail de primeiro acesso chegou à caixa de teste', msgs.length > 0);
const { data: perfilNovo } = await admin.from('perfis').select('nome, metadata').eq('id', r.data?.user_id ?? '').maybeSingle();
check('perfil criado com a coluna metadata', perfilNovo?.nome === 'Prof Novo' && perfilNovo.metadata !== undefined);

const respEmail = em('mae');
r = await adminA.functions.invoke('create-school-user', { body: { escola_id: escA.id, nome: 'Mãe Um', email: respEmail, cpf: cpf(902), papel: 'Responsavel', aluno_ids: [U.al1], parentesco: 'Mãe' } });
check('Admin cria Responsável vinculado ao aluno', !r.error && r.data?.success === true, JSON.stringify(r.error?.message ?? r.data));
const respId = r.data?.user_id;
const { data: vinc } = await admin.from('responsaveis_alunos').select('aluno_id, parentesco').eq('responsavel_id', respId ?? '');
check('vínculo responsável × aluno gravado', vinc?.length === 1 && vinc[0].aluno_id === U.al1 && vinc[0].parentesco === 'Mãe');

r = await adminA.functions.invoke('create-school-user', { body: { escola_id: escA.id, nome: 'Sem Filho', email: em('semfilho'), cpf: cpf(903), papel: 'Responsavel' } });
check('Responsável sem aluno é recusado', !!r.error || r.data?.error);
const { data: orfao } = await admin.from('perfis').select('id').eq('cpf', cpf(903));
check('...e nada foi criado', (orfao ?? []).length === 0);
r = await adminA.functions.invoke('create-school-user', { body: { escola_id: escA.id, nome: 'Filho Alheio', email: em('alheio'), cpf: cpf(904), papel: 'Responsavel', aluno_ids: [U.alB] } });
check('Responsável de aluno de OUTRA escola é recusado', !!r.error || r.data?.error);
const secA = await como(em('secA'));
r = await secA.functions.invoke('create-school-user', { body: { escola_id: escA.id, nome: 'Dir', email: em('dir'), cpf: cpf(905), papel: 'Diretor' } });
check('Secretaria não cria Diretor', !!r.error || r.data?.error);
r = await secA.functions.invoke('create-school-user', { body: { escola_id: escA.id, nome: 'Aluno Novo', email: em('alnovo'), cpf: cpf(906), papel: 'Aluno' } });
check('Secretaria cria Aluno (Enturmação)', !r.error && r.data?.success === true, JSON.stringify(r.error?.message ?? r.data));
const alNovoId = r.data?.user_id;
const adminBc = await como(em('adminB'));
r = await adminBc.functions.invoke('create-school-user', { body: { escola_id: escA.id, nome: 'Invasor', email: em('inv'), cpf: cpf(907), papel: 'Admin' } });
check('Admin da escola B não cria usuário na escola A', !!r.error || r.data?.error);
// Mesma pessoa em duas escolas (professor na A, diretor na B): um login, dois vínculos
const profId = (await admin.from('perfis').select('id').eq('cpf', cpf(901)).single()).data?.id;
const emailsAntes = (await emailsPara(novoProf)).length;
r = await adminBc.functions.invoke('create-school-user', { body: { escola_id: escB.id, nome: 'Prof Novo', email: novoProf, cpf: cpf(901), papel: 'Diretor' } });
check('Admin da B vincula quem já existe na A (mesmo e-mail e CPF)', !r.error && r.data?.success === true && r.data?.vinculado_existente === true, JSON.stringify(r.error?.message ?? r.data));
check('...reaproveita o MESMO login', r.data?.user_id === profId);
const { data: vincs } = await admin.from('membros_escola').select('escola_id, papel').eq('user_id', profId);
check('...e ele fica com 2 vínculos: Professor na A, Diretor na B',
  vincs?.length === 2 && vincs.some((v) => v.escola_id === escA.id && v.papel === 'Professor') && vincs.some((v) => v.escola_id === escB.id && v.papel === 'Diretor'));
await new Promise((r2) => setTimeout(r2, 1500));
check('...sem novo e-mail de primeiro acesso', (await emailsPara(novoProf)).length === emailsAntes);
const { data: perfilIntacto } = await admin.from('perfis').select('nome').eq('id', profId).single();
check('...e o perfil original não foi alterado', perfilIntacto?.nome === 'Prof Novo');
r = await adminBc.functions.invoke('create-school-user', { body: { escola_id: escB.id, nome: 'Prof Novo', email: novoProf, cpf: cpf(901), papel: 'Diretor' } });
check('mesmo vínculo duas vezes é recusado', !!r.error || r.data?.error);
check('...e a pessoa continua existindo', !!(await admin.auth.admin.getUserById(profId)).data?.user);
r = await adminBc.functions.invoke('create-school-user', { body: { escola_id: escB.id, nome: 'Outro', email: em('outro'), cpf: cpf(901), papel: 'Professor' } });
check('CPF existente com OUTRO e-mail é recusado', !!r.error || r.data?.error);
r = await adminBc.functions.invoke('create-school-user', { body: { escola_id: escB.id, nome: 'Outro', email: novoProf, cpf: cpf(950), papel: 'Professor' } });
check('e-mail existente com OUTRO CPF é recusado', !!r.error || r.data?.error);
const { data: orfao2 } = await admin.from('perfis').select('id').eq('cpf', cpf(950));
check('...e nada foi criado', (orfao2 ?? []).length === 0);
// Como a pessoa enxerga as duas escolas com o mesmo login
await admin.auth.admin.updateUserById(profId, { password: senha });
const multi = await como(novoProf);
const { data: meus } = await multi.from('membros_escola').select('escola_id, papel').eq('user_id', profId);
check('logada, a pessoa vê os 2 vínculos (seletor de escola no topo)', meus?.length === 2);

r = await adminA.functions.invoke('create-school-user', { body: { escola_id: escA.id, nome: 'X', email: em('x'), cpf: cpf(908), papel: 'SuperAdmin' } });
check('papel inválido é recusado', !!r.error || r.data?.error);
r = await adminA.functions.invoke('create-school-user', { body: { escola_id: escA.id, nome: 'Sem CPF', email: em('semcpf'), papel: 'Professor' } });
check('usuário sem CPF é recusado (perfis.cpf é NOT NULL)', !!r.error || r.data?.error);
const { data: semcpf } = await admin.auth.admin.listUsers({ perPage: 1000 });
check('...e nenhuma conta ficou pela metade no Auth', !(semcpf?.users ?? []).some((u) => u.email === em('semcpf')));

// ---------- Gestão de Turmas (Secretaria) ----------
secao('Gestão de Turmas e Enturmação (Secretaria)');
let q = await secA.from('turmas').insert({ escola_id: escA.id, nome: '5A', ano_letivo: 2026, turno: 'Manhã' }).select().single();
check('cria turma', !q.error, q.error?.message);
const turma = q.data;
q = await secA.from('disciplinas').insert({ escola_id: escA.id, nome: 'Matemática' }).select().single();
const disc = q.data;
check('cria disciplina', !q.error, q.error?.message);
q = await secA.from('turma_professores').insert({ escola_id: escA.id, turma_id: turma.id, professor_id: U.profA, disciplina_id: disc.id });
check('vincula professor à turma e disciplina', !q.error, q.error?.message);
for (const [nome, uid] of [['Aluno Um', U.al1], ['Aluno Dois', U.al2]]) {
  const dup = await secA.from('matriculas').select('id, turmas!inner(nome, ano_letivo, escola_id)').eq('aluno_id', uid).eq('status', 'Ativo').eq('turmas.escola_id', escA.id).limit(1).maybeSingle();
  check(`consulta de matrícula duplicada de ${nome} (embed turmas!inner)`, !dup.error, dup.error?.message);
  const ins = await secA.from('matriculas').insert({ escola_id: escA.id, turma_id: turma.id, aluno_id: uid, status: 'Ativo' });
  check(`matricula ${nome} na turma`, !ins.error, ins.error?.message);
}
const dup2 = await secA.from('matriculas').insert({ escola_id: escA.id, turma_id: turma.id, aluno_id: U.al1, status: 'Ativo' });
check('matrícula repetida é recusada (código 23505)', dup2.error?.code === '23505');
q = await secA.from('matriculas').select('id, status, perfis:aluno_id (id, nome)').eq('turma_id', turma.id).order('status');
check('lista de alunos da turma com nome (embed perfis)', !q.error && q.data.length === 2 && q.data.every((m) => m.perfis?.nome), q.error?.message);
q = await secA.from('matrizes_curriculares').insert({ turma_id: turma.id, disciplina_id: disc.id, carga_horaria: 80 });
check('matriz curricular', !q.error, q.error?.message);

// ---------- Diário (Professor) ----------
secao('Diário de Classe (Professor)');
const prof = await como(em('profA'));
q = await prof.from('turma_professores').select('turma_id, disciplina_id, turmas:turma_id (nome), disciplinas:disciplina_id (nome)').eq('escola_id', escA.id).eq('professor_id', U.profA);
check('professor lista as suas turmas e disciplinas', !q.error && q.data.length === 1 && q.data[0].turmas?.nome === '5A' && q.data[0].disciplinas?.nome === 'Matemática', q.error?.message ?? JSON.stringify(q.data));
q = await prof.from('matriculas').select('id, perfis:aluno_id (id, nome)').eq('turma_id', turma.id).eq('status', 'Ativo');
check('professor vê os alunos ativos da turma (o que o diário carrega)', !q.error && q.data.length === 2 && q.data.every((m) => m.perfis?.nome), q.error?.message ?? JSON.stringify(q.data));
const lista = q.data.map((m) => ({ mid: m.id, aluno: m.perfis.id }));
const dia = '2026-05-10';
const falhou = (res) => { if (res.error) throw new Error(res.error.message); };
let salvou = true;
try {
  const ids = lista.map((a) => a.mid);
  falhou(await prof.from('frequencia').delete().in('matricula_id', ids).eq('data', dia));
  falhou(await prof.from('frequencia').insert(lista.map((a, i) => ({ escola_id: escA.id, matricula_id: a.mid, data: dia, presente: i === 0 }))));
  falhou(await prof.from('notas').delete().in('matricula_id', ids).eq('disciplina_id', disc.id).eq('data', dia));
  falhou(await prof.from('notas').insert(lista.map((a, i) => ({ escola_id: escA.id, matricula_id: a.mid, disciplina_id: disc.id, valor: 7.5 + i, data: dia }))));
} catch (e) { salvou = false; console.log('    erro:', e.message); }
check('SALVAR O DIÁRIO grava frequência e notas (sem erro)', salvou);
let n1 = await admin.from('notas').select('valor').eq('escola_id', escA.id);
let f1 = await admin.from('frequencia').select('presente').eq('escola_id', escA.id);
check('...e os dados estão mesmo no banco', n1.data?.length === 2 && f1.data?.length === 2);
// salvar de novo na mesma data substitui
try {
  const ids = lista.map((a) => a.mid);
  falhou(await prof.from('frequencia').delete().in('matricula_id', ids).eq('data', dia));
  falhou(await prof.from('frequencia').insert(lista.map((a) => ({ escola_id: escA.id, matricula_id: a.mid, data: dia, presente: true }))));
  salvou = true;
} catch (e) { salvou = false; }
f1 = await admin.from('frequencia').select('presente').eq('escola_id', escA.id);
check('salvar de novo na mesma data substitui (sem duplicar)', salvou && f1.data.length === 2 && f1.data.every((x) => x.presente));
q = await prof.from('matrizes_curriculares').select('disciplina_id, disciplinas (nome)').eq('turma_id', turma.id);
check('professor lê a matriz da turma', !q.error && q.data.length === 1, q.error?.message);

// ---------- Financeiro (Admin) ----------
secao('Financeiro (Admin)');
const { data: ativas } = await adminA.from('matriculas').select('aluno_id, turma_id').eq('status', 'Ativo').eq('escola_id', escA.id);
const { data: vinculos } = await adminA.from('membros_escola').select('id, user_id').eq('escola_id', escA.id).eq('papel', 'Aluno');
const porAluno = new Map(vinculos.map((v) => [v.user_id, v.id]));
const faturas = ativas.filter((m) => porAluno.has(m.aluno_id)).map((m) => ({ escola_id: escA.id, aluno_id: porAluno.get(m.aluno_id), turma_id: m.turma_id, valor: 500, data_vencimento: '2026-06-10', status: 'Pendente', mes_referencia: 'Maio/2026' }));
check('admin enxerga as matrículas e vínculos para gerar faturas', faturas.length === 2, `matrículas=${ativas?.length} vínculos=${vinculos?.length}`);
q = await adminA.from('faturas').insert(faturas);
check('gera faturas em massa', !q.error, q.error?.message);
q = await adminA.from('financeiro_verbas').insert({ escola_id: escA.id, categoria: 'Material', valor: 100, tipo: 'Saida', status_aprovacao: 'Pendente', data_registro: '2026-05-02' });
check('registra movimentação', !q.error, q.error?.message);
q = await adminA.from('faturas').update({ status: 'Pago', data_pagamento: '2026-05-11' }).eq('aluno_id', M.al1);
check('dá baixa na fatura', !q.error, q.error?.message);
q = await adminA.from('faturas').select('aluno_id, membros_escola:aluno_id (perfis:user_id (nome))').neq('status', 'Pago');
check('lista de inadimplentes com nome (embed duplo)', !q.error, q.error?.message);
const prof2 = await prof.from('financeiro_verbas').select('id');
check('professor NÃO vê o financeiro', (prof2.data ?? []).length === 0);

// ---------- Portal do Aluno ----------
secao('Portal do Aluno');
const al1 = await como(em('al1'));
q = await al1.from('matriculas').select('id, turmas (id, nome)').eq('aluno_id', U.al1).eq('status', 'Ativo').order('created_at', { ascending: false }).limit(1);
check('aluno vê a própria matrícula e a turma', !q.error && q.data?.[0]?.turmas?.nome === '5A', q.error?.message ?? JSON.stringify(q.data));
const minhaMat = q.data?.[0]?.id;
q = await al1.from('matrizes_curriculares').select('disciplina_id, disciplinas (nome)').eq('turma_id', turma.id);
check('aluno vê as disciplinas da turma', !q.error && q.data.length === 1, q.error?.message);
q = await al1.from('notas').select('disciplina_id, valor, data').eq('matricula_id', minhaMat);
check('aluno vê a própria nota', !q.error && q.data.length === 1 && Number(q.data[0].valor) === 7.5, q.error?.message ?? JSON.stringify(q.data));
q = await al1.from('frequencia').select('presente').eq('matricula_id', minhaMat);
check('aluno vê a própria frequência', !q.error && q.data.length === 1, q.error?.message);
q = await al1.from('faturas').select('id, mes_referencia, data_vencimento, valor, status').eq('aluno_id', M.al1).order('data_vencimento', { ascending: false });
check('aluno vê a própria fatura', !q.error && q.data.length === 1 && q.data[0].status === 'Pago', q.error?.message);
const tudo = await al1.from('notas').select('id');
check('aluno NÃO vê a nota do colega', tudo.data?.length === 1);
const tent = await al1.from('notas').update({ valor: 10 }).eq('matricula_id', minhaMat).select();
check('aluno NÃO consegue alterar a própria nota', (tent.data ?? []).length === 0);
const termos = await al1.from('perfis').update({ aceitou_termos_em: new Date().toISOString() }).eq('id', U.al1).select();
check('aceite dos termos é gravado (política de update em perfis)', !termos.error && termos.data?.length === 1, termos.error?.message);

// ---------- Portal da Família ----------
secao('Portal da Família (Responsável)');
// Quem é criado pela função não tem senha (entra pelo link do e-mail); no teste definimos uma por fora.
await admin.auth.admin.updateUserById(respId, { password: senha });
const mae = await como(respEmail);
q = await mae.from('responsaveis_alunos').select('aluno_id, perfis:aluno_id (nome)').eq('responsavel_id', respId).eq('escola_id', escA.id);
check('responsável lista os filhos vinculados (embed perfis)', !q.error && q.data.length === 1 && q.data[0].perfis?.nome === 'Aluno Um', q.error?.message ?? JSON.stringify(q.data));
q = await mae.from('membros_escola').select('id, user_id').eq('escola_id', escA.id).eq('papel', 'Aluno').in('user_id', [U.al1]);
check('responsável acha o vínculo do filho', !q.error && q.data.length === 1 && q.data[0].id === M.al1, q.error?.message);
q = await mae.from('matriculas').select('id, turmas (id, nome)').eq('aluno_id', U.al1).eq('status', 'Ativo').limit(1);
check('responsável vê a matrícula do filho', !q.error && q.data.length === 1, q.error?.message);
const matFilho = q.data?.[0]?.id;
q = await mae.from('notas').select('valor').eq('matricula_id', matFilho);
check('responsável vê a nota do filho', !q.error && q.data.length === 1, q.error?.message);
q = await mae.from('frequencia').select('presente').eq('matricula_id', matFilho);
check('responsável vê a frequência do filho', !q.error && q.data.length === 1, q.error?.message);
q = await mae.from('faturas').select('valor, status').eq('aluno_id', M.al1);
check('responsável vê a fatura do filho', !q.error && q.data.length === 1, q.error?.message);
q = await mae.from('notas').select('id');
check('responsável NÃO vê notas de outros alunos', q.data?.length === 1);
q = await mae.from('faturas').select('id');
check('responsável NÃO vê faturas de outros alunos', q.data?.length === 1);
q = await mae.from('notas').update({ valor: 10 }).eq('matricula_id', matFilho).select();
check('responsável NÃO altera nota', (q.data ?? []).length === 0);

// ---------- Gestão de usuários ----------
secao('Gestão de usuários (Secretaria / Admin)');
q = await secA.from('membros_escola').delete().eq('user_id', alNovoId).select();
check('Secretaria remove um aluno (política de delete em membros_escola)', !q.error && q.data?.length === 1, q.error?.message);
q = await secA.from('membros_escola').delete().eq('id', M.adminA).select();
check('Secretaria NÃO remove o Admin', (q.data ?? []).length === 0);
q = await adminA.from('membros_escola').select('id, papel, tipo_vinculo, perfis:user_id (id, nome, cpf)').eq('escola_id', escA.id).order('papel');
check('Admin lista os usuários com nome e CPF (embed perfis)', !q.error && q.data.length >= 6 && q.data.every((m) => m.perfis?.nome), q.error?.message);

console.log(`\n${ok} verificações passaram, ${falhas.length} falharam.`);
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1); }
