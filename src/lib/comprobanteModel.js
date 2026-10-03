import { KINDER } from './orgConfig';

export const COMPROBANTE_THEME = {
  colores: {
    primario: '#5A7A9A',
    texto: '#1f2937',
    textoSuave: '#475569',
    badgeFondo: '#A7C7E7',
    badgeTexto: '#334155',
    filaPar: '#F8F9FB',
    linea: '#dddddd',
    nota: '#999999',
    bandaFondo: '#EBF1F7',
    bandaBorde: '#A7C7E7',
    labelSuave: '#64748B',
    exito: '#16A34A',
    papel: '#ffffff',
    fondo: '#e5e7eb',
  },
  papel: {
    anchoPx: 816, altoPx: 1056, // US Letter @96dpi
    ptAncho: 612, ptAlto: 792, // US Letter en pt
    tercioPt: 264, // 1/3 del alto de la hoja
  },
  espaciado: {
    margenSuperiorPt: 40,
    paddingFilaPt: 2,
    margenBloquePt: 8,
    logoAltoPt: 30,
  },
};

export function formatearMonto(valor) {
  const n = parseFloat(valor) || 0;
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildComprobanteModel(pago, cuenta = null, org = KINDER) {
  return {
    emisor: { nombre: org.nombre, telefono: org.telefono, domicilio: org.domicilio },
    folio: pago.folio || '—',
    fechaEmision: new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    alumno: pago.alumno_nombre || '—',
    concepto: pago.concepto || '—',
    cuentaRef: pago.cxc_id ? `ID-${String(pago.cxc_id).slice(0, 8)}` : '—',
    fechaPago: pago.fecha || '—',
    metodo: pago.metodo_pago || '—',
    referencia: pago.referencia || '—',
    monto: formatearMonto(pago.monto),
    totales: cuenta
      ? {
          monto: formatearMonto(cuenta.monto),
          pagado: formatearMonto(cuenta.monto_pagado),
          saldo: formatearMonto(
            (parseFloat(cuenta.monto) || 0) - (parseFloat(cuenta.monto_pagado) || 0),
          ),
        }
      : null,
    esLegacy: pago.origen === 'legacy',
  };
}

export function buildComprobanteDocDefinition(modelo, logoDataUri = null) {
  const infoRows = [
    ['Alumno', modelo.alumno],
    ['Concepto', modelo.concepto],
    ['Cuenta', `Ref: ${modelo.cuentaRef}`],
    ['Fecha de pago', modelo.fechaPago],
    ['Método de pago', modelo.metodo],
    ['Referencia', modelo.referencia],
  ];

  const content = [];

  if (logoDataUri) {
    content.push({ image: logoDataUri, fit: [202, 194], absolutePosition: { x: 205, y: 70 } });
  }

  content.push(
    {
      columns: [
        {
          width: 'auto',
          stack: [
            {
              text: [
                { text: 'Colegio ', color: '#84f542' },
                { text: modelo.emisor.nombre, color: '#4269f5' },
              ],
              fontSize: 20,
              bold: true,
            },
            { text: 'Comprobante de Pago', fontSize: 13, color: '#666666' },
          ],
        },
        {
          width: '*',
          stack: [
            { text: `Folio: ${modelo.folio}`, alignment: 'right', fontSize: 10, bold: true },
            { text: `Fecha de emisión: ${modelo.fechaEmision}`, alignment: 'right', fontSize: 10, color: '#666666' },
          ],
        },
      ],
      margin: [0, 0, 0, 8],
    },
    {
      table: {
        widths: ['35%', '*'],
        body: infoRows.map(([label, value]) => [
          { text: label, fontSize: 10, color: '#64748B', margin: [2, 0, 2, 0] },
          { text: String(value), fontSize: 10, bold: true, color: '#1f2937', margin: [2, 0, 2, 0] },
        ]),
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => '#ddd',
        vLineColor: () => '#ddd',
      },
    },
    {
      table: {
        widths: ['*'],
        body: [[{ text: `Monto: ${modelo.monto}`, alignment: 'right', fontSize: 16, bold: true, color: '#5A7A9A', margin: [6, 8, 6, 0] }]],
      },
      layout: {
        fillColor: () => '#EBF1F7',
        hLineWidth: () => 1,
        hLineColor: () => '#A7C7E7',
        vLineWidth: () => 0,
      },
      margin: [0, 8, 0, 0],
    },
  );

  if (modelo.totales) {
    const saldoNum = parseFloat(String(modelo.totales.saldo).replace(/[$,]/g, '').trim());
    const saldoCero = !Number.isNaN(saldoNum) && saldoNum <= 0;
    content.push({
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            { text: 'Monto de la cuenta', fontSize: 10, color: '#64748B', margin: [2, 0, 2, 0] },
            { text: modelo.totales.monto, fontSize: 10, color: '#1f2937', alignment: 'right', margin: [2, 0, 2, 0] },
          ],
          [
            { text: 'Monto pagado', fontSize: 10, color: '#64748B', margin: [2, 0, 2, 0] },
            { text: modelo.totales.pagado, fontSize: 10, color: '#1f2937', alignment: 'right', margin: [2, 0, 2, 0] },
          ],
          [
            { text: 'Saldo pendiente', fontSize: 10, bold: true, color: '#64748B', margin: [2, 0, 2, 0] },
            { text: modelo.totales.saldo, fontSize: 10, bold: true, color: saldoCero ? '#16A34A' : '#1f2937', alignment: 'right', margin: [2, 0, 2, 0] },
          ],
        ],
      },
      layout: {
        hLineWidth: (rowIndex) => (rowIndex === 0 ? 1 : 0.5),
        hLineColor: (rowIndex) => (rowIndex === 0 ? '#A7C7E7' : '#ddd'),
        vLineWidth: () => 0,
      },
      margin: [0, 8, 0, 0],
    });
  }

  if (modelo.esLegacy) {
    content.push({
      text: 'Comprobante reconstruido desde el historial de pagos.',
      italics: true,
      fontSize: 9,
      color: '#999',
      margin: [0, 6, 0, 0],
    });
  }

  return {
    pageSize: 'LETTER',
    pageOrientation: 'portrait',
    pageMargins: [40, 40, 40, 40],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: '' },
        { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 8, color: '#999' },
      ],
      margin: [40, 8, 40, 0],
    }),
    content,
    defaultStyle: {
      font: 'Roboto',
    },
  };
}

