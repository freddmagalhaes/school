// Níveis de suporte (N1/N2/N3/dono), motivo obrigatório, auditoria e ausência de acesso direto às tabelas das escolas.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, as, admin, ID } from './helpers.mjs';

const U = (n) => `10000000-0000-0000-0000-0000000000d${n}`;
const OP = { n1: U(1), n2: U(2), n3: U(3), dono: U(4), superAdm: U(5), fin: U(6), semNivel: U(7) };
const MOTIVO = 'Chamado 1234: dúvida sobre notas';

before(async () => {
  await setup();
  const ops = [
    [OP.n1, 'n1', 'suporte', false, 1], [OP.n2, 'n2', 'suporte', false, 2], [OP.n3, 'n3', 'suporte', false, 3],
    [OP.dono, 'dono', 'root', true, null], [OP.superAdm, 'sup', 'super_admin', false, null],
    [OP.fin, 'fin', 'financeiro', false, null], [OP.semNivel, 'semnivel', 'suporte', false, null],
  ];
  for (const [id, nome, role, isRoot, nivel] of ops) {
    await admin(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [id, `${nome}@suporte.teste`]);
    await admin(`INSERT INTO public.root_admins (id, nome, email, role, is_root, is_active, nivel_suporte) VALUES ($1,$2,$3,$4,$5,true,$6)`,
      [id, nome, `${nome}@suporte.teste`, role, isRoot, nivel]);
  }
});
after(async () => { await teardown(); });

const chama = (uid, sql, params = []) => as(uid, (q) => q(sql, params));
const negado = (r) => r.error?.code === '42501';
const logs = async (acao) => (await admin(`SELECT * FROM public.audit_logs WHERE acao = $1 ORDER BY created_at`, [acao])).rows;

describe('Nível de cada operador', () => {
  test('níveis calculados', async () => {
    const nivel = async (u) => (await chama(u, 'SELECT public.suporte_nivel() AS n')).rows[0].n;
    assert.equal(await nivel(OP.n1), 1);
    assert.equal(await nivel(OP.n2), 2);
    assert.equal(await nivel(OP.n3), 3);
    assert.equal(await nivel(OP.semNivel), 1);     // suporte sem nível definido = N1 (o mais restrito)
    assert.equal(await nivel(OP.superAdm), 3);
    assert.equal(await nivel(OP.dono), 4);
    assert.equal(await nivel(OP.fin), 0);
    assert.equal(await nivel(ID.adminA), 0);       // Admin de escola não é operador
  });
  test('operador desativado volta a nível 0', async () => {
    await admin(`UPDATE public.root_admins SET is_active = false WHERE id = $1`, [OP.n3]);
    assert.equal((await chama(OP.n3, 'SELECT public.suporte_nivel() AS n')).rows[0].n, 0);
    await admin(`UPDATE public.root_admins SET is_active = true WHERE id = $1`, [OP.n3]);
  });
});

describe('N1: escolas, resumo e usuários (sem CPF, e-mail mascarado)', () => {
  test('lista as escolas', async () => {
    const r = await chama(OP.n1, 'SELECT * FROM public.suporte_escolas()');
    assert.deepEqual(r.rows.map((x) => x.id).sort(), [ID.escolaA, ID.escolaB].sort());
  });
  test('resumo da escola A, sem motivo', async () => {
    const r = await chama(OP.n1, 'SELECT public.suporte_escola_resumo($1) AS j', [ID.escolaA]);
    assert.ok(!r.error, r.error?.message);
    assert.equal(r.rows[0].j.escola.nome, 'Escola A');
    assert.equal(r.rows[0].j.turmas, 2);
  });
  test('usuários: sem CPF e com e-mail mascarado', async () => {
    const r = await chama(OP.n1, 'SELECT public.suporte_usuarios($1) AS j', [ID.escolaA]);
    assert.ok(!r.error, r.error?.message);
    const txt = JSON.stringify(r.rows[0].j);
    assert.ok(r.rows[0].j.length >= 5);
    assert.doesNotMatch(txt, /111\.111\.111/);              // nenhum CPF
    assert.doesNotMatch(txt, /prof\.a@teste/);              // e-mail completo não aparece
    assert.match(txt, /p\*\*\*@teste/);                     // mascarado
  });
  test('N1 NÃO vê estrutura nem aluno', async () => {
    assert.ok(negado(await chama(OP.n1, 'SELECT public.suporte_estrutura($1, $2)', [ID.escolaA, MOTIVO])));
    assert.ok(negado(await chama(OP.n1, 'SELECT public.suporte_aluno($1, $2, $3)', [ID.escolaA, ID.aluno1A, MOTIVO])));
  });
});

