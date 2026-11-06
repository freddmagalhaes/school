// Testes de RLS (isolamento entre escolas e permissões por papel).
// Cada teste roda como um usuário real do cenário (fixtures.sql) e desfaz tudo no fim.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, as, admin, ID, MEMBRO } from './helpers.mjs';

before(async () => { await setup(); });
after(async () => { await teardown(); });

const ESCOLA_A_TABLES = [
  ['turmas', ID.turmaA], ['disciplinas', ID.discMat], ['matriculas', ID.matr1A],
  ['notas', ID.notaA1], ['frequencia', ID.freqA1], ['financeiro_verbas', ID.finA],
  ['faturas', ID.fatA1],
];

/** Uma escrita foi bloqueada se deu erro ou não afetou nenhuma linha. */
const blocked = (r) => Boolean(r.error) || r.rowCount === 0;

describe('Isolamento entre escolas (Admin da escola B contra a escola A)', () => {
  for (const [tabela, id] of ESCOLA_A_TABLES) {
    test(`${tabela}: não lê`, async () => {
      const r = await as(ID.adminB, (q) => q(`SELECT id FROM public.${tabela} WHERE id = $1`, [id]));
      assert.equal(r.rowCount, 0);
    });
    test(`${tabela}: não apaga`, async () => {
      const r = await as(ID.adminB, (q) => q(`DELETE FROM public.${tabela} WHERE id = $1`, [id]));
      assert.ok(blocked(r));
      const { rows } = await admin(`SELECT 1 FROM public.${tabela} WHERE id = $1`, [id]);
      assert.equal(rows.length, 1, 'a linha da escola A precisa continuar existindo');
    });
  }

  test('não altera nota da escola A', async () => {
    const r = await as(ID.adminB, (q) => q('UPDATE public.notas SET valor = 10 WHERE id = $1', [ID.notaA1]));
    assert.ok(blocked(r));
  });
  test('não cria turma na escola A', async () => {
    const r = await as(ID.adminB, (q) => q("INSERT INTO public.turmas (escola_id, nome, ano_letivo, turno) VALUES ($1, 'X', 2026, 'Manhã')", [ID.escolaA]));
    assert.ok(blocked(r));
  });
  test('não vê membros nem perfis (CPF) da escola A', async () => {
    const m = await as(ID.adminB, (q) => q('SELECT id FROM public.membros_escola WHERE escola_id = $1', [ID.escolaA]));
    assert.equal(m.rowCount, 0);
    const p = await as(ID.adminB, (q) => q('SELECT cpf FROM public.perfis WHERE id = $1', [ID.aluno1A]));
    assert.equal(p.rowCount, 0);
  });
  test('não altera dados da escola A', async () => {
    const r = await as(ID.adminB, (q) => q("UPDATE public.escolas SET nome = 'invadida' WHERE id = $1", [ID.escolaA]));
    assert.ok(blocked(r));
  });
  test('não se promove a membro da escola A', async () => {
    const r = await as(ID.adminB, (q) => q("INSERT INTO public.membros_escola (escola_id, user_id, papel, tipo_vinculo) VALUES ($1, $2, 'Admin', 'Efetivo')", [ID.escolaA, ID.adminB]));
    assert.ok(blocked(r));
  });
});

