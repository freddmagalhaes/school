// Canal de atendimento: visibilidade, autoria definida pelo servidor, status, escalonamento e limites.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { setup, teardown, as, admin, ID } from './helpers.mjs';

const OP = { n1: '10000000-0000-0000-0000-0000000000e1', n2: '10000000-0000-0000-0000-0000000000e2', fin: '10000000-0000-0000-0000-0000000000e3', dono: '10000000-0000-0000-0000-0000000000e4' };

before(async () => {
  await setup();
  for (const [id, nome, role, isRoot, nivel] of [[OP.n1, 'Atendente N1', 'suporte', false, 1], [OP.n2, 'Analista N2', 'suporte', false, 2], [OP.fin, 'Financeiro', 'financeiro', false, null], [OP.dono, 'Dono', 'root', true, null]]) {
    await admin(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [id, `${nome.replace(/ /g, '').toLowerCase()}@chat.teste`]);
    await admin(`INSERT INTO public.root_admins (id, nome, email, role, is_root, is_active, nivel_suporte) VALUES ($1,$2,$3,$4,$5,true,$6)`,
      [id, nome, `${nome.replace(/ /g, '').toLowerCase()}@chat.teste`, role, isRoot, nivel]);
  }
});
after(async () => { await teardown(); });

// troca "quem está logado" dentro da mesma transação, para simular cliente e suporte na mesma conversa
const sou = (q, uid) => q(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
const abrir = (q, escola = ID.escolaA, assunto = 'Não consigo lançar notas') =>
  q(`INSERT INTO public.atendimentos (escola_id, aberto_por, assunto) VALUES ($1, $2, $3) RETURNING id, aberto_por, autor_nome, status, nivel_atual`, [escola, ID.profA, assunto]);
const falar = (q, id, texto = 'olá') => q(`INSERT INTO public.atendimento_mensagens (atendimento_id, autor_id, autor_tipo, texto) VALUES ($1, $2, 'cliente', $3) RETURNING autor_id, autor_tipo, autor_nome`, [id, '00000000-0000-0000-0000-000000000000', texto]);
const conv = (uid, fn) => as(uid, fn);

describe('Abrir conversa', () => {
  test('Professor, Secretaria e Admin da escola abrem; o servidor grava quem abriu e o nome', async () => {
    for (const [uid, nome] of [[ID.profA, 'Professor A'], [ID.secretariaA, 'Secretaria A'], [ID.adminA, 'Admin A']]) {
      const r = await conv(uid, (q) => q(`INSERT INTO public.atendimentos (escola_id, aberto_por, assunto) VALUES ($1, $2, 'Dúvida sobre a grade') RETURNING aberto_por, autor_nome, status, nivel_atual`, [ID.escolaA, uid]));
      assert.ok(!r.error, r.error?.message);
      assert.equal(r.rows[0].aberto_por, uid);
      assert.equal(r.rows[0].autor_nome, nome);
      assert.equal(r.rows[0].status, 'aberto');
      assert.equal(r.rows[0].nivel_atual, 1);
    }
  });
  test('não dá para abrir em nome de outra pessoa (o servidor corrige para quem está logado)', async () => {
    const r = await conv(ID.profA, (q) => q(`INSERT INTO public.atendimentos (escola_id, aberto_por, assunto) VALUES ($1, $2, 'Em nome de outro') RETURNING aberto_por`, [ID.escolaA, ID.adminA]));
    assert.equal(r.rows[0].aberto_por, ID.profA);
  });
  test('Aluno, Responsável, Admin de outra escola e visitante não abrem', async () => {
    for (const uid of [ID.aluno1A, ID.respA, ID.adminB, null]) {
      const r = await conv(uid, (q) => q(`INSERT INTO public.atendimentos (escola_id, aberto_por, assunto) VALUES ($1, $2, 'Quero ajuda')`, [ID.escolaA, uid ?? ID.profA]));
      assert.ok(r.error, String(uid));
    }
  });
  test('assunto curto demais ou longo demais é recusado', async () => {
    assert.ok((await conv(ID.profA, (q) => abrir(q, ID.escolaA, 'ab'))).error);
    assert.ok((await conv(ID.profA, (q) => abrir(q, ID.escolaA, 'x'.repeat(121)))).error);
  });
});

describe('Quem enxerga a conversa', () => {
  let id;
  before(async () => {
    id = (await admin(`INSERT INTO public.atendimentos (escola_id, aberto_por, assunto) VALUES ($1, $2, 'Conversa de teste') RETURNING id`, [ID.escolaA, ID.profA])).rows[0].id;
    await admin(`INSERT INTO public.atendimento_mensagens (atendimento_id, autor_id, texto) VALUES ($1, $2, 'primeira mensagem')`, [id, ID.profA]);
  });
  const ve = async (uid) => (await conv(uid, (q) => q(`SELECT id FROM public.atendimentos WHERE id = $1`, [id]))).rowCount;
  const vemMsg = async (uid) => (await conv(uid, (q) => q(`SELECT 1 FROM public.atendimento_mensagens WHERE atendimento_id = $1`, [id]))).rowCount;
  test('quem abriu, o Admin da escola e todo o suporte veem', async () => {
    for (const uid of [ID.profA, ID.adminA, OP.n1, OP.n2, OP.dono]) { assert.equal(await ve(uid), 1, String(uid)); assert.equal(await vemMsg(uid), 1, 'msg ' + uid); }
  });
  test('colega professor, secretaria, aluno, outra escola, financeiro e visitante NÃO veem', async () => {
    for (const uid of [ID.profOutroA, ID.secretariaA, ID.aluno1A, ID.adminB, OP.fin, null]) {
      assert.equal(await ve(uid).catch(() => 0), 0, String(uid));
      assert.equal(await vemMsg(uid).catch(() => 0), 0, 'msg ' + uid);
    }
  });
});

describe('Mensagens: autoria definida pelo servidor', () => {
  test('cliente escreve: o servidor marca "cliente" e o nome, mesmo que o navegador diga outra coisa', async () => {
    await conv(ID.profA, async (q) => {
      const a = await abrir(q);
      const m = await q(`INSERT INTO public.atendimento_mensagens (atendimento_id, autor_id, autor_tipo, autor_nome, texto) VALUES ($1, $2, 'suporte', 'Fulano do Suporte', 'oi') RETURNING autor_id, autor_tipo, autor_nome`, [a.rows[0].id, ID.adminA]);
      // autor_id diferente de quem está logado é barrado pela política; o servidor reescreve para o próprio usuário
      assert.ok(!m.error, m.error?.message);
      assert.equal(m.rows[0].autor_id, ID.profA);
      assert.equal(m.rows[0].autor_tipo, 'cliente');
      assert.equal(m.rows[0].autor_nome, 'Professor A');
    });
  });
  test('fluxo: cliente pergunta, N1 responde (assume e muda para "em atendimento"), cliente encerra, volta a escrever e reabre', async () => {
    await conv(ID.profA, async (q) => {
      const a = (await abrir(q)).rows[0];
      await falar(q, a.id, 'Preciso de ajuda');
      let s = (await q(`SELECT status, ultimo_autor, atendente_nome FROM public.atendimentos WHERE id = $1`, [a.id])).rows[0];
      assert.deepEqual([s.status, s.ultimo_autor, s.atendente_nome], ['aberto', 'cliente', null]);

      await sou(q, OP.n1);
      const r = await q(`INSERT INTO public.atendimento_mensagens (atendimento_id, autor_id, texto) VALUES ($1, $2, 'Já te ajudo') RETURNING autor_tipo, autor_nome`, [a.id, OP.n1]);
      assert.ok(!r.error, r.error?.message);
      assert.equal(r.rows[0].autor_tipo, 'suporte');
      assert.equal(r.rows[0].autor_nome, 'Atendente N1');
      s = (await q(`SELECT status, ultimo_autor, atendente_nome, atendente_id FROM public.atendimentos WHERE id = $1`, [a.id])).rows[0];
      assert.deepEqual([s.status, s.ultimo_autor, s.atendente_nome, s.atendente_id], ['em_atendimento', 'suporte', 'Atendente N1', OP.n1]);

      await sou(q, ID.profA);
      const enc = await q(`UPDATE public.atendimentos SET status = 'resolvido' WHERE id = $1`, [a.id]);
      assert.equal(enc.rowCount, 1);
      s = (await q(`SELECT status, resolvido_em FROM public.atendimentos WHERE id = $1`, [a.id])).rows[0];
      assert.equal(s.status, 'resolvido'); assert.ok(s.resolvido_em);

      await falar(q, a.id, 'Voltou o problema');
      s = (await q(`SELECT status, resolvido_em FROM public.atendimentos WHERE id = $1`, [a.id])).rows[0];
      assert.equal(s.status, 'aberto'); assert.equal(s.resolvido_em, null);
    });
  });
  test('quem não abriu a conversa não escreve nela (nem colega, nem Admin da escola, nem outra escola)', async () => {
    const id = (await admin(`INSERT INTO public.atendimentos (escola_id, aberto_por, assunto) VALUES ($1, $2, 'Só minha') RETURNING id`, [ID.escolaA, ID.profA])).rows[0].id;
    for (const uid of [ID.profOutroA, ID.adminA, ID.adminB, OP.fin, ID.aluno1A]) {
      const r = await conv(uid, (q) => q(`INSERT INTO public.atendimento_mensagens (atendimento_id, autor_id, texto) VALUES ($1, $2, 'intruso')`, [id, uid]));
      assert.ok(r.error, String(uid));
    }
  });
  test('mensagem vazia ou com mais de 2000 caracteres é recusada; 2000 passa', async () => {
    const id = (await admin(`INSERT INTO public.atendimentos (escola_id, aberto_por, assunto) VALUES ($1, $2, 'Tamanho') RETURNING id`, [ID.escolaA, ID.profA])).rows[0].id;
    const msg = (t) => conv(ID.profA, (q) => q(`INSERT INTO public.atendimento_mensagens (atendimento_id, autor_id, texto) VALUES ($1, $2, $3)`, [id, ID.profA, t]));
    assert.ok((await msg('   ')).error);
    assert.ok((await msg('x'.repeat(2001))).error);
    assert.ok(!(await msg('x'.repeat(2000))).error);
  });
  test('ninguém edita nem apaga mensagens', async () => {
    const id = (await admin(`INSERT INTO public.atendimentos (escola_id, aberto_por, assunto) VALUES ($1, $2, 'Imutável') RETURNING id`, [ID.escolaA, ID.profA])).rows[0].id;
    await admin(`INSERT INTO public.atendimento_mensagens (atendimento_id, autor_id, texto) VALUES ($1, $2, 'original')`, [id, ID.profA]);
    for (const uid of [ID.profA, OP.n1, OP.dono]) {
      assert.ok((await conv(uid, (q) => q(`UPDATE public.atendimento_mensagens SET texto = 'alterado' WHERE atendimento_id = $1`, [id]))).error, 'update ' + uid);
      assert.ok((await conv(uid, (q) => q(`DELETE FROM public.atendimento_mensagens WHERE atendimento_id = $1`, [id]))).error, 'delete ' + uid);
    }
  });
});

describe('Status, escalonamento e limites de cada lado', () => {
  let id;
  before(async () => { id = (await admin(`INSERT INTO public.atendimentos (escola_id, aberto_por, assunto) VALUES ($1, $2, 'Escalar') RETURNING id`, [ID.escolaA, ID.profA])).rows[0].id; });
  test('N1 escala para o N2 e resolve', async () => {
    await conv(OP.n1, async (q) => {
      const e = await q(`UPDATE public.atendimentos SET nivel_atual = 2 WHERE id = $1 RETURNING nivel_atual`, [id]);
      assert.equal(e.rows[0].nivel_atual, 2);
      const r = await q(`UPDATE public.atendimentos SET status = 'resolvido' WHERE id = $1 RETURNING status, resolvido_em`, [id]);
      assert.equal(r.rows[0].status, 'resolvido'); assert.ok(r.rows[0].resolvido_em);
    });
  });
  test('cliente NÃO muda nível, atendente nem reabre pelo status, e só encerra', async () => {
    await conv(ID.profA, async (q) => {
      assert.ok((await q(`UPDATE public.atendimentos SET nivel_atual = 3 WHERE id = $1`, [id])).error);
      assert.ok((await q(`UPDATE public.atendimentos SET atendente_id = $2 WHERE id = $1`, [id, ID.profA])).error);
      assert.ok((await q(`UPDATE public.atendimentos SET status = 'em_atendimento' WHERE id = $1`, [id])).error);
      assert.ok((await q(`UPDATE public.atendimentos SET assunto = 'Outro assunto' WHERE id = $1`, [id])).error);
      assert.ok((await q(`UPDATE public.atendimentos SET aberto_por = $2 WHERE id = $1`, [id, ID.adminA])).error);
    });
  });
  test('"lida" usa a hora do servidor, mesmo que o navegador mande outra', async () => {
    await conv(ID.profA, async (q) => {
      const r = await q(`UPDATE public.atendimentos SET lido_cliente_em = '2000-01-01' WHERE id = $1 RETURNING lido_cliente_em`, [id]);
      assert.ok(new Date(r.rows[0].lido_cliente_em).getFullYear() >= 2026);
    });
    await conv(OP.n1, async (q) => {
      const r = await q(`UPDATE public.atendimentos SET lido_suporte_em = '2000-01-01' WHERE id = $1 RETURNING lido_suporte_em`, [id]);
      assert.ok(new Date(r.rows[0].lido_suporte_em).getFullYear() >= 2026);
    });
  });
  test('Admin da escola, financeiro e outras escolas não alteram a conversa de outro', async () => {
    for (const uid of [ID.adminA, ID.profOutroA, ID.adminB, OP.fin]) {
      const r = await conv(uid, (q) => q(`UPDATE public.atendimentos SET status = 'resolvido' WHERE id = $1`, [id]));
      assert.ok(r.error || r.rowCount === 0, String(uid));
    }
  });
  test('ninguém apaga conversas pelo app', async () => {
    for (const uid of [ID.profA, OP.n1, OP.dono]) assert.ok((await conv(uid, (q) => q(`DELETE FROM public.atendimentos WHERE id = $1`, [id]))).error, String(uid));
  });
  test('visitante não acessa nada', async () => {
    assert.ok((await conv(null, (q) => q(`SELECT 1 FROM public.atendimentos`))).error);
    assert.ok((await conv(null, (q) => q(`SELECT 1 FROM public.atendimento_mensagens`))).error);
  });
});
