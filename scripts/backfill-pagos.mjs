#!/usr/bin/env node
/**
 * backfill-pagos.mjs — Reconstruye kinder.pagos desde cxc + finanzas.
 *
 * Propósito: las filas de finanzas con descripcion 'Pago CxC - <concepto> -
 * <alumno_nombre>' son pagos históricos sin comprobante. Este script crea
 * una fila en kinder.pagos por cada una (origen='legacy', vinculada a su
 * finanza) y una fila sintética por cada saldo no reconciliado.
 *
 * Idempotencia: por cada cxc verifica `SELECT count(*) FROM kinder.pagos
 * WHERE cxc_id = $1`; si ya tiene pagos, la cuenta se omite por completo
 * (skipped). Re-ejecutable con seguridad.
 *
 * Uso:
 *   node scripts/backfill-pagos.mjs --dry-run   # calcula e imprime, no escribe
 *   node scripts/backfill-pagos.mjs             # inserta en una transacción
 *
 * (pg se resuelve desde scripts/node_modules, igual que migrar-supabase.mjs;
 * ejecutar desde la raíz del repo.)
 *
 * Credenciales SOLO por variables de entorno (nunca hardcodear):
 *   PGHOST     (default: 192.168.1.68)
 *   PGPORT     (default: 5432)
 *   PGDATABASE (default: kinder)
 *   PGUSER     (default: kinder_owner)
 *   PGPASSWORD (sin default — requerida salvo .pgpass)
 */

import pg from 'pg';

const { Client } = pg;

const DRY_RUN = process.argv.includes('--dry-run');

const pgConfig = {
  host: process.env.PGHOST ?? '192.168.1.68',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'kinder',
  user: process.env.PGUSER ?? 'kinder_owner',
  password: process.env.PGPASSWORD,
};

const PREFIJO = 'Pago CxC - ';

function fail(msg) {
  console.error(`[backfill-pagos] ERROR: ${msg}`);
  process.exit(1);
}

// Parsea 'Pago CxC - <concepto> - <alumno_nombre>' partiendo por la derecha:
// concepto = entre el primer ' - ' (el del prefijo) y el último;
// alumno_nombre = después del último ' - '. Así un concepto con ' - '
// (ej. 'Mensualidad - Enero') se conserva completo. Devuelve null si el
// formato no tiene ambos segmentos no vacíos.
function parsePagoCxC(descripcion) {
  if (typeof descripcion !== 'string' || !descripcion.startsWith(PREFIJO)) return null;
  const primero = descripcion.indexOf(' - '); // separador del prefijo
  const ultimo = descripcion.lastIndexOf(' - ');
  if (primero === -1 || ultimo === -1 || primero === ultimo) return null;
  const concepto = descripcion.slice(primero + 3, ultimo).trim();
  const alumno_nombre = descripcion.slice(ultimo + 3).trim();
  if (!concepto || !alumno_nombre) return null;
  return { concepto, alumno_nombre };
}

const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
const short = (id) => String(id).slice(0, 8);

async function nextFolio(client) {
  const r = await client.query(`SELECT nextval('kinder.seq_folio_comprobante') AS n`);
  const n = Number(r.rows[0].n);
  const year = new Date().getFullYear();
  return `COM-${year}-${String(n).padStart(5, '0')}`;
}

const client = new Client(pgConfig);
try {
  await client.connect();
} catch (err) {
  fail(`sin conexión a ${pgConfig.user}@${pgConfig.host}:${pgConfig.port}/${pgConfig.database}: ${err.message}`);
}

