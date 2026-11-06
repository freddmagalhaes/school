// Perfil Responsável: leitura dos dados do(s) filho(s) vinculado(s), nunca de outros alunos, nunca escrita.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, as, admin, ID, MEMBRO } from './helpers.mjs';

before(async () => { await setup(); });
after(async () => { await teardown(); });

const blocked = (r) => Boolean(r.error) || r.rowCount === 0;

describe('Responsável lê somente o filho vinculado', () => {
  test('notas', async () => {
    const r = await as(ID.respA, (q) => q('SELECT id FROM public.notas'));
    assert.deepEqual(r.rows.map((x) => x.id), [ID.notaA1]);
  });
  test('frequência', async () => {
    const r = await as(ID.respA, (q) => q('SELECT id FROM public.frequencia'));
    assert.deepEqual(r.rows.map((x) => x.id), [ID.freqA1]);
  });
  test('matrícula', async () => {
    const r = await as(ID.respA, (q) => q('SELECT id FROM public.matriculas'));
    assert.deepEqual(r.rows.map((x) => x.id), [ID.matr1A]);
  });
  test('faturas', async () => {
    const r = await as(ID.respA, (q) => q('SELECT id FROM public.faturas'));
    assert.deepEqual(r.rows.map((x) => x.id), [ID.fatA1]);
  });
  test('turma_alunos e vínculo do aluno', async () => {
    const t = await as(ID.respA, (q) => q('SELECT aluno_id FROM public.turma_alunos'));
    assert.deepEqual(t.rows.map((x) => x.aluno_id), [MEMBRO.aluno1A]);
    const m = await as(ID.respA, (q) => q("SELECT id FROM public.membros_escola WHERE papel = 'Aluno'"));
    assert.deepEqual(m.rows.map((x) => x.id), [MEMBRO.aluno1A]);
  });
  test('perfil do filho, mas não o dos outros alunos nem da equipe', async () => {
    const r = await as(ID.respA, (q) => q('SELECT id FROM public.perfis ORDER BY id'));
    assert.deepEqual(r.rows.map((x) => x.id).sort(), [ID.aluno1A, ID.respA].sort());
  });
  test('não vê o colega do filho', async () => {
    const r = await as(ID.respA, (q) => q('SELECT id FROM public.notas WHERE id = $1', [ID.notaA2]));
    assert.equal(r.rowCount, 0);
  });
  test('com dois filhos, vê os dois', async () => {
    await admin('INSERT INTO public.responsaveis_alunos (escola_id, responsavel_id, aluno_id) VALUES ($1, $2, $3)', [ID.escolaA, ID.respA, ID.aluno2A]);
    try {
      const r = await as(ID.respA, (q) => q('SELECT id FROM public.notas ORDER BY id'));
      assert.deepEqual(r.rows.map((x) => x.id).sort(), [ID.notaA1, ID.notaA2].sort());
    } finally {
      await admin('DELETE FROM public.responsaveis_alunos WHERE responsavel_id = $1 AND aluno_id = $2', [ID.respA, ID.aluno2A]);
    }
  });
  test('responsável da escola B não vê o filho da escola A', async () => {
    for (const t of ['notas', 'frequencia', 'matriculas', 'faturas']) {
      const r = await as(ID.respB, (q) => q(`SELECT id FROM public.${t}`));
      assert.ok(r.rows.every((x) => ![ID.notaA1, ID.freqA1, ID.matr1A, ID.fatA1].includes(x.id)), t);
    }
  });
});

describe('Responsável não escreve nem acessa o que não é dele', () => {
  test('não altera nota, frequência, matrícula nem fatura do filho', async () => {
    const tentativas = [
      ['UPDATE public.notas SET valor = 10 WHERE id = $1', ID.notaA1],
      ['UPDATE public.frequencia SET presente = true WHERE id = $1', ID.freqA1],
      ["UPDATE public.matriculas SET status = 'Evadido' WHERE id = $1", ID.matr1A],
      ["UPDATE public.faturas SET status = 'Pago' WHERE id = $1", ID.fatA1],
    ];
    for (const [sql, id] of tentativas) {
      const r = await as(ID.respA, (q) => q(sql, [id]));
      assert.ok(blocked(r), sql);
    }
  });
  test('não lança nota nova nem apaga turma', async () => {
    const n = await as(ID.respA, (q) => q("INSERT INTO public.notas (escola_id, matricula_id, disciplina_id, valor, data) VALUES ($1, $2, $3, 10, '2026-04-01')", [ID.escolaA, ID.matr1A, ID.discMat]));
    assert.ok(blocked(n));
    const t = await as(ID.respA, (q) => q('DELETE FROM public.turmas WHERE id = $1', [ID.turmaA]));
    assert.ok(blocked(t));
  });
  test('não vê o financeiro da escola', async () => {
    const r = await as(ID.respA, (q) => q('SELECT id FROM public.financeiro_verbas'));
    assert.equal(r.rowCount, 0);
  });
  test('não se vincula a outro aluno nem se promove', async () => {
    const v = await as(ID.respA, (q) => q('INSERT INTO public.responsaveis_alunos (escola_id, responsavel_id, aluno_id) VALUES ($1, $2, $3)', [ID.escolaA, ID.respA, ID.aluno2A]));
    assert.ok(blocked(v));
    const p = await as(ID.respA, (q) => q("UPDATE public.membros_escola SET papel = 'Admin' WHERE user_id = $1", [ID.respA]));
    assert.ok(blocked(p));
  });
  test('não remove o próprio vínculo com o filho', async () => {
    const r = await as(ID.respA, (q) => q('DELETE FROM public.responsaveis_alunos WHERE responsavel_id = $1', [ID.respA]));
    assert.ok(blocked(r));
  });
  test('lê os próprios vínculos', async () => {
    const r = await as(ID.respA, (q) => q('SELECT aluno_id FROM public.responsaveis_alunos'));
    assert.deepEqual(r.rows.map((x) => x.aluno_id), [ID.aluno1A]);
  });
});

