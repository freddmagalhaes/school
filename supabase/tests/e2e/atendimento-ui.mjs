// Chat de atendimento no navegador real: o professor abre uma conversa pelo botão "Ajuda", o suporte N1 responde
// pela caixa de entrada do backoffice, escala para o N2, resolve; o professor vê a resposta e reabre.
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
const cpf = (n) => `${rnd.slice(0, 3)}.${rnd.slice(3)}.${String(n).padStart(3, '0')}-33`;
const em = (n) => `${n}.${rodada}@chat.local`;
let ok = 0; const falhas = [];
const check = (nome, cond, extra = '') => { if (cond) { ok++; console.log('  ✔', nome); } else { falhas.push(nome); console.log('  ✖', nome, extra); } };

const { data: esc } = await admin.from('escolas').insert({ nome: 'Escola Chat ' + rodada, cnpj: `C${rodada}`.slice(0, 18) }).select().single();
const mk = async (key, nome, n) => {
  const { data, error } = await admin.auth.admin.createUser({ email: em(key), password: senha, email_confirm: true });
  if (error) throw error;
  return data.user.id;
};
const profId = await mk('prof', 'Professora Lia', 1);
await admin.from('perfis').insert({ id: profId, nome: 'Professora Lia', cpf: cpf(1), aceitou_termos_em: new Date().toISOString() });
await admin.from('membros_escola').insert({ escola_id: esc.id, user_id: profId, papel: 'Professor', tipo_vinculo: 'Efetivo' });
const n1Id = await mk('n1', 'Atendente Ana', 2);
await admin.from('root_admins').insert({ id: n1Id, nome: 'Atendente Ana', email: em('n1'), role: 'suporte', nivel_suporte: 1, is_root: false, is_active: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
const nova = async () => { const c = await browser.newContext({ viewport: { width: 1400, height: 950 } }); const p = await c.newPage(); p.setDefaultTimeout(20000); return p; };
const erros = [];

const prof = await nova();
prof.on('pageerror', (e) => erros.push('prof: ' + e.message));
await prof.goto(APP + '/');
await prof.fill('#email', em('prof')); await prof.fill('#password', senha); await prof.click('button[type=submit]');
await prof.waitForURL(/\/app/);

console.log('\nProfessor abre a conversa');
await prof.getByRole('button', { name: /Ajuda e suporte|Ajuda/ }).first().click();
await prof.getByRole('button', { name: /Nova conversa/ }).click();
await prof.getByPlaceholder('Ex.: Não consigo lançar notas').fill('Não consigo lançar notas');
await prof.locator('textarea').first().fill('Ao salvar o diário aparece um erro. Podem ajudar?');
await prof.getByRole('button', { name: 'Enviar', exact: true }).click();
await prof.getByText(/^Aberto/).first().waitFor();   // a tela de conversa só abre depois de gravar
await prof.locator('p', { hasText: 'Ao salvar o diário aparece um erro. Podem ajudar?' }).first().waitFor();
const { data: a1 } = await admin.from('atendimentos').select('*').eq('escola_id', esc.id);
check('a conversa foi gravada com o nome do professor e status "aberto"', a1?.length === 1 && a1[0].autor_nome === 'Professora Lia' && a1[0].status === 'aberto' && a1[0].aberto_por === profId, JSON.stringify(a1));
await prof.screenshot({ path: process.env.SHOTS + '/chat-professor.png' });

console.log('\nSuporte N1 responde pelo backoffice');
const sup = await nova();
sup.on('pageerror', (e) => erros.push('sup: ' + e.message));
await sup.goto(APP + '/ops/login');
await sup.fill('#root-email', em('n1')); await sup.fill('#root-senha', senha); await sup.click('#btn-root-entrar');
await sup.waitForURL(/\/ops\/dashboard/);
await sup.goto(APP + '/ops/atendimento');
await sup.getByText('Não consigo lançar notas').first().click();
await sup.locator('p', { hasText: 'Ao salvar o diário aparece um erro. Podem ajudar?' }).first().waitFor();
check('o suporte vê o nome da escola e do professor na fila', (await sup.getByText(/Escola Chat/).count()) > 0 && (await sup.getByText(/Professora Lia/).count()) > 0);
await sup.getByPlaceholder('Responder ao cliente').fill('Olá! Pode me dizer qual mensagem de erro aparece?');
await sup.getByRole('button', { name: 'Enviar', exact: true }).click();
await sup.locator('p', { hasText: 'Olá! Pode me dizer qual mensagem de erro aparece?' }).first().waitFor();
const { data: a2 } = await admin.from('atendimentos').select('status, atendente_nome, ultimo_autor').eq('id', a1[0].id).single();
check('ao responder, a conversa vira "em atendimento" e o N1 é o atendente', a2.status === 'em_atendimento' && a2.atendente_nome === 'Atendente Ana' && a2.ultimo_autor === 'suporte', JSON.stringify(a2));

console.log('\nProfessor recebe a resposta (sem recarregar)');
await prof.locator('p', { hasText: 'Olá! Pode me dizer qual mensagem de erro aparece?' }).first().waitFor({ timeout: 20000 });
check('a resposta do suporte aparece na janela de chat do professor', true);
await prof.locator('textarea').last().fill('Aparece "permissão negada".');
await prof.getByRole('button', { name: 'Enviar', exact: true }).click();
await sup.locator('p', { hasText: 'Aparece "permissão negada".' }).first().waitFor({ timeout: 20000 });
check('a resposta do professor chega ao suporte (sem recarregar)', true);

console.log('\nEscalonar e resolver');
await sup.locator('select').filter({ hasText: 'N1' }).selectOption('2');
await sup.getByRole('button', { name: /Resolver/ }).click();
await sup.getByRole('button', { name: /Reabrir/ }).waitFor();
const { data: a3 } = await admin.from('atendimentos').select('status, nivel_atual, resolvido_em').eq('id', a1[0].id).single();
check('escalada para N2 e resolvida', a3.nivel_atual === 2 && a3.status === 'resolvido' && !!a3.resolvido_em, JSON.stringify(a3));
await sup.screenshot({ path: process.env.SHOTS + '/chat-suporte.png' });

await prof.locator('textarea').last().fill('Voltou a acontecer.');
await prof.getByRole('button', { name: 'Enviar', exact: true }).click();
await prof.waitForTimeout(1500);
const { data: a4 } = await admin.from('atendimentos').select('status, resolvido_em').eq('id', a1[0].id).single();
check('o professor escreve numa conversa resolvida e ela reabre', a4.status === 'aberto' && a4.resolvido_em === null, JSON.stringify(a4));

await browser.close();
console.log('\nErros de página:', erros.length ? erros : 'nenhum');
console.log(`\n${ok} verificações passaram, ${falhas.length} falharam.`);
process.exit(falhas.length ? 1 : 0);
