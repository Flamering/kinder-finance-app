import React, { useState } from 'react';
import {
  Search,
  Filter,
  Home,
  BarChart2,
  Settings,
  User,
  X,
  ChevronRight,
  Plus,
  Info,
  LayoutList,
  Table as TableIcon,
  Pencil,
  Trash2,
  Eye
} from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' o 'table'

  // datos simulados con estados para el Semáforo
  const [items, setItems] = useState(Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    title: `Elemento Operativo ${i + 1}`,
    desc: `Descripción técnica del flujo de trabajo ${i + 1}`,
    status: i % 3 === 0 ? 'Operativo' : i % 3 === 1 ? 'Pendiente' : 'Detenido',
    date: '2024-04-11'
  })));

  // Helper para estilos del Semáforo (Basado en TableView.md)
  const getStatusStyles = (status) => {
    switch (status) {
      case 'Operativo': return 'bg-[#A7C7E7]/20 text-[#4A5568] border-[#A7C7E7]/40';
      case 'Pendiente': return 'bg-[#FDE68A]/40 text-yellow-800 border-yellow-200';
      case 'Detenido': return 'bg-[#FCA5A5]/40 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // --- Componente: Tabla CRUD ---
  const CRUDTable = ({ data, onSelect }) => (
    <div className="w-full overflow-hidden bg-white rounded-2xl border border-[#EAEAEA] shadow-sm animate-in fade-in duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#EAEAEA] border-b border-[#EAEAEA]">
              <th className="p-4 text-[10px] font-bold text-[#74739E] uppercase tracking-widest">ID/Ref</th>
              <th className="p-4 text-[10px] font-bold text-[#74739E] uppercase tracking-widest">Elemento</th>
              <th className="p-4 text-[10px] font-bold text-[#74739E] uppercase tracking-widest text-center">Estado</th>
              <th className="p-4 text-[10px] font-bold text-[#74739E] uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-[#F7F9FB] transition-colors group">
                <td className="p-4 text-xs font-mono text-slate-400">#{item.id.toString().padStart(3, '0')}</td>
                <td className="p-4">
                  <div className="font-semibold text-slate-700 text-sm">{item.title}</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{item.desc}</div>
                </td>
                <td className="p-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-bold border ${getStatusStyles(item.status)}`}>
                    {item.status}
                  </span>
                </td>
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
                    <button className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
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

  return (
    <div className="flex h-screen w-full bg-[#F7F9FB] text-slate-800 overflow-hidden font-sans">

      {/* SIDE SIDEBAR - Explorador */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-full md:w-80 bg-white border-r border-[#EAEAEA] flex flex-col transition-transform duration-300
        ${selectedItem ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
      `}>
        {/* Header Fijo (Área Seleccionada en Screenshot) */}
        <div className="p-4 space-y-3 bg-white border-b border-[#EAEAEA]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#74739E]">Explorador</h2>
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

            {/* Botón de Cambio de Vista - Requerimiento Nuevo */}
            <button
              onClick={() => {
                setViewMode(viewMode === 'list' ? 'table' : 'list');
                setSelectedItem(null); // Reset para mostrar la tabla
              }}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-[#EAEAEA] text-[#74739E] border-transparent hover:bg-slate-200' : 'bg-[#74739E] text-white border-[#74739E]'}`}
              title={viewMode === 'list' ? "Cambiar a Vista Tabla" : "Cambiar a Vista Lista"}
            >
              {viewMode === 'list' ? <TableIcon size={18} /> : <LayoutList size={18} />}
            </button>

            <button className="p-2 bg-[#EAEAEA] rounded-xl text-[#74739E] hover:bg-slate-200 transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Contenido de la Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {items
            .filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((item) => (
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
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${getStatusStyles(item.status)}`}>
                  {item.status}
                </span>
                <ChevronRight size={14} className="text-slate-300" />
              </div>
              <h4 className="font-semibold text-slate-700 text-sm">{item.title}</h4>
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN STAGE */}
      <main className={`
        flex-1 relative transition-all duration-300 mb-16 md:mb-0 md:ml-80
      `}>
        <div className="h-full flex flex-col p-6 md:p-10 overflow-y-auto bg-[#F7F9FB]">

          {/* Lógica de Visualización basada en viewMode y selectedItem */}
          {viewMode === 'table' && !selectedItem ? (
            <div className="max-w-6xl mx-auto w-full">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#74739E]">Vista de Gestión</h1>
                <p className="text-sm text-slate-400">Control de estados y acciones rápidas para elementos operativos.</p>
              </div>
              <CRUDTable
                data={items.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()))}
                onSelect={setSelectedItem}
              />
            </div>
          ) : selectedItem ? (
            <div className="animate-in slide-in-from-right-10 duration-500 max-w-4xl mx-auto w-full">
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 bg-white shadow-sm border border-[#EAEAEA] rounded-full hover:bg-[#EAEAEA] transition-colors"
                >
                  <X size={20} />
                </button>
                <h2 className="text-2xl font-bold text-[#74739E]">Detalles del Objeto</h2>
              </div>

              <section className="bg-white p-10 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-[#EAEAEA] space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">{selectedItem.title}</h1>
                    <p className="text-slate-400 mt-1 font-mono text-sm">Registro Ref: ID-{selectedItem.id.toString().padStart(4, '0')}</p>
                  </div>
                  <span className={`px-6 py-2 rounded-full text-xs font-black uppercase border tracking-widest ${getStatusStyles(selectedItem.status)}`}>
                    {selectedItem.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 bg-[#F7F9FB] rounded-2xl border border-[#EAEAEA]">
                    <h5 className="text-[10px] font-black text-[#74739E] mb-3 uppercase tracking-tighter">Descripción Operativa</h5>
                    <p className="text-slate-600 leading-relaxed text-sm italic">"{selectedItem.desc}"</p>
                  </div>
                  <div className="p-6 bg-[#F7F9FB] rounded-2xl border border-[#EAEAEA] flex flex-col justify-center">
                    <h5 className="text-[10px] font-black text-[#74739E] mb-3 uppercase tracking-tighter">Última Actividad</h5>
                    <p className="text-lg font-bold text-slate-700">{selectedItem.date}</p>
                    <p className="text-xs text-slate-400">Sincronización automática activa</p>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <div className="w-24 h-24 bg-[#EAEAEA] rounded-[2rem] flex items-center justify-center mb-6 text-[#74739E]">
                <Info size={48} />
              </div>
              <h2 className="text-2xl font-bold text-[#74739E]">Explorador de Datos</h2>
              <p className="text-slate-400 max-w-xs mx-auto mt-2 italic">
                {viewMode === 'list'
                  ? "Selecciona un elemento de la lista para inspeccionar sus propiedades detalladas."
                  : "Cambia a vista de tabla para gestionar múltiples elementos a la vez."}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* BOTTOM NAVBAR */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#F7F9FB] border-t border-[#EAEAEA] z-50 flex items-center justify-around shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        {[
          { id: 'home', icon: Home, label: 'Inicio' },
          { id: 'stats', icon: BarChart2, label: 'Stats' },
          { id: 'profile', icon: User, label: 'Perfil' },
          { id: 'settings', icon: Settings, label: 'Ajustes' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      {/* MODAL DE CREACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#F7F9FB] rounded-[2rem] shadow-2xl p-8 border border-white animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-[#74739E] mb-6">Nuevo Registro</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombre</label>
                <input type="text" className="w-full p-3 bg-[#EAEAEA] border-none rounded-xl outline-none focus:ring-2 focus:ring-[#A7C7E7]" />
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-4 bg-[#A7C7E7] text-white font-black rounded-xl shadow-lg shadow-[#A7C7E7]/30 mt-4 active:scale-95 transition-all"
              >
                CREAR ELEMENTO
              </button>
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
