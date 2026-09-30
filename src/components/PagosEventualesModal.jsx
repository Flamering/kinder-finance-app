import React from 'react';
import { X, Receipt, DollarSign } from 'lucide-react';

const getEstadoChip = (estado) => {
  switch (estado) {
    case 'Pagado':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Parcial':
      return 'bg-[#FDE68A]/40 text-yellow-800 border-yellow-200';
    case 'Pendiente':
    case 'Vencido':
    default:
      return 'bg-[#FCA5A5]/40 text-red-800 border-red-200';
  }
};

const PagosEventualesModal = ({ isOpen, onClose, alumno, cuentasEventuales, onVerComprobantes, onRegistrarPago }) => {
  if (!isOpen || !alumno) return null;

  const cuentas = cuentasEventuales || [];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-[2xl] shadow-elevated p-8 border border-slate-200/50 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-black text-[#74739E]">Pagos Eventuales</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-6">{alumno.alumno_nombre}</p>

        {cuentas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Receipt size={40} className="text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">Aún no hay pagos eventuales para este alumno.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Concepto</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Pagado</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Estado</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map((cuenta) => (
                  <tr key={cuenta.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-700">{cuenta.concepto}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{cuenta.fecha_vencimiento || cuenta.fecha_emision || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700">
                      ${parseFloat(cuenta.monto || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      ${parseFloat(cuenta.monto_pagado || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${getEstadoChip(cuenta.estado)}`}>
                        {cuenta.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => onVerComprobantes(cuenta)}
                          className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Comprobantes"
                        >
                          <Receipt size={16} />
                        </button>
                        {cuenta.estado !== 'Pagado' && (
                          <button
                            onClick={() => onRegistrarPago(cuenta)}
                            className="p-2 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                            title="Registrar pago"
                          >
                            <DollarSign size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PagosEventualesModal;
