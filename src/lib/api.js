const API_BASE = (import.meta.env.VITE_API_BASE || 'api').replace(/\/+$/, '');

const SECTION_DEFAULTS = {
  finanzas: { tipo: 'Ingreso', estado: 'Completado' },
  alumnos: { estado: 'Activo' },
  cxc: { estado: 'Pendiente' },
};

function normalizeOne(result) {
  if (Array.isArray(result)) return result[0];
  return result;
}

async function throwIfNotOk(res) {
  if (res.ok) return;
  const body = await res.text().catch(() => '');
  throw new Error(`PostgREST ${res.status} ${res.statusText}${body ? `: ${body}` : ''}`);
}

export async function fetchSectionData(section) {
  const res = await fetch(`${API_BASE}/${section}?eliminado=eq.false&order=created_at.desc`, {
    headers: { Accept: 'application/json' },
  });
  await throwIfNotOk(res);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createRecord(section, data) {
  const enrichedData = { ...(SECTION_DEFAULTS[section] || {}), ...data, eliminado: false };
  const res = await fetch(`${API_BASE}/${section}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify([enrichedData]),
  });
  await throwIfNotOk(res);
  const result = await res.json();
  return normalizeOne(result);
}

export async function updateRecord(section, id, data) {
  const res = await fetch(`${API_BASE}/${section}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res);
  const result = await res.json();
  return normalizeOne(result);
}

export async function softDeleteRecord(section, id) {
  const res = await fetch(`${API_BASE}/${section}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ eliminado: true }),
  });
  await throwIfNotOk(res);
}

export async function createBulkRecords(section, records) {
  const enriched = records.map((r) => ({
    ...(SECTION_DEFAULTS[section] || {}),
    ...r,
    eliminado: false,
  }));
  const res = await fetch(`${API_BASE}/${section}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(enriched),
  });
  await throwIfNotOk(res);
  const result = await res.json();
  return Array.isArray(result) ? result : [result];
}

export async function registrarPago({ alumnoId, cxcId, monto, fecha, metodoPago, referencia, categoria }) {
  const res = await fetch(`${API_BASE}/rpc/registrar_pago`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      p_alumno_id: alumnoId,
      p_cxc_id: cxcId,
      p_monto: monto,
      p_fecha: fecha,
      p_metodo_pago: metodoPago,
      p_referencia: referencia ?? null,
      p_categoria: categoria ?? 'Mensualidad',
    }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function registrarPagoEventual({ alumnoId, concepto, monto, fecha, metodoPago, referencia }) {
  const res = await fetch(`${API_BASE}/rpc/registrar_pago_eventual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      p_alumno_id: alumnoId,
      p_concepto: concepto,
      p_monto: monto,
      p_fecha: fecha,
      p_metodo_pago: metodoPago,
      p_referencia: referencia ?? null,
    }),
  });
  await throwIfNotOk(res);
  return res.json();
}

export async function fetchPagosByAlumno(alumnoId) {
  const res = await fetch(
    `${API_BASE}/pagos?alumno_id=eq.${encodeURIComponent(alumnoId)}&eliminado=eq.false&order=fecha.desc`,
    { headers: { Accept: 'application/json' } }
  );
  await throwIfNotOk(res);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