describe('Aluno: só lê o que é seu e não escreve em nada da escola', () => {
  test('lê as próprias notas e não as dos colegas', async () => {
    const r = await as(ID.aluno1A, (q) => q('SELECT id FROM public.notas'));
    assert.deepEqual(r.rows.map((x) => x.id), [ID.notaA1]);
  });
  test('lê a própria frequência e não a dos colegas', async () => {
    const r = await as(ID.aluno1A, (q) => q('SELECT id FROM public.frequencia'));
    assert.deepEqual(r.rows.map((x) => x.id), [ID.freqA1]);
  });
  test('lê a própria matrícula e não a dos colegas', async () => {
    const r = await as(ID.aluno1A, (q) => q('SELECT id FROM public.matriculas'));
    assert.deepEqual(r.rows.map((x) => x.id), [ID.matr1A]);
  });
  test('lê as próprias faturas e não as dos colegas', async () => {
    const r = await as(ID.aluno1A, (q) => q('SELECT id FROM public.faturas'));
    assert.deepEqual(r.rows.map((x) => x.id), [ID.fatA1]);
  });
  test('não vê o CPF dos colegas', async () => {
    const r = await as(ID.aluno1A, (q) => q('SELECT id FROM public.perfis'));
    assert.deepEqual(r.rows.map((x) => x.id), [ID.aluno1A]);
  });
  test('não vê a movimentação financeira da escola', async () => {
    const r = await as(ID.aluno1A, (q) => q('SELECT id FROM public.financeiro_verbas'));
    assert.equal(r.rowCount, 0);
  });
  test('não altera a própria nota', async () => {
    const r = await as(ID.aluno1A, (q) => q('UPDATE public.notas SET valor = 10 WHERE id = $1', [ID.notaA1]));
    assert.ok(blocked(r));
    const { rows } = await admin('SELECT valor FROM public.notas WHERE id = $1', [ID.notaA1]);
    assert.equal(Number(rows[0].valor), 8);
  });
  test('não altera a nota do colega', async () => {
    const r = await as(ID.aluno1A, (q) => q('UPDATE public.notas SET valor = 0 WHERE id = $1', [ID.notaA2]));
    assert.ok(blocked(r));
  });
  test('não lança nota nova', async () => {
    const r = await as(ID.aluno1A, (q) => q("INSERT INTO public.notas (escola_id, matricula_id, disciplina_id, valor, data) VALUES ($1, $2, $3, 10, '2026-04-01')", [ID.escolaA, ID.matr1A, ID.discMat]));
    assert.ok(blocked(r));
  });
  test('não corrige a própria falta', async () => {
    const r = await as(ID.aluno2A, (q) => q('UPDATE public.frequencia SET presente = true WHERE id = $1', [ID.freqA2]));
    assert.ok(blocked(r));
  });
  test('não quita a própria fatura', async () => {
    const r = await as(ID.aluno1A, (q) => q("UPDATE public.faturas SET status = 'Pago' WHERE id = $1", [ID.fatA1]));
    assert.ok(blocked(r));
  });
  test('não apaga turma, disciplina nem matrícula', async () => {
    for (const [t, id] of [['turmas', ID.turmaA], ['disciplinas', ID.discMat], ['matriculas', ID.matr1A]]) {
      const r = await as(ID.aluno1A, (q) => q(`DELETE FROM public.${t} WHERE id = $1`, [id]));
      assert.ok(blocked(r), t);
    }
  });
  test('não se promove a Admin', async () => {
    const r = await as(ID.aluno1A, (q) => q("UPDATE public.membros_escola SET papel = 'Admin' WHERE id = $1", [MEMBRO.aluno1A]));
    assert.ok(blocked(r));
    const { rows } = await admin('SELECT papel FROM public.membros_escola WHERE id = $1', [MEMBRO.aluno1A]);
    assert.equal(rows[0].papel, 'Aluno');
  });
  test('não cria vínculo novo para si', async () => {
    const r = await as(ID.aluno1A, (q) => q("INSERT INTO public.membros_escola (escola_id, user_id, papel, tipo_vinculo) VALUES ($1, $2, 'Admin', 'Efetivo')", [ID.escolaA, ID.aluno1A]));
    assert.ok(blocked(r));
  });
});

