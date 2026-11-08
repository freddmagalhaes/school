// Abre o app REAL num navegador (Chromium) contra a pilha Supabase local e percorre as telas:
// Termos de Uso, Diário de Classe (professor), Portal do Aluno e Portal da Família (responsável).
// Pré-requisitos e como rodar: supabase/tests/e2e/README.md
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
const cpf = (n) => `${rnd.slice(0, 3)}.${rnd.slice(3)}.${String(n).padStart(3, '0')}-11`;
const em = (n) => `${n}.${rodada}@ui.local`;

let ok = 0; const falhas = [];
const check = (nome, cond, extra = '') => { if (cond) { ok++; console.log('  ✔', nome); } else { falhas.push(nome); console.log('  ✖', nome, extra); } };

async function pessoa(nome, key, n, papel, escola, aceitou) {
  const { data, error } = await admin.auth.admin.createUser({ email: em(key), password: senha, email_confirm: true });
  if (error) throw error;
  await admin.from('perfis').insert({ id: data.user.id, nome, cpf: cpf(n), aceitou_termos_em: aceitou ? new Date().toISOString() : null });
  const { data: m } = await admin.from('membros_escola').insert({ escola_id: escola, user_id: data.user.id, papel, tipo_vinculo: 'Efetivo' }).select('id').single();
  return { id: data.user.id, membro: m.id };
}

// ---------- cenário ----------
const { data: esc } = await admin.from('escolas').insert({ nome: 'Escola UI ' + rodada, cnpj: `U${rodada}`.slice(0, 18) }).select().single();
const prof = await pessoa('Professora Ana', 'prof', 1, 'Professor', esc.id, true);
const al1 = await pessoa('Aluno Bruno', 'al1', 2, 'Aluno', esc.id, false); // vai ver o modal de termos
const al2 = await pessoa('Aluna Carla', 'al2', 3, 'Aluno', esc.id, true);
const mae = await pessoa('Mãe do Bruno', 'mae', 4, 'Responsavel', esc.id, true);
await admin.from('responsaveis_alunos').insert({ escola_id: esc.id, responsavel_id: mae.id, aluno_id: al1.id, parentesco: 'Mãe' });
const { data: turma } = await admin.from('turmas').insert({ escola_id: esc.id, nome: '7B', ano_letivo: 2026, turno: 'Manhã' }).select().single();
const { data: disc } = await admin.from('disciplinas').insert({ escola_id: esc.id, nome: 'História' }).select().single();
await admin.from('turma_professores').insert({ escola_id: esc.id, turma_id: turma.id, professor_id: prof.id, disciplina_id: disc.id });
await admin.from('matrizes_curriculares').insert({ turma_id: turma.id, disciplina_id: disc.id, carga_horaria: 60 });
await admin.from('matriculas').insert([{ escola_id: esc.id, turma_id: turma.id, aluno_id: al1.id }, { escola_id: esc.id, turma_id: turma.id, aluno_id: al2.id }]);
await admin.from('faturas').insert({ escola_id: esc.id, aluno_id: al1.membro, turma_id: turma.id, valor: 450, data_vencimento: '2026-06-10', mes_referencia: 'Junho/2026' });

const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
const novaPagina = async () => { const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage(); p.setDefaultTimeout(15000); return p; };
const entrar = async (p, email) => {
  await p.goto(APP + '/');
  await p.fill('#email', email);
  await p.fill('#password', senha);
  await p.click('button[type=submit]');
};
const erros = [];

