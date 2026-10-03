#!/usr/bin/env node
/**
 * migrar-supabase.mjs — T2 Migración Kinder Finance Supabase→Postgres selfhosted.
 *
 * Carga los datos reales desde Supabase REST al PostgreSQL selfhosted
 * (DB kinder, schema kinder), preservando id/created_at/updated_at tal cual
 * y los vínculos entre tablas (cxc.alumno_id, maestros_salones.*).
 *
 * Re-ejecutable: INSERT con columnas explícitas + `ON CONFLICT (id) DO UPDATE`.
 * Durante la carga real se deshabilitan temporalmente los 6 triggers
 * `update_*_updated_at` (se re-habilitan al final en `finally`) para que el
 * upsert NO pise `updated_at` con now() en filas ya existentes.
 *
 * Credenciales SOLO por variables de entorno (nunca hardcodear):
 *   SUPABASE_URL              (default: https://pmitwzppmabuotzpuhro.supabase.co/rest/v1)
 *   SUPABASE_SERVICE_ROLE_KEY (sin default — requerida)
 *   PGHOST     (default: 192.168.1.68)
 *   PGPORT     (default: 5432)
 *   PGDATABASE (default: kinder)
 *   PGUSER     (default: kinder_owner)
 *   PGPASSWORD (sin default — requerida salvo .pgpass)
 *
 * Uso:
 *   node scripts/migrar-supabase.mjs --dry-run   # solo cuenta e imprime, no escribe
 *   node scripts/migrar-supabase.mjs             # carga real + verificación
 *   node scripts/migrar-supabase.mjs --truncate  # TRUNCATE ... CASCADE de las 7 (peligroso)
 */

import pg from 'pg';

const { Client } = pg;

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://pmitwzppmabuotzpuhro.supabase.co/rest/v1';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const DO_TRUNCATE = process.argv.includes('--truncate');

const pgConfig = {
  host: process.env.PGHOST ?? '192.168.1.68',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'kinder',
  user: process.env.PGUSER ?? 'kinder_owner',
  password: process.env.PGPASSWORD,
};

// Columnas explícitas por tabla (deben coincidir con db/schema.sql).
const TABLES = [
  { name: 'alumnos', columns: ['id', 'nombre', 'grado', 'tutor', 'telefono', 'email', 'estado', 'fecha_inscripcion', 'eliminado', 'created_at', 'updated_at', 'tutor_id', 'salon_id', 'monto_colegiatura'] },
  { name: 'tutores', columns: ['id', 'nombre_completo', 'email', 'telefono', 'telefono_secundario', 'direccion', 'colonia', 'ciudad', 'estado_fiscal', 'codigo_postal', 'rfc', 'curp', 'datos_facturacion', 'eliminado', 'created_at', 'updated_at'] },
  { name: 'maestros', columns: ['id', 'nombre_completo', 'email', 'telefono', 'telefono_emergencia', 'direccion', 'rfc', 'curp', 'especialidad', 'fecha_contratacion', 'activo', 'eliminado', 'created_at', 'updated_at'] },
  { name: 'salones', columns: ['id', 'nombre', 'descripcion', 'capacidad_maxima', 'horario', 'eliminado', 'created_at', 'updated_at'] },
  { name: 'cxc', columns: ['id', 'alumno_id', 'alumno_nombre', 'concepto', 'monto', 'monto_pagado', 'fecha_emision', 'fecha_vencimiento', 'estado', 'eliminado', 'created_at', 'updated_at'] },
  { name: 'finanzas', columns: ['id', 'tipo', 'categoria', 'monto', 'descripcion', 'fecha', 'metodo_pago', 'estado', 'eliminado', 'created_at', 'updated_at'] },
  { name: 'maestros_salones', columns: ['id', 'maestro_id', 'salon_id', 'rol', 'eliminado', 'created_at'] },
];

// Triggers BEFORE UPDATE que pisan updated_at (los 6 de schema.sql).
const UPDATED_AT_TRIGGERS = [
  ['alumnos', 'update_alumnos_updated_at'],
  ['cxc', 'update_cxc_updated_at'],
  ['finanzas', 'update_finanzas_updated_at'],
  ['tutores', 'update_tutores_updated_at'],
  ['maestros', 'update_maestros_updated_at'],
  ['salones', 'update_salones_updated_at'],
];