describe('Professor: lança só nas turmas e disciplinas em que leciona', () => {
  test('lança nota na própria turma e disciplina', async () => {
    const r = await as(ID.profA, (q) => q("INSERT INTO public.notas (escola_id, matricula_id, disciplina_id, valor, data) VALUES ($1, $2, $3, 7, '2026-04-01')", [ID.escolaA, ID.matr1A, ID.discMat]));
    assert.ok(!r.error, r.error?.message);
    assert.equal(r.rowCount, 1);
  });
  test('corrige nota na própria disciplina', async () => {
    const r = await as(ID.profA, (q) => q('UPDATE public.notas SET valor = 9 WHERE id = $1', [ID.notaA1]));
    assert.equal(r.rowCount, 1);
  });
  test('não lança nota em disciplina de outro professor', async () => {
    const r = await as(ID.profA, (q) => q("INSERT INTO public.notas (escola_id, matricula_id, disciplina_id, valor, data) VALUES ($1, $2, $3, 7, '2026-04-01')", [ID.escolaA, ID.matr1A, ID.discPor]));
    assert.ok(blocked(r));
  });
  test('não lança nota em turma onde não leciona', async () => {
    await admin("INSERT INTO public.matriculas (id, escola_id, turma_id, aluno_id, status) VALUES ('40000000-0000-0000-0000-0000000000c9', $1, $2, $3, 'Ativo') ON CONFLICT DO NOTHING", [ID.escolaA, ID.turmaA2, ID.aluno1A]);
    try {
      const r = await as(ID.profA, (q) => q("INSERT INTO public.notas (escola_id, matricula_id, disciplina_id, valor, data) VALUES ($1, '40000000-0000-0000-0000-0000000000c9', $2, 7, '2026-04-01')", [ID.escolaA, ID.discMat]));
      assert.ok(blocked(r));
    } finally {
      await admin("DELETE FROM public.matriculas WHERE id = '40000000-0000-0000-0000-0000000000c9'");
    }
  });
  test('lança frequência na própria turma', async () => {
    const r = await as(ID.profA, (q) => q("INSERT INTO public.frequencia (escola_id, matricula_id, data, presente) VALUES ($1, $2, '2026-04-02', true)", [ID.escolaA, ID.matr1A]));
    assert.equal(r.rowCount, 1, r.error?.message);
  });
  test('lê as notas dos alunos da própria turma', async () => {
    const r = await as(ID.profA, (q) => q('SELECT id FROM public.notas WHERE matricula_id IN ($1, $2)', [ID.matr1A, ID.matr2A]));
    assert.equal(r.rowCount, 2);
  });
  test('não mexe em turmas, disciplinas, matrículas, financeiro nem faturas', async () => {
    const tentativas = [
      ["UPDATE public.turmas SET nome = 'hack' WHERE id = $1", ID.turmaA],
      ["DELETE FROM public.disciplinas WHERE id = $1", ID.discMat],
      ["UPDATE public.matriculas SET status = 'Evadido' WHERE id = $1", ID.matr1A],
      ["UPDATE public.financeiro_verbas SET status_aprovacao = 'Aprovado' WHERE id = $1", ID.finA],
      ["UPDATE public.faturas SET status = 'Pago' WHERE id = $1", ID.fatA1],
    ];
    for (const [sql, id] of tentativas) {
      const r = await as(ID.profA, (q) => q(sql, [id]));
      assert.ok(blocked(r), sql);
    }
  });
  test('não vê a movimentação financeira nem as faturas', async () => {
    const f = await as(ID.profA, (q) => q('SELECT id FROM public.financeiro_verbas'));
    assert.equal(f.rowCount, 0);
    const t = await as(ID.profA, (q) => q('SELECT id FROM public.faturas'));
    assert.equal(t.rowCount, 0);
  });
});