// ---------------------------------------------------------------------------
// HTML del comprobante para IMPRIMIR.
// Espeja exactamente el markup de ComprobantePreview (mismo modelo y tema).
// Imprimir HTML es fiable en todos los navegadores (el iframe con PDF NO abre
// el diálogo en Chromium); el PDF se conserva para descargar/compartir.
// ---------------------------------------------------------------------------
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildComprobanteHTML(modelo, logoDataUri = null) {
  const C = COMPROBANTE_THEME.colores;
  const filas = [
    ['Alumno', modelo.alumno],
    ['Concepto', modelo.concepto],
    ['Cuenta', `Ref: ${modelo.cuentaRef}`],
    ['Fecha de pago', modelo.fechaPago],
    ['Método de pago', modelo.metodo],
    ['Referencia', modelo.referencia],
  ];

  const filasHtml = filas
    .map(([label, value]) => `
      <div style="display:flex;justify-content:space-between;padding:2pt 0;border-bottom:0.5pt solid #ddd">
        <span style="font-size:10pt;color:#64748B">${esc(label)}</span>
        <span style="font-size:10pt;font-weight:bold;color:#1f2937;text-align:right">${esc(value)}</span>
      </div>`)
    .join('');

  let totalesHtml = '';
  if (modelo.totales) {
    const saldoNum = parseFloat(String(modelo.totales.saldo).replace(/[$,]/g, '').trim());
    const saldoCero = !Number.isNaN(saldoNum) && saldoNum <= 0;
    const rows = [
      ['Monto de la cuenta', modelo.totales.monto, false],
      ['Monto pagado', modelo.totales.pagado, false],
      ['Saldo pendiente', modelo.totales.saldo, true],
    ];
    totalesHtml = `
      <div style="margin-top:8pt">
        ${rows
          .map(([label, value, bold], i) => `
          <div style="display:flex;justify-content:space-between;${i === 0 ? 'border-top:1pt solid #A7C7E7;' : ''}border-bottom:0.5pt solid #ddd">
            <span style="font-size:10pt;color:#64748B;font-weight:${bold ? 'bold' : 'normal'}">${esc(label)}</span>
            <span style="font-size:10pt;text-align:right;font-weight:${bold ? 'bold' : 'normal'};color:${bold ? (saldoCero ? '#16A34A' : '#1f2937') : '#1f2937'}">${esc(value)}</span>
          </div>`)
          .join('')}
      </div>`;
  }

  const notaHtml = modelo.esLegacy
    ? '<div style="font-style:italic;font-size:9pt;color:#999999;margin-top:6pt">Comprobante reconstruido desde el historial de pagos.</div>'
    : '';

  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="Logo" style="position:absolute;top:calc(75% + 10px);left:50%;transform:translate(-50%,-50%);height:266px;width:auto;z-index:0">`
    : '';

  return `
  <div class="comprobante-paper" style="position:relative;width:816px;min-height:1056px;margin:0 auto;padding:40pt 40pt;background-color:${C.papel};font-family:Roboto,sans-serif;color:${C.texto}">
    <div style="position:relative;isolation:isolate">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8pt">
        <div>
          <span style="font-size:20pt;font-weight:bold">
            <span style="color:#84f542">Colegio </span><span style="color:#4269f5">${esc(modelo.emisor.nombre)}</span>
          </span>
          <div style="font-size:13pt;color:#666666">Comprobante de Pago</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10pt;font-weight:bold">Folio: ${esc(modelo.folio)}</div>
          <div style="font-size:10pt;color:#666666">Fecha de emisión: ${esc(modelo.fechaEmision)}</div>
        </div>
      </div>
      <div style="position:relative">
        ${logoHtml}
        <div style="position:relative;z-index:1">${filasHtml}</div>
      </div>
      <div style="background-color:#EBF1F7;border-top:1pt solid #A7C7E7;border-bottom:1pt solid #A7C7E7;padding:6pt 8pt;margin-top:8pt">
        <div style="text-align:right;font-size:16pt;font-weight:bold;color:${C.primario}">Monto: ${esc(modelo.monto)}</div>
      </div>
      ${totalesHtml}
      ${notaHtml}
      <div style="text-align:right;font-size:8pt;color:${C.nota};margin-top:24pt">Página 1 de 1</div>
    </div>
  </div>`;
}