describe('Quem gerencia os vínculos', () => {
  test('Secretaria vincula responsável e aluno da mesma escola', async () => {
    const r = await as(ID.secretariaA, (q) => q('INSERT INTO public.responsaveis_alunos (escola_id, responsavel_id, aluno_id) VALUES ($1, $2, $3)', [ID.escolaA, ID.respA, ID.aluno2A]));
    assert.equal(r.rowCount, 1, r.error?.message);
  });
  test('vínculo com aluno de outra escola é recusado', async () => {
    const r = await as(ID.secretariaA, (q) => q('INSERT INTO public.responsaveis_alunos (escola_id, responsavel_id, aluno_id) VALUES ($1, $2, $3)', [ID.escolaA, ID.respA, ID.aluno1B]));
    assert.ok(blocked(r));
  });
  test('vínculo cujo "responsável" não tem o papel Responsável é recusado', async () => {
    const r = await as(ID.adminA, (q) => q('INSERT INTO public.responsaveis_alunos (escola_id, responsavel_id, aluno_id) VALUES ($1, $2, $3)', [ID.escolaA, ID.profA, ID.aluno2A]));
    assert.ok(blocked(r));
  });
  test('Professor e Aluno não criam vínculo', async () => {
    for (const uid of [ID.profA, ID.aluno1A]) {
      const r = await as(uid, (q) => q('INSERT INTO public.responsaveis_alunos (escola_id, responsavel_id, aluno_id) VALUES ($1, $2, $3)', [ID.escolaA, ID.respA, ID.aluno2A]));
      assert.ok(blocked(r));
    }
  });
  test('Admin da escola B não vê nem altera vínculos da escola A', async () => {
    const s = await as(ID.adminB, (q) => q('SELECT id FROM public.responsaveis_alunos WHERE escola_id = $1', [ID.escolaA]));
    assert.equal(s.rowCount, 0);
    const d = await as(ID.adminB, (q) => q('DELETE FROM public.responsaveis_alunos WHERE escola_id = $1', [ID.escolaA]));
    assert.ok(blocked(d));
  });
  test('Admin remove vínculo', async () => {
    const r = await as(ID.adminA, (q) => q('DELETE FROM public.responsaveis_alunos WHERE responsavel_id = $1', [ID.respA]));
    assert.equal(r.rowCount, 1);
  });
});

describe('Secretaria gerencia o acesso do responsável', () => {
  test('Secretaria remove o vínculo de um responsável, mas não promove ninguém', async () => {
    const ok = await as(ID.secretariaA, (q) => q("DELETE FROM public.membros_escola WHERE user_id = $1 AND papel = 'Responsavel'", [ID.respA]));
    assert.equal(ok.rowCount, 1);
    const no = await as(ID.secretariaA, (q) => q("UPDATE public.membros_escola SET papel = 'Diretor' WHERE user_id = $1", [ID.respA]));
    assert.ok(blocked(no));
  });
});

describe('Funções aceitam o id de turma_alunos (esquema alternativo do app)', () => {
  test('professor, aluno, responsável e escola reconhecidos pelo id de turma_alunos', async () => {
    const { rows } = await admin('SELECT id FROM public.turma_alunos WHERE aluno_id = $1', [MEMBRO.aluno1A]);
    const ta = rows[0].id;
    const prof = await as(ID.profA, (q) => q('SELECT public.professor_leciona_matricula($1, $2) AS ok', [ta, ID.discMat]));
    assert.equal(prof.rows[0].ok, true);
    const profOutra = await as(ID.profA, (q) => q('SELECT public.professor_leciona_matricula($1, $2) AS ok', [ta, ID.discPor]));
    assert.equal(profOutra.rows[0].ok, false);
    const aluno = await as(ID.aluno1A, (q) => q('SELECT public.matricula_e_minha($1) AS ok', [ta]));
    assert.equal(aluno.rows[0].ok, true);
    const colega = await as(ID.aluno2A, (q) => q('SELECT public.matricula_e_minha($1) AS ok', [ta]));
    assert.equal(colega.rows[0].ok, false);
    const resp = await as(ID.respA, (q) => q('SELECT public.responsavel_da_matricula($1) AS ok', [ta]));
    assert.equal(resp.rows[0].ok, true);
    const esc = await as(ID.adminA, (q) => q('SELECT public.matricula_na_escola($1, $2) AS a, public.matricula_na_escola($1, $3) AS b', [ta, ID.escolaA, ID.escolaB]));
    assert.deepEqual([esc.rows[0].a, esc.rows[0].b], [true, false]);
  });
});