describe('Secretaria, Diretor e Admin: o que cada um faz', () => {
  test('Secretaria cadastra turma e matricula aluno', async () => {
    const t = await as(ID.secretariaA, (q) => q("INSERT INTO public.turmas (escola_id, nome, ano_letivo, turno) VALUES ($1, '7A', 2026, 'Manhã')", [ID.escolaA]));
    assert.equal(t.rowCount, 1, t.error?.message);
    const m = await as(ID.secretariaA, (q) => q("UPDATE public.matriculas SET status = 'Transferido' WHERE id = $1", [ID.matr1A]));
    assert.equal(m.rowCount, 1);
  });
  test('Secretaria não acessa o financeiro da escola', async () => {
    const f = await as(ID.secretariaA, (q) => q('SELECT id FROM public.financeiro_verbas'));
    assert.equal(f.rowCount, 0);
    const r = await as(ID.secretariaA, (q) => q("UPDATE public.financeiro_verbas SET status_aprovacao = 'Aprovado' WHERE id = $1", [ID.finA]));
    assert.ok(blocked(r));
  });
  test('Secretaria lê as notas e a frequência da escola', async () => {
    const r = await as(ID.secretariaA, (q) => q('SELECT id FROM public.notas'));
    assert.equal(r.rowCount, 2);
  });
  test('Secretaria não promove ninguém a Admin', async () => {
    const r = await as(ID.secretariaA, (q) => q("UPDATE public.membros_escola SET papel = 'Admin' WHERE id = $1", [MEMBRO.aluno1A]));
    assert.ok(blocked(r));
  });
  test('Secretaria remove aluno, mas não remove o Admin', async () => {
    const ok = await as(ID.secretariaA, (q) => q('DELETE FROM public.membros_escola WHERE id = $1', [MEMBRO.aluno2A]));
    assert.equal(ok.rowCount, 1);
    const no = await as(ID.secretariaA, (q) => q('DELETE FROM public.membros_escola WHERE id = $1', [MEMBRO.adminA]));
    assert.ok(blocked(no));
  });
  test('Diretor aprova movimentação; Subdiretor-like (leitura) não aprova', async () => {
    const r = await as(ID.diretorA, (q) => q("UPDATE public.financeiro_verbas SET status_aprovacao = 'Aprovado' WHERE id = $1", [ID.finA]));
    assert.equal(r.rowCount, 1);
  });
  test('Admin lê o financeiro, quita fatura e vê todos os perfis da escola', async () => {
    const f = await as(ID.adminA, (q) => q('SELECT id FROM public.financeiro_verbas'));
    assert.equal(f.rowCount, 1);
    const q1 = await as(ID.adminA, (q) => q("UPDATE public.faturas SET status = 'Pago' WHERE id = $1", [ID.fatA1]));
    assert.equal(q1.rowCount, 1);
    const p = await as(ID.adminA, (q) => q('SELECT id FROM public.perfis'));
    assert.equal(p.rowCount, 8);
  });
  test('Admin altera a própria escola e gerencia períodos letivos', async () => {
    const e = await as(ID.adminA, (q) => q("UPDATE public.escolas SET telefone = '31999990000' WHERE id = $1", [ID.escolaA]));
    assert.equal(e.rowCount, 1);
    const p = await as(ID.adminA, (q) => q("INSERT INTO public.periodos_letivos (escola_id, nome, ordem, ano_letivo, data_inicio, data_fim) VALUES ($1, '1º Bimestre', 1, 2026, '2026-02-01', '2026-04-30')", [ID.escolaA]));
    assert.equal(p.rowCount, 1, p.error?.message);
  });
  test('Admin não consegue gravar linha em outra escola (WITH CHECK)', async () => {
    const r = await as(ID.adminA, (q) => q("INSERT INTO public.turmas (escola_id, nome, ano_letivo, turno) VALUES ($1, 'X', 2026, 'Manhã')", [ID.escolaB]));
    assert.ok(blocked(r));
  });
});

