import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import SelectField from './SelectField';

const sectionConfig = {
  alumnos: {
    titleCreate: 'Nuevo Alumno',
    titleEdit: 'Editar Alumno',
  },
  cxc: {
    titleCreate: 'Nueva Cuenta por Cobrar',
    titleEdit: 'Editar Cuenta por Cobrar',
  },
  finanzas: {
    titleCreate: 'Nuevo Registro Financiero',
    titleEdit: 'Editar Registro Financiero',
  },
};

const RecordModal = ({ isOpen, onClose, section, mode, initialData, tags, onTagsChange, onSave, alumnoNames = [], gradoOptions = [], conceptoOptions = [], categoriaOptions = [] }) => {
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  const getDefaults = (section) => {
    switch (section) {
      case 'alumnos': return { estado: 'Activo' };
      case 'cxc': return { estado: 'Pendiente' };
      case 'finanzas': return { tipo: 'Ingreso', estado: 'Completado', fecha: new Date().toISOString().split('T')[0] };
      default: return {};
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({ ...initialData });
      } else {
        setFormData(getDefaults(section));
      }
      setFormErrors({});
    }
  }, [isOpen, mode, initialData]);

  const getTagOptions = (tagList) => (tagList || []).map(t => ({ value: t, label: t }));

  const handleCreateTag = (field, tagList, newValue) => {
    if (!tagList.includes(newValue)) {
      onTagsChange({ ...tags, [section]: [...tagList, newValue] });
    }
    setFormData({ ...formData, [field]: newValue });
  };

  const handleSubmit = async () => {
    setFormErrors({});
    try {
      const enrichedData = { ...getDefaults(section), ...formData };
      await onSave(enrichedData);
      onClose();
    } catch (err) {
      setFormErrors({ general: err.message });
    }
  };

  if (!isOpen) return null;

  const config = sectionConfig[section];
  const title = mode === 'edit' ? config.titleEdit : config.titleCreate;
  const submitLabel = mode === 'edit' ? 'GUARDAR' : 'CREAR';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#F7F9FB] rounded-[2rem] shadow-2xl p-8 border border-white animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-[#74739E]">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {formErrors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {formErrors.general}
          </div>
        )}

        <div className="space-y-4">
          {section === 'alumnos' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre del Alumno *</label>
                <input
                  type="text"
                  value={formData.nombre || ''}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                  required
                />
              </div>
              <SelectField
                label="Grado"
                options={getTagOptions(gradoOptions)}
                value={formData.grado}
                onChange={(val) => setFormData({ ...formData, grado: val })}
                onCreateOption={(v) => handleCreateTag('grado', tags.alumnos, v)}
                isCreatable
                required
              />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tutor</label>
                <input
                  type="text"
                  value={formData.tutor || ''}
                  onChange={(e) => setFormData({ ...formData, tutor: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Teléfono</label>
                <input
                  type="text"
                  value={formData.telefono || ''}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                />
              </div>
              <SelectField
                label="Estado"
                options={[
                  { value: 'Activo', label: 'Activo' },
                  { value: 'Inactivo', label: 'Inactivo' },
                  { value: 'Moroso', label: 'Moroso' },
                ]}
                value={formData.estado}
                onChange={(val) => setFormData({ ...formData, estado: val })}
              />
            </>
          )}

          {section === 'cxc' && (
            <>
              <SelectField
                label="Nombre del Alumno"
                options={alumnoNames.map(n => ({ value: n, label: n }))}
                value={formData.alumno_nombre}
                onChange={(val) => setFormData({ ...formData, alumno_nombre: val })}
                isCreatable
                required
              />
              <SelectField
                label="Concepto"
                options={getTagOptions(conceptoOptions)}
                value={formData.concepto}
                onChange={(val) => setFormData({ ...formData, concepto: val })}
                onCreateOption={(v) => handleCreateTag('concepto', tags.cxc, v)}
                isCreatable
                required
              />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monto || ''}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha de Vencimiento</label>
                <input
                  type="date"
                  value={formData.fecha_vencimiento || ''}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                />
              </div>
              <SelectField
                label="Estado"
                options={[
                  { value: 'Pendiente', label: 'Pendiente' },
                  { value: 'Pagado', label: 'Pagado' },
                  { value: 'Parcial', label: 'Parcial' },
                  { value: 'Vencido', label: 'Vencido' },
                ]}
                value={formData.estado}
                onChange={(val) => setFormData({ ...formData, estado: val })}
              />
            </>
          )}

          {section === 'finanzas' && (
            <>
              <SelectField
                label="Tipo"
                options={[
                  { value: 'Ingreso', label: 'Ingreso' },
                  { value: 'Gasto', label: 'Gasto' },
                ]}
                value={formData.tipo}
                onChange={(val) => setFormData({ ...formData, tipo: val })}
                required
              />
              <SelectField
                label="Categoría"
                options={getTagOptions(categoriaOptions)}
                value={formData.categoria}
                onChange={(val) => setFormData({ ...formData, categoria: val })}
                onCreateOption={(v) => handleCreateTag('categoria', tags.finanzas, v)}
                isCreatable
                required
              />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Monto *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monto || ''}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha</label>
                <input
                  type="date"
                  value={formData.fecha || ''}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción</label>
                <textarea
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7] resize-none"
                  rows="3"
                />
              </div>
              <SelectField
                label="Método de Pago"
                options={[
                  { value: 'Transferencia', label: 'Transferencia' },
                  { value: 'Efectivo', label: 'Efectivo' },
                  { value: 'Tarjeta', label: 'Tarjeta' },
                ]}
                value={formData.metodo_pago}
                onChange={(val) => setFormData({ ...formData, metodo_pago: val })}
                placeholder="Seleccionar..."
              />
              <SelectField
                label="Estado"
                options={[
                  { value: 'Completado', label: 'Completado' },
                  { value: 'Pendiente', label: 'Pendiente' },
                ]}
                value={formData.estado}
                onChange={(val) => setFormData({ ...formData, estado: val })}
              />
            </>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-[#EAEAEA] text-[#74739E] font-black rounded-xl active:scale-95 transition-all"
            >
              CANCELAR
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-4 bg-[#A7C7E7] text-white font-black rounded-xl shadow-lg shadow-[#A7C7E7]/30 active:scale-95 transition-all"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordModal;