describe('N2: estrutura e e-mail completo, com motivo', () => {
  test('estrutura exige motivo', async () => {
    const r = await chama(OP.n2, 'SELECT public.suporte_estrutura($1, $2)', [ID.escolaA, 'curto']);
    assert.equal(r.error?.code, '22023');
    const ok = await chama(OP.n2, 'SELECT public.suporte_estrutura($1, $2) AS j', [ID.escolaA, MOTIVO]);
    assert.ok(!ok.error, ok.error?.message);
    assert.equal(ok.rows[0].j.turmas.length, 2);
    assert.ok(ok.rows[0].j.disciplinas.includes('Matemática'));
  });
  test('e-mail completo só com motivo', async () => {
    const sem = await chama(OP.n2, 'SELECT public.suporte_usuarios($1) AS j', [ID.escolaA]);
    assert.doesNotMatch(JSON.stringify(sem.rows[0].j), /prof\.a@teste/);
    const com = await chama(OP.n2, 'SELECT public.suporte_usuarios($1, $2) AS j', [ID.escolaA, MOTIVO]);
    assert.match(JSON.stringify(com.rows[0].j), /prof\.a@teste/);
    assert.doesNotMatch(JSON.stringify(com.rows[0].j), /111\.111\.111/);   // CPF nunca
  });
  test('N1 com motivo continua com e-mail mascarado', async () => {
    const r = await chama(OP.n1, 'SELECT public.suporte_usuarios($1, $2) AS j', [ID.escolaA, MOTIVO]);
    assert.doesNotMatch(JSON.stringify(r.rows[0].j), /prof\.a@teste/);
  });
  test('N2 NÃO vê aluno', async () => {
    assert.ok(negado(await chama(OP.n2, 'SELECT public.suporte_aluno($1, $2, $3)', [ID.escolaA, ID.aluno1A, MOTIVO])));
  });
});

describe('N3 e dono: notas, frequência e faturas do aluno', () => {
  for (const [nome, op] of [['N3', OP.n3], ['super_admin', OP.superAdm], ['dono', OP.dono]]) {
    test(`${nome} vê o aluno, com motivo, sem CPF`, async () => {
      const r = await chama(op, 'SELECT public.suporte_aluno($1, $2, $3) AS j', [ID.escolaA, ID.aluno1A, MOTIVO]);
      assert.ok(!r.error, r.error?.message);
      const j = r.rows[0].j;
      assert.equal(j.nome, 'Aluno 1 A');
      assert.equal(j.notas.length, 1);
      assert.equal(Number(j.notas[0].valor), 8);
      assert.equal(j.frequencia.presencas, 1);
      assert.equal(j.faturas.length, 1);
      assert.doesNotMatch(JSON.stringify(j), /111\.111\.111/);
    });
  }
  test('aluno de OUTRA escola não é encontrado', async () => {
    const r = await chama(OP.n3, 'SELECT public.suporte_aluno($1, $2, $3)', [ID.escolaA, ID.aluno1B, MOTIVO]);
    assert.equal(r.error?.code, 'P0002');
  });
  test('motivo curto é recusado', async () => {
    assert.equal((await chama(OP.n3, 'SELECT public.suporte_aluno($1, $2, $3)', [ID.escolaA, ID.aluno1A, 'abc'])).error?.code, '22023');
  });
});

describe('Quem não é suporte não entra', () => {
  test('financeiro, Admin de escola e professor são negados em tudo', async () => {
    for (const u of [OP.fin, ID.adminA, ID.profA, ID.aluno1A]) {
      assert.ok(negado(await chama(u, 'SELECT * FROM public.suporte_escolas()')), String(u));
      assert.ok(negado(await chama(u, 'SELECT public.suporte_escola_resumo($1)', [ID.escolaA])), String(u));
      assert.ok(negado(await chama(u, 'SELECT public.suporte_usuarios($1)', [ID.escolaA])), String(u));
    }
  });
  test('visitante (anon) não executa as funções', async () => {
    assert.ok((await chama(null, 'SELECT public.suporte_escola_resumo($1)', [ID.escolaA])).error);
  });
  test('ninguém, nem logado, grava registro falso de acesso chamando suporte_exige', async () => {
    const r = await chama(OP.n3, `SELECT public.suporte_exige(1::smallint, $1, 'FALSO', 'x')`, [ID.escolaA]);
    assert.ok(r.error);
  });
});

