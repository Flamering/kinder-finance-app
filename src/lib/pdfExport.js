import { buildComprobanteDocDefinition, buildComprobanteHTML, buildComprobanteModel, COMPROBANTE_THEME } from './comprobanteModel';
import { KINDER } from './orgConfig';
import logoUrl from '../assets/logo-ausubel-25.png';

export async function exportCxcVencidosPDF(records) {
  const vencidos = records.filter((r) => r.estado === 'Vencido');

  if (vencidos.length === 0) {
    alert('No hay registros vencidos para exportar.');
    return;
  }

  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  const pdfFonts = await import('pdfmake/build/vfs_fonts');
  pdfMake.vfs = pdfFonts.vfs;

  const total = vencidos.reduce((sum, r) => sum + parseFloat(r.monto || 0), 0);
  const fechaActual = new Date().toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const docDefinition = {
    pageOrientation: 'landscape',
    pageMargins: [40, 60, 40, 60],
    header: {
      text: 'Cuentas por Cobrar \u2014 Vencidas',
      alignment: 'center',
      margin: [0, 20, 0, 0],
      fontSize: 18,
      bold: true,
      color: '#5A7A9A'
    },
    footer: (currentPage, pageCount) => ({
      text: `P\u00e1gina ${currentPage} de ${pageCount}`,
      alignment: 'center',
      fontSize: 9,
      color: '#999',
      margin: [0, 10, 0, 0]
    }),
    content: [
      {
        text: `Fecha de generaci\u00f3n: ${fechaActual}`,
        alignment: 'right',
        fontSize: 10,
        color: '#666',
        margin: [0, 0, 0, 20]
      },
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', '*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'No.', style: 'tableHeader' },
              { text: 'Alumno', style: 'tableHeader' },
              { text: 'Concepto', style: 'tableHeader' },
              { text: 'Monto', style: 'tableHeader', alignment: 'right' },
              { text: 'Emisi\u00f3n', style: 'tableHeader', alignment: 'center' },
              { text: 'Vencimiento', style: 'tableHeader', alignment: 'center' }
            ],
            ...vencidos.map((r, i) => [
              { text: String(i + 1), alignment: 'center', fontSize: 9 },
              { text: r.alumno_nombre, fontSize: 9 },
              { text: r.concepto, fontSize: 9 },
              { text: `$${parseFloat(r.monto).toLocaleString()}`, alignment: 'right', fontSize: 9, bold: true },
              { text: r.fecha_emision || '\u2014', alignment: 'center', fontSize: 9 },
              { text: r.fecha_vencimiento || '\u2014', alignment: 'center', fontSize: 9 }
            ])
          ]
        },
        layout: {
          fillColor: (rowIndex) => rowIndex === 0 ? '#5A7A9A' : (rowIndex % 2 === 0 ? '#F8F9FB' : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#ddd',
          vLineColor: () => '#ddd'
        }
      },
      {
        text: [
          { text: '\nTotal de registros vencidos: ', bold: true, fontSize: 11 },
          { text: `${vencidos.length}`, fontSize: 11 },
          { text: '\nMonto total: ', bold: true, fontSize: 11 },
          { text: `$${total.toLocaleString()}`, fontSize: 11, color: '#D32F2F', bold: true }
        ],
        alignment: 'right',
        margin: [0, 15, 0, 0]
      }
    ],
    styles: {
      tableHeader: {
        color: 'white',
        fontSize: 9,
        bold: true,
        alignment: 'center'
      }
    },
    defaultStyle: {
      font: 'Roboto'
    }
  };

  pdfMake.createPdf(docDefinition).download('cuentas_por_cobrar_vencidas.pdf');
}

let logoDataUriPromise = null;
function obtenerLogoDataUri() {
  if (!logoDataUriPromise) {
    logoDataUriPromise = fetch(logoUrl).then((r) => r.blob()).then(
      (b) => new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.readAsDataURL(b);
      }),
    );
  }
  return logoDataUriPromise;
}