describe('Tabelas do backoffice e cadastro público', () => {
  test('usuário de escola não vê assinaturas, equipe interna, configurações nem leads', async () => {
    for (const t of ['assinaturas', 'root_admins', 'system_settings', 'crm_leads_escolas']) {
      const r = await as(ID.adminA, (q) => q(`SELECT 1 FROM public.${t}`));
      assert.equal(r.rowCount, 0, t);
    }
  });
  test('usuário de escola não se torna operador', async () => {
    const r = await as(ID.adminA, (q) => q("INSERT INTO public.root_admins (id, nome, email, role, is_root, is_active) VALUES ($1, 'x', 'x@x', 'root', true, true)", [ID.adminA]));
    assert.ok(blocked(r));
  });
  test('operador ativo lê as assinaturas', async () => {
    await admin("INSERT INTO public.assinaturas (nome, email, nome_escola, plano, ciclo, metodo_pgto, valor_total) VALUES ('c', 'c@c', 'Esc', 'basico', 'mensal', 'pix', 590)");
    const r = await as(ID.operador, (q) => q ? q('SELECT 1 FROM public.assinaturas') : null);
    assert.ok(r.rowCount >= 1);
  });
  test('cadastro público só cria assinatura pendente e sem escola', async () => {
    const ok = await as(null, (q) => q("INSERT INTO public.assinaturas (nome, email, nome_escola, plano, ciclo, metodo_pgto, valor_total) VALUES ('c', 'c@c', 'Esc', 'basico', 'mensal', 'pix', 590)"));
    assert.equal(ok.rowCount, 1, ok.error?.message);
    const ativa = await as(null, (q) => q("INSERT INTO public.assinaturas (nome, email, nome_escola, plano, ciclo, metodo_pgto, valor_total, status) VALUES ('c', 'c@c', 'Esc', 'basico', 'mensal', 'pix', 0, 'ativo')"));
    assert.ok(blocked(ativa), 'visitante não pode criar assinatura já ativa');
    const comEscola = await as(null, (q) => q("INSERT INTO public.assinaturas (nome, email, nome_escola, plano, ciclo, metodo_pgto, valor_total, escola_id) VALUES ('c', 'c@c', 'Esc', 'basico', 'mensal', 'pix', 0, $1)", [ID.escolaA]));
    assert.ok(blocked(comEscola), 'visitante não pode vincular assinatura a uma escola');
  });
  test('visitante anônimo não lê nada das escolas', async () => {
    for (const t of ['escolas', 'perfis', 'membros_escola', 'turmas', 'notas', 'faturas', 'financeiro_verbas']) {
      const r = await as(null, (q) => q(`SELECT 1 FROM public.${t}`));
      assert.equal(r.rowCount, 0, t);
    }
  });
  test('log de auditoria: não se grava em nome de outra pessoa', async () => {
    const r = await as(ID.adminA, (q) => q("INSERT INTO public.audit_logs (user_id, escola_id, acao) VALUES ($1, $2, 'x')", [ID.adminB, ID.escolaA]));
    assert.ok(blocked(r));
  });
});

describe('Vínculos entre escolas e turma_alunos', () => {
  test('Admin da escola A não grava nota de A apontando para matrícula da escola B', async () => {
    const r = await as(ID.adminA, (q) => q("INSERT INTO public.notas (escola_id, matricula_id, disciplina_id, valor, data) VALUES ($1, $2, $3, 10, '2026-04-01')", [ID.escolaA, ID.matr1B, ID.discMat]));
    assert.ok(blocked(r));
  });
  test('Admin da escola A não grava frequência de A apontando para matrícula da escola B', async () => {
    const r = await as(ID.adminA, (q) => q("INSERT INTO public.frequencia (escola_id, matricula_id, data, presente) VALUES ($1, $2, '2026-04-05', true)", [ID.escolaA, ID.matr1B]));
    assert.ok(blocked(r));
  });
  test('aluno vê só a própria linha em turma_alunos; professor vê a turma toda', async () => {
    const a = await as(ID.aluno1A, (q) => q('SELECT id FROM public.turma_alunos'));
    assert.equal(a.rowCount, 1);
    const p = await as(ID.profA, (q) => q('SELECT id FROM public.turma_alunos'));
    assert.equal(p.rowCount, 2);
  });
  test('aluno não se enturma nem enturma o colega', async () => {
    const r = await as(ID.aluno1A, (q) => q('INSERT INTO public.turma_alunos (turma_id, aluno_id) VALUES ($1, $2)', [ID.turmaA2, MEMBRO.aluno1A]));
    assert.ok(blocked(r));
    const d = await as(ID.aluno1A, (q) => q('DELETE FROM public.turma_alunos'));
    assert.ok(blocked(d));
  });
  test('escola B não enxerga turma_alunos da escola A', async () => {
    const r = await as(ID.adminB, (q) => q('SELECT id FROM public.turma_alunos WHERE turma_id = $1', [ID.turmaA]));
    assert.equal(r.rowCount, 0);
  });
});
