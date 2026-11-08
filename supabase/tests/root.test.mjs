// Dono do sistema (root) enxerga as escolas para poder escolher qual gerenciar; suporte comum não.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, as, admin, ID } from './helpers.mjs';

const ROOT = '10000000-0000-0000-0000-0000000000f2';
before(async () => {
  await setup();
  await admin(`INSERT INTO auth.users (id, email) VALUES ($1, 'root@teste')`, [ROOT]);
  await admin(`INSERT INTO public.root_admins (id, nome, email, role, is_root, is_active) VALUES ($1, 'Root', 'root@teste', 'root', true, true)`, [ROOT]);
});
after(async () => { await teardown(); });

describe('Root lê as escolas', () => {
  for (const t of ['escolas', 'membros_escola', 'perfis', 'turmas', 'disciplinas', 'matriculas']) {
    test(`root vê ${t} de todas as escolas`, async () => {
      const r = await as(ROOT, (q) => q(`SELECT count(*)::int AS n FROM public.${t}`));
      assert.ok(r.rows[0].n >= 2, `${t}: ${r.rows[0]?.n}`);
    });
  }
  test('root NÃO lê notas nem faturas (dado de aluno)', async () => {
    for (const t of ['notas', 'faturas', 'financeiro_verbas']) {
      const r = await as(ROOT, (q) => q(`SELECT 1 FROM public.${t}`));
      assert.equal(r.rowCount, 0, t);
    }
  });
  test('suporte (não-root) continua sem ver escolas', async () => {
    const r = await as(ID.operador, (q) => q('SELECT 1 FROM public.escolas'));
    assert.equal(r.rowCount, 0);
  });
  test('Admin da escola A continua vendo só a própria escola', async () => {
    const r = await as(ID.adminA, (q) => q('SELECT id FROM public.escolas'));
    assert.deepEqual(r.rows.map((x) => x.id), [ID.escolaA]);
  });

  test('root cria escola e liga à assinatura', async () => {
    const a = await admin("INSERT INTO public.assinaturas (nome,email,nome_escola,plano,ciclo,metodo_pgto,valor_total) VALUES ('c','c@c','Nova','basico','mensal','pix',1) RETURNING id");
    await as(ROOT, async (q) => {
      const e = await q("INSERT INTO public.escolas (nome, cnpj) VALUES ('Nova', '99.999.999/0001-99') RETURNING id");
      assert.ok(!e.error, e.error?.message);
      const u = await q('UPDATE public.assinaturas SET escola_id = $1 WHERE id = $2', [e.rows[0].id, a.rows[0].id]);
      assert.ok(!u.error && u.rowCount === 1, u.error?.message);
    });
  });
  test('suporte e Admin de escola NÃO criam escola', async () => {
    for (const uid of [ID.operador, ID.adminA]) {
      const r = await as(uid, (q) => q("INSERT INTO public.escolas (nome, cnpj) VALUES ('X', '88.888.888/0001-88')"));
      assert.ok(r.error, String(uid));
    }
  });

  test('root grava a estrutura acadêmica de qualquer escola (turma, disciplina, professor da turma, horário)', async () => {
    await as(ROOT, async (q) => {
      const t = await q(`INSERT INTO public.turmas (escola_id, nome, ano_letivo, turno) VALUES ($1,'R1',2026,'Matutino') RETURNING id`, [ID.escolaA]);
      assert.ok(!t.error, t.error?.message);
      const d = await q(`INSERT INTO public.disciplinas (escola_id, nome) VALUES ($1,'Disc Root') RETURNING id`, [ID.escolaA]);
      assert.ok(!d.error, d.error?.message);
      const tp = await q(`INSERT INTO public.turma_professores (escola_id, turma_id, professor_id, disciplina_id) VALUES ($1,$2,$3,$4)`, [ID.escolaA, t.rows[0].id, ID.profA, d.rows[0].id]);
      assert.ok(!tp.error, tp.error?.message);
      const h = await q(`INSERT INTO public.horarios_aula (escola_id, turma_id, professor_id, disciplina_id, dia_semana, hora_inicio, hora_fim) VALUES ($1,$2,$3,$4,2,'07:00','07:50')`, [ID.escolaA, t.rows[0].id, ID.profA, d.rows[0].id]);
      assert.ok(!h.error, h.error?.message);
      const u = await q(`UPDATE public.turmas SET nome = 'R1b' WHERE id = $1`, [t.rows[0].id]);
      assert.equal(u.rowCount, 1);
      const x = await q(`DELETE FROM public.turmas WHERE id = $1`, [t.rows[0].id]);
      assert.equal(x.rowCount, 1);
    });
  });
  test('suporte (não-root) continua sem gravar estrutura', async () => {
    const r = await as(ID.operador, (q) => q(`INSERT INTO public.turmas (escola_id, nome, ano_letivo, turno) VALUES ($1,'X',2026,'Manhã')`, [ID.escolaA]));
    assert.ok(r.error);
  });
});