try {
  // 1. Cuentas con algo pagado (no eliminadas), en orden de emisión.
  const cxcRes = await client.query(
    `SELECT id, alumno_id, alumno_nombre, concepto, monto, monto_pagado, fecha_emision
       FROM kinder.cxc
      WHERE monto_pagado > 0 AND eliminado = false
      ORDER BY fecha_emision ASC NULLS LAST, created_at ASC`,
  );
  const consumidas = new Set();
  let procesadas = 0;
  let skipped = 0;
  let insertados = 0;
  let sinteticos = 0;
  const lineas = [];
  const pendientes = []; // inserts acumulados (para dry-run o transacción)

  // 1b. Cuentas sin alumno_id: no pueden tener pagos (NOT NULL).
  const cuentas = cxcRes.rows.filter((c) => {
    if (c.alumno_id === null || c.alumno_id === undefined) {
      lineas.push(`SKIP ${short(c.id)} | ${c.alumno_nombre} | ${c.concepto} | sin alumno_id (pagos.alumno_id es NOT NULL)`);
      skipped++;
      return false;
    }
    return true;
  });

  // 2. Finanzas de ingreso tipo 'Pago CxC - %', ordenadas por fecha.
  const finRes = await client.query(
    `SELECT id, monto, fecha, metodo_pago, descripcion
       FROM kinder.finanzas
      WHERE tipo = 'Ingreso' AND descripcion LIKE 'Pago CxC - %'
      ORDER BY fecha ASC, created_at ASC`,
  );
  const finanzas = finRes.rows.map((f) => ({ ...f, parsed: parsePagoCxC(f.descripcion) }));

  for (const c of cuentas) {
    // 3. Idempotencia: si la cuenta ya tiene pagos, se omite.
    const ya = await client.query('SELECT count(*)::int AS n FROM kinder.pagos WHERE cxc_id = $1', [c.id]);
    if (ya.rows[0].n > 0) {
      skipped++;
      lineas.push(`SKIP ${short(c.id)} | ${c.alumno_nombre} | ${c.concepto} | ya tiene ${ya.rows[0].n} pago(s)`);
      continue;
    }
    procesadas++;

    // 4. Candidatas: mismo alumno y concepto, aún no consumidas, por fecha.
    // Se asignan acumulando mientras no se exceda lo pagado.
    const candidatas = finanzas.filter(
      (f) => !consumidas.has(f.id)
        && f.parsed !== null
        && f.parsed.alumno_nombre === c.alumno_nombre
        && f.parsed.concepto === c.concepto,
    );

    const objetivo = num(c.monto_pagado);
    let acumulado = 0;
    let creados = 0;
    for (const f of candidatas) {
      const m = num(f.monto);
      if (m <= 0) continue;
      if (acumulado + m > objetivo + 0.005) continue; // no exceder lo pagado
      consumidas.add(f.id);
      acumulado += m;
      creados++;
      pendientes.push({
        cxc: c,
        monto: m,
        fecha: f.fecha,
        metodo_pago: f.metodo_pago ?? 'Transferencia',
        referencia: null,
        finanza_id: f.id,
      });
    }

    // 5. Residual: si no se cubrió todo lo pagado, una fila sintética.
    let esSintetico = false;
    const resto = Math.round((objetivo - acumulado) * 100) / 100;
    if (resto > 0.005) {
      esSintetico = true;
      sinteticos++;
      pendientes.push({
        cxc: c,
        monto: resto,
        fecha: c.fecha_emision,
        metodo_pago: 'Transferencia',
        referencia: 'Reconstruido por backfill',
        finanza_id: null,
      });
    }

    lineas.push(
      `OK ${short(c.id)} | ${c.alumno_nombre} | ${c.concepto} | pagado=${objetivo} | pagos=${creados + (esSintetico ? 1 : 0)}${esSintetico ? ' (1 sintético)' : ''}`,
    );
  }

  // 6. Huérfanas: finanzas 'Pago CxC' que ninguna cuenta consumió
  // (o que no parsearon). Se reportan, no se insertan.
  const huerfanas = finanzas.filter((f) => !consumidas.has(f.id));
  const huerfanasParseadas = huerfanas.filter((f) => f.parsed !== null);
  const huerfanasSinParsear = huerfanas.filter((f) => f.parsed === null);

  // 7. Escritura: todo en una transacción. En dry-run no se abre.
  if (!DRY_RUN) {
    try {
      await client.query('BEGIN');
      for (const p of pendientes) {
        const folio = await nextFolio(client);
        await client.query(
          `INSERT INTO kinder.pagos
             (folio, alumno_id, cxc_id, alumno_nombre, concepto, monto, fecha, metodo_pago, referencia, finanza_id, origen)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'legacy')`,
          [folio, p.cxc.alumno_id, p.cxc.id, p.cxc.alumno_nombre, p.cxc.concepto,
            p.monto, p.fecha, p.metodo_pago, p.referencia, p.finanza_id],
        );
        insertados++;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } else {
    insertados = pendientes.length; // lo que se insertaría
  }

  // Reporte.
  console.log(`[backfill-pagos] ${DRY_RUN ? 'DRY-RUN (nada escrito)' : 'APLICADO'} — detalle por cuenta:`);
  for (const l of lineas) console.log(`  ${l}`);
  console.log('--- totales ---');
  console.log(`cuentas con pago: ${cuentas.length}`);
  console.log(`cuentas procesadas: ${procesadas}`);
  console.log(`cuentas omitidas (ya tenían pagos): ${skipped}`);
  console.log(`pagos ${DRY_RUN ? 'a insertar' : 'insertados'}: ${insertados}`);
  console.log(`sintéticos: ${sinteticos}`);
  console.log(`huérfanas (no asignadas a ninguna CxC): ${huerfanas.length}`);
  if (huerfanasParseadas.length > 0) {
    console.log('--- huérfanas parseables ---');
    for (const f of huerfanasParseadas) {
      console.log(`  ${short(f.id)} | ${f.parsed.alumno_nombre} | ${f.parsed.concepto} | monto=${f.monto} | fecha=${f.fecha} | ${f.descripcion}`);
    }
  }
  if (huerfanasSinParsear.length > 0) {
    console.log('--- huérfanas sin formato esperado ---');
    for (const f of huerfanasSinParsear) {
      console.log(`  ${short(f.id)} | monto=${f.monto} | fecha=${f.fecha} | ${f.descripcion}`);
    }
  }

  const hayDescuadre = huerfanas.length > 0 || sinteticos > 0;
  console.log(hayDescuadre
    ? '[backfill-pagos] DONE con datos sin conciliar (ver arriba).'
    : '[backfill-pagos] DONE: todo conciliado.');
  process.exit(hayDescuadre ? 1 : 0);
} catch (err) {
  try { await client.query('ROLLBACK'); } catch { /* sin transacción activa */ }
  fail(err.message);
} finally {
  await client.end();
}