const PAGE_SIZE = 1000;
const BATCH_SIZE = 200;

function fail(msg) {
  console.error(`[migrar-supabase] ERROR: ${msg}`);
  process.exit(1);
}

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Accept-Profile': 'public',
    ...extra,
  };
}

// Conteo exacto en origen vía PostgREST (Prefer: count=exact + Content-Range).
async function fetchOriginCount(table) {
  const res = await fetch(
    `${SUPABASE_URL}/${table}?select=id&order=id&limit=1`,
    { headers: sbHeaders({ Prefer: 'count=exact' }) },
  );
  if (!res.ok) fail(`origen ${table}: HTTP ${res.status} ${await res.text()}`);
  const cr = res.headers.get('content-range') ?? '';
  const m = cr.match(/\/(\d+)$/);
  if (!m) fail(`origen ${table}: sin Content-Range (${cr})`);
  return Number(m[1]);
}

// Página de filas del origen (select=* para traer columnas tal cual).
async function fetchOriginPage(table, offset) {
  const res = await fetch(
    `${SUPABASE_URL}/${table}?select=*&order=id&limit=${PAGE_SIZE}&offset=${offset}`,
    { headers: sbHeaders() },
  );
  if (!res.ok) fail(`origen ${table} offset=${offset}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchAllOrigin(table) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await fetchOriginPage(table, offset);
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
const sumCol = (rows, col) => rows.reduce((a, r) => a + num(r[col]), 0);

// Normaliza para comparar origen (REST/JSON) vs destino (pg):
// pg devuelve numeric como string ("1500.00"), date/timestamptz como Date,
// y jsonb como objeto — hay que comparar por valor semántico, no por string.
function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
}

function norm(v) {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) return `T:${Number.isNaN(v.getTime()) ? 'Invalid' : v.toISOString()}`;
  if (typeof v === 'object') return `J:${stableStringify(v)}`;
  if (typeof v === 'number') return `N:${String(v)}`;
  if (typeof v === 'boolean') return `B:${v}`;
  if (typeof v === 'string') {
    const s = v.trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) return `N:${String(Number(s))}`; // numeric pg "1500.00"
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return `T:${d.toISOString()}`; // date / timestamptz
    }
    return `S:${v}`;
  }
  return `S:${String(v)}`;
}

if (!SUPABASE_KEY) fail('falta SUPABASE_SERVICE_ROLE_KEY en el entorno.');

const client = new Client(pgConfig);
try {
  await client.connect();
} catch (err) {
  fail(`sin conexión a ${pgConfig.user}@${pgConfig.host}:${pgConfig.port}/${pgConfig.database}: ${err.message}`);
}

const ident = (s) => `"${s.replace(/"/g, '""')}"`;

