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
  Plus,
  Info,
  LayoutList,
  Table as TableIcon,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from './lib/supabase';

// --- Constantes de Diseño ---
const COLORS = {
  primary: '#A7C7E7',
  secondary: '#EAEAEA',
  tertiary: '#74739E',
  neutral: '#F7F9FB'
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

  // Estados para formulario de creación
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  // Estados para sistema de etiquetas
  const [tags, setTags] = useState({ alumnos: [], cxc: [], finanzas: [] });
  const [newTag, setNewTag] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  // Estado para scroll infinito (chunks de 8)
  const [visibleCount, setVisibleCount] = useState(8);
  const loadMoreRef = React.useRef(null);
  const visibleCountRef = React.useRef(visibleCount);
  const filteredDataRef = React.useRef([]);
  const listContainerRef = React.useRef(null);

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

  // Función para agregar nueva etiqueta
  const addTag = (section) => {
    if (!newTag.trim()) return;
    const tagList = tags[section] || [];
    if (!tagList.includes(newTag.trim())) {
      const updatedTags = { ...tags, [section]: [...tagList, newTag.trim()] };
      setTags(updatedTags);
    }
    setNewTag('');
    setShowNewTagInput(false);
  };

  // Función para eliminar etiqueta
  const removeTag = (section, tagToRemove) => {
    const updatedTags = { ...tags, [section]: tags[section].filter(t => t !== tagToRemove) };
    setTags(updatedTags);
  };

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

  // Cargar datos al cambiar de sección
  useEffect(() => {
    if (currentSection === 'home' || !currentSection) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data: result, error: err } = await supabase
          .from(currentSection)
          .select('*')
          .eq('eliminado', false)
          .order('created_at', { ascending: false });
        
        if (err) throw err;
        setData(prev => ({ ...prev, [currentSection]: result || [] }));
      } catch (err) {
        console.error(`Error fetching ${currentSection}:`, err);
        setError(`Error al cargar ${currentSection}: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentSection]);

  const sectionData = data[currentSection] || [];

  // Función de Soft Delete
  const handleSoftDelete = async (itemId) => {
    if (!currentSection || currentSection === 'home') return;
    
    try {
      const { error: err } = await supabase
        .from(currentSection)
        .update({ eliminado: true })
        .eq('id', itemId);
      
      if (err) throw err;
      
      // Actualizar estado local
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
  const handleCreate = async () => {
    if (!currentSection || currentSection === 'home') return;
    
    setFormErrors({});
    
    try {
      const recordToCreate = {
        ...formData,
        eliminado: false,
      };

      const { data: result, error: err } = await supabase
        .from(currentSection)
        .insert([recordToCreate])
        .select();
      
      if (err) throw err;
      
      // Actualizar estado local
      setData(prev => ({
        ...prev,
        [currentSection]: [result[0], ...prev[currentSection]]
      }));
      
      // Limpiar formulario
      setFormData({});
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error al crear:', err);
      setFormErrors({ general: err.message });
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
        case 'Activo': return 'bg-[#A7C7E7]/20 text-[#4A5568] border-[#A7C7E7]/40';
        case 'Inactivo': return 'bg-slate-100 text-slate-600 border-slate-200';
        case 'Moroso': return 'bg-[#FCA5A5]/40 text-red-800 border-red-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
    }
    if (section === 'cxc') {
      switch (status) {
        case 'Pagado': return 'bg-[#A7C7E7]/20 text-[#4A5568] border-[#A7C7E7]/40';
        case 'Pendiente': return 'bg-[#FDE68A]/40 text-yellow-800 border-yellow-200';
        case 'Vencido': return 'bg-[#FCA5A5]/40 text-red-800 border-red-200';
        case 'Parcial': return 'bg-[#FDE68A]/40 text-yellow-800 border-yellow-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
    }
    if (section === 'finanzas') {
      switch (status) {
        case 'Completado': return 'bg-[#A7C7E7]/20 text-[#4A5568] border-[#A7C7E7]/40';
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
                <div className="text-[10px] text-slate-400">{item.grado} • {item.tutor}</div>
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
                <div className="text-[10px] text-slate-400">{item.concepto}</div>
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
                <div className="text-[10px] text-slate-400">{item.tipo} • {item.descripcion || 'Sin descripción'}</div>
              </td>
              <td className="p-4 text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-bold border ${getStatusStyles(item.estado, section)}`}>
                  {item.estado}
                </span>
              </td>
              <td className="p-4 text-sm font-semibold text-slate-700">${parseFloat(item.monto).toLocaleString()}</td>
            </>
          );
        default:
          return null;
      }
    };

    return (
      <div className="w-full overflow-hidden bg-white rounded-2xl border border-[#EAEAEA] shadow-sm animate-in fade-in duration-500">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#EAEAEA] border-b border-[#EAEAEA]">
                <th className="p-4 text-[10px] font-bold text-[#74739E] uppercase tracking-widest">
                  {section === 'alumnos' ? 'Alumno' : section === 'cxc' ? 'Concepto' : 'Categoría'}
                </th>
                <th className="p-4 text-[10px] font-bold text-[#74739E] uppercase tracking-widest text-center">Estado</th>
                <th className="p-4 text-[10px] font-bold text-[#74739E] uppercase tracking-widest">
                  {section === 'alumnos' ? 'Inscripción' : section === 'cxc' ? 'Monto' : 'Monto'}
                </th>
                <th className="p-4 text-[10px] font-bold text-[#74739E] uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-[#F7F9FB] transition-colors group">
                  {renderTableCell(item, section)}
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onSelect(item)}
                        className="p-2 text-[#A7C7E7] hover:bg-[#A7C7E7]/10 rounded-lg transition-colors"
                        title="Ver Detalle"
                      >
                        <Eye size={16} />
                      </button>
                      <button className="p-2 text-[#74739E] hover:bg-[#74739E]/10 rounded-lg transition-colors" title="Editar">
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
    <div className="flex h-screen w-full bg-[#F7F9FB] text-slate-800 overflow-hidden font-sans">

      {/* SIDE SIDEBAR - Explorador */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-full md:static md:z-auto md:w-80 md:flex-shrink-0 bg-white border-r border-[#EAEAEA] flex flex-col transition-transform duration-300
        ${selectedItem ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
      `}>
        {/* Header Fijo (Área Seleccionada en Screenshot) */}
        <div className="p-4 space-y-3 bg-white border-b border-[#EAEAEA]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#74739E]">
              {currentSection === 'home' ? 'Inicio' : 
               currentSection === 'alumnos' ? 'Alumnos' : 
               currentSection === 'cxc' ? 'Cuentas por Cobrar' : 'Finanzas'}
            </h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 bg-[#A7C7E7] text-white rounded-lg shadow-md hover:brightness-105 active:scale-95 transition-all"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 bg-[#EAEAEA] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#A7C7E7] transition-all"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Botón de Cambio de Vista */}
            <button
              onClick={() => setSelectedItem(selectedItem === '__table__' ? null : '__table__')}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center ${selectedItem === '__table__' ? 'bg-[#74739E] text-white border-[#74739E]' : 'bg-[#EAEAEA] text-[#74739E] border-transparent hover:bg-slate-200'}`}
              title={selectedItem === '__table__' ? "Volver a Lista" : "Mostrar Tabla"}
            >
              {selectedItem === '__table__' ? <LayoutList size={18} /> : <TableIcon size={18} />}
            </button>

            <button 
              onClick={() => setIsFilterOpen(true)}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center ${Object.keys(filters).length > 0 ? 'bg-[#74739E] text-white border-[#74739E]' : 'bg-[#EAEAEA] text-[#74739E] border-transparent hover:bg-slate-200'}`}
              title="Filtrar"
            >
              <Filter size={18} />
              {Object.keys(filters).length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
          </div>
        </div>

        {/* Contenido de la Lista */}
        <div ref={listContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {currentSection === 'home' ? (
            <div className="text-center text-slate-400 py-10">
              <Home size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">Bienvenido al sistema de gestión</p>
              <p className="text-xs mt-2">Selecciona una sección para comenzar</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center text-slate-400 py-10">
              <p className="text-sm">No hay registros para mostrar</p>
            </div>
          ) : (
            <>
              {filteredData.slice(0, visibleCount).map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`
                    p-4 rounded-2xl cursor-pointer transition-all border
                    ${selectedItem?.id === item.id
                      ? 'bg-[#F7F9FB] border-[#74739E] shadow-inner'
                      : 'bg-white border-[#EAEAEA] hover:border-[#A7C7E7] hover:shadow-sm'}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${getStatusStyles(item.estado, currentSection)}`}>
                      {item.estado}
                    </span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                  <h4 className="font-semibold text-slate-700 text-sm">
                    {currentSection === 'alumnos' ? item.nombre :
                     currentSection === 'cxc' ? `${item.alumno_nombre} - ${item.concepto}` :
                     `${item.tipo}: ${item.categoria}`}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                    {currentSection === 'alumnos' ? `${item.grado} • ${item.tutor}` :
                     currentSection === 'cxc' ? `$${item.monto} • Vence: ${item.fecha_vencimiento}` :
                     `$${parseFloat(item.monto).toLocaleString()} • ${item.fecha}`}
                  </p>
                </div>
              ))}
              {/* Indicador de carga más items */}
              {visibleCount < filteredData.length && (
                <div className="text-center py-3">
                  <div className="w-5 h-5 border-2 border-[#A7C7E7] border-t-transparent rounded-full animate-spin mx-auto" />
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
        <div className="h-full overflow-y-auto bg-[#F7F9FB]">
          <div className="w-full md:max-w-5xl md:mx-auto p-6 md:p-10">
          {/* Lógica de Visualización basada en viewMode y selectedItem */}
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Loader2 size={48} className="text-[#74739E] animate-spin mb-4" />
              <p className="text-slate-400">Cargando datos...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <AlertCircle size={48} className="text-red-400 mb-4" />
              <h2 className="text-xl font-bold text-red-600 mb-2">Error de Conexión</h2>
              <p className="text-slate-400 max-w-md mx-auto">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-6 py-3 bg-[#A7C7E7] text-white rounded-xl hover:brightness-105"
              >
                Reintentar
              </button>
            </div>
          ) : currentSection !== 'home' && selectedItem === '__table__' ? (
            <div className="animate-in slide-in-from-right-10 duration-500 w-full">
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 bg-white shadow-sm border border-[#EAEAEA] rounded-full hover:bg-[#EAEAEA] transition-colors"
                >
                  <X size={20} />
                </button>
                <h2 className="text-2xl font-bold text-[#74739E]">
                  {currentSection === 'alumnos' ? 'Gestión de Alumnos' :
                   currentSection === 'cxc' ? 'Cuentas por Cobrar' : 'Gestión Financiera'}
                </h2>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {currentSection === 'alumnos' && (() => {
                    const activos = filteredData.filter(i => i.estado === 'Activo').length;
                    const morosos = filteredData.filter(i => i.estado === 'Moroso').length;
                    const inactivos = filteredData.filter(i => i.estado === 'Inactivo').length;
                    return (
                      <>
                        <div className="p-4 rounded-2xl bg-[#A7C7E7]/10 border border-[#A7C7E7]/30">
                          <div className="text-2xl font-black text-[#74739E]">{activos}</div>
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
                        <div className="p-4 rounded-2xl bg-[#A7C7E7]/10 border border-[#A7C7E7]/30">
                          <div className="text-2xl font-black text-[#74739E]">${totalCobrar.toLocaleString()}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Total por Cobrar</div>
                        </div>
                      </>
                    );
                  })()}
                  {currentSection === 'finanzas' && (() => {
                    const ingresos = filteredData.filter(i => i.tipo === 'Ingreso').reduce((s, i) => s + parseFloat(i.monto), 0);
                    const gastos = filteredData.filter(i => i.tipo === 'Gasto').reduce((s, i) => s + parseFloat(i.monto), 0);
                    const pendientes = filteredData.filter(i => i.estado === 'Pendiente').length;
                    return (
                      <>
                        <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
                          <div className="text-2xl font-black text-green-600">+${ingresos.toLocaleString()}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Ingresos</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                          <div className="text-2xl font-black text-red-600">-${gastos.toLocaleString()}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Gastos</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
                          <div className="text-2xl font-black text-yellow-700">{pendientes}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Pendientes</div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EAEAEA]">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                        {currentSection === 'alumnos' ? 'Alumnos' :
                         currentSection === 'cxc' ? 'Cuentas por Cobrar' : 'Finanzas'}
                      </h1>
                      <p className="text-slate-400 mt-1 text-sm">
                        {currentSection === 'alumnos' ? 'Control de alumnos y su información académica.' :
                         currentSection === 'cxc' ? 'Seguimiento de pagos y cuentas pendientes.' :
                         'Registro de ingresos y gastos del kinder.'}
                      </p>
                    </div>
                    <span className="px-4 py-2 rounded-full text-xs font-black uppercase border tracking-widest bg-[#F7F9FB] border-[#EAEAEA] text-slate-500">
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
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 bg-white shadow-sm border border-[#EAEAEA] rounded-full hover:bg-[#EAEAEA] transition-colors"
                >
                  <X size={20} />
                </button>
                <h2 className="text-2xl font-bold text-[#74739E]">
                  {currentSection === 'alumnos' ? 'Detalle del Alumno' :
                   currentSection === 'cxc' ? 'Detalle de Cuenta' : 'Detalle Financiero'}
                </h2>
              </div>

              {/* Header card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EAEAEA] mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                      {currentSection === 'alumnos' ? selectedItem.nombre :
                       currentSection === 'cxc' ? selectedItem.concepto :
                       selectedItem.categoria}
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">
                      Registro Ref: ID-{selectedItem.id.toString().padStart(4, '0')}
                    </p>
                  </div>
                  <span className={`px-5 py-2 rounded-full text-xs font-black uppercase border tracking-widest ${getStatusStyles(selectedItem.estado, currentSection)}`}>
                    {selectedItem.estado}
                  </span>
                </div>
              </div>

              {/* Detail cards - full width grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentSection === 'alumnos' ? (
                  <>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EAEAEA]">
                      <h5 className="text-[10px] font-black text-[#74739E] mb-4 uppercase tracking-tighter">Información Académica</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-[#EAEAEA]">
                          <span className="text-sm text-slate-400">Grado</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.grado}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#EAEAEA]">
                          <span className="text-sm text-slate-400">Tutor</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.tutor}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#EAEAEA]">
                          <span className="text-sm text-slate-400">Email</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.email}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-slate-400">Teléfono</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.telefono}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EAEAEA]">
                      <h5 className="text-[10px] font-black text-[#74739E] mb-4 uppercase tracking-tighter">Fecha de Inscripción</h5>
                      <p className="text-2xl font-bold text-slate-700 mb-3">{selectedItem.fecha_inscripcion}</p>
                      <p className="text-sm text-slate-400">Estado actual: {selectedItem.status}</p>
                    </div>
                  </>
                ) : currentSection === 'cxc' ? (
                  <>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EAEAEA]">
                      <h5 className="text-[10px] font-black text-[#74739E] mb-4 uppercase tracking-tighter">Información de Pago</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-[#EAEAEA]">
                          <span className="text-sm text-slate-400">Alumno</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.alumno_nombre}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#EAEAEA]">
                          <span className="text-sm text-slate-400">Concepto</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.concepto}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#EAEAEA]">
                          <span className="text-sm text-slate-400">Monto Total</span>
                          <span className="text-sm font-bold text-slate-700">${parseFloat(selectedItem.monto).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#EAEAEA]">
                          <span className="text-sm text-slate-400">Monto Pagado</span>
                          <span className="text-sm font-semibold text-green-600">${parseFloat(selectedItem.monto_pagado).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-slate-400">Saldo Pendiente</span>
                          <span className="text-sm font-bold text-red-600">${(parseFloat(selectedItem.monto) - parseFloat(selectedItem.monto_pagado)).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EAEAEA]">
                      <h5 className="text-[10px] font-black text-[#74739E] mb-4 uppercase tracking-tighter">Fechas</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-[#EAEAEA]">
                          <span className="text-sm text-slate-400">Emisión</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.fecha_emision}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-slate-400">Vencimiento</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.fecha_vencimiento}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 mt-4">Estado: {selectedItem.estado}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EAEAEA]">
                      <h5 className="text-[10px] font-black text-[#74739E] mb-4 uppercase tracking-tighter">Información Financiera</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-[#EAEAEA]">
                          <span className="text-sm text-slate-400">Tipo</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.tipo}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#EAEAEA]">
                          <span className="text-sm text-slate-400">Categoría</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.categoria}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#EAEAEA]">
                          <span className="text-sm text-slate-400">Monto</span>
                          <span className="text-lg font-bold text-slate-700">${parseFloat(selectedItem.monto).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#EAEAEA]">
                          <span className="text-sm text-slate-400">Método de Pago</span>
                          <span className="text-sm font-semibold text-slate-700">{selectedItem.metodo_pago || 'N/A'}</span>
                        </div>
                        <div className="py-2">
                          <span className="text-sm text-slate-400 block mb-1">Descripción</span>
                          <p className="text-sm text-slate-600">{selectedItem.descripcion || 'Sin descripción'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EAEAEA]">
                      <h5 className="text-[10px] font-black text-[#74739E] mb-4 uppercase tracking-tighter">Fecha de Registro</h5>
                      <p className="text-2xl font-bold text-slate-700 mb-3">{selectedItem.fecha}</p>
                      <p className="text-sm text-slate-400">Estado: {selectedItem.estado}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              {currentSection === 'home' ? (
                <>
                  <div className="w-24 h-24 bg-[#EAEAEA] rounded-[2rem] flex items-center justify-center mb-6 text-[#74739E]">
                    <Home size={48} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#74739E]">Dashboard Principal</h2>
                  <p className="text-slate-400 max-w-md mx-auto mt-2">
                    Bienvenido al sistema de gestión del kinder. Selecciona una sección en la barra inferior para comenzar.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 bg-[#EAEAEA] rounded-[2rem] flex items-center justify-center mb-6 text-[#74739E]">
                    {currentSection === 'alumnos' ? <Users size={48} /> :
                     currentSection === 'cxc' ? <DollarSign size={48} /> :
                     <TrendingUp size={48} />}
                  </div>
                  <h2 className="text-2xl font-bold text-[#74739E]">
                    {currentSection === 'alumnos' ? 'Alumnos' :
                     currentSection === 'cxc' ? 'Cuentas por Cobrar' : 'Finanzas'}
                  </h2>
                  <p className="text-slate-400 max-w-md mx-auto mt-2">
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
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#F7F9FB] border-t border-[#EAEAEA] z-50 flex items-center justify-around shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
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
              {isActive && <div className="absolute top-0 w-8 h-1 bg-[#A7C7E7] rounded-b-full shadow-[0_2px_5px_#A7C7E7]" />}
              <Icon
                size={22}
                className={`transition-colors ${isActive ? 'text-[#74739E]' : 'text-slate-300'}`}
              />
              <span className={`text-[9px] font-bold mt-1 transition-colors ${isActive ? 'text-[#74739E]' : 'text-slate-300'}`}>
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
          <div className="relative w-full max-w-lg bg-[#F7F9FB] rounded-[2rem] shadow-2xl p-8 border border-white animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-[#74739E]">
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
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                    <select
                      value={filters.estado || ''}
                      onChange={(e) => setFilters({ ...filters, estado: e.target.value || undefined })}
                      className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                    >
                      <option value="">Todos</option>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="Moroso">Moroso</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Grado</label>
                    <select
                      value={filters.grado || ''}
                      onChange={(e) => setFilters({ ...filters, grado: e.target.value || undefined })}
                      className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
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
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                    <select
                      value={filters.estado || ''}
                      onChange={(e) => setFilters({ ...filters, estado: e.target.value || undefined })}
                      className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                    >
                      <option value="">Todos</option>
                      <option value="Pagado">Pagado</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Vencido">Vencido</option>
                      <option value="Parcial">Parcial</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Concepto</label>
                    <select
                      value={filters.concepto || ''}
                      onChange={(e) => setFilters({ ...filters, concepto: e.target.value || undefined })}
                      className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
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
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo</label>
                    <select
                      value={filters.tipo || ''}
                      onChange={(e) => setFilters({ ...filters, tipo: e.target.value || undefined })}
                      className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                    >
                      <option value="">Todos</option>
                      <option value="Ingreso">Ingreso</option>
                      <option value="Gasto">Gasto</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado</label>
                    <select
                      value={filters.estado || ''}
                      onChange={(e) => setFilters({ ...filters, estado: e.target.value || undefined })}
                      className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                    >
                      <option value="">Todos</option>
                      <option value="Completado">Completado</option>
                      <option value="Pendiente">Pendiente</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Categoría</label>
                    <select
                      value={filters.categoria || ''}
                      onChange={(e) => setFilters({ ...filters, categoria: e.target.value || undefined })}
                      className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]"
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
                  className="flex-1 py-4 bg-[#EAEAEA] text-[#74739E] font-black rounded-xl active:scale-95 transition-all"
                >
                  LIMPIAR
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 py-4 bg-[#A7C7E7] text-white font-black rounded-xl shadow-lg shadow-[#A7C7E7]/30 active:scale-95 transition-all"
                >
                  APLICAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CREACIÓN */}
      {isModalOpen && currentSection !== 'home' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#F7F9FB] rounded-[2rem] shadow-2xl p-8 border border-white animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-[#74739E] mb-6">
              {currentSection === 'alumnos' ? 'Nuevo Alumno' :
               currentSection === 'cxc' ? 'Nueva Cuenta por Cobrar' : 'Nuevo Registro Financiero'}
            </h3>

            {formErrors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {formErrors.general}
              </div>
            )}

            <div className="space-y-4">
              {currentSection === 'alumnos' && (
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
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.alumnos.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setFormData({ ...formData, grado: tag })}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${formData.grado === tag ? 'bg-[#A7C7E7] text-white border-[#A7C7E7]' : 'bg-white text-slate-600 border-[#EAEAEA] hover:border-[#A7C7E7]'}`}
                        >
                          {tag}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowNewTagInput(!showNewTagInput)}
                        className="px-3 py-1 rounded-full text-xs font-bold border border-dashed border-slate-400 text-slate-400 hover:border-[#A7C7E7] hover:text-[#A7C7E7]"
                      >
                        + Nuevo
                      </button>
                    </div>
                    {showNewTagInput && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTag('alumnos')}
                          placeholder="Nueva etiqueta..."
                          className="flex-1 p-2 bg-[#EAEAEA] border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                        />
                        <button onClick={() => addTag('alumnos')} className="px-4 py-2 bg-[#A7C7E7] text-white rounded-lg">✓</button>
                      </div>
                    )}
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

              {currentSection === 'cxc' && (
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
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.cxc.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setFormData({ ...formData, concepto: tag })}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${formData.concepto === tag ? 'bg-[#A7C7E7] text-white border-[#A7C7E7]' : 'bg-white text-slate-600 border-[#EAEAEA] hover:border-[#A7C7E7]'}`}
                        >
                          {tag}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowNewTagInput(!showNewTagInput)}
                        className="px-3 py-1 rounded-full text-xs font-bold border border-dashed border-slate-400 text-slate-400 hover:border-[#A7C7E7] hover:text-[#A7C7E7]"
                      >
                        + Nuevo
                      </button>
                    </div>
                    {showNewTagInput && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTag('cxc')}
                          placeholder="Nuevo concepto..."
                          className="flex-1 p-2 bg-[#EAEAEA] border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                        />
                        <button onClick={() => addTag('cxc')} className="px-4 py-2 bg-[#A7C7E7] text-white rounded-lg">✓</button>
                      </div>
                    )}
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

              {currentSection === 'finanzas' && (
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
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.finanzas.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setFormData({ ...formData, categoria: tag })}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${formData.categoria === tag ? 'bg-[#A7C7E7] text-white border-[#A7C7E7]' : 'bg-white text-slate-600 border-[#EAEAEA] hover:border-[#A7C7E7]'}`}
                        >
                          {tag}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowNewTagInput(!showNewTagInput)}
                        className="px-3 py-1 rounded-full text-xs font-bold border border-dashed border-slate-400 text-slate-400 hover:border-[#A7C7E7] hover:text-[#A7C7E7]"
                      >
                        + Nuevo
                      </button>
                    </div>
                    {showNewTagInput && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTag('finanzas')}
                          placeholder="Nueva categoría..."
                          className="flex-1 p-2 bg-[#EAEAEA] border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#A7C7E7]"
                        />
                        <button onClick={() => addTag('finanzas')} className="px-4 py-2 bg-[#A7C7E7] text-white rounded-lg">✓</button>
                      </div>
                    )}
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
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-[#EAEAEA] text-[#74739E] font-black rounded-xl active:scale-95 transition-all"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 py-4 bg-[#A7C7E7] text-white font-black rounded-xl shadow-lg shadow-[#A7C7E7]/30 active:scale-95 transition-all"
                >
                  CREAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #EAEAEA; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #74739E; }
      `}</style>
    </div>
  );
};

export default App;
