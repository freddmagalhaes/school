// Uma pessoa com vínculos em duas escolas e papéis diferentes: Professor na A, Diretor na B.
// Cada papel vale só na sua escola.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, as, admin, ID } from './helpers.mjs';

const MULTI = '10000000-0000-0000-0000-0000000000c1';
before(async () => {
  await setup();
  await admin(`INSERT INTO auth.users (id, email) VALUES ($1, 'multi@teste')`, [MULTI]);
  await admin(`INSERT INTO public.perfis (id, nome, cpf) VALUES ($1, 'Multi', '333.333.333-01')`, [MULTI]);
  await admin(`INSERT INTO public.membros_escola (escola_id, user_id, papel, tipo_vinculo) VALUES ($1,$2,'Professor','Efetivo'), ($3,$2,'Diretor','Efetivo')`,
    [ID.escolaA, MULTI, ID.escolaB]);
});
after(async () => { await teardown(); });

describe('Professor na escola A e Diretor na escola B', () => {
  test('vê as duas escolas', async () => {
    const r = await as(MULTI, (q) => q('SELECT id FROM public.escolas ORDER BY nome'));
    assert.deepEqual(r.rows.map((x) => x.id).sort(), [ID.escolaA, ID.escolaB].sort());
  });
  test('como Diretor da B: vê o financeiro da B, mas NÃO o da A', async () => {
    const r = await as(MULTI, (q) => q('SELECT id FROM public.financeiro_verbas'));
    assert.deepEqual(r.rows.map((x) => x.id), [ID.finB]);
  });
  test('como Diretor da B: vê as notas da B; como Professor da A, sem turma na A, não vê as da A', async () => {
    const r = await as(MULTI, (q) => q('SELECT id FROM public.notas'));
    assert.deepEqual(r.rows.map((x) => x.id), [ID.notaB1]);
  });
  test('como Professor da A: não lança nota na A (não leciona lá)', async () => {
    const r = await as(MULTI, (q) => q(
      `INSERT INTO public.notas (escola_id, matricula_id, disciplina_id, valor, data) VALUES ($1,$2,$3,9,'2026-04-01')`,
      [ID.escolaA, ID.matr1A, ID.discMat]));
    assert.ok(r.error);
  });
  test('como Diretor da B: não altera dados da A', async () => {
    const r = await as(MULTI, (q) => q(`UPDATE public.turmas SET nome = 'x' WHERE id = $1`, [ID.turmaA]));
    assert.equal(r.rowCount, 0);
  });
  test('depois de virar professor da turma na A, lança nota na A', async () => {
    await admin(`INSERT INTO public.turma_professores (escola_id, turma_id, professor_id, disciplina_id) VALUES ($1,$2,$3,$4)`,
      [ID.escolaA, ID.turmaA, MULTI, ID.discPor]);
    const r = await as(MULTI, (q) => q(
      `INSERT INTO public.notas (escola_id, matricula_id, disciplina_id, valor, data) VALUES ($1,$2,$3,9,'2026-04-01')`,
      [ID.escolaA, ID.matr1A, ID.discPor]));
    assert.ok(!r.error, r.error?.message);
    // mas só na disciplina que leciona
    const r2 = await as(MULTI, (q) => q(
      `INSERT INTO public.notas (escola_id, matricula_id, disciplina_id, valor, data) VALUES ($1,$2,$3,9,'2026-04-02')`,
      [ID.escolaA, ID.matr1A, ID.discMat]));
    assert.ok(r2.error);
  });

  test('mesma escola, turnos e disciplinas diferentes: Matemática de manhã (5A) e Português à tarde (6A)', async () => {
    const P = '10000000-0000-0000-0000-0000000000c2';
    await admin(`INSERT INTO auth.users (id, email) VALUES ($1, 'turnos@teste')`, [P]);
    await admin(`INSERT INTO public.perfis (id, nome, cpf) VALUES ($1, 'Turnos', '333.333.333-02')`, [P]);
    await admin(`INSERT INTO public.membros_escola (escola_id, user_id, papel, tipo_vinculo) VALUES ($1,$2,'Professor','Efetivo')`, [ID.escolaA, P]);
    await admin(`INSERT INTO public.turma_professores (escola_id, turma_id, professor_id, disciplina_id) VALUES ($1,$2,$3,$4), ($1,$5,$3,$6)`,
      [ID.escolaA, ID.turmaA, P, ID.discMat, ID.turmaA2, ID.discPor]);
    await admin(`INSERT INTO public.matriculas (id, escola_id, turma_id, aluno_id, status) VALUES ('40000000-0000-0000-0000-0000000000a9', $1, $2, $3, 'Ativo')`,
      [ID.escolaA, ID.turmaA2, ID.aluno2A]);
    const ins = (q, mat, disc) => q(`INSERT INTO public.notas (escola_id, matricula_id, disciplina_id, valor, data) VALUES ($1,$2,$3,7,'2026-05-01')`, [ID.escolaA, mat, disc]);
    const manha = await as(P, (q) => ins(q, ID.matr1A, ID.discMat));
    assert.ok(!manha.error, 'manhã: ' + manha.error?.message);
    const tarde = await as(P, (q) => ins(q, '40000000-0000-0000-0000-0000000000a9', ID.discPor));
    assert.ok(!tarde.error, 'tarde: ' + tarde.error?.message);
    // trocar as disciplinas entre as turmas continua proibido
    const troca = await as(P, (q) => ins(q, ID.matr1A, ID.discPor));
    assert.ok(troca.error, 'Português na turma da manhã não deveria ser permitido');
  });
});
