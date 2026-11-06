// Infraestrutura dos testes de RLS: Postgres comum + stub do Supabase (00_supabase_stub.sql).
// Variável: RLS_DB_URL (padrão: Postgres local do Docker na porta 5433).
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const ADMIN_URL = process.env.RLS_DB_URL || 'postgres://postgres:teste-local-123@127.0.0.1:5433/postgres';
const DB_NAME = process.env.RLS_TEST_DB || 'edugestao_rls';

// Ordem em que os SQL do repositório são aplicados (os mesmos passos do deploy).
const FILES = [
  'tests/00_supabase_stub.sql',
  'schema.sql',
  'fase1_academico.sql',
  'fase1_diario.sql',
  'fase2_financeiro.sql',
  'lgpd_setup.sql',
  'production_setup.sql',
];

const withDb = (name) => {
  const u = new URL(ADMIN_URL);
  u.pathname = `/${name}`;
  return u.toString();
};

/** Ids fixos para o cenário de teste. */
export const ID = {
  escolaA: '00000000-0000-0000-0000-0000000000a1',
  escolaB: '00000000-0000-0000-0000-0000000000b1',
  adminA: '10000000-0000-0000-0000-0000000000a1',
  diretorA: '10000000-0000-0000-0000-0000000000a2',
  secretariaA: '10000000-0000-0000-0000-0000000000a3',
  profA: '10000000-0000-0000-0000-0000000000a4',
  profOutroA: '10000000-0000-0000-0000-0000000000a5',
  aluno1A: '10000000-0000-0000-0000-0000000000a6',
  aluno2A: '10000000-0000-0000-0000-0000000000a7',
  adminB: '10000000-0000-0000-0000-0000000000b1',
  aluno1B: '10000000-0000-0000-0000-0000000000b2',
  operador: '10000000-0000-0000-0000-0000000000f1',
  respA: '10000000-0000-0000-0000-0000000000a8',
  respB: '10000000-0000-0000-0000-0000000000b3',
  turmaA: '20000000-0000-0000-0000-0000000000a1',
  turmaA2: '20000000-0000-0000-0000-0000000000a2',
  turmaB: '20000000-0000-0000-0000-0000000000b1',
  discMat: '30000000-0000-0000-0000-0000000000a1',
  discPor: '30000000-0000-0000-0000-0000000000a2',
  discB: '30000000-0000-0000-0000-0000000000b1',
  matr1A: '40000000-0000-0000-0000-0000000000a1',
  matr2A: '40000000-0000-0000-0000-0000000000a2',
  matr1B: '40000000-0000-0000-0000-0000000000b1',
  notaA1: '50000000-0000-0000-0000-0000000000a1',
  notaA2: '50000000-0000-0000-0000-0000000000a2',
  notaB1: '50000000-0000-0000-0000-0000000000b1',
  freqA1: '60000000-0000-0000-0000-0000000000a1',
  freqA2: '60000000-0000-0000-0000-0000000000a2',
  freqB1: '60000000-0000-0000-0000-0000000000b1',
  finA: '70000000-0000-0000-0000-0000000000a1',
  finB: '70000000-0000-0000-0000-0000000000b1',
  fatA1: '80000000-0000-0000-0000-0000000000a1',
  fatA2: '80000000-0000-0000-0000-0000000000a2',
  fatB1: '80000000-0000-0000-0000-0000000000b1',
};

export const MEMBRO = {
  adminA: '90000000-0000-0000-0000-0000000000a1',
  aluno1A: '90000000-0000-0000-0000-0000000000a6',
  aluno2A: '90000000-0000-0000-0000-0000000000a7',
  aluno1B: '90000000-0000-0000-0000-0000000000b2',
};

let pool;

/** Recria o banco de testes, aplica os SQL e cria o cenário. */
export async function setup() {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${DB_NAME}`);
  await admin.end();

  pool = new pg.Pool({ connectionString: withDb(DB_NAME), max: 4 });
  const files = [...FILES];
  const migDir = path.join(root, 'migrations');
  if (fs.existsSync(migDir)) {
    for (const f of fs.readdirSync(migDir).filter((n) => n.endsWith('.sql')).sort()) files.push(`migrations/${f}`);
  }
  for (const f of files) await pool.query(fs.readFileSync(path.join(root, f), 'utf8'));
  await pool.query(fs.readFileSync(path.join(here, 'fixtures.sql'), 'utf8'));
  return pool;
}

export async function teardown() {
  await pool?.end();
}

/**
 * Executa `fn(q)` como um usuário autenticado (ou anônimo, se uid for null), sob RLS.
 * Tudo é desfeito no final (ROLLBACK): os testes não interferem uns nos outros.
 * `q(sql, params)` devolve { rows, rowCount } ou { error } (nunca lança por erro de SQL).
 */
export async function as(uid, fn) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(`SET LOCAL ROLE ${uid ? 'authenticated' : 'anon'}`);
    if (uid) await c.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [uid]);
    const q = async (sql, params) => {
      await c.query('SAVEPOINT s');
      try {
        const r = await c.query(sql, params);
        await c.query('RELEASE SAVEPOINT s');
        return { rows: r.rows, rowCount: r.rowCount };
      } catch (error) {
        await c.query('ROLLBACK TO SAVEPOINT s');
        return { error, rows: [], rowCount: 0 };
      }
    };
    return await fn(q);
  } finally {
    await c.query('ROLLBACK').catch(() => {});
    c.release();
  }
}

/** Como o superusuário (ignora RLS): para conferir o estado real do banco. */
export const admin = (sql, params) => pool.query(sql, params);
