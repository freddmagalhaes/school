// Grade de horários: conflitos (turma, professor na mesma escola, professor em outra escola), permissões e carga horária.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, as, admin, ID } from './helpers.mjs';

before(async () => {
  await setup();
  // profA também leciona na turma 6A (tarde) e é professor da escola B (turma 5B, disciplina B)
  await admin(`INSERT INTO public.turma_professores (escola_id, turma_id, professor_id, disciplina_id) VALUES ($1,$2,$3,$4)`,
    [ID.escolaA, ID.turmaA2, ID.profA, ID.discMat]);
  await admin(`INSERT INTO public.membros_escola (escola_id, user_id, papel, tipo_vinculo) VALUES ($1,$2,'Professor','Efetivo')`, [ID.escolaB, ID.profA]);
  await admin(`INSERT INTO public.turma_professores (escola_id, turma_id, professor_id, disciplina_id) VALUES ($1,$2,$3,$4)`,
    [ID.escolaB, ID.turmaB, ID.profA, ID.discB]);
});
after(async () => { await teardown(); });

const aula = (escola, turma, prof, disc, dia, ini, fim) =>
  admin(`INSERT INTO public.horarios_aula (escola_id, turma_id, professor_id, disciplina_id, dia_semana, hora_inicio, hora_fim)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [escola, turma, prof, disc, dia, ini, fim]);
const falha = async (p, codigo, trecho) => {
  await assert.rejects(p, (e) => { assert.equal(e.code, codigo, e.message); if (trecho) assert.match(e.message, trecho); return true; });
};

describe('Conflitos de horário', () => {
  test('aula válida entra', async () => {
    const r = await aula(ID.escolaA, ID.turmaA, ID.profA, ID.discMat, 1, '08:00', '09:00');
    assert.equal(r.rowCount, 1);
  });
  test('a mesma turma não tem duas aulas ao mesmo tempo', async () => {
    await falha(aula(ID.escolaA, ID.turmaA, ID.profOutroA, ID.discPor, 1, '08:30', '09:30'), '23P01', /turma já tem aula/);
  });
  test('o professor não está em duas turmas ao mesmo tempo na mesma escola (diz a turma)', async () => {
    await falha(aula(ID.escolaA, ID.turmaA2, ID.profA, ID.discMat, 1, '08:30', '09:30'), '23P01', /nesta escola \(turma 5A\)/);
  });
  test('horários que só se encostam (09:00) são permitidos', async () => {
    const r = await aula(ID.escolaA, ID.turmaA2, ID.profA, ID.discMat, 1, '09:00', '10:00');
    assert.equal(r.rowCount, 1);
  });
  test('outro dia da semana não conflita', async () => {
    const r = await aula(ID.escolaA, ID.turmaA2, ID.profA, ID.discMat, 2, '08:00', '09:00');
    assert.equal(r.rowCount, 1);
  });
  test('o professor não está em duas escolas ao mesmo tempo, sem revelar qual', async () => {
    await assert.rejects(aula(ID.escolaB, ID.turmaB, ID.profA, ID.discB, 1, '08:15', '08:45'), (e) => {
      assert.equal(e.code, '23P01');
      assert.match(e.message, /em outra escola/);
      assert.doesNotMatch(e.message, /5A|6A|Escola A|Matemática/);
      return true;
    });
  });
  test('em outro horário a escola B aceita', async () => {
    const r = await aula(ID.escolaB, ID.turmaB, ID.profA, ID.discB, 1, '14:00', '15:00');
    assert.equal(r.rowCount, 1);
  });
  test('professor que não está atribuído à turma e disciplina é recusado', async () => {
    await falha(aula(ID.escolaA, ID.turmaA, ID.profOutroA, ID.discMat, 3, '08:00', '09:00'), '23514', /não está atribuído/);
  });
  test('turma de outra escola é recusada', async () => {
    await falha(aula(ID.escolaA, ID.turmaB, ID.profA, ID.discB, 3, '08:00', '09:00'), '23514');
  });
  test('fim antes do início é recusado', async () => {
    await falha(aula(ID.escolaA, ID.turmaA, ID.profA, ID.discMat, 3, '10:00', '09:00'), '23514');
    await falha(aula(ID.escolaA, ID.turmaA, ID.profA, ID.discMat, 3, '09:00', '09:00'), '23514');
  });
  test('editar a própria aula não conflita consigo mesma', async () => {
    const r = await aula(ID.escolaA, ID.turmaA, ID.profA, ID.discMat, 4, '08:00', '09:00');
    await admin(`UPDATE public.horarios_aula SET hora_fim = '09:30' WHERE id = $1`, [r.rows[0].id]);
  });
  test('remover a atribuição do professor remove as aulas dela da grade', async () => {
    await aula(ID.escolaA, ID.turmaA, ID.profOutroA, ID.discPor, 5, '10:00', '11:00');
    await admin(`DELETE FROM public.turma_professores WHERE turma_id = $1 AND professor_id = $2 AND disciplina_id = $3`, [ID.turmaA, ID.profOutroA, ID.discPor]);
    const r = await admin(`SELECT 1 FROM public.horarios_aula WHERE professor_id = $1`, [ID.profOutroA]);
    assert.equal(r.rowCount, 0);
  });
});

describe('Permissões da grade', () => {
  test('Admin e Secretaria gravam; Professor, Aluno e Responsável não', async () => {
    const ins = (q) => q(`INSERT INTO public.horarios_aula (escola_id, turma_id, professor_id, disciplina_id, dia_semana, hora_inicio, hora_fim)
                          VALUES ($1,$2,$3,$4,6,'08:00','09:00')`, [ID.escolaA, ID.turmaA, ID.profA, ID.discMat]);
    assert.ok(!(await as(ID.adminA, ins)).error);
    assert.ok(!(await as(ID.secretariaA, ins)).error);
    for (const u of [ID.profA, ID.aluno1A, ID.respA]) assert.ok((await as(u, ins)).error, String(u));
  });
  test('Professor lê a grade da escola dele; Aluno e Responsável não', async () => {
    assert.ok((await as(ID.profA, (q) => q('SELECT 1 FROM public.horarios_aula'))).rowCount > 0);
    for (const u of [ID.aluno1A, ID.respA]) assert.equal((await as(u, (q) => q('SELECT 1 FROM public.horarios_aula'))).rowCount, 0);
  });
  test('Admin da B não vê nem altera a grade da A', async () => {
    const r = await as(ID.adminB, (q) => q('SELECT escola_id FROM public.horarios_aula'));
    assert.ok(r.rows.every((x) => x.escola_id === ID.escolaB));
    const d = await as(ID.adminB, (q) => q('DELETE FROM public.horarios_aula WHERE escola_id = $1', [ID.escolaA]));
    assert.equal(d.rowCount, 0);
  });
  test('visitante não acessa', async () => {
    assert.ok((await as(null, (q) => q('SELECT 1 FROM public.horarios_aula'))).error);
  });
});

describe('Carga horária contratada', () => {
  test('Admin define; valores absurdos são recusados; Professor não altera a própria', async () => {
    const up = (q, h) => q(`UPDATE public.membros_escola SET carga_horaria_semanal = $1 WHERE user_id = $2 AND escola_id = $3`, [h, ID.profA, ID.escolaA]);
    const ok = await as(ID.adminA, (q) => up(q, 20));
    assert.ok(!ok.error && ok.rowCount === 1);
    assert.ok((await as(ID.adminA, (q) => up(q, 81))).error);
    assert.equal((await as(ID.profA, (q) => up(q, 40))).rowCount, 0);
  });
});
