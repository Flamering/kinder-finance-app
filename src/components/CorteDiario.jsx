import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Loader2, Printer, X } from 'lucide-react';
import { fetchPagosByRango } from '../lib/api';
import { imprimirCorteDiario } from '../lib/pdfExport';

function isoLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatoDinero(n) {
  return `$${(parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CorteDiario = ({ onClose }) => {
  const ahora = new Date();
  const [mes, setMes] = useState(() => new Date(ahora.getFullYear(), ahora.getMonth(), 1));
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diaAbierto, setDiaAbierto] = useState(null);
  const [imprimiendo, setImprimiendo] = useState(null);

  const cargar = async (fechaMes) => {
    const y = fechaMes.getFullYear();
    const m = fechaMes.getMonth();
    const desde = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const ultimo = new Date(y, m + 1, 0).getDate();
    const hasta = `${y}-${String(m + 1).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`;
    setLoading(true);
    setError(null);
    try {
      const lista = await fetchPagosByRango(desde, hasta);
      setPagos(Array.isArray(lista) ? lista : []);
      console.log('[corte] pagos del mes', { desde, hasta, count: (lista || []).length });
    } catch (err) {
      setError(err.message || 'Error al cargar los pagos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar(mes);
  }, [mes]);

  const porFecha = useMemo(() => {
    const mapa = {};
    for (const p of pagos) {
      if (!p.fecha) continue;
      if (!mapa[p.fecha]) mapa[p.fecha] = [];
      mapa[p.fecha].push(p);
    }
    return mapa;
  }, [pagos]);

  const diasHabiles = useMemo(() => {
    const y = mes.getFullYear();
    const m = mes.getMonth();
    const ultimo = new Date(y, m + 1, 0).getDate();
    const dias = [];
    for (let d = 1; d <= ultimo; d++) {
      const fecha = new Date(y, m, d);
      const dow = fecha.getDay();
      if (dow === 0 || dow === 6) continue;
      dias.push(isoLocal(fecha));
    }
    return dias;
  }, [mes]);

  const totalMes = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const diasConIngresos = diasHabiles.filter((f) => (porFecha[f] || []).length > 0).length;

  const moverMes = (dir) => {
    setMes((prev) => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
    setDiaAbierto(null);
  };

  const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const etiquetaMes = capFirst(mes.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }));

  const imprimirDia = async (fecha, pagosDelDia) => {
    console.log('[corte] imprimir', { fecha, pagos: pagosDelDia.length });
    setImprimiendo(fecha);
    try {
      await imprimirCorteDiario(fecha, pagosDelDia);
    } catch (err) {
      alert(`Error al imprimir el corte: ${err.message}`);
    } finally {
      setImprimiendo(null);
    }
  };

  return (
    <div className="animate-in slide-in-from-right-10 duration-500 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={onClose}
          className="p-2 bg-white shadow-sm border border-slate-200 rounded-full hover:bg-slate-100 transition-colors"
          title="Volver"
        >
          <X size={18} />
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-slate-600 flex-1 min-w-[180px]">
          Corte diario de ingresos
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => moverMes(-1)}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
            title="Mes anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-slate-700 min-w-[140px] text-center">{etiquetaMes}</span>
          <button
            onClick={() => moverMes(1)}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
            title="Mes siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
          <div className="text-2xl font-black text-green-600">{formatoDinero(totalMes)}</div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Total del mes</div>
        </div>
        <div className="p-4 rounded-2xl bg-brand-50 border border-brand-150/30">
          <div className="text-2xl font-black text-slate-600">{pagos.length}</div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Ingresos</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="text-2xl font-black text-slate-600">{diasConIngresos}</div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Días con ingresos</div>
        </div>
      </div>

      {/* Body */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 size={36} className="text-slate-400 animate-spin mb-3" />
            <p className="text-sm text-slate-500">Cargando ingresos del mes...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <AlertCircle size={36} className="text-red-400 mb-3" />
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={() => cargar(mes)}
              className="px-6 py-2.5 bg-[#5A7A9A] text-white text-sm font-bold rounded-xl hover:brightness-110 transition-all"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {diasHabiles.map((fecha) => {
              const pagosDelDia = porFecha[fecha] || [];
              const total = pagosDelDia.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
              const tiene = pagosDelDia.length > 0;
              const abierto = diaAbierto === fecha;
              const etiquetaDia = capFirst(new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', {
                weekday: 'short', day: '2-digit', month: 'short',
              }));
              return (
                <li key={fecha} className={tiene ? '' : 'opacity-60'}>
                  <div
                    onClick={() => setDiaAbierto(abierto ? null : fecha)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-700">{etiquetaDia}</div>
                      {tiene && (
                        <div className="text-[11px] text-slate-400">
                          {pagosDelDia.length} {pagosDelDia.length === 1 ? 'ingreso' : 'ingresos'}
                        </div>
                      )}
                    </div>
                    <div className={`text-sm font-black ${tiene ? 'text-green-600' : 'text-slate-400'}`}>
                      {formatoDinero(total)}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); imprimirDia(fecha, pagosDelDia); }}
                      disabled={!tiene || imprimiendo === fecha}
                      className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Imprimir corte del día"
                    >
                      {imprimiendo === fecha
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Printer size={16} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDiaAbierto(abierto ? null : fecha); }}
                      className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
                      title={abierto ? 'Contraer' : 'Expandir'}
                    >
                      <ChevronDown size={16} className={`transition-transform ${abierto ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {abierto && (
                    <div className="px-4 pb-4">
                      {pagosDelDia.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">Sin ingresos registrados.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-slate-50">
                                <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Folio</th>
                                <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Alumno</th>
                                <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Concepto</th>
                                <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Método</th>
                                <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-right">Monto</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {pagosDelDia.map((p) => (
                                <tr key={p.id}>
                                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{p.folio || '—'}</td>
                                  <td className="px-3 py-2 text-xs font-semibold text-slate-700">{p.alumno_nombre || '—'}</td>
                                  <td className="px-3 py-2 text-xs text-slate-500">{p.concepto || '—'}</td>
                                  <td className="px-3 py-2 text-xs text-slate-500">{p.metodo_pago || '—'}</td>
                                  <td className="px-3 py-2 text-xs font-bold text-slate-700 text-right whitespace-nowrap">
                                    {formatoDinero(p.monto)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CorteDiario;