// ---------- Professor: diário ----------
console.log('\nProfessor: Diário de Classe');
{
  const p = await novaPagina();
  p.on('pageerror', (e) => erros.push('prof: ' + e.message));
  await entrar(p, em('prof'));
  await p.waitForURL(/\/app/);
  await p.goto(APP + '/app/academico');
  await p.getByText('Suas Disciplinas').waitFor();
  await p.getByRole('button', { name: /7B/ }).click();
  await p.getByText('Aluno Bruno').waitFor();
  check('a turma aparece e carrega os alunos da matrícula', (await p.getByText('Aluna Carla').count()) > 0);
  const linhas = p.locator('tbody tr');
  check('diário lista os 2 alunos', (await linhas.count()) === 2);
  // a lista vem em ordem alfabética: 1ª linha = Aluna Carla, 2ª = Aluno Bruno
  await p.locator('input[type=number]').nth(0).fill('8.5');
  await p.locator('input[type=number]').nth(1).fill('6');
  await p.getByRole('button', { name: /Salvar Diário/ }).click();
  await p.getByText('Diário salvo com sucesso!').waitFor();
  check('a tela mostra "Diário salvo com sucesso!"', true);
  const { data: notas } = await admin.from('notas').select('valor').eq('escola_id', esc.id).order('valor');
  const { data: freq } = await admin.from('frequencia').select('presente').eq('escola_id', esc.id);
  check('e as notas estão mesmo no banco (6 e 8,5)', notas?.length === 2 && Number(notas[0].valor) === 6 && Number(notas[1].valor) === 8.5, JSON.stringify(notas));
  check('e a frequência também (2 presentes)', freq?.length === 2 && freq.every((f) => f.presente));
  await p.screenshot({ path: process.env.SHOTS + '/diario.png' });
  // recarrega a página: os dados salvos voltam
  await p.reload();
  await p.getByRole('button', { name: /7B/ }).click();
  await p.getByText('Aluno Bruno').waitFor();
  const valores = await p.locator('input[type=number]').evaluateAll((els) => els.map((e) => e.value));
  check('ao reabrir o diário, as notas salvas reaparecem', valores.includes('8.5') && valores.includes('6'), JSON.stringify(valores));
}

// ---------- Aluno: termos + portal ----------
console.log('\nAluno: termos de uso e Portal');
{
  const p = await novaPagina();
  p.on('pageerror', (e) => erros.push('aluno: ' + e.message));
  await entrar(p, em('al1'));
  await p.getByRole('heading', { name: /Termos de Uso e Política de Privacidade/ }).waitFor();
  check('primeiro acesso mostra o modal de Termos', true);
  await p.locator('input[type=checkbox]').first().check();
  await p.getByRole('button', { name: /Continuar para o Sistema/ }).click();
  await p.getByRole('heading', { name: /Termos de Uso e Política de Privacidade/ }).waitFor({ state: 'hidden' });
  await p.waitForURL(/\/portal/);
  await p.getByText(/Bem-vindo\(a\) ao seu Portal/).waitFor();
  const { data: perf } = await admin.from('perfis').select('aceitou_termos_em').eq('id', al1.id).single();
  check('o aceite dos termos foi gravado no banco', !!perf?.aceitou_termos_em);
  await p.getByText('História').waitFor();
  const txt = await p.locator('body').innerText();
  check('portal mostra a turma 7B', txt.includes('7B'));
  check('portal mostra a nota do aluno (6.0)', txt.includes('6.0'));
  check('portal mostra a fatura de Junho/2026 (R$ 450.00)', txt.includes('Junho/2026') && txt.includes('450.00'));
  check('portal NÃO mostra a nota da colega (8.5)', !txt.includes('8.5'));
  check('o cabeçalho diz "Portal do Aluno"', txt.includes('Portal do Aluno'));
  await p.screenshot({ path: process.env.SHOTS + '/portal-aluno.png' });
}

// ---------- Responsável: Portal da Família ----------
console.log('\nResponsável: Portal da Família');
{
  const p = await novaPagina();
  p.on('pageerror', (e) => erros.push('resp: ' + e.message));
  await entrar(p, em('mae'));
  await p.waitForURL(/\/portal/);
  await p.getByText(/Aluno\(a\):/).first().waitFor();
  const txt = await p.locator('body').innerText();
  check('cabeçalho "Portal da Família"', txt.includes('Portal da Família'));
  check('mostra o nome do filho (Aluno Bruno)', txt.includes('Aluno Bruno'));
  await p.getByText('História').waitFor();
  const t2 = await p.locator('body').innerText();
  check('mostra a nota e a fatura do filho', t2.includes('6.0') && t2.includes('450.00') && !t2.includes('8.5'));
  check('NÃO mostra a colega do filho', !t2.includes('Aluna Carla'));
  await p.screenshot({ path: process.env.SHOTS + '/portal-familia.png' });
}

await browser.close();
check('nenhum erro de JavaScript não tratado nas telas', erros.length === 0, erros.join(' | '));
console.log(`\n${ok} verificações passaram, ${falhas.length} falharam.`);
if (falhas.length) { console.log('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1); }
