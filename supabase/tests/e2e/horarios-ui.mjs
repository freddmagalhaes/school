// Abre o app REAL no Chromium contra a pilha Supabase local e percorre: tempos de aula, aula em vários dias,
// montagem pela visão do professor, cópia de dia, conflito e a escolha única de escola do Root.
// Como rodar: veja supabase/tests/e2e/README.md (mesmas variáveis do ui.mjs).
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

const { chromium } = await import(process.env.PW_CORE);
const APP = process.env.APP_URL || 'http://127.0.0.1:5199';
const env = Object.fromEntries(
  execSync('npx supabase status -o env', { cwd: process.env.SB_DIR, encoding: 'utf8' })
    .split('\n').filter((l) => l.includes('=')).map((l) => { const [k, ...v] = l.split('='); return [k, v.join('=').replace(/^"|"$/g, '')]; }));
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const senha = 'Senha-teste-123';
const rodada = Date.now().toString(36);
const rnd = String(Date.now() % 1e6).padStart(6, '0');
const cpf = (n) => `${rnd.slice(0, 3)}.${rnd.slice(3)}.${String(n).padStart(3, '0')}-22`;
const em = (n) => `${n}.${rodada}@hui.local`;
let ok = 0; const falhas = [];
const check = (nome, cond, extra = '') => { if (cond) { ok++; console.log('  ✔', nome); } else { falhas.push(nome); console.log('  ✖', nome, extra); } };

async function pessoa(nome, key, n, papel, escola) {
  const { data, error } = await admin.auth.admin.createUser({ email: em(key), password: senha, email_confirm: true });
  if (error) throw error;
  await admin.from('perfis').insert({ id: data.user.id, nome, cpf: cpf(n), aceitou_termos_em: new Date().toISOString() });
  if (escola) await admin.from('membros_escola').insert({ escola_id: escola, user_id: data.user.id, papel, tipo_vinculo: 'Efetivo' });
  return data.user.id;
}

const { data: esc } = await admin.from('escolas').insert({ nome: 'Escola Horarios ' + rodada, cnpj: `H${rodada}`.slice(0, 18) }).select().single();
const { data: esc2 } = await admin.from('escolas').insert({ nome: 'Outra Escola ' + rodada, cnpj: `O${rodada}`.slice(0, 18) }).select().single();
await pessoa('Diretora Dora', 'adm', 1, 'Admin', esc.id);
const prof = await pessoa('Prof Paulo', 'prof', 2, 'Professor', esc.id);
const { data: t1 } = await admin.from('turmas').insert({ escola_id: esc.id, nome: '101', ano_letivo: 2026, turno: 'Matutino' }).select().single();
const { data: t2 } = await admin.from('turmas').insert({ escola_id: esc.id, nome: '105', ano_letivo: 2026, turno: 'Matutino' }).select().single();
const { data: mat } = await admin.from('disciplinas').insert({ escola_id: esc.id, nome: 'Matemática' }).select().single();
await admin.from('turma_professores').insert([
  { escola_id: esc.id, turma_id: t1.id, professor_id: prof, disciplina_id: mat.id },
  { escola_id: esc.id, turma_id: t2.id, professor_id: prof, disciplina_id: mat.id },
]);

const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
const novaPagina = async () => { const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } }); const p = await ctx.newPage(); p.setDefaultTimeout(15000); return p; };
const entrar = async (p, email) => { await p.goto(APP + '/'); await p.fill('#email', email); await p.fill('#password', senha); await p.click('button[type=submit]'); };
const erros = [];
// Escolhe a opção de um <select> pelo trecho do texto (selectOption não aceita regex)
const escolher = async (sel, trecho) => {
  let opts = [];
  for (let t = 0; t < 40; t++) {   // as opções chegam do banco um instante depois: espera até 8 s
    opts = await sel.locator('option').allTextContents();
    const i = opts.findIndex((x) => x.includes(trecho));
    if (i >= 0) { await sel.selectOption({ index: i }); return; }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`opção "${trecho}" não encontrada em: ${opts.join(' | ')}`);
};
const contar = async (tabela, filtro = {}) => (await admin.from(tabela).select('id').match(filtro)).data?.length ?? -1;

