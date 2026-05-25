import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Home,
  Users,
  DollarSign,
  TrendingUp,
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  Info,
  LayoutList,
  Table as TableIcon,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  Calendar,
  Check
} from 'lucide-react';
import RecordModal from './components/RecordModal';
import HomeDashboard from './components/HomeDashboard';
import { fetchSectionData, createRecord, updateRecord, softDeleteRecord } from './lib/api';

// --- Constantes de Diseño ---
const COLORS = {
  primary: '#5A7A9A',
  secondary: '#E2E8F0',
  tertiary: '#475569',
  neutral: '#F0F2F5'
};

// Componente: Modal de Ajuste de Nómina
const NominaAdjustmentModal = ({ isOpen, onClose, selectedMonth, nominaCalculada, nominaAdjustments, onSave, onRemove }) => {
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const nominaKey = `${selectedMonth.anio}-${String(selectedMonth.mes + 1).padStart(2, '0')}`;
  const ajusteExistente = nominaAdjustments[nominaKey];
  const [ajusteMonto, setAjusteMonto] = useState(ajusteExistente?.monto || 0);
  const [ajusteDescripcion, setAjusteDescripcion] = useState(ajusteExistente?.descripcion || '');

  React.useEffect(() => {
    if (ajusteExistente) {
      setAjusteMonto(ajusteExistente.monto);
      setAjusteDescripcion(ajusteExistente.descripcion || '');
    } else {
      setAjusteMonto(0);
      setAjusteDescripcion('');
    }
  }, [ajusteExistente]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-elevated p-8 border border-slate-200/50 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-600">Ajuste de Nómina</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-orange-50 rounded-xl border border-orange-200">
          <div className="text-xs font-bold text-slate-500 uppercase">Período</div>
          <div className="text-sm font-semibold text-slate-700">{monthNames[selectedMonth.mes]} {selectedMonth.anio}</div>
        </div>

        <div className="mb-4 p-3 bg-slate-50 rounded-xl">
          <div className="text-xs font-bold text-slate-500 uppercase">Nómina calculada</div>
          <div className="text-lg font-black text-orange-600">${nominaCalculada.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Ajuste (positivo o negativo)</label>
            <input
              type="number"
              value={ajusteMonto}
              onChange={(e) => setAjusteMonto(parseFloat(e.target.value) || 0)}
              className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200 text-lg font-bold"
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Descripción (opcional)</label>
            <input
              type="text"
              value={ajusteDescripcion}
              onChange={(e) => setAjusteDescripcion(e.target.value)}
              className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
              placeholder="Ej: Ajuste por horas extra"
            />
          </div>

          <div className="p-3 bg-brand-50 rounded-xl">
            <div className="text-xs font-bold text-slate-500 uppercase">Total con ajuste</div>
            <div className="text-xl font-black text-slate-700">${(nominaCalculada + ajusteMonto).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div className="flex gap-2 pt-6">
          {ajusteExistente && (
            <button
              onClick={() => { onRemove(); onClose(); }}
              className="px-4 py-4 bg-red-50 text-red-600 font-black rounded-xl active:scale-95 transition-all border border-red-200"
            >
              ELIMINAR
            </button>
          )}
          <button
            onClick={() => onSave(ajusteMonto, ajusteDescripcion)}
            className="flex-1 py-4 bg-[#5A7A9A] text-white font-black rounded-xl shadow-lg shadow-[#5A7A9A]/40 active:scale-95 transition-all"
          >
            GUARDAR
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSection, setCurrentSection] = useState('home');
  const [isMobile, setIsMobile] = useState(false);

  // Estados para datos de Supabase
  const [data, setData] = useState({ alumnos: [], cxc: [], finanzas: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para filtros
  const [filters, setFilters] = useState({});

  // Estados para formulario de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Estados para sistema de etiquetas
  const [tags, setTags] = useState({ alumnos: [], cxc: [], finanzas: [] });

  // Estado para scroll infinito (chunks de 8)
  const [visibleCount, setVisibleCount] = useState(8);
  const loadMoreRef = React.useRef(null);
  const visibleCountRef = React.useRef(visibleCount);
  const filteredDataRef = React.useRef([]);
  const listContainerRef = React.useRef(null);

  // Estado para selector de mes/año en finanzas
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState({ mes: now.getMonth(), anio: now.getFullYear() });
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // Estado para ajuste de nómina
  const [showNominaModal, setShowNominaModal] = useState(false);
  const [nominaAdjustments, setNominaAdjustments] = useState({});

  // Cargar etiquetas desde localStorage
  useEffect(() => {
    const savedTags = localStorage.getItem('kinder-finance-tags');
    if (savedTags) {
      try {
        setTags(JSON.parse(savedTags));
      } catch (e) {
        console.error('Error loading tags:', e);
      }
    } else {
      // Tags por defecto
      const defaultTags = {
        alumnos: ['Pre-Kinder', 'Kinder A', 'Kinder B'],
        cxc: ['Mensualidad', 'Inscripción', 'Actividad Extra', 'Uniforme', 'Material'],
        finanzas: ['Mensualidad', 'Inscripción', 'Nómina', 'Mantenimiento', 'Material', 'Servicios']
      };
      setTags(defaultTags);
      localStorage.setItem('kinder-finance-tags', JSON.stringify(defaultTags));
    }
  }, []);

  // Guardar tags en localStorage cuando cambian
  useEffect(() => {
    if (Object.keys(tags).length > 0) {
      localStorage.setItem('kinder-finance-tags', JSON.stringify(tags));
    }
  }, [tags]);

  // Cargar ajustes de nómina desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kinder-finance-nomina-adjustments');
    if (saved) {
      try {
        setNominaAdjustments(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading nomina adjustments:', e);
      }
    }
  }, []);

  // Guardar ajustes de nómina en localStorage cuando cambian
  useEffect(() => {
    if (Object.keys(nominaAdjustments).length > 0) {
      localStorage.setItem('kinder-finance-nomina-adjustments', JSON.stringify(nominaAdjustments));
    }
  }, [nominaAdjustments]);

  // Detectar si es mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Al cambiar de sección, limpiar selección y activar tabla en desktop
  useEffect(() => {
    setSelectedItem(null);
    setVisibleCount(8);
    if (currentSection !== 'home' && !isMobile) {
      setSelectedItem('__table__');
    }
  }, [currentSection, isMobile]);

  // Reset visible count cuando cambia la búsqueda
  useEffect(() => {
    setVisibleCount(8);
  }, [searchTerm]);

  // Cerrar dropdown de meses al cambiar de sección
  useEffect(() => {
    setShowMonthDropdown(false);
  }, [currentSection]);

  // Cargar todas las secciones al iniciar
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [alumnos, cxc, finanzas] = await Promise.all([
          fetchSectionData('alumnos'),
          fetchSectionData('cxc'),
          fetchSectionData('finanzas'),
        ]);
        setData({ alumnos, cxc, finanzas });
      } catch (err) {
        console.error('Error loading data:', err);
        setError(`Error al cargar datos: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // Refrescar datos al cambiar de sección
  useEffect(() => {
    if (currentSection === 'home' || !currentSection) return;
    (async () => {
      try {
        const result = await fetchSectionData(currentSection);
        setData(prev => ({ ...prev, [currentSection]: result }));
      } catch (err) {
        console.error(`Error refreshing ${currentSection}:`, err);
      }
    })();
  }, [currentSection]);

  const sectionData = data[currentSection] || [];

  // Función de Soft Delete
  const handleSoftDelete = async (itemId) => {
    if (!currentSection || currentSection === 'home') return;
    try {
      await softDeleteRecord(currentSection, itemId);
      setData(prev => ({
        ...prev,
        [currentSection]: prev[currentSection].filter(item => item.id !== itemId)
      }));
      if (selectedItem?.id === itemId) setSelectedItem(null);
    } catch (err) {
      console.error('Error al eliminar:', err);
      setError(`Error al eliminar: ${err.message}`);
    }
  };

  // Función para crear registro
  const handleCreate = async (formData) => {
    if (!currentSection || currentSection === 'home') return;
    try {
      const result = await createRecord(currentSection, formData);
      setData(prev => ({
        ...prev,
        [currentSection]: [result, ...prev[currentSection]]
      }));
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error al crear:', err);
      throw err;
    }
  };

  // Función para editar registro
  const handleEdit = (item) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  // Función para actualizar registro
  const handleUpdate = async (formData) => {
    if (!currentSection || currentSection === 'home') return;
    try {
      const { id, created_at, updated_at, eliminado, ...cleanData } = formData;
      const result = await updateRecord(currentSection, id, cleanData);
      setData(prev => ({
        ...prev,
        [currentSection]: prev[currentSection].map(item =>
          item.id === id ? result : item
        )
      }));
      setSelectedItem(result);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error al actualizar:', err);
      throw err;
    }
  };

  // Función para aplicar filtros
  const applyFilters = () => {
    // Los filtros se aplican en el render
    setIsFilterOpen(false);
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    setFilters({});
  };

  // Helpers para meses disponibles en finanzas
  const getAvailableMonths = (finanzasData) => {
    const months = new Map();
    finanzasData.forEach(item => {
      if (!item.fecha || item.eliminado) return;
      const d = new Date(item.fecha);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!months.has(key)) {
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        months.set(key, { mes: d.getMonth(), anio: d.getFullYear(), label: `${monthNames[d.getMonth()]} ${d.getFullYear()}` });
      }
    });
    return Array.from(months.values()).sort((a, b) => {
      if (a.anio !== b.anio) return b.anio - a.anio;
      return b.mes - a.mes;
    });
  };

  // Filtrar datos por mes/año seleccionado
  const filterByMonth = (data, mes, anio) => {
    return data.filter(item => {
      if (!item.fecha) return false;
      const d = new Date(item.fecha);
      return d.getFullYear() === anio && d.getMonth() === mes && !item.eliminado;
    });
  };

  // Navegar al mes anterior/siguiente
  const navigateMonth = (direction) => {
    setSelectedMonth(prev => {
      let newMes = prev.mes + direction;
      let newAnio = prev.anio;
      if (newMes < 0) {
        newMes = 11;
        newAnio--;
      } else if (newMes > 11) {
        newMes = 0;
        newAnio++;
      }
      return { mes: newMes, anio: newAnio };
    });
  };

  // Guardar ajuste de nómina
  const saveNominaAdjustment = (monto, descripcion) => {
    const key = `${selectedMonth.anio}-${String(selectedMonth.mes + 1).padStart(2, '0')}`;
    setNominaAdjustments(prev => ({
      ...prev,
      [key]: { monto, descripcion }
    }));
    setShowNominaModal(false);
  };

  // Eliminar ajuste de nómina
  const removeNominaAdjustment = () => {
    const key = `${selectedMonth.anio}-${String(selectedMonth.mes + 1).padStart(2, '0')}`;
    setNominaAdjustments(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Función para obtener datos filtrados
  const getFilteredData = () => {
    let filtered = sectionData;

    // Filtro por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        if (currentSection === 'alumnos') return item.nombre?.toLowerCase().includes(searchLower);
        if (currentSection === 'cxc') return item.alumno_nombre?.toLowerCase().includes(searchLower) || item.concepto?.toLowerCase().includes(searchLower);
        if (currentSection === 'finanzas') return item.categoria?.toLowerCase().includes(searchLower);
        return true;
      });
    }

    // Filtros avanzados
    if (Object.keys(filters).length > 0) {
      filtered = filtered.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          return item[key] === value;
        });
      });
    }

    return filtered;
  };

  const filteredData = getFilteredData();

  // Sync refs for IntersectionObserver
  React.useEffect(() => {
    visibleCountRef.current = visibleCount;
  }, [visibleCount]);

  React.useEffect(() => {
    filteredDataRef.current = filteredData;
  }, [filteredData.length]);

  // IntersectionObserver para scroll infinito (stable, re-observes when count changes)
  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Si el scroll está a 80px o menos del fondo, cargar más
      if (scrollHeight - scrollTop - clientHeight < 80) {
        if (filteredDataRef.current.length > visibleCountRef.current) {
          setVisibleCount(prev => prev + 8);
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Helper para estilos del Semáforo según sección
  const getStatusStyles = (status, section) => {
    if (section === 'alumnos') {
      switch (status) {
        case 'Activo': return 'bg-[#A7C7E7]/20 text-slate-700 border-[#A7C7E7]/40';
        case 'Inactivo': return 'bg-slate-100 text-slate-600 border-slate-200';
        case 'Moroso': return 'bg-[#FCA5A5]/40 text-red-800 border-red-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
    }
    if (section === 'cxc') {
      switch (status) {
        case 'Pagado': return 'bg-[#A7C7E7]/20 text-slate-700 border-[#A7C7E7]/40';
        case 'Pendiente': return 'bg-[#FDE68A]/40 text-yellow-800 border-yellow-200';
        case 'Vencido': return 'bg-[#FCA5A5]/40 text-red-800 border-red-200';
        case 'Parcial': return 'bg-[#FDE68A]/40 text-yellow-800 border-yellow-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
    }
    if (section === 'finanzas') {
      switch (status) {
        case 'Completado': return 'bg-[#A7C7E7]/20 text-slate-700 border-[#A7C7E7]/40';
        case 'Pendiente': return 'bg-[#FDE68A]/40 text-yellow-800 border-yellow-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  // --- Componente: Tabla CRUD ---
  const CRUDTable = ({ data, onSelect, section }) => {
    // Renderizar columnas según la sección
    const renderTableCell = (item, section) => {
      switch (section) {
        case 'alumnos':
          return (
            <>
              <td className="p-4">
                <div className="font-semibold text-slate-700 text-sm">{item.nombre}</div>
                <div className="text-[10px] text-slate-500">{item.grado} • {item.tutor}</div>
              </td>
              <td className="p-4 text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-bold border ${getStatusStyles(item.estado, section)}`}>
                  {item.estado}
                </span>
              </td>
              <td className="p-4 text-sm text-slate-500">{item.fecha_inscripcion || '—'}</td>
            </>
          );
        case 'cxc':
          return (
            <>
              <td className="p-4">
                <div className="font-semibold text-slate-700 text-sm">{item.alumno_nombre}</div>
                <div className="text-[10px] text-slate-500">{item.concepto}</div>
              </td>
              <td className="p-4 text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-bold border ${getStatusStyles(item.estado, section)}`}>
                  {item.estado}
                </span>
              </td>
              <td className="p-4 text-sm font-semibold text-slate-700">${parseFloat(item.monto).toLocaleString()}</td>
            </>
          );
        case 'finanzas':
          return (
            <>
              <td className="p-4">
                <div className="font-semibold text-slate-700 text-sm">{item.categoria}</div>
                <div className="text-[10px] text-slate-500">{item.tipo} • {item.descripcion || 'Sin descripción'}</div>
              </td>
              <td className="p-4 text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-bold border ${getStatusStyles(item.estado, section)}`}>
                  {item.estado}
                </span>
              </td>
              <td className={`p-4 text-sm font-bold ${item.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                {item.tipo === 'Ingreso' ? '+' : '-'}${parseFloat(item.monto).toLocaleString()}
              </td>
            </>
          );
        default:
          return null;
      }
    };

    return (
      <div className="w-full overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-card transition-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="p-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  {section === 'alumnos' ? 'Alumno' : section === 'cxc' ? 'Concepto' : 'Categoría'}
                </th>
                <th className="p-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center">Estado</th>
                <th className="p-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  {section === 'alumnos' ? 'Inscripción' : section === 'cxc' ? 'Monto' : 'Monto'}
                </th>
                <th className="p-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-[#F8F9FB] transition-colors group">
                  {renderTableCell(item, section)}
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onSelect(item)}
                        className="p-2 text-brand-200 hover:bg-brand-100/30 rounded-lg transition-colors"
                        title="Ver Detalle"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-slate-600 hover:bg-[#74739E]/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleSoftDelete(item.id)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 overflow-hidden font-sans">

      {/* SIDE SIDEBAR - Explorador */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-full md:static md:z-auto md:w-80 md:flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300
        ${selectedItem ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
      `}>
        {/* Header Fijo */}
        <div className="p-4 space-y-3 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-600">
              {currentSection === 'home' ? 'Inicio' : 
               currentSection === 'alumnos' ? 'Alumnos' : 
               currentSection === 'cxc' ? 'Cuentas por Cobrar' : 'Finanzas'}
            </h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center w-9 h-9 bg-[#5A7A9A] text-white rounded-lg shadow-md hover:shadow-lg hover:brightness-110 active:scale-95 transition-all duration-200"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-200 transition-all"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Botón de Cambio de Vista */}
            <button
              onClick={() => setSelectedItem(selectedItem === '__table__' ? null : '__table__')}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center ${selectedItem === '__table__' ? 'bg-[#74739E] text-white border-[#74739E]' : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'}`}
              title={selectedItem === '__table__' ? "Volver a Lista" : "Mostrar Tabla"}
            >
              {selectedItem === '__table__' ? <LayoutList size={18} /> : <TableIcon size={18} />}
            </button>

            <button 
              onClick={() => setIsFilterOpen(true)}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center ${Object.keys(filters).length > 0 ? 'bg-[#74739E] text-white border-[#74739E]' : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'}`}
              title="Filtrar"
            >
              <Filter size={18} />
              {Object.keys(filters).length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
          </div>
        </div>

        {/* Contenido de la Lista */}
        <div ref={listContainerRef} className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {currentSection === 'home' ? (
            <div className="space-y-3">
              {[
                { id: 'alumnos', icon: Users, label: 'Alumnos', desc: `${data.alumnos.filter(a => a.estado === 'Activo').length} activos` },
                { id: 'cxc', icon: DollarSign, label: 'Cuentas por Cobrar', desc: `${data.cxc.filter(c => c.estado === 'Pendiente' || c.estado === 'Vencido').length} pendientes` },
                { id: 'finanzas', icon: TrendingUp, label: 'Finanzas', desc: `${data.finanzas.filter(f => f.estado === 'Pendiente').length} pendientes` },
              ].map((section) => {
                const Icon = section.icon;
                return (
                  <div
                    key={section.id}
                    onClick={() => { setActiveTab(section.id); setCurrentSection(section.id); setSelectedItem(null); setSearchTerm(''); }}
                    className="p-4 rounded-xl cursor-pointer transition-all hover:bg-slate-100 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 shrink-0">
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-700 text-sm">{section.label}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{section.desc}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center text-slate-500 py-10">
              <p className="text-sm">No hay registros para mostrar</p>
            </div>
          ) : (
            <>
              {filteredData.slice(0, visibleCount).map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`
                    p-3.5 rounded-xl cursor-pointer transition-all
                    ${selectedItem?.id === item.id
                      ? 'bg-brand-50 text-brand-300 border-l-2 border-brand-200'
                      : 'hover:bg-slate-100 text-slate-700 border-l-2 border-transparent'}
                  `}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide border ${getStatusStyles(item.estado, currentSection)}`}>
                          {item.estado}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm truncate">
                        {currentSection === 'alumnos' ? item.nombre :
                         currentSection === 'cxc' ? `${item.alumno_nombre} - ${item.concepto}` :
                         `${item.tipo}: ${item.categoria}`}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {currentSection === 'alumnos' ? `${item.grado} • ${item.tutor}` :
                         currentSection === 'cxc' ? `$${item.monto} • Vence: ${item.fecha_vencimiento}` :
                         `$${parseFloat(item.monto).toLocaleString()} • ${item.fecha}`}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 mt-1.5 shrink-0" />
                  </div>
                </div>
              ))}
              {/* Indicador de carga más items */}
              {visibleCount < filteredData.length && (
                <div className="text-center py-3">
                  <div className="w-5 h-5 border-2 border-brand-200 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* MAIN STAGE */}
      <main className={`
        fixed inset-0 z-30 md:static md:z-auto md:flex-1 md:min-h-0 transition-transform duration-300 mb-16 md:mb-0
        ${selectedItem ? 'translate-x-0' : (isMobile && currentSection !== 'home' ? 'translate-x-full' : 'translate-x-0')}
      `}>
        <div className="h-full overflow-y-auto bg-slate-50">
          <div className="w-full p-6 md:p-10">
          {/* Lógica de Visualización basada en viewMode y selectedItem */}
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Loader2 size={48} className="text-slate-600 animate-spin mb-4" />
              <p className="text-slate-500">Cargando datos...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <AlertCircle size={48} className="text-red-400 mb-4" />
              <h2 className="text-xl font-bold text-red-600 mb-2">Error de Conexión</h2>
              <p className="text-slate-500 max-w-md mx-auto">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-6 py-3 bg-[#5A7A9A] text-white rounded-xl hover:brightness-110"
              >
                Reintentar
              </button>
            </div>
          ) : currentSection !== 'home' && selectedItem === '__table__' ? (
            <div className="animate-in slide-in-from-right-10 duration-500 w-full">
              <div className="flex items-center gap-3 mb-8">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 bg-white shadow-sm border border-slate-200 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
                <h2 className="text-xl font-bold text-slate-600">
                  {currentSection === 'alumnos' ? 'Gestión de Alumnos' :
                   currentSection === 'cxc' ? 'Cuentas por Cobrar' : 'Gestión Financiera'}
                </h2>
              </div>

              {/* Summary Cards */}
              <div className={`grid grid-cols-1 gap-4 mb-6 ${currentSection === 'finanzas' ? 'sm:grid-cols-5' : 'sm:grid-cols-3'}`}>
                  {currentSection === 'alumnos' && (() => {
                    const activos = filteredData.filter(i => i.estado === 'Activo').length;
                    const morosos = filteredData.filter(i => i.estado === 'Moroso').length;
                    const inactivos = filteredData.filter(i => i.estado === 'Inactivo').length;
                    return (
                      <>
                        <div className="p-4 rounded-2xl bg-brand-50 border border-brand-150/30">
                          <div className="text-2xl font-black text-slate-600">{activos}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Activos</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                          <div className="text-2xl font-black text-red-600">{morosos}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Morosos</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                          <div className="text-2xl font-black text-slate-600">{inactivos}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Inactivos</div>
                        </div>
                      </>
                    );
                  })()}
                  {currentSection === 'cxc' && (() => {
                    const pendientes = filteredData.filter(i => i.estado === 'Pendiente' || i.estado === 'Parcial').length;
                    const vencidos = filteredData.filter(i => i.estado === 'Vencido').length;
                    const totalCobrar = filteredData.reduce((sum, i) => sum + (parseFloat(i.monto) - parseFloat(i.monto_pagado || 0)), 0);
                    return (
                      <>
                        <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
                          <div className="text-2xl font-black text-yellow-700">{pendientes}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Pendientes</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                          <div className="text-2xl font-black text-red-600">{vencidos}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Vencidos</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-brand-50 border border-brand-150/30">
                          <div className="text-2xl font-black text-slate-600">${totalCobrar.toLocaleString()}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Total por Cobrar</div>
                        </div>
                      </>
                    );
                  })()}
                  {currentSection === 'finanzas' && (() => {
                    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                    const availableMonths = getAvailableMonths(data.finanzas);
                    const monthData = filterByMonth(filteredData, selectedMonth.mes, selectedMonth.anio);
                    const currentMonthLabel = `${monthNames[selectedMonth.mes]} ${selectedMonth.anio}`;

                    const ingresos = monthData.filter(i => i.tipo === 'Ingreso').reduce((s, i) => s + parseFloat(i.monto), 0);
                    const gastos = monthData.filter(i => i.tipo === 'Gasto').reduce((s, i) => s + parseFloat(i.monto), 0);
                    const pendientes = monthData.filter(i => i.estado === 'Pendiente').length;
                    const total = ingresos - gastos;
                    const nominaCalculada = monthData
                      .filter(i => i.categoria?.toLowerCase() === 'nómina')
                      .reduce((s, i) => s + parseFloat(i.monto), 0);
                    const nominaKey = `${selectedMonth.anio}-${String(selectedMonth.mes + 1).padStart(2, '0')}`;
                    const nominaAjuste = nominaAdjustments[nominaKey]?.monto || 0;
                    const nominaTotal = nominaCalculada + nominaAjuste;

                    return (
                      <>
                        {/* Selector de mes/año */}
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigateMonth(-1)}
                              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                            >
                              <ChevronLeft size={18} />
                            </button>
                            <span className="text-sm font-bold text-slate-700 min-w-[140px] text-center">{currentMonthLabel}</span>
                            <button
                              onClick={() => navigateMonth(1)}
                              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                          <div className="relative">
                            <button
                              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1"
                            >
                              <Calendar size={16} />
                              <span className="text-xs font-bold text-slate-600">Meses</span>
                            </button>
                            {showMonthDropdown && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMonthDropdown(false)} />
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-elevated border border-slate-200 z-50 max-h-64 overflow-y-auto">
                                  {availableMonths.length === 0 ? (
                                    <div className="p-3 text-xs text-slate-500 text-center">Sin registros</div>
                                  ) : (
                                    availableMonths.map((m, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => {
                                          setSelectedMonth({ mes: m.mes, anio: m.anio });
                                          setShowMonthDropdown(false);
                                        }}
                                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-100 transition-colors flex items-center justify-between ${
                                          m.mes === selectedMonth.mes && m.anio === selectedMonth.anio
                                            ? 'bg-brand-50 text-brand-300'
                                            : 'text-slate-700'
                                        }`}
                                      >
                                        <span>{m.label}</span>
                                        {m.mes === selectedMonth.mes && m.anio === selectedMonth.anio && (
                                          <Check size={14} />
                                        )}
                                      </button>
                                    ))
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Cards de resultado */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
                          <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
                            <div className="text-2xl font-black text-green-600">+${ingresos.toLocaleString()}</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Ingresos</div>
                          </div>
                          <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                            <div className="text-2xl font-black text-red-600">-${gastos.toLocaleString()}</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Gastos</div>
                          </div>
                          <div className="p-4 rounded-2xl bg-brand-50 border border-brand-150/30">
                            <div className="text-2xl font-black text-slate-600">${total.toLocaleString()}</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Total</div>
                          </div>
                          <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
                            <div className="text-2xl font-black text-yellow-700">{pendientes}</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Pendientes</div>
                          </div>
                          <button
                            onClick={() => setShowNominaModal(true)}
                            className="p-4 rounded-2xl bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors text-left relative cursor-pointer"
                          >
                            <div className="text-2xl font-black text-orange-600">${nominaTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Nómina</div>
                            {nominaAjuste !== 0 && (
                              <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-black ${
                                nominaAjuste > 0 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                              }`}>
                                {nominaAjuste > 0 ? '+' : ''}{nominaAjuste.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-card transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                        {currentSection === 'alumnos' ? 'Alumnos' :
                         currentSection === 'cxc' ? 'Cuentas por Cobrar' : 'Finanzas'}
                      </h1>
                      <p className="text-slate-500 mt-1 text-sm">
                        {currentSection === 'alumnos' ? 'Control de alumnos y su información académica.' :
                         currentSection === 'cxc' ? 'Seguimiento de pagos y cuentas pendientes.' :
                         'Registro de ingresos y gastos del kinder.'}
                      </p>
                    </div>
                    <span className="px-4 py-2 rounded-full text-xs font-black uppercase border tracking-widest bg-slate-100 border-slate-200 text-slate-500">
                      {filteredData.length} registros
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <CRUDTable
                      data={filteredData}
                      onSelect={setSelectedItem}
                      section={currentSection}
                    />
                  </div>
                </div>
              </div>
          ) : selectedItem ? (
            <div className="animate-in slide-in-from-right-10 duration-500 w-full">
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 bg-white shadow-sm border border-slate-200 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
                <h2 className="text-xl font-bold text-slate-600">
                  {currentSection === 'alumnos' ? 'Detalle del Alumno' :
                   currentSection === 'cxc' ? 'Detalle de Cuenta' : 'Detalle Financiero'}
                </h2>
                <button
                  onClick={() => handleEdit(selectedItem)}
                  className="ml-auto flex items-center justify-center w-9 h-9 bg-[#5A7A9A] text-white rounded-xl hover:brightness-110 transition-all"
                  title="Editar"
                >
                  <Pencil size={16} />
                </button>
              </div>

              {/* Header card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-tight">
                      {currentSection === 'alumnos' ? selectedItem.nombre :
                       currentSection === 'cxc' ? selectedItem.concepto :
                       selectedItem.categoria}
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                      Ref: ID-{selectedItem.id.toString().padStart(4, '0')}
                    </p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase border tracking-wider ${getStatusStyles(selectedItem.estado, currentSection)}`}>
                    {selectedItem.estado}
                  </span>
                </div>
              </div>

              {/* Detail cards - full width grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {currentSection === 'alumnos' ? (
                  <>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h5 className="text-[10px] font-bold text-slate-600 mb-4 uppercase tracking-wider">Información Académica</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Grado</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.grado}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Tutor</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.tutor}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Email</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.email}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-slate-500">Teléfono</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.telefono}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h5 className="text-[10px] font-bold text-slate-600 mb-4 uppercase tracking-wider">Fecha de Inscripción</h5>
                      <p className="text-lg font-bold text-slate-700 mb-2">{selectedItem.fecha_inscripcion}</p>
                      <p className="text-sm text-slate-500">Estado actual: {selectedItem.status}</p>
                    </div>
                  </>
                ) : currentSection === 'cxc' ? (
                  <>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h5 className="text-[10px] font-bold text-slate-600 mb-4 uppercase tracking-wider">Información de Pago</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Alumno</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.alumno_nombre}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Concepto</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.concepto}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Monto Total</span>
                          <span className="text-sm font-bold text-slate-700">${parseFloat(selectedItem.monto).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Monto Pagado</span>
                          <span className="text-sm font-semibold text-green-600">${parseFloat(selectedItem.monto_pagado).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-slate-500">Saldo Pendiente</span>
                          <span className="text-sm font-bold text-red-600">${(parseFloat(selectedItem.monto) - parseFloat(selectedItem.monto_pagado)).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h5 className="text-[10px] font-bold text-slate-600 mb-4 uppercase tracking-wider">Fechas</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Emisión</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.fecha_emision}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-slate-500">Vencimiento</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.fecha_vencimiento}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 mt-4">Estado: {selectedItem.estado}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h5 className="text-[10px] font-bold text-slate-600 mb-4 uppercase tracking-wider">Información Financiera</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Tipo</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.tipo}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Categoría</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.categoria}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Monto</span>
                          <span className="text-sm font-bold text-slate-700">${parseFloat(selectedItem.monto).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-500">Método de Pago</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.metodo_pago || 'N/A'}</span>
                        </div>
                        <div className="py-2">
                          <span className="text-sm text-slate-500 block mb-1">Descripción</span>
                          <p className="text-sm text-slate-600">{selectedItem.descripcion || 'Sin descripción'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h5 className="text-[10px] font-bold text-slate-600 mb-4 uppercase tracking-wider">Fecha de Registro</h5>
                      <p className="text-lg font-bold text-slate-700 mb-2">{selectedItem.fecha}</p>
                      <p className="text-sm text-slate-500">Estado: {selectedItem.estado}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              {currentSection === 'home' ? (
                <div className="w-full p-6 md:p-10">
                  <HomeDashboard cxcData={data.cxc} finanzasData={data.finanzas} />
                </div>
              ) : (
                <>
                  <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-6 text-slate-600">
                    {currentSection === 'alumnos' ? <Users size={48} /> :
                     currentSection === 'cxc' ? <DollarSign size={48} /> :
                     <TrendingUp size={48} />}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-600">
                    {currentSection === 'alumnos' ? 'Alumnos' :
                     currentSection === 'cxc' ? 'Cuentas por Cobrar' : 'Finanzas'}
                  </h2>
                  <p className="text-slate-500 max-w-md mx-auto mt-2">
                    No hay registros para mostrar. Haz clic en el botón + para crear uno nuevo.
                  </p>
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </main>

      {/* BOTTOM NAVBAR */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50 flex items-center justify-around shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        {[
          { id: 'home', icon: Home, label: 'Inicio' },
          { id: 'alumnos', icon: Users, label: 'Alumnos' },
          { id: 'cxc', icon: DollarSign, label: 'CxC' },
          { id: 'finanzas', icon: TrendingUp, label: 'Finanzas' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentSection(tab.id);
                setSelectedItem(null);
                setSearchTerm('');
              }}
              className="relative flex flex-col items-center justify-center w-16 h-full transition-all"
            >
              {isActive && <div className="absolute top-0 w-8 h-0.5 bg-brand-200 rounded-b-full shadow-[0_2px_6px_#6B9CC7]" />}
              <Icon
                size={20}
                className={`transition-colors ${isActive ? 'text-brand-300' : 'text-slate-300'}`}
              />
              <span className={`text-[9px] font-semibold mt-0.5 transition-colors ${isActive ? 'text-brand-300' : 'text-slate-300'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* MODAL DE FILTROS */}
      {isFilterOpen && currentSection !== 'home' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-elevated p-8 border border-slate-200/50 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-600">
                {currentSection === 'alumnos' ? 'Filtrar Alumnos' :
                 currentSection === 'cxc' ? 'Filtrar Cuentas' : 'Filtrar Finanzas'}
              </h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {currentSection === 'alumnos' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Estado</label>
                    <select
                      value={filters.estado || ''}
                      onChange={(e) => setFilters({ ...filters, estado: e.target.value || undefined })}
                      className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
                    >
                      <option value="">Todos</option>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="Moroso">Moroso</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Grado</label>
                    <select
                      value={filters.grado || ''}
                      onChange={(e) => setFilters({ ...filters, grado: e.target.value || undefined })}
                      className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
                    >
                      <option value="">Todos</option>
                      <option value="Pre-Kinder">Pre-Kinder</option>
                      <option value="Kinder A">Kinder A</option>
                      <option value="Kinder B">Kinder B</option>
                    </select>
                  </div>
                </>
              )}

              {currentSection === 'cxc' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Estado</label>
                    <select
                      value={filters.estado || ''}
                      onChange={(e) => setFilters({ ...filters, estado: e.target.value || undefined })}
                      className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
                    >
                      <option value="">Todos</option>
                      <option value="Pagado">Pagado</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Vencido">Vencido</option>
                      <option value="Parcial">Parcial</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Concepto</label>
                    <select
                      value={filters.concepto || ''}
                      onChange={(e) => setFilters({ ...filters, concepto: e.target.value || undefined })}
                      className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
                    >
                      <option value="">Todos</option>
                      {tags.cxc.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                  </div>
                </>
              )}

              {currentSection === 'finanzas' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo</label>
                    <select
                      value={filters.tipo || ''}
                      onChange={(e) => setFilters({ ...filters, tipo: e.target.value || undefined })}
                      className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
                    >
                      <option value="">Todos</option>
                      <option value="Ingreso">Ingreso</option>
                      <option value="Gasto">Gasto</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Estado</label>
                    <select
                      value={filters.estado || ''}
                      onChange={(e) => setFilters({ ...filters, estado: e.target.value || undefined })}
                      className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
                    >
                      <option value="">Todos</option>
                      <option value="Completado">Completado</option>
                      <option value="Pendiente">Pendiente</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Categoría</label>
                    <select
                      value={filters.categoria || ''}
                      onChange={(e) => setFilters({ ...filters, categoria: e.target.value || undefined })}
                      className="w-full p-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-200"
                    >
                      <option value="">Todas</option>
                      {tags.finanzas.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  onClick={clearFilters}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-xl active:scale-95 transition-all"
                >
                  LIMPIAR
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 py-4 bg-[#5A7A9A] text-white font-black rounded-xl shadow-lg shadow-[#5A7A9A]/40 active:scale-95 transition-all"
                >
                  APLICAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(() => {
        const gradoOptions = [...new Set([...tags.alumnos, ...data.alumnos.map(a => a.grado).filter(Boolean)])];
        const conceptoOptions = [...new Set([...tags.cxc, ...data.cxc.map(c => c.concepto).filter(Boolean)])];
        const categoriaOptions = [...new Set([...tags.finanzas, ...data.finanzas.map(f => f.categoria).filter(Boolean)])];
        const alumnoNames = [...new Set(data.alumnos.map(a => a.nombre))];
        const sharedProps = { tags, onTagsChange: (newTags) => setTags(newTags), gradoOptions, conceptoOptions, categoriaOptions, alumnoNames };
        return (
          <>
            <RecordModal
              isOpen={isModalOpen && currentSection !== 'home'}
              onClose={() => setIsModalOpen(false)}
              section={currentSection}
              mode="create"
              onSave={handleCreate}
              {...sharedProps}
            />
            <RecordModal
              isOpen={isEditModalOpen && currentSection !== 'home' && editingItem !== null}
              onClose={() => { setIsEditModalOpen(false); setEditingItem(null); }}
              section={currentSection}
              mode="edit"
              initialData={editingItem}
              onSave={handleUpdate}
              {...sharedProps}
            />
          </>
        );
      })()}

      {/* MODAL DE AJUSTE DE NÓMINA */}
      {(() => {
        const monthData = filterByMonth(filteredData, selectedMonth.mes, selectedMonth.anio);
        const nominaCalculada = monthData
          .filter(i => i.categoria?.toLowerCase() === 'nómina')
          .reduce((s, i) => s + parseFloat(i.monto), 0);

        return (
          <NominaAdjustmentModal
            isOpen={showNominaModal}
            onClose={() => setShowNominaModal(false)}
            selectedMonth={selectedMonth}
            nominaCalculada={nominaCalculada}
            nominaAdjustments={nominaAdjustments}
            onSave={saveNominaAdjustment}
            onRemove={removeNominaAdjustment}
          />
        );
      })()}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #CBD5E1 transparent; }
        .animate-in { animation: animate-in 0.3s ease-out; }
        @keyframes animate-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .slide-in-from-right-10 { animation: slide-in-right 0.35s ease-out; }
        @keyframes slide-in-right { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
        .zoom-in-95 { animation: zoom-in 0.2s ease-out; }
        @keyframes zoom-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .fade-in { animation: fade-in 0.4s ease-out; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default App;
