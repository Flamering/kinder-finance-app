import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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

const RecordModal = ({ isOpen, onClose, section, mode, initialData, tags, onTagsChange, onSave }) => {
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [newTag, setNewTag] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  const getDefaults = (section) => {
    switch (section) {
      case 'alumnos': return { estado: 'Activo' };
      case 'cxc': return { estado: 'Pendiente' };
      case 'finanzas': return { tipo: 'Ingreso', estado: 'Completado' };
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
      setNewTag('');
      setShowNewTagInput(false);
    }
  }, [isOpen, mode, initialData]);

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const tagList = tags[section] || [];
    if (!tagList.includes(newTag.trim())) {
      onTagsChange({ ...tags, [section]: [...tagList, newTag.trim()] });
    }
    setNewTag('');
    setShowNewTagInput(false);
  };

  const handleRemoveTag = (tagToRemove) => {
    onTagsChange({ ...tags, [section]: tags[section].filter(t => t !== tagToRemove) });
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

  const renderTagSelector = (field, tagList) => (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tagList.map(tag => (
          <button
            key={tag}
            onClick={() => setFormData({ ...formData, [field]: tag })}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${formData[field] === tag ? 'bg-[#A7C7E7] text-white border-[#A7C7E7]' : 'bg-white text-slate-600 border-[#EAEAEA] hover:border-[#A7C7E7]'}`}
          >
            {tag}
          </button>
        ))}
        <button
          onClick={() => setShowNewTagInput(!showNewTagInput)}
          className="px-3 py-1 rounded-full text-xs font-bold border border-dashed border-slate-400 text-slate-400 hover:border-[#A7C7E7] hover:text-[#A7C7E7]"
        >
          + Nueva
        </button>
      </div>
      {showNewTagInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Nueva etiqueta..."
            className="flex-1 p-2 bg-[#EAEAEA] border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#A7C7E7]"
          />
          <button onClick={handleAddTag} className="px-4 py-2 bg-[#A7C7E7] text-white rounded-lg">✓</button>
        </div>
      )}
    </div>
  );

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
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Grado *</label>
                {renderTagSelector('grado', tags.alumnos)}
              </div>
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
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                <select
                  value={formData.estado || 'Activo'}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Moroso">Moroso</option>
                </select>
              </div>
            </>
          )}

          {section === 'cxc' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre del Alumno *</label>
                <input
                  type="text"
                  value={formData.alumno_nombre || ''}
                  onChange={(e) => setFormData({ ...formData, alumno_nombre: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Concepto *</label>
                {renderTagSelector('concepto', tags.cxc)}
              </div>
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
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                <select
                  value={formData.estado || 'Pendiente'}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagado">Pagado</option>
                  <option value="Parcial">Parcial</option>
                  <option value="Vencido">Vencido</option>
                </select>
              </div>
            </>
          )}

          {section === 'finanzas' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo *</label>
                <select
                  value={formData.tipo || 'Ingreso'}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                >
                  <option value="Ingreso">Ingreso</option>
                  <option value="Gasto">Gasto</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Categoría *</label>
                {renderTagSelector('categoria', tags.finanzas)}
              </div>
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
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descripción</label>
                <textarea
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7] resize-none"
                  rows="3"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Método de Pago</label>
                <select
                  value={formData.metodo_pago || ''}
                  onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                <select
                  value={formData.estado || 'Completado'}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                >
                  <option value="Completado">Completado</option>
                  <option value="Pendiente">Pendiente</option>
                </select>
              </div>
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
