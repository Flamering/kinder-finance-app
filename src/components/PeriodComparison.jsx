import React, { useMemo } from 'react';
import MonthlyChart from './MonthlyChart';

const PeriodComparison = ({ cxcData = [] }) => {
  const { chartData, totalAnterior, totalActual, variacion, variacionPct } = useMemo(() => {
    const now = new Date();
    const anio = now.getFullYear();
    const mes = now.getMonth();

    const mesAnt = mes === 0 ? 11 : mes - 1;
    const anioAnt = mes === 0 ? anio - 1 : anio;

    const filtro = (item, m, a) => {
      const f = new Date(item.fecha_emision);
      return f.getFullYear() === a && f.getMonth() === m && !item.eliminado;
    };

    const delMes = cxcData.filter((i) => filtro(i, mes, anio));
    const delAnterior = cxcData.filter((i) => filtro(i, mesAnt, anioAnt));

    const totalActual = delMes.reduce((s, i) => s + parseFloat(i.monto || 0), 0);
    const totalAnterior = delAnterior.reduce((s, i) => s + parseFloat(i.monto || 0), 0);
    const variacion = totalActual - totalAnterior;
    const variacionPct = totalAnterior > 0 ? (variacion / totalAnterior) * 100 : 0;

    const dias = new Date(anioAnt, mesAnt + 1, 0).getDate();
    const agrupado = {};
    delAnterior.forEach((i) => {
      const dia = new Date(i.fecha_emision).getDate();
      agrupado[dia] = (agrupado[dia] || 0) + parseFloat(i.monto || 0);
    });

    const chartData = Array.from({ length: dias }, (_, i) => {
      const dia = i + 1;
      const fecha = new Date(anioAnt, mesAnt, dia);
      return {
        day: dia,
        label: fecha.toLocaleDateString('es', { day: 'numeric', month: 'short' }),
        total: agrupado[dia] || 0,
      };
    });

    return { chartData, totalAnterior, totalActual, variacion, variacionPct };
  }, [cxcData]);

  const pctFormatted = `${variacion >= 0 ? '+' : ''}${variacionPct.toFixed(1)}%`;

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-[#74739E] mb-1">Variación vs periodo anterior</h2>
      <p className="text-sm text-slate-400 mb-6">Resumen de cuentas por cobrar contra el mes pasado</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <MonthlyChart data={chartData} />
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EAEAEA] flex flex-col justify-between">
          <h5 className="text-[10px] font-black text-[#74739E] mb-4 uppercase tracking-tighter">
            Total mes anterior
          </h5>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-4xl font-black text-[#74739E]">
              ${totalAnterior.toLocaleString()}
            </div>
            <div className={`flex items-center gap-1 mt-2 ${variacion >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <span className="text-lg font-black">{variacion >= 0 ? '↑' : '↓'}</span>
              <span className="text-sm font-bold">{pctFormatted}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">Variación respecto al mes actual</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="text-2xl font-black text-slate-600">${totalAnterior.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">Periodo anterior</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#A7C7E7]/10 border border-[#A7C7E7]/30">
          <div className="text-2xl font-black text-[#74739E]">${totalActual.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">Periodo actual</div>
        </div>
        <div className={`p-4 rounded-2xl border ${variacion >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`text-2xl font-black ${variacion >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {variacion >= 0 ? '+' : ''}${Math.abs(variacion).toLocaleString()}
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">Variación</div>
        </div>
      </div>
    </div>
  );
};

export default PeriodComparison;
