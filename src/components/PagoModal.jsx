import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import SelectField from './SelectField';

const PagoModal = ({ isOpen, onClose, record, onConfirm }) => {
  const [formData, setFormData] = useState({
    montoPago: '',
    fecha: new Date().toISOString().split('T')[0],
    metodoPago: 'Transferencia',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        montoPago: '',
        fecha: new Date().toISOString().split('T')[0],
        metodoPago: 'Transferencia',
      });
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !record) return null;

  const montoTotal = parseFloat(record.monto) || 0;
  const montoPagado = parseFloat(record.monto_pagado) || 0;
  const saldoPendiente = montoTotal - montoPagado;

  const handleSubmit = async () => {
    setError(null);
    const monto = parseFloat(formData.montoPago);

    if (!monto || monto <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if (!formData.fecha) {
      setError('La fecha es obligatoria');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        montoPago: monto,
        fecha: formData.fecha,
        metodoPago: formData.metodoPago,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al procesar el pago');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-elevated p-8 border border-slate-200/50 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-[#74739E]">Registrar Pago</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h5 className="text-[10px] font-bold text-slate-600 mb-3 uppercase tracking-wider">Información de la Cuenta</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Alumno:</span>
                <span className="font-semibold text-slate-700">{record.alumno_nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Concepto:</span>
                <span className="font-semibold text-slate-700">{record.concepto}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500">Monto Total:</span>
                <span className="font-bold text-slate-700">${montoTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monto Pagado:</span>
                <span className="font-semibold text-green-600">${montoPagado.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500">Saldo Pendiente:</span>
                <span className="font-bold text-red-600">${saldoPendiente.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Monto a Pagar *</label>
            <input
              type="number"
              step="0.01"
              value={formData.montoPago}
              onChange={(e) => setFormData({ ...formData, montoPago: e.target.value })}
              className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
              placeholder={`Saldo: $${saldoPendiente.toFixed(2)}`}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Fecha *</label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
              required
            />
          </div>

          <SelectField
            label="Método de Pago"
            options={[
              { value: 'Transferencia', label: 'Transferencia' },
              { value: 'Efectivo', label: 'Efectivo' },
              { value: 'Tarjeta', label: 'Tarjeta' },
            ]}
            value={formData.metodoPago}
            onChange={(val) => setFormData({ ...formData, metodoPago: val })}
            required
          />

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-xl active:scale-95 transition-all disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-4 bg-green-600 text-white font-black rounded-xl shadow-lg shadow-green-600/40 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'PROCESANDO...' : 'CONFIRMAR PAGO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagoModal;
