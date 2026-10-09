import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import SelectField from './SelectField';
import { registrarCobroEventual } from '../lib/api';

const freshForm = () => ({
  alumnoSel: null,
  concepto: 'Colegiatura eventual',
  monto: '',
  fecha: new Date().toISOString().split('T')[0],
  metodoPago: 'Transferencia',
  referencia: '',
  grado: 'Eventual',
  tutor: '',
});

const CobroEventualModal = ({ isOpen, onClose, alumnos, onCreated }) => {
  const [formData, setFormData] = useState(freshForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClose = () => {
    if (loading) return;
    setFormData(freshForm());
    setError(null);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  const esNuevo = formData.alumnoSel && !alumnos.some((a) => a.id === formData.alumnoSel);

  const handleSubmit = async () => {
    setError(null);

    if (!formData.alumnoSel) {
      setError('Selecciona o escribe el nombre del alumno');
      return;
    }

    const concepto = (formData.concepto || '').trim();
    const monto = parseFloat(formData.monto);

    if (!concepto) {
      setError('El concepto es obligatorio');
      return;
    }
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
      const result = await registrarCobroEventual({
        alumnoId: esNuevo ? null : formData.alumnoSel,
        nombre: esNuevo ? String(formData.alumnoSel).trim() : null,
        grado: esNuevo ? (formData.grado || '').trim() || null : null,
        tutor: esNuevo ? (formData.tutor || '').trim() || null : null,
        concepto,
        monto,
        fecha: formData.fecha,
        metodoPago: formData.metodoPago,
        referencia: formData.referencia?.trim() ? formData.referencia.trim() : null,
      });
      onCreated(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar el cobro eventual');
      setLoading(false);
    }
  };

  const options = alumnos.map((a) => ({ value: a.id, label: `${a.nombre} (${a.grado})` }));

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-elevated p-8 border border-slate-200/50 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-[#74739E]">Cobro Excepcional</h3>
          <button onClick={handleClose} disabled={loading} className="p-2 hover:bg-slate-200 rounded-lg disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <SelectField
            label="Alumno"
            options={options}
            value={formData.alumnoSel}
            onChange={(val) => setFormData({ ...formData, alumnoSel: val })}
            onCreateOption={(v) => setFormData({ ...formData, alumnoSel: v })}
            isCreatable
            placeholder="Selecciona o escribe un nombre..."
            required
          />

          {esNuevo && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Grado</label>
                <input
                  type="text"
                  value={formData.grado}
                  onChange={(e) => setFormData({ ...formData, grado: e.target.value })}
                  className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Ej: Eventual"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tutor</label>
                <input
                  type="text"
                  value={formData.tutor}
                  onChange={(e) => setFormData({ ...formData, tutor: e.target.value })}
                  className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Opcional"
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Concepto *</label>
            <input
              type="text"
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Ej: Colegiatura eventual"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Monto *</label>
            <input
              type="number"
              step="0.01"
              value={formData.monto}
              onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
              className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="0.00"
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

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Referencia</label>
            <input
              type="text"
              value={formData.referencia}
              onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Opcional"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-xl active:scale-95 transition-all disabled:opacity-50"
            >
              CANCELAR
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-4 bg-green-600 text-white font-black rounded-xl shadow-lg shadow-green-600/40 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'PROCESANDO...' : 'REGISTRAR COBRO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CobroEventualModal;
