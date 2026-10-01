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

// Genera el File listo para compartir. Asíncrono: NO requiere gesto de usuario.
export async function crearComprobanteFile(pago, cuenta) {
  const { pdf, filename, modelo } = await crearComprobantePDF(pago, cuenta);
  const blob = await pdf.getBlob(); // pdfmake 0.3.x: getBlob() devuelve Promise<Blob>
  return { file: new File([blob], filename, { type: 'application/pdf' }), filename, modelo };
}

// Comparte un File YA generado. DEBE llamarse dentro del handler del click
// (la Web Share API exige activación transitoria del usuario).
// Retorna 'shared' | 'cancelled' | 'unsupported'.
export async function compartirComprobanteFile(file, { title, text } = {}) {
  if (!puedeCompartirComprobante()) return 'unsupported';
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) return 'unsupported';
  try {
    await navigator.share({ files: [file], title, text });
    return 'shared';
  } catch (err) {
    if (err && err.name === 'AbortError') return 'cancelled';
    throw err;
  }
}

// Comparte el PDF por la hoja nativa del dispositivo.
// Retorna 'shared' | 'cancelled' | 'downloaded'.
// NOTA: puede perder la activación transitoria en navegadores estrictos —
// los componentes deben preferir crearComprobanteFile + compartirComprobanteFile.
export async function compartirComprobantePagoPDF(pago, cuenta) {
  const { file, modelo } = await crearComprobanteFile(pago, cuenta);
  const res = await compartirComprobanteFile(file, {
    title: `Comprobante ${pago.folio || ''}`.trim(),
    text: `Comprobante de pago — ${modelo.alumno} — ${modelo.monto}`,
  });
  if (res === 'unsupported') { await exportComprobantePagoPDF(pago, cuenta, { action: 'download' }); return 'downloaded'; }
  return res;
}
