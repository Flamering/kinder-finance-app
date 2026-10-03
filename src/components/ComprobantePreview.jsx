import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Printer, Share2, Loader2 } from 'lucide-react';
import logo25Url from '../assets/logo-ausubel-25.png';
import { COMPROBANTE_THEME, buildComprobanteModel } from '../lib/comprobanteModel';
import { exportComprobantePagoPDF, crearComprobanteBlob, imprimirComprobanteHTML, descargarComprobanteBlob, compartirComprobanteBlob, puedeCompartirComprobante } from '../lib/pdfExport';

const T = COMPROBANTE_THEME;

const ComprobantePreview = ({ isOpen, onClose, pago, cuentas }) => {
  const paperRef = useRef(null);
  const metodoRowRef = useRef(null);
  const [logoTop, setLogoTop] = useState(null);
  const [comprobante, setComprobante] = useState(null);
  const [preparando, setPreparando] = useState(false);
  const admiteCompartir = puedeCompartirComprobante();

  useEffect(() => {
    if (!isOpen || !pago) { setComprobante(null); return; }
    let cancelado = false;
    setPreparando(true);
    setComprobante(null);
    const cuentaPre = (cuentas || []).find((c) => c.id === pago.cxc_id) || null;
    console.log('[preview] pre-generando PDF para imprimir/compartir…', { folio: pago?.folio });
    crearComprobanteBlob(pago, cuentaPre)
      .then((res) => { console.log('[preview] PDF listo', { folio: pago?.folio, bytes: res?.blob?.size }); if (!cancelado) setComprobante(res); })
      .catch((err) => { console.log('[preview] fallo la pre-generación', err); if (!cancelado) setComprobante(null); })
      .finally(() => { if (!cancelado) setPreparando(false); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pago?.id]);

  useEffect(() => {
    const measure = () => {
      if (metodoRowRef.current && paperRef.current) {
        const center = metodoRowRef.current.offsetTop + metodoRowRef.current.offsetHeight / 2;
        setLogoTop(center - 266 / 2 + 10);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  if (!isOpen || !pago) return null;

  const cuenta = (cuentas || []).find((c) => c.id === pago.cxc_id) || null;
  const modelo = buildComprobanteModel(pago, cuenta);

  const handleImprimir = async () => {
    console.log('[preview][imprimir] click (HTML)');
    try {
      const res = await imprimirComprobanteHTML(pago, cuenta);
      console.log('[preview][imprimir] resultado:', res);
    } catch (err) {
      console.log('[preview][imprimir] error', err);
      alert(err.message || 'Error al imprimir el comprobante');
    }
  };

  const handleDescargar = async () => {
    if (comprobante) {
      descargarComprobanteBlob(comprobante.blob, comprobante.filename);
      return;
    }
    try {
      await exportComprobantePagoPDF(pago, cuenta, { action: 'download' });
    } catch (err) {
      alert(err.message || 'Error al generar el comprobante');
    }
  };

  const handleCompartir = async () => {
    if (!comprobante) {
      // Aún no está listo (o falló la pre-generación): fallback a descarga
      try { await exportComprobantePagoPDF(pago, cuenta, { action: 'download' }); } catch (err) { alert(err.message || 'Error al generar el comprobante'); }
      return;
    }
    try {
      const res = await compartirComprobanteBlob(comprobante.blob, comprobante.filename, {
        title: `Comprobante ${pago.folio || ''}`.trim(),
        text: `Comprobante de pago — ${modelo.alumno} — ${modelo.monto}`,
      });
      if (res === 'unsupported') { descargarComprobanteBlob(comprobante.blob, comprobante.filename); alert('Tu navegador no permite compartir archivos; se descargó el PDF.'); }
    } catch (err) {
      alert(err.message || 'Error al compartir el comprobante');
    }
  };

  const infoRows = [
    ['Alumno', modelo.alumno],
    ['Concepto', modelo.concepto],
    ['Cuenta', `Ref: ${modelo.cuentaRef}`],
    ['Fecha de pago', modelo.fechaPago],
    ['Método de pago', modelo.metodo],
    ['Referencia', modelo.referencia],
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: T.colores.fondo }}
        onClick={onClose}
      />
      <div className="relative max-w-[860px] w-full max-h-[92vh] overflow-y-auto bg-white rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">Vista previa del comprobante</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDescargar}
              className="flex items-center gap-2 px-4 py-2 bg-[#5A7A9A] text-white text-sm font-bold rounded-xl hover:brightness-110"
            >
              <Download size={16} />
              Descargar PDF
            </button>
            <button
              onClick={handleImprimir}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-300"
            >
              <Printer size={16} />
              Imprimir
            </button>
            {admiteCompartir && (
              <button
                onClick={handleCompartir}
                disabled={preparando || !comprobante}
                className="flex items-center gap-2 px-4 py-2 bg-[#A7C7E7] text-slate-800 text-sm font-bold rounded-xl hover:brightness-105 disabled:opacity-50"
              >
                {preparando || !comprobante ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                Compartir
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <div
          ref={paperRef}
          style={{
            position: 'relative',
            isolation: 'isolate',
            width: 816,
            minHeight: 1056,
            maxWidth: '100%',
            margin: '0 auto',
            padding: '40pt 40pt',
            backgroundColor: T.colores.papel,
            fontFamily: 'Roboto, sans-serif',
            color: T.colores.texto,
          }}
        >
          <img
            src={logo25Url}
            alt="Logo"
            style={{
              position: 'absolute',
              top: logoTop != null ? `${logoTop}px` : '65%',
              left: '50%',
              transform: 'translateX(-50%)',
              height: '266px',
              width: 'auto',
              zIndex: -1,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8pt' }}>
            <div>
              <span style={{ fontSize: '20pt', fontWeight: 'bold' }}>
                <span style={{ color: '#84f542' }}>Colegio </span>
                <span style={{ color: '#4269f5' }}>{modelo.emisor.nombre}</span>
              </span>
              <div style={{ fontSize: '13pt', color: '#666666' }}>Comprobante de Pago</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>Folio: {modelo.folio}</div>
              <div style={{ fontSize: '10pt', color: '#666666' }}>Fecha de emisión: {modelo.fechaEmision}</div>
            </div>
          </div>

          <div>
            {infoRows.map(([label, value]) => (
              <div
                key={label}
                ref={label === 'Método de pago' ? metodoRowRef : undefined}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '2pt 0',
                  borderBottom: '0.5pt solid #ddd',
                }}
              >
                <span style={{ fontSize: '10pt', color: '#64748B' }}>
                  {label}
                </span>
                <span style={{ fontSize: '10pt', fontWeight: 'bold', color: '#1f2937', textAlign: 'right' }}>{String(value)}</span>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: '#EBF1F7', borderTop: '1pt solid #A7C7E7', borderBottom: '1pt solid #A7C7E7', padding: '6pt 8pt', marginTop: '8pt' }}>
            <div style={{ textAlign: 'right', fontSize: '16pt', fontWeight: 'bold', color: T.colores.primario }}>Monto: {modelo.monto}</div>
          </div>

          {modelo.totales && (() => {
            const saldoNum = parseFloat(String(modelo.totales.saldo).replace(/[$,]/g, '').trim());
            const saldoCero = !Number.isNaN(saldoNum) && saldoNum <= 0;
            return (
            <div style={{ marginTop: '8pt' }}>
              {[
                ['Monto de la cuenta', modelo.totales.monto, false],
                ['Monto pagado', modelo.totales.pagado, false],
                ['Saldo pendiente', modelo.totales.saldo, true],
              ].map(([label, value, bold], rowIndex) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: rowIndex === 0 ? '1pt solid #A7C7E7' : undefined,
                    borderBottom: '0.5pt solid #ddd',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10pt',
                      color: '#64748B',
                      fontWeight: bold ? 'bold' : 'normal',
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: '10pt',
                      textAlign: 'right',
                      color: bold ? (saldoCero ? '#16A34A' : '#1f2937') : '#1f2937',
                      fontWeight: bold ? 'bold' : 'normal',
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
            );
          })()}

          {modelo.esLegacy && (
            <div
              style={{
                fontStyle: 'italic',
                fontSize: '9pt',
                color: T.colores.nota,
                marginTop: '6pt',
              }}
            >
              Comprobante reconstruido desde el historial de pagos.
            </div>
          )}

          <div
            style={{
              textAlign: 'right',
              fontSize: '8pt',
              color: T.colores.nota,
              marginTop: '24pt',
            }}
          >
            Página 1 de 1
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprobantePreview;