// ---------------------------------------------------------------------------
// Carga de pdfmake con reintentos.
// La importación dinámica puede fallar por un corte transitorio de red o por
// un despliegue a medio aplicar. El navegador CACHEA ese fallo para toda la
// sesión de la página (module map), así que un solo fallo rompe todas las
// impresiones/descargas posteriores. Reintentamos con un query de
// cache-busting para forzar una petición nueva y auto-sanar sin recargar.
// ---------------------------------------------------------------------------
function urlDesdeError(err) {
  const msg = String((err && err.message) || '');
  // Chrome/Edge: "Failed to fetch dynamically imported module: <url>"
  // Firefox: "error loading dynamically imported module: <url>"
  const m = /dynamically imported module[:\s]+(\S+)/i.exec(msg) || /(https?:\/\/\S+)/i.exec(msg);
  return m ? m[1] : null;
}

const TIMEOUT_IMPORT_MS = 15000; // un import colgado no debe colgar la UI para siempre

async function importarChunk(loader, etiqueta) {
  let ultimo = null;
  for (let intento = 1; intento <= 3; intento++) {
    try {
      console.log(`[pdf] importando ${etiqueta} (intento ${intento}/3)`);
      return await Promise.race([
        loader(),
        new Promise((_, rej) => setTimeout(
          () => rej(new Error(`timeout importando ${etiqueta} (${TIMEOUT_IMPORT_MS}ms)`)),
          TIMEOUT_IMPORT_MS,
        )),
      ]);
    } catch (err) {
      ultimo = err;
      console.log(`[pdf] import ${etiqueta} intento ${intento} FALLÓ`, err);
      const url = urlDesdeError(err);
      if (url) {
        const bust = url + (url.includes('?') ? '&' : '?') + 'retry=' + intento;
        try {
          console.log(`[pdf] reintentando ${etiqueta} con cache-busting`, bust);
          return await import(/* @vite-ignore */ bust);
        } catch (err2) {
          ultimo = err2;
          console.log(`[pdf] reintento ${etiqueta} ${intento} falló`, err2);
        }
      }
      await new Promise((r) => setTimeout(r, 400 * intento));
    }
  }
  throw ultimo;
}

let libreriasPdfMake = null;
function cargarLibreriasPdfMake() {
  if (!libreriasPdfMake) {
    libreriasPdfMake = (async () => {
      const pdfMakeMod = await importarChunk(() => import('pdfmake/build/pdfmake'), 'pdfmake');
      const pdfFontsMod = await importarChunk(() => import('pdfmake/build/vfs_fonts'), 'vfs_fonts');
      const pdfMake = pdfMakeMod.default || pdfMakeMod;
      pdfMake.vfs = pdfFontsMod.vfs || pdfFontsMod.default || pdfFontsMod;
      return pdfMake;
    })().catch((err) => {
      libreriasPdfMake = null; // permite un nuevo intento en la próxima acción
      throw err;
    });
  }
  return libreriasPdfMake;
}

// Returns { pdf, filename, modelo } — pdf is the pdfmake pdf object (browser build)
async function crearComprobantePDF(pago, cuenta) {
  console.log('[pdf] generar docDefinition', { folio: pago?.folio });
  const pdfMake = await cargarLibreriasPdfMake();
  const modelo = buildComprobanteModel(pago, cuenta);
  const logoDataUri = await obtenerLogoDataUri();
  console.log('[pdf] logo cargado', { bytes: typeof logoDataUri === 'string' ? logoDataUri.length : 0 });
  const docDefinition = buildComprobanteDocDefinition(modelo, logoDataUri);
  return { pdf: pdfMake.createPdf(docDefinition), filename: `comprobante_${pago.folio}.pdf`, modelo };
}

export async function exportComprobantePagoPDF(pago, cuenta, { action = 'download' } = {}) {
  console.log('[pdf] export', { action, folio: pago?.folio });
  const { pdf, filename } = await crearComprobantePDF(pago, cuenta);

  if (action === 'print') {
    await pdf.open();
  } else {
    await pdf.download(filename);
  }
  console.log('[pdf] export listo', { action });
}

