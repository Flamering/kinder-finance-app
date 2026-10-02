import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Download, Printer, Receipt, Eye, Share2, DollarSign, Pencil, Plus } from 'lucide-react';
import { fetchPagosByAlumno } from '../lib/api';
import { buildComprobanteModel } from '../lib/comprobanteModel';
import {
  exportComprobantePagoPDF,
  crearComprobanteBlob,
  imprimirComprobanteHTML,
  descargarComprobanteBlob,
  compartirComprobanteBlob,
  puedeCompartirComprobante,
} from '../lib/pdfExport';
import ComprobantePreview from './ComprobantePreview';

function fmtMoney(v) {
  const n = parseFloat(v || 0);
  return `$${Number.isNaN(n) ? '0.00' : n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusChip(estado) {
  if (estado === 'Pagado') return 'bg-green-100 text-green-700 border border-green-200';
  if (estado === 'Vencido') return 'bg-red-100 text-red-700 border border-red-200';
  return 'bg-amber-100 text-amber-700 border border-amber-200';
}

function sortCuentas(arr) {
  const out = [...arr];
  out.sort((a, b) => {
    const aPag = a.estado === 'Pagado' ? 1 : 0;
    const bPag = b.estado === 'Pagado' ? 1 : 0;
    if (aPag !== bPag) return aPag - bPag;
    const av = a.fecha_vencimiento || '';
    const bv = b.fecha_vencimiento || '';
    if (!av && bv) return 1;
    if (av && !bv) return -1;
    if (av !== bv) return av < bv ? -1 : 1;
    const ae = a.fecha_emision || '';
    const be = b.fecha_emision || '';
    if (ae !== be) return ae < be ? -1 : 1;
    return 0;
  });
  return out;
}

function CuentaBlock({
  cuenta,
  pagosCuenta,
  expandida,
  onToggle,
  comprobantesListos,
  preparandoListo,
  admiteCompartir,
  onRegistrarPago,
  onEditarCuenta,
  onPreview,
  onDescargar,
  onImprimir,
  onCompartir,
}) {
  const monto = parseFloat(cuenta.monto || 0);
  const pagado = parseFloat(cuenta.monto_pagado || 0);
  const saldo = monto - pagado;
  return (
    <div className="rounded-xl border border-slate-200 p-4 mb-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-slate-800">{cuenta.concepto}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
            cuenta.tipo === 'Eventual'
              ? 'bg-[#A7C7E7]/20 text-slate-700 border-[#A7C7E7]/40'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {cuenta.tipo}
        </span>
        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusChip(cuenta.estado)}`}>
          {cuenta.estado}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-3">
        <div>
          <p className="text-[10px] text-slate-500">Ref</p>
          <p className="text-[10px] font-semibold text-slate-800">ID-{String(cuenta.id || '').slice(0, 8)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Emisión</p>
          <p className="text-[10px] font-semibold text-slate-800">{cuenta.fecha_emision || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Vencimiento</p>
          <p className="text-[10px] font-semibold text-slate-800">{cuenta.fecha_vencimiento || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Monto</p>
          <p className="text-[10px] font-semibold text-slate-800">{fmtMoney(monto)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Pagado</p>
          <p className="text-[10px] font-semibold text-green-600">{fmtMoney(pagado)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Saldo</p>
          <p className={`text-[10px] font-semibold ${saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {fmtMoney(Math.max(saldo, 0))}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {saldo > 0 && (
          <button
            onClick={() => { try { onRegistrarPago && onRegistrarPago(cuenta); } catch (err) { alert(err.message || 'Error al registrar el pago'); } }}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:brightness-110"
          >
            <DollarSign size={14} />
            Registrar pago
          </button>
        )}
        <button
          onClick={() => { try { onEditarCuenta && onEditarCuenta(cuenta); } catch (err) { alert(err.message || 'Error al editar la cuenta'); } }}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200"
        >
          <Pencil size={14} />
          Editar
        </button>
        <button
          onClick={() => onToggle(cuenta.id)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200"
        >
          <Receipt size={14} />
          Comprobantes ({pagosCuenta.length})
        </button>
      </div>

      {expandida && (
        <div className="mt-3 space-y-2">
          {pagosCuenta.length === 0 ? (
            <p className="text-xs text-slate-500">Sin comprobantes registrados.</p>
          ) : (
            pagosCuenta.map((pago) => (
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
                    onClick={() => onPreview(pago)}
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Vista previa"
                  >
                    <Eye size={16} />
                  </button>
                  {admiteCompartir && (
                    <button
                      onClick={() => onCompartir(pago)}
                      disabled={preparandoListo[pago.id] || !comprobantesListos[pago.id]}
                      className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                      title="Compartir"
                    >
                      {preparandoListo[pago.id] ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                    </button>
                  )}
                  <button
                    onClick={() => onDescargar(pago)}
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Descargar PDF"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => onImprimir(pago)}
                    className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Imprimir"
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const DetalleAlumnoCxC = ({ grupo, onRegistrarPago, onEditarCuenta, onNuevoPagoEventual, recargarPagos }) => {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagoPreview, setPagoPreview] = useState(null);
  const [comprobantesListos, setComprobantesListos] = useState({});
  const [preparandoListo, setPreparandoListo] = useState({});
  const [expandidas, setExpandidas] = useState({});

  const alumnoId = grupo?.alumno_id;
  const cuentas = useMemo(() => grupo?.cuentas || [], [grupo]);

  const loadPagos = async () => {
    if (!alumnoId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPagosByAlumno(alumnoId);
      setPagos(result);
    } catch (err) {
      setError(err.message || 'Error al cargar comprobantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPagos([]);
    setComprobantesListos({});
    setPreparandoListo({});
    if (alumnoId) loadPagos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnoId, recargarPagos]);

  useEffect(() => {
    if (pagos.length === 0) return;
    if (!puedeCompartirComprobante()) return;
    let cancelado = false;
    (async () => {
      for (const p of pagos) {
        if (cancelado) return;
        console.log('[detalle] pre-generando PDF', { folio: p.folio });
        setPreparandoListo((prev) => ({ ...prev, [p.id]: true }));
        try {
          const cuenta = (cuentas || []).find((c) => c.id === p.cxc_id);
          const listo = await crearComprobanteBlob(p, cuenta);
          console.log('[detalle] PDF listo', { folio: p.folio, bytes: listo?.blob?.size });
          if (!cancelado) setComprobantesListos((prev) => ({ ...prev, [p.id]: listo }));
        } catch (err) {
          console.log('[detalle] fallo la pre-generación', { folio: p.folio }, err);
        } finally {
          if (!cancelado) setPreparandoListo((prev) => ({ ...prev, [p.id]: false }));
        }
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagos]);

  useEffect(() => {
    return () => {
      setComprobantesListos({});
      setPreparandoListo({});
    };
  }, []);

  const cuentasOrdenadas = useMemo(() => sortCuentas(cuentas), [cuentas]);

  const cuentasColegiatura = useMemo(
    () => cuentasOrdenadas.filter((c) => c.tipo !== 'Eventual'),
    [cuentasOrdenadas]
  );
  const cuentasEventuales = useMemo(
    () => cuentasOrdenadas.filter((c) => c.tipo === 'Eventual'),
    [cuentasOrdenadas]
  );

  const resumen = useMemo(() => {
    const total = cuentas.length;
    const nColegiatura = cuentas.filter((c) => c.tipo !== 'Eventual').length;
    const nEventuales = cuentas.filter((c) => c.tipo === 'Eventual').length;
    const totalFacturado = cuentas.reduce((acc, c) => acc + parseFloat(c.monto || 0), 0);
    const totalPagado = cuentas.reduce((acc, c) => acc + parseFloat(c.monto_pagado || 0), 0);
    const saldo = cuentas.reduce((acc, c) => acc + (parseFloat(c.monto || 0) - parseFloat(c.monto_pagado || 0)), 0);
    const pendientes = cuentas.filter((c) => c.estado !== 'Pagado' && c.fecha_vencimiento);
    let proximo = '—';
    if (pendientes.length > 0) {
      proximo = pendientes.reduce((min, c) => (c.fecha_vencimiento < min ? c.fecha_vencimiento : min), pendientes[0].fecha_vencimiento);
    }
    return { total, nColegiatura, nEventuales, totalFacturado, totalPagado, saldo, proximo };
  }, [cuentas]);

  const aggregate = useMemo(() => {
    if (cuentas.length === 0) return { label: 'Sin cuentas', cls: 'bg-slate-100 text-slate-500 border border-slate-200' };
    if (cuentas.every((c) => c.estado === 'Pagado')) return { label: 'Pagado', cls: 'bg-green-100 text-green-700 border border-green-200' };
    if (cuentas.some((c) => c.estado === 'Vencido')) return { label: 'Vencido', cls: 'bg-red-100 text-red-700 border border-red-200' };
    const n = cuentas.filter((c) => c.estado !== 'Pagado').length;
    return { label: `${n} ${n === 1 ? 'pendiente' : 'pendientes'}`, cls: 'bg-amber-100 text-amber-700 border border-amber-200' };
  }, [cuentas]);

  const pagosPorCuenta = useMemo(() => {
    const map = {};
    for (const p of pagos) {
      if (!map[p.cxc_id]) map[p.cxc_id] = [];
      map[p.cxc_id].push(p);
    }
    return map;
  }, [pagos]);

  const handlePdf = async (pago, action) => {
    try {
      const cuenta = (cuentas || []).find((c) => c.id === pago.cxc_id);
      await exportComprobantePagoPDF(pago, cuenta, { action });
    } catch (err) {
      alert(err.message || 'Error al generar el comprobante');
    }
  };

  const handleDescargar = async (pago) => {
    try {
      const listo = comprobantesListos[pago.id];
      if (listo) {
        console.log('[detalle][descargar] blob listo', { folio: pago?.folio, bytes: listo?.blob?.size });
        descargarComprobanteBlob(listo.blob, listo.filename);
        return;
      }
      console.log('[detalle][descargar] fallback export', { folio: pago?.folio });
      await handlePdf(pago, 'download');
    } catch (err) {
      console.log('[detalle][descargar] error', err);
      alert(err.message || 'Error al descargar el comprobante');
    }
  };

  const handleImprimir = async (pago) => {
    console.log('[detalle][imprimir] click (HTML)', { folio: pago?.folio });
    try {
      const cuenta = (cuentas || []).find((c) => c.id === pago.cxc_id);
      const res = await imprimirComprobanteHTML(pago, cuenta);
      console.log('[detalle][imprimir] resultado:', res);
    } catch (err) {
      console.log('[detalle][imprimir] error', err);
      alert(err.message || 'Error al imprimir el comprobante');
    }
  };

  const handleCompartir = async (pago) => {
    const listo = comprobantesListos[pago.id];
    if (!listo) {
      try {
        console.log('[detalle][compartir] sin blob, fallback descarga', { folio: pago?.folio });
        const cuenta = (cuentas || []).find((c) => c.id === pago.cxc_id);
        await exportComprobantePagoPDF(pago, cuenta, { action: 'download' });
      } catch (err) {
        console.log('[detalle][compartir] error fallback', err);
        alert(err.message || 'Error al generar el comprobante');
      }
      return;
    }
    try {
      const cuenta = (cuentas || []).find((c) => c.id === pago.cxc_id);
      const modelo = buildComprobanteModel(pago, cuenta);
      console.log('[detalle][compartir] compartiendo', { folio: pago?.folio, bytes: listo?.blob?.size });
      const res = await compartirComprobanteBlob(listo.blob, listo.filename, {
        title: `Comprobante ${pago.folio || ''}`.trim(),
        text: `Comprobante de pago — ${modelo.alumno} — ${modelo.monto}`,
      });
      console.log('[detalle][compartir] resultado:', res);
      if (res === 'unsupported') {
        descargarComprobanteBlob(listo.blob, listo.filename);
        alert('Tu navegador no permite compartir archivos; se descargó el PDF.');
      }
    } catch (err) {
      console.log('[detalle][compartir] error', err);
      alert(err.message || 'Error al compartir el comprobante');
    }
  };

  const toggleExpandida = (cuentaId) => {
    setExpandidas((prev) => ({ ...prev, [cuentaId]: !prev[cuentaId] }));
  };

  if (!grupo) return null;

  const admiteCompartir = puedeCompartirComprobante();

  const cuentaBlockProps = (cuenta) => ({
    cuenta,
    pagosCuenta: pagosPorCuenta[cuenta.id] || [],
    expandida: !!expandidas[cuenta.id],
    onToggle: toggleExpandida,
    comprobantesListos,
    preparandoListo,
    admiteCompartir,
    onRegistrarPago,
    onEditarCuenta,
    onPreview: setPagoPreview,
    onDescargar: handleDescargar,
    onImprimir: handleImprimir,
    onCompartir: handleCompartir,
  });

  const renderEstadoCarga = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 size={32} className="animate-spin text-slate-400 mb-3" />
          <p className="text-sm text-slate-500">Cargando comprobantes...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={loadPagos}
            className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:brightness-110 shrink-0"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return null;
  };

  const estadoCarga = renderEstadoCarga();

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800">{grupo.alumno_nombre}</h2>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${aggregate.cls}`}>
            {aggregate.label}
          </span>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 mb-4">
        <h3 className="uppercase tracking-wider text-[10px] font-bold text-slate-600 mb-4">
          Resumen
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold">Cuentas</p>
            <p className="text-lg font-black text-slate-800">{resumen.total}</p>
            <p className="text-[10px] text-slate-500">{resumen.nColegiatura} colegiatura · {resumen.nEventuales} eventuales</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold">Total facturado</p>
            <p className="text-lg font-black text-slate-800">{fmtMoney(resumen.totalFacturado)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold">Total pagado</p>
            <p className="text-lg font-black" style={{ color: '#16A34A' }}>{fmtMoney(resumen.totalPagado)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold">Saldo pendiente</p>
            <p className="text-lg font-black" style={{ color: resumen.saldo > 0 ? '#DC2626' : '#16A34A' }}>{fmtMoney(Math.max(resumen.saldo, 0))}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-bold">Próximo vencimiento</p>
            <p className="text-lg font-black text-slate-800">{resumen.proximo}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 mb-4">
        <h3 className="uppercase tracking-wider text-[10px] font-bold text-slate-600 mb-4">
          Cuentas de colegiatura ({cuentasColegiatura.length})
        </h3>

        {estadoCarga || (cuentasColegiatura.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Sin cuentas de colegiatura.</p>
        ) : (
          <div>
            {cuentasColegiatura.map((cuenta) => (
              <CuentaBlock key={cuenta.id} {...cuentaBlockProps(cuenta)} />
            ))}
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="uppercase tracking-wider text-[10px] font-bold text-slate-600">
            Pagos eventuales ({cuentasEventuales.length})
          </h3>
          {grupo.alumno_id && (
            <button
              onClick={() => { try { onNuevoPagoEventual && onNuevoPagoEventual(); } catch (err) { alert(err.message || 'Error al abrir el pago eventual'); } }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:brightness-110"
            >
              <Plus size={16} />
              Nuevo pago eventual
            </button>
          )}
        </div>

        {estadoCarga || (cuentasEventuales.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Aún no hay pagos eventuales para este alumno.</p>
        ) : (
          <div>
            {cuentasEventuales.map((cuenta) => (
              <CuentaBlock key={cuenta.id} {...cuentaBlockProps(cuenta)} />
            ))}
          </div>
        ))}
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

export default DetalleAlumnoCxC;
