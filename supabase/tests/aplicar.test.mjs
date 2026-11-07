// Garante que os arquivos "prontos para colar" (supabase/aplicar) são cópias exatas das migrations testadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pares = [
  ['01_perfis_metadata.sql', '20261106000050_perfis_metadata.sql'],
  ['02_politicas_por_papel.sql', '20261106000100_rls_por_papel.sql'],
  ['03_papel_responsavel.sql', '20261106000200_responsavel_papel.sql'],
  ['04_vinculos_responsavel.sql', '20261106000300_responsavel_vinculos.sql'],
  ['05_indices.sql', '20261106000400_indices.sql'],
  ['06_privilegios.sql', '20261106000500_privilegios.sql'],
  ['07_root_le_escolas.sql', '20261106000600_root_le_escolas.sql'],
  ['08_root_cria_escola.sql', '20261106000700_root_cria_escola.sql'],
  ['09_horarios_e_carga.sql', '20261106000800_horarios_e_carga.sql'],
  ['10_root_gerencia_estrutura.sql', '20261106000900_root_gerencia_estrutura.sql'],
];
for (const [aplicar, migration] of pares) {
  test(`aplicar/${aplicar} é cópia de migrations/${migration}`, () => {
    const a = fs.readFileSync(path.join(raiz, 'aplicar', aplicar), 'utf8');
    const m = fs.readFileSync(path.join(raiz, 'migrations', migration), 'utf8');
    assert.equal(a, m);
  });
}
