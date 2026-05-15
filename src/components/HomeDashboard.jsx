import React, { useMemo } from 'react';
import MonthlyChart from './MonthlyChart';
import MonthlySummary from './MonthlySummary';
import MiniCards from './MiniCards';
import PeriodComparison from './PeriodComparison';

const HomeDashboard = ({ cxcData = [] }) => {
  const { chartData, mesActual, vsAnterior, stats } = useMemo(() => {
    const now = new Date();
    const anio = now.getFullYear();
    const mes = now.getMonth();

    const filtroMes = (item) => {
      const f = new Date(item.fecha_emision);
      return f.getFullYear() === anio && f.getMonth() === mes && !item.eliminado;
    };
    const filtroMesAnterior = (item) => {
      const f = new Date(item.fecha_emision);
      const m = mes === 0 ? 11 : mes - 1;
      const a = mes === 0 ? anio - 1 : anio;
      return f.getFullYear() === a && f.getMonth() === m && !item.eliminado;
    };

    const delMes = cxcData.filter(filtroMes);
    const delMesAnterior = cxcData.filter(filtroMesAnterior);

    const mesActual = delMes.reduce((s, i) => s + parseFloat(i.monto || 0), 0);
    const vsAnterior = delMesAnterior.reduce((s, i) => s + parseFloat(i.monto || 0), 0);

    const diasDelMes = new Date(anio, mes + 1, 0).getDate();
    const agrupado = {};
    delMes.forEach((i) => {
      const dia = new Date(i.fecha_emision).getDate();
      agrupado[dia] = (agrupado[dia] || 0) + parseFloat(i.monto || 0);
    });

    const chartData = Array.from({ length: diasDelMes }, (_, i) => {
      const dia = i + 1;
      const fecha = new Date(anio, mes, dia);
      return {
        day: dia,
        label: fecha.toLocaleDateString('es', { day: 'numeric', month: 'short' }),
        total: agrupado[dia] || 0,
      };
    });

    const mayor = delMes.reduce((max, i) => Math.max(max, parseFloat(i.monto || 0)), 0);
    const porVencer = delMes.filter((i) => i.estado === 'Pendiente' || i.estado === 'Vencido').length;

    return { chartData, mesActual, vsAnterior, stats: { facturas: delMes.length, mayorMonto: mayor, porVencer } };
  }, [cxcData]);

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-[#74739E] mb-1">¿Cómo vamos hoy?</h2>
      <p className="text-sm text-slate-400 mb-6">Resumen de cuentas por cobrar del mes actual</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <MonthlyChart data={chartData} />
        </div>
        <MonthlySummary total={mesActual} vsAnterior={vsAnterior} />
      </div>

      <MiniCards {...stats} />

      <div className="mt-10">
        <PeriodComparison cxcData={cxcData} />
      </div>
    </div>
  );
};

export default HomeDashboard;