// Devuelve true si el navegador puede compartir archivos.
export function puedeCompartirComprobante() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

// Genera el blob del comprobante (asíncrono; sin gesto de usuario).
// Devuelve { blob, filename, modelo }. El File se crea de forma perezosa
// SOLO al compartir, para no mantener dos copias en memoria.
export async function crearComprobanteBlob(pago, cuenta) {
  const t0 = performance.now();
  console.log('[pdf] generando blob', { folio: pago?.folio });
  const { pdf, filename, modelo } = await crearComprobantePDF(pago, cuenta);
  const blob = await pdf.getBlob();
  console.log('[pdf] blob listo', { folio: pago?.folio, bytes: blob?.size, ms: Math.round(performance.now() - t0) });
  return { blob, filename, modelo };
}

// Comparte un blob YA generado. DEBE llamarse dentro del click: el File se
// crea de forma síncrona (preserva la activación) y navigator.share se llama
// inmediatamente. Retorna 'shared' | 'cancelled' | 'unsupported'.
export async function compartirComprobanteBlob(blob, filename, { title, text } = {}) {
  if (!puedeCompartirComprobante()) return 'unsupported';
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) return 'unsupported';
  try {
    await navigator.share({ files: [file], title, text });
    return 'shared';
  } catch (err) {
    if (err && err.name === 'AbortError') return 'cancelled';
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Impresión FIABLE: imprime un documento HTML en un iframe fuera de
// pantalla. Imprimir un PDF dentro de un iframe NO abre el diálogo en
// Chromium; el HTML sí. Además NO depende de pdfmake, así que la impresión
// funciona aunque la importación del PDF falle. Sin pestaña nueva.
//
// titulo: título del documento (document.title). cuerpoHtml: contenido del
// <body>. cssExtra: CSS adicional (se inyecta después del reset base).
// ---------------------------------------------------------------------------
export async function imprimirDocumentoHTML(titulo, cuerpoHtml, cssExtra = '') {
  console.log('[imprimir] HTML — inicio', { titulo });
  // Copiar las hojas de estilo del documento padre (traen las @font-face de Roboto).
  const estilos = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((l) => l.href).filter(Boolean)
    .map((href) => `<link rel="stylesheet" href="${href}">`).join('');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:816px;height:1056px;border:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title>${estilos}<style>@page{size:Letter;margin:0}html,body{margin:0;padding:0;background:#fff}.comprobante-paper{-webkit-print-color-adjust:exact;print-color-adjust:exact}${cssExtra}</style></head><body>${cuerpoHtml}</body></html>`);
  doc.close();

  try { if (doc.fonts && doc.fonts.ready) await doc.fonts.ready; } catch { /* noop */ }
  await new Promise((r) => setTimeout(r, 150));

  try {
    console.log('[imprimir] HTML — llamando print()');
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    console.log('[imprimir] HTML — print() retornó');
    return 'printed';
  } finally {
    setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1000);
  }
}

export async function imprimirComprobanteHTML(pago, cuenta) {
  console.log('[imprimir] HTML — inicio', { folio: pago?.folio });
  const modelo = buildComprobanteModel(pago, cuenta);
  const logoDataUri = await obtenerLogoDataUri();
  const cuerpo = buildComprobanteHTML(modelo, logoDataUri);
  return imprimirDocumentoHTML(`Comprobante ${pago?.folio || ''}`, cuerpo);
}

// ---------------------------------------------------------------------------
// Corte diario de ingresos: HTML del reporte de los pagos de una fecha,
// con el mismo lenguaje visual del comprobante (tema + nombre bicolor).
// ---------------------------------------------------------------------------
function escHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatearMontoCorte(valor) {
  const n = parseFloat(valor) || 0;
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fechaLargaEsMX(fechaISO) {
  const d = new Date(`${fechaISO}T12:00:00`);
  if (Number.isNaN(d.getTime())) return fechaISO;
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Construye el HTML del corte diario de ingresos de una fecha.
export function buildCorteDiarioHTML(fechaISO, pagos) {
  const C = COMPROBANTE_THEME.colores;
  const lista = Array.isArray(pagos) ? pagos : [];
  const fechaCorte = fechaLargaEsMX(fechaISO);
  const emitido = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const total = lista.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);

  const thBase = `padding:6pt 6pt;text-align:left;font-size:9pt;font-weight:bold;color:#ffffff;background-color:${C.primario}`;
  const tdBase = `padding:5pt 6pt;font-size:9pt;color:${C.texto};border-bottom:0.5pt solid ${C.linea}`;
  const encabezados = ['No.', 'Folio', 'Alumno', 'Concepto', 'Método', 'Monto'];

  const filasHtml = lista
    .map((p, i) => {
      const fondo = i % 2 === 1 ? `background-color:${C.filaPar};` : '';
      return `<tr style="${fondo}">`
        + `<td style="${tdBase};text-align:center">${i + 1}</td>`
        + `<td style="${tdBase}">${escHtml(p.folio || '—')}</td>`
        + `<td style="${tdBase}">${escHtml(p.alumno_nombre || '—')}</td>`
        + `<td style="${tdBase}">${escHtml(p.concepto || '—')}</td>`
        + `<td style="${tdBase}">${escHtml(p.metodo_pago || '—')}</td>`
        + `<td style="${tdBase};text-align:right;font-weight:bold">${escHtml(formatearMontoCorte(p.monto))}</td>`
        + '</tr>';
    })
    .join('');

  // Relación por alumno: agrupa por alumno_nombre, ordenada por total desc.
  const porAlumno = new Map();
  for (const p of lista) {
    const nombre = p.alumno_nombre || '—';
    const e = porAlumno.get(nombre) || { alumno: nombre, n: 0, total: 0 };
    e.n += 1;
    e.total += parseFloat(p.monto) || 0;
    porAlumno.set(nombre, e);
  }
  const grupos = [...porAlumno.values()].sort((a, b) => b.total - a.total);
  const gruposHtml = grupos
    .map((g, i) => {
      const fondo = i % 2 === 1 ? `background-color:${C.filaPar};` : '';
      return `<tr style="${fondo}">`
        + `<td style="${tdBase}">${escHtml(g.alumno)}</td>`
        + `<td style="${tdBase};text-align:center">${g.n}</td>`
        + `<td style="${tdBase};text-align:right;font-weight:bold">${escHtml(formatearMontoCorte(g.total))}</td>`
        + '</tr>';
    })
    .join('');

  const tablasHtml = lista.length === 0
    ? '<div style="text-align:center;font-size:11pt;color:#666666;margin:24pt 0">Sin ingresos registrados en esta fecha.</div>'
    : `<div style="font-size:11pt;font-weight:bold;margin:12pt 0 4pt">Lista de ingresos</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>${encabezados.map((h, i) => `<th style="${thBase}${i === 0 ? ';text-align:center' : ''}${i === 5 ? ';text-align:right' : ''}">${h}</th>`).join('')}</tr></thead>
        <tbody>${filasHtml}</tbody>
      </table>
      <div style="font-size:11pt;font-weight:bold;margin:12pt 0 4pt">Relación por alumno</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th style="${thBase}">Alumno</th><th style="${thBase};text-align:center"># ingresos</th><th style="${thBase};text-align:right">Total</th></tr></thead>
        <tbody>${gruposHtml}</tbody>
      </table>`;

  return `
  <div class="comprobante-paper" style="position:relative;width:816px;min-height:1056px;margin:0 auto;padding:40pt 40pt;background-color:${C.papel};font-family:Roboto,sans-serif;color:${C.texto}">
    <div style="position:relative;isolation:isolate">
      <div style="text-align:center">
        <span style="font-size:20pt;font-weight:bold">
          <span style="color:#84f542">Colegio </span><span style="color:#4269f5">${escHtml(KINDER.nombre)}</span>
        </span>
        <div style="font-size:13pt;color:#666666">Corte diario de ingresos</div>
      </div>
      <div style="text-align:right;margin-top:8pt">
        <div style="font-size:10pt;font-weight:bold">Fecha del corte: ${escHtml(fechaCorte)}</div>
        <div style="font-size:10pt;color:#666666">Emitido: ${escHtml(emitido)}</div>
      </div>
      <div style="background-color:#EBF1F7;border-top:1pt solid #A7C7E7;border-bottom:1pt solid #A7C7E7;padding:6pt 8pt;margin-top:8pt">
        <div style="text-align:right;font-size:12pt;color:${C.textoSuave}">${lista.length} ingreso${lista.length === 1 ? '' : 's'}</div>
        <div style="text-align:right;font-size:16pt;font-weight:bold;color:${C.primario}">Total cobrado: ${escHtml(formatearMontoCorte(total))}</div>
      </div>
      ${tablasHtml}
      <div style="text-align:right;font-size:8pt;color:${C.nota};margin-top:24pt">Página 1 de 1</div>
    </div>
  </div>`;
}

// Imprime el corte diario de una fecha.
export async function imprimirCorteDiario(fechaISO, pagos) {
  return imprimirDocumentoHTML(`Corte ${fechaISO}`, buildCorteDiarioHTML(fechaISO, pagos));
}

// Imprime un blob PDF SIN abrir pestaña: iframe oculto + contentWindow.print()
// (abre el diálogo de impresión directamente). Libera el object-URL y el iframe
// en cuanto print() retorna o falla. Retorna 'printed' | 'failed'.
export function imprimirComprobanteBlob(blob) {
  console.log('[imprimir] inicio', { bytes: blob?.size, type: blob?.type });
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    console.log('[imprimir] objectURL creada');
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.border = '0';

    let resuelto = false;
    const terminar = (res) => {
      if (resuelto) return;
      resuelto = true;
      console.log('[imprimir] fin →', res, '(URL revocada, iframe removido)');
      URL.revokeObjectURL(url);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      resolve(res);
    };

    iframe.onload = () => {
      console.log('[imprimir] iframe onload — visor listo');
      try {
        const win = iframe.contentWindow;
        if (!win || typeof win.print !== 'function') { console.log('[imprimir] contentWindow.print NO disponible'); terminar('failed'); return; }
        win.focus();
        console.log('[imprimir] llamando contentWindow.print()');
        win.print();
        console.log('[imprimir] print() retornó (diálogo cerrado)');
        terminar('printed');
      } catch (e) {
        console.log('[imprimir] excepción en print()', e);
        terminar('failed');
      }
    };
    iframe.onerror = (e) => { console.log('[imprimir] iframe onerror', e); terminar('failed'); };

    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => { console.log('[imprimir] timeout de seguridad 8s'); terminar('failed'); }, 8000);
  });
}

// Descarga un blob ya generado (no requiere gesto). Libera la URL al terminar.
export function descargarComprobanteBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// Fallback: abre el PDF en una pestaña nueva (auto-print vía visor).
// window.open debe ejecutarse pronto tras el gesto para no ser bloqueado.
// Retorna 'opened' | 'blocked'.
export function abrirComprobanteEnPestana(blob) {
  console.log('[imprimir] fallback pestaña — intentando window.open', { bytes: blob?.size });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  console.log('[imprimir] window.open →', win ? 'pestaña abierta' : 'BLOQUEADA por el navegador');
  if (!win) { URL.revokeObjectURL(url); return 'blocked'; }
  win.addEventListener('load', () => { console.log('[imprimir] fallback pestaña — URL revocada'); setTimeout(() => URL.revokeObjectURL(url), 2000); }, { once: true });
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'opened';
}
