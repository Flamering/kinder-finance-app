import React, { useState, useEffect } from 'react';
import { X, Loader2, Download, Printer, Receipt, Eye, Share2 } from 'lucide-react';
import { fetchPagosByAlumno } from '../lib/api';
import { exportComprobantePagoPDF, compartirComprobantePagoPDF, puedeCompartirComprobante } from '../lib/pdfExport';
import ComprobantePreview from './ComprobantePreview';

const ComprobantesModal = ({ isOpen, onClose, alumno, cuentas, tipoCuenta = 'Colegiatura', cuentaInicial = '' }) => {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroCuenta, setFiltroCuenta] = useState(cuentaInicial);
  const [pagoPreview, setPagoPreview] = useState(null);

  const loadPagos = async () => {
    if (!alumno?.alumno_id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPagosByAlumno(alumno.alumno_id);
      setPagos(result);
    } catch (err) {
      setError(err.message || 'Error al cargar comprobantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFiltroCuenta(cuentaInicial || '');
      setPagos([]);
      loadPagos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen || !alumno) return null;

  const cuentasFiltradas = (cuentas || []).filter((c) =>
    tipoCuenta === 'Eventual' ? c.tipo === 'Eventual' : c.tipo !== 'Eventual'
  );
  const idsValidos = new Set(cuentasFiltradas.map((c) => c.id));
  const pagosVisibles = pagos.filter((p) => idsValidos.has(p.cxc_id));
  const pagosFiltrados = filtroCuenta
    ? pagosVisibles.filter((p) => p.cxc_id === filtroCuenta)
    : pagosVisibles;

  const handlePdf = async (pago, action) => {
    try {
      const cuenta = (cuentas || []).find((c) => c.id === pago.cxc_id);
      if (action === 'share') {
        const res = await compartirComprobantePagoPDF(pago, cuenta);
        if (res === 'downloaded') alert('Tu navegador no permite compartir archivos; se descargó el PDF.');
        return;
      }
      await exportComprobantePagoPDF(pago, cuenta, { action });
    } catch (err) {
      alert(err.message || 'Error al generar el comprobante');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-elevated p-8 border border-slate-200/50 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-black text-[#74739E]">Comprobantes de Pago</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-6">{alumno.alumno_nombre}</p>

        <div className="space-y-1 mb-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cuenta</label>
          <select
            value={filtroCuenta}
            onChange={(e) => setFiltroCuenta(e.target.value)}
            className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="">Todas las cuentas</option>
            {cuentasFiltradas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.concepto} — {c.alumno_nombre}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 size={32} className="animate-spin text-slate-400 mb-3" />
            <p className="text-sm text-slate-500">Cargando comprobantes...</p>
          </div>
        ) : error ? (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              onClick={loadPagos}
              className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:brightness-110 shrink-0"
            >
              Reintentar
            </button>
          </div>
        ) : pagosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Receipt size={40} className="text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">Aún no hay pagos registrados para este alumno.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pagosFiltrados.map((pago) => (
              <div
                key={pago.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-700">{pago.folio}</span>
                    {pago.origen === 'legacy' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-200 text-slate-500">
                        reconstruido
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {pago.fecha} • {pago.concepto}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#A7C7E7]/20 text-slate-700 border border-[#A7C7E7]/40">
                    {pago.metodo_pago}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-700 shrink-0">
                  ${parseFloat(pago.monto).toLocaleString()}
                </span>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setPagoPreview(pago)}
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Vista previa"
                  >
                    <Eye size={16} />
                  </button>
                  {puedeCompartirComprobante() && (
                    <button
                      onClick={() => handlePdf(pago, 'share')}
                      className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Compartir"
                    >
                      <Share2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handlePdf(pago, 'download')}
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Descargar PDF"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handlePdf(pago, 'print')}
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Imprimir"
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ComprobantePreview
        isOpen={!!pagoPreview}
        onClose={() => setPagoPreview(null)}
        pago={pagoPreview}
        cuentas={cuentas}
      />
    </div>
  );
};

export default ComprobantesModal;