try {
  if (DO_TRUNCATE) {
    const list = TABLES.map((t) => `kinder.${t.name}`).join(', ');
    console.log(`[migrar-supabase] --truncate: TRUNCATE ${list} CASCADE`);
    await client.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
    console.log('[migrar-supabase] DONE truncate.');
    process.exit(0);
  }

  // 1. Origen: conteos + datos (en memoria; ~600 filas en total).
  const origin = {};
  for (const t of TABLES) {
    const count = await fetchOriginCount(t.name);
    const rows = await fetchAllOrigin(t.name);
    if (rows.length !== count) {
      console.log(`[migrar-supabase] AVISO ${t.name}: count=exact=${count} pero páginas trajeron ${rows.length}`);
    }
    origin[t.name] = rows;
  }

  // 2. Destino: conteos previos (detectar filas ajenas sin borrarlas).
  const prevCounts = {};
  for (const t of TABLES) {
    const r = await client.query(`SELECT count(*)::int AS n FROM kinder.${t.name}`);
    prevCounts[t.name] = r.rows[0].n;
  }

  console.log('--- dry-run / previo ---');
  for (const t of TABLES) {
    console.log(`${t.name}: origen=${origin[t.name].length} destino_previo=${prevCounts[t.name]}`);
  }

  if (DRY_RUN) {
    console.log('[migrar-supabase] --dry-run: nada escrito.');
    process.exit(0);
  }

  // 3. Carga real en orden de dependencias (padres antes que hijas por FK).
  // Deshabilita triggers updated_at para preservar updated_at en re-ejecuciones.
  for (const [tbl, trg] of UPDATED_AT_TRIGGERS) {
    await client.query(`ALTER TABLE kinder.${tbl} DISABLE TRIGGER ${trg}`);
  }
  console.log('[migrar-supabase] triggers updated_at deshabilitados (temporal).');

  try {
    await client.query('BEGIN');
    for (const t of TABLES) {
      const rows = origin[t.name];
      const cols = t.columns;
      const setClause = cols.filter((c) => c !== 'id').map((c) => `${ident(c)}=EXCLUDED.${ident(c)}`).join(', ');
      let inserted = 0;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const values = [];
        const placeholders = batch.map((row, bi) => {
          const ph = cols.map((c, ci) => {
            let v = row[c] ?? null;
            if (v !== null && typeof v === 'object') v = JSON.stringify(v); // jsonb
            values.push(v);
            return `$${bi * cols.length + ci + 1}`;
          });
          return `(${ph.join(', ')})`;
        });
        const sql = `INSERT INTO kinder.${t.name} (${cols.map(ident).join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT (id) DO UPDATE SET ${setClause}`;
        await client.query(sql, values);
        inserted += batch.length;
      }
      console.log(`[migrar-supabase] ${t.name}: upsert ${inserted}/${rows.length}`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    for (const [tbl, trg] of UPDATED_AT_TRIGGERS) {
      await client.query(`ALTER TABLE kinder.${tbl} ENABLE TRIGGER ${trg}`);
    }
    console.log('[migrar-supabase] triggers updated_at re-habilitados.');
  }

  // 4. Verificación: conteos, huérfanos, sumas, diff de 2 filas de muestra.
  console.log('--- verificación ---');
  let allOk = true;
  for (const t of TABLES) {
    const r = await client.query(`SELECT count(*)::int AS n FROM kinder.${t.name}`);
    const n = r.rows[0].n;
    const ok = n === origin[t.name].length;
    if (!ok) allOk = false;
    console.log(`${t.name}: origen=${origin[t.name].length} destino=${n} ${ok ? 'OK' : 'DIFEREN!'}`);
  }

  const orph = await client.query(
    'SELECT count(*)::int AS n FROM kinder.cxc c LEFT JOIN kinder.alumnos a ON a.id = c.alumno_id WHERE c.alumno_id IS NOT NULL AND a.id IS NULL',
  );
  console.log(`huérfanos cxc.alumno_id: ${orph.rows[0].n} ${orph.rows[0].n === 0 ? 'OK' : 'DIFEREN!'}`);
  if (orph.rows[0].n !== 0) allOk = false;

  for (const [tbl, col] of [['cxc', 'monto'], ['cxc', 'monto_pagado'], ['finanzas', 'monto']]) {
    const r = await client.query(`SELECT coalesce(sum(${col}),0)::float8 AS s FROM kinder.${tbl}`);
    const dst = r.rows[0].s;
    const src = sumCol(origin[tbl], col);
    const ok = Math.abs(dst - src) < 0.005;
    if (!ok) allOk = false;
    console.log(`suma ${tbl}.${col}: origen=${src} destino=${dst} ${ok ? 'OK' : 'DIFEREN!'}`);
  }

  for (const t of TABLES.filter((x) => x.name !== 'maestros_salones')) {
    const samples = origin[t.name].slice(0, 2);
    for (const s of samples) {
      const r = await client.query('SELECT * FROM kinder.' + t.name + ' WHERE id = $1', [s.id]);
      const d = r.rows[0];
      if (!d) {
        allOk = false;
        console.log(`diff ${t.name} ${s.id}: FALTA en destino DIFEREN!`);
        continue;
      }
      const diffs = t.columns.filter((c) => String(norm(d[c])) !== String(norm(s[c])));
      if (diffs.length > 0) {
        allOk = false;
        console.log(`diff ${t.name} ${s.id}: columnas distintas: ${diffs.join(', ')} DIFEREN!`);
      } else {
        console.log(`diff ${t.name} ${s.id}: idéntica OK`);
      }
    }
  }

  console.log(allOk ? '[migrar-supabase] DONE: todo verificado.' : '[migrar-supabase] DONE con DIFERENCIAS (ver arriba).');
  process.exit(allOk ? 0 : 1);
} finally {
  await client.end();
}