describe('Sem leitura direta das tabelas das escolas', () => {
  test('N1, N2 e N3 não leem notas, faturas, perfis nem membros por SELECT', async () => {
    for (const u of [OP.n1, OP.n2, OP.n3]) {
      for (const t of ['notas', 'faturas', 'perfis', 'membros_escola', 'frequencia', 'turmas', 'escolas']) {
        const r = await chama(u, `SELECT 1 FROM public.${t}`);
        assert.equal(r.rowCount, 0, `${u} leu ${t}`);
      }
    }
  });
});

describe('Auditoria', () => {
  // as() desfaz a transação no fim: o registro e a leitura dele precisam acontecer juntos
  const noMesmoAcesso = (uid, fn) => as(uid, async (q) => { await fn(q); return (await q(`SELECT * FROM public.audit_logs WHERE acao LIKE 'SUPORTE_%' ORDER BY created_at`)).rows; });

  test('cada consulta gera um registro com operador, escola, nível e motivo', async () => {
    const r = await noMesmoAcesso(OP.dono, (q) => q('SELECT public.suporte_aluno($1, $2, $3)', [ID.escolaA, ID.aluno1A, MOTIVO]));
    assert.equal(r.length, 1);
    assert.equal(r[0].acao, 'SUPORTE_VER_ALUNO');
    assert.equal(r[0].user_id, OP.dono);
    assert.equal(r[0].escola_id, ID.escolaA);
    assert.equal(r[0].detalhes.nivel, 4);
    assert.equal(r[0].detalhes.motivo, MOTIVO);
    assert.equal(r[0].detalhes.aluno_id, ID.aluno1A);
    assert.ok(r[0].created_at);
  });
  test('consulta recusada (nível ou motivo) não deixa registro de acesso', async () => {
    const r = await noMesmoAcesso(OP.dono, async (q) => {
      // o dono faz uma consulta que falha por motivo curto: nada deve ser gravado
      await q('SELECT public.suporte_estrutura($1, $2)', [ID.escolaA, 'x']);
    });
    assert.equal(r.length, 0);
  });
  test('registro de usuários indica se o e-mail foi completo', async () => {
    const r = await noMesmoAcesso(OP.dono, async (q) => {
      await q('SELECT public.suporte_usuarios($1)', [ID.escolaA]);
      await q('SELECT public.suporte_usuarios($1, $2)', [ID.escolaA, MOTIVO]);
    });
    assert.equal(r.length, 2);
    assert.deepEqual(r.map((x) => x.detalhes.email_completo), [false, true]);
  });
  test('o dono lê todos os registros; suporte não lê', async () => {
    await admin(`INSERT INTO public.audit_logs (user_id, escola_id, acao, detalhes) VALUES ($1, $2, 'SUPORTE_VER_RESUMO', '{}')`, [OP.n1, ID.escolaA]);
    assert.ok((await chama(OP.dono, `SELECT 1 FROM public.audit_logs WHERE acao LIKE 'SUPORTE_%'`)).rowCount > 0);
    assert.equal((await chama(OP.n3, `SELECT 1 FROM public.audit_logs`)).rowCount, 0);
  });
  test('o Admin da escola vê os acessos à própria escola, e a outra escola não vê', async () => {
    await admin(`INSERT INTO public.audit_logs (user_id, escola_id, acao, detalhes) VALUES ($1, $2, 'SUPORTE_VER_ALUNO', '{}')`, [OP.n3, ID.escolaA]);
    const adm = await chama(ID.adminA, `SELECT escola_id FROM public.audit_logs WHERE acao LIKE 'SUPORTE_%'`);
    assert.ok(adm.rowCount > 0 && adm.rows.every((x) => x.escola_id === ID.escolaA));
    const admB = await chama(ID.adminB, `SELECT 1 FROM public.audit_logs WHERE acao LIKE 'SUPORTE_%' AND escola_id = $1`, [ID.escolaA]);
    assert.equal(admB.rowCount, 0);
  });
  test('ninguém altera nem apaga registros pelo app, nem o dono', async () => {
    for (const u of [OP.dono, OP.n3, ID.adminA]) {
      assert.ok((await chama(u, `DELETE FROM public.audit_logs`)).error, 'delete ' + u);
      assert.ok((await chama(u, `UPDATE public.audit_logs SET acao = 'x'`)).error, 'update ' + u);
    }
  });
});
