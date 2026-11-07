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
});
