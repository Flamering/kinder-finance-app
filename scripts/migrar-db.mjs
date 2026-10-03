#!/usr/bin/env node
/**
 * migrar-db.mjs — Runner idempotente de migraciones SQL.
 *
 * Aplica en orden alfabético todos los archivos `.sql` de `db/`
 * contra el PostgreSQL central del homelab usando la CLI `psql`.
 * Re-ejecutable con seguridad: cada .sql debe ser idempotente
 * (IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
 *
 * Configuración por variables de entorno (nunca hardcodear passwords):
 *   PGHOST     (default: 192.168.1.68)
 *   PGPORT     (default: 5432)
 *   PGDATABASE (default: kinder)
 *   PGUSER     (default: admin para migrar; el DDL hace OWNER TO kinder_owner)
 *   PGPASSWORD (sin default — psql la pide o falla si no hay .pgpass)
 *   DB_DIR     (default: <repo>/db)
 *
 * Uso:
 *   PGPASSWORD='...' node scripts/migrar-db.mjs
 *   PGPASSWORD='...' PGDATABASE=kinder node scripts/migrar-db.mjs --dry-run
 */

import { readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DB_DIR = process.env.DB_DIR ?? join(ROOT, 'db');
const DRY_RUN = process.argv.includes('--dry-run');

const env = {
  PGHOST: process.env.PGHOST ?? '192.168.1.68',
  PGPORT: process.env.PGPORT ?? '5432',
  PGDATABASE: process.env.PGDATABASE ?? 'kinder',
  PGUSER: process.env.PGUSER ?? 'admin',
};

function fail(msg) {
  console.error(`[migrar-db] ERROR: ${msg}`);
  process.exit(1);
}

if (!existsSync(DB_DIR)) fail(`directorio no existe: ${DB_DIR}`);

const files = readdirSync(DB_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) fail(`sin archivos .sql en ${DB_DIR}`);

console.log(`[migrar-db] target=${env.PGUSER}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE} dir=${DB_DIR}`);
console.log(`[migrar-db] archivos (${files.length}): ${files.join(', ')}`);
if (DRY_RUN) {
  console.log('[migrar-db] --dry-run: no se aplica nada.');
  process.exit(0);
}

try {
  execFileSync('psql', ['-c', 'SELECT 1', '-tA'], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch {
  fail(`no hay conexión psql a ${env.PGHOST} como ${env.PGUSER}. Revisa PGHOST/PGUSER/PGPASSWORD.`);
}

let ok = 0;
for (const f of files) {
  const full = join(DB_DIR, f);
  console.log(`[migrar-db] aplicando ${f} ...`);
  try {
    execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-f', full], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    console.log(`[migrar-db] OK ${f}`);
    ok++;
  } catch (err) {
    const stderr = err?.stderr?.toString().slice(-2000) ?? String(err);
    fail(`falló ${f}:\n${stderr}`);
  }
}

console.log(`[migrar-db] DONE: ${ok}/${files.length} archivos aplicados.`);