console.log('\nAdmin: tempos de aula e grade');
{
  const p = await novaPagina();
  p.on('pageerror', (e) => erros.push('admin: ' + e.message));
  await entrar(p, em('adm'));
  await p.waitForURL(/\/app/);
  await p.goto(APP + '/app/academico');
  await p.getByRole('button', { name: 'Horários' }).click();
  // tempos de aula
  await p.getByRole('button', { name: /Tempos de aula/ }).click();
  await p.getByRole('button', { name: 'Gerar tempos' }).click();
  await p.getByText('5 tempos de aula criados para o turno Matutino.').waitFor();
  check('gerar tempos cria 5 horários no turno Matutino', (await contar('periodos_aula', { escola_id: esc.id, turno: 'Matutino' })) === 5);

  // por turma: segunda e quarta, 1º horário
  await escolher(p.locator('select').filter({ hasText: 'Escolha a turma' }), '101');
  await p.getByText('Dias da semana').waitFor();
  await escolher(p.locator('select').filter({ hasText: '— Escolha —' }).first(), 'Matemática');
  await p.locator('label', { hasText: 'Quarta' }).click();
  await p.getByRole('button', { name: /Adicionar aula em 2 dias/ }).click();
  await p.getByText(/2 aulas lançadas\./).waitFor();
  const { data: a1 } = await admin.from('horarios_aula').select('dia_semana, hora_inicio, hora_fim').eq('turma_id', t1.id).order('dia_semana');
  check('aula em 2 dias (seg e qua) no 1º horário 07:00–07:50', a1?.length === 2 && a1[0].dia_semana === 1 && a1[1].dia_semana === 3 && a1[0].hora_inicio.startsWith('07:00') && a1[0].hora_fim.startsWith('07:50'), JSON.stringify(a1));

  // por professor: turma 105, segunda, 2º horário
  await p.getByRole('button', { name: 'Por professor' }).click();
  await escolher(p.locator('select').filter({ hasText: 'Escolha o professor' }), 'Prof Paulo');
  await p.getByText('Dias da semana').waitFor();
  await escolher(p.locator('select').filter({ hasText: '— Escolha —' }).first(), '105');
  await escolher(p.locator('select').filter({ hasText: 'º horário' }).last(), '2º horário');
  await p.getByRole('button', { name: /^Adicionar aula$/ }).click();
  await p.getByText(/1 aula lançada\./).waitFor();
  const { data: a2 } = await admin.from('horarios_aula').select('dia_semana, hora_inicio').eq('turma_id', t2.id);
  check('pela visão do professor: turma 105 na segunda, 2º horário (07:50)', a2?.length === 1 && a2[0].dia_semana === 1 && a2[0].hora_inicio.startsWith('07:50'), JSON.stringify(a2));

  // copiar a segunda para terça
  await p.getByRole('button', { name: /copiar/ }).first().click();
  await p.locator('label', { hasText: 'Terça' }).last().click();
  await p.getByRole('button', { name: 'Copiar', exact: true }).click();
  await p.getByText(/2 aulas lançadas\./).waitFor();
  check('copiar a segunda (2 aulas: 101 e 105) para a terça', (await contar('horarios_aula', { professor_id: prof, dia_semana: 2 })) === 2);

  // conflito: o professor já está na 101 no 1º horário da segunda; tentar a 105 no mesmo horário
  await escolher(p.locator('select').filter({ hasText: '— Escolha —' }).first(), '105');
  await escolher(p.locator('select').filter({ hasText: 'º horário' }).last(), '1º horário');
  await p.getByRole('button', { name: /^Adicionar aula$/ }).click();
  await p.getByText(/não entrou/).waitFor();
  const txt = await p.locator('body').innerText();
  check('conflito aparece na tela, com a turma que já ocupa o horário', /já tem aula neste horário nesta escola \(turma 101\)/.test(txt), txt.slice(0, 300));
  await p.screenshot({ path: process.env.SHOTS + '/grade-professor.png', fullPage: true });
}

console.log('\nRoot: a escola escolhida vale para todas as abas');
{
  const rootId = await pessoa('Root Rita', 'root', 3, null, null);
  await admin.from('root_admins').insert({ id: rootId, nome: 'Root Rita', email: em('root'), role: 'root', is_root: true, is_active: true });
  const p = await novaPagina();
  p.on('pageerror', (e) => erros.push('root: ' + e.message));
  await entrar(p, em('root'));
  await p.waitForTimeout(1500);
  await p.goto(APP + '/app/academico');
  const seletor = p.locator('select').first();
  await seletor.waitFor();
  check('root vê o seletor de escola no topo do módulo', true);
  await seletor.selectOption({ label: esc.nome });
  await p.getByText('Todas as abas deste módulo usam a escola escolhida aqui.').waitFor();
  await p.getByRole('button', { name: 'Disciplinas' }).click();
  await p.getByText('Matemática').waitFor();
  check('na aba Disciplinas aparecem as disciplinas da mesma escola (sem escolher de novo)', true);
  check('e só existe UM seletor de escola na tela', (await p.locator('select').filter({ hasText: 'Selecione uma escola' }).count()) === 1);
  await p.getByRole('button', { name: 'Gestão de Turmas' }).click();
  await p.getByText('101').first().waitFor();
  check('na aba Gestão de Turmas aparecem as turmas dessa escola', (await p.getByText('105').count()) > 0);
  // criar disciplina como root
  await p.getByRole('button', { name: 'Disciplinas' }).click();
  await p.getByRole('button', { name: /Nova Disciplina/ }).click();
  await p.locator('input[type=text]').last().fill('História Root');
  await p.getByRole('button', { name: /Salvar/ }).click();
  await p.getByText('História Root').waitFor();
  const { data: dd } = await admin.from('disciplinas').select('escola_id').eq('nome', 'História Root');
  check('root grava a disciplina e ela fica na escola escolhida', dd?.length === 1 && dd[0].escola_id === esc.id, JSON.stringify(dd));
  await p.screenshot({ path: process.env.SHOTS + '/root-academico.png', fullPage: true });
}

await browser.close();
console.log('\nErros de página:', erros.length ? erros : 'nenhum');
console.log(`\n${ok} verificações passaram, ${falhas.length} falharam.`);
process.exit(falhas.length ? 1 : 0);
