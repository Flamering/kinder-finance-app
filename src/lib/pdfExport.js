import { buildComprobanteDocDefinition, buildComprobanteModel } from './comprobanteModel';
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

// Returns { pdf, filename, modelo } — pdf is the pdfmake pdf object (browser build)
async function crearComprobantePDF(pago, cuenta) {
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  const pdfFonts = await import('pdfmake/build/vfs_fonts');
  pdfMake.vfs = pdfFonts.vfs;
  const modelo = buildComprobanteModel(pago, cuenta);
  const logoDataUri = await obtenerLogoDataUri();
  const docDefinition = buildComprobanteDocDefinition(modelo, logoDataUri);
  return { pdf: pdfMake.createPdf(docDefinition), filename: `comprobante_${pago.folio}.pdf`, modelo };
}

export async function exportComprobantePagoPDF(pago, cuenta, { action = 'download' } = {}) {
  const { pdf, filename } = await crearComprobantePDF(pago, cuenta);

  if (action === 'print') {
    await pdf.open();
  } else {
    await pdf.download(filename);
  }
}

// Devuelve true si el navegador puede compartir archivos.
export function puedeCompartirComprobante() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

// Genera el blob del comprobante (asíncrono; sin gesto de usuario).
// Devuelve { blob, filename, modelo }. El File se crea de forma perezosa
// SOLO al compartir, para no mantener dos copias en memoria.
export async function crearComprobanteBlob(pago, cuenta) {
  const { pdf, filename, modelo } = await crearComprobantePDF(pago, cuenta);
  const blob = await pdf.getBlob();
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

// Imprime un blob PDF SIN abrir pestaña: iframe oculto + contentWindow.print()
// (abre el diálogo de impresión directamente). Libera el object-URL y el iframe
// en cuanto print() retorna o falla. Retorna 'printed' | 'failed'.
export function imprimirComprobanteBlob(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
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
      URL.revokeObjectURL(url);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      resolve(res);
    };

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win || typeof win.print !== 'function') { terminar('failed'); return; }
        win.focus();
        win.print();
        terminar('printed');
      } catch {
        terminar('failed');
      }
    };
    iframe.onerror = () => terminar('failed');

    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => terminar('failed'), 8000);
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
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) { URL.revokeObjectURL(url); return 'blocked'; }
  win.addEventListener('load', () => setTimeout(() => URL.revokeObjectURL(url), 2000), { once: true });
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'opened';
}
