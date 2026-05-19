import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg border border-slate-200 rounded-xl p-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className={`text-sm font-black ${entry.dataKey === 'ingresos' ? 'text-green-600' : 'text-red-600'}`}>
          {entry.dataKey === 'ingresos' ? '+' : '-'}${Math.abs(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const MonthlyFinanceSummary = ({ data = [] }) => {
  const { chartData, ingresos, gastos, neto } = useMemo(() => {
    const now = new Date();
    const anio = now.getFullYear();
    const mes = now.getMonth();

    const delMes = data.filter((item) => {
      const f = new Date(item.fecha);
      return f.getFullYear() === anio && f.getMonth() === mes && !item.eliminado;
    });

    const ingresos = delMes
      .filter((i) => i.tipo === 'Ingreso')
      .reduce((s, i) => s + parseFloat(i.monto || 0), 0);
    const gastos = delMes
      .filter((i) => i.tipo === 'Gasto')
      .reduce((s, i) => s + parseFloat(i.monto || 0), 0);
    const neto = ingresos - gastos;

    const diasDelMes = new Date(anio, mes + 1, 0).getDate();
    const agrupado = {};
    delMes.forEach((i) => {
      const dia = new Date(i.fecha).getDate();
      if (!agrupado[dia]) agrupado[dia] = { ingresos: 0, gastos: 0 };
      const monto = parseFloat(i.monto || 0);
      if (i.tipo === 'Ingreso') agrupado[dia].ingresos += monto;
      else agrupado[dia].gastos += monto;
    });

    const chartData = Array.from({ length: diasDelMes }, (_, i) => {
      const dia = i + 1;
      const fecha = new Date(anio, mes, dia);
      return {
        day: dia,
        label: fecha.toLocaleDateString('es', { day: 'numeric', month: 'short' }),
        ingresos: agrupado[dia]?.ingresos || 0,
        gastos: agrupado[dia]?.gastos || 0,
      };
    });

    return { chartData, ingresos, gastos, neto };
  }, [data]);

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-slate-600 mb-1">Resumen Financiero</h2>
      <p className="text-sm text-slate-500 mb-6">Ingresos y gastos del mes</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-card transition-shadow">
            <h5 className="text-[10px] font-black text-slate-600 mb-4 uppercase tracking-tighter">
              Ingresos / Gastos del mes (día a día)
            </h5>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorIngresos)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#22c55e', stroke: 'white', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="gastos"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#colorGastos)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#ef4444', stroke: 'white', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <h5 className="text-[10px] font-black text-slate-600 mb-4 uppercase tracking-tighter">
            Balance del mes
          </h5>
          <div className="flex-1 flex flex-col justify-center space-y-3">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ingresos</div>
              <div className="text-2xl font-black text-green-600">+${ingresos.toLocaleString()}</div>
            </div>
            <div className="border-t border-[#EAEAEA]" />
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Gastos</div>
              <div className="text-2xl font-black text-red-600">-${gastos.toLocaleString()}</div>
            </div>
            <div className="border-t border-[#EAEAEA] pt-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Neto</div>
              <div className={`text-2xl font-black ${neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {neto >= 0 ? '+' : ''}${neto.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyFinanceSummary;
