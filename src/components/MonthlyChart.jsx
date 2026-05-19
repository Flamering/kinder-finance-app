import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg border border-slate-200 rounded-xl p-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
      <p className="text-sm font-black text-slate-700">${payload[0].value.toLocaleString()}</p>
    </div>
  );
};

const MonthlyChart = ({ data }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-card transition-shadow">
    <h5 className="text-[10px] font-black text-slate-600 mb-4 uppercase tracking-tighter">
      CxC — Ingresos del mes (día a día)
    </h5>
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#A7C7E7" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#A7C7E7" stopOpacity={0} />
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
          dataKey="total"
          stroke="#A7C7E7"
          strokeWidth={2}
          fill="url(#colorTotal)"
          dot={false}
          activeDot={{ r: 4, fill: '#74739E', stroke: 'white', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export default MonthlyChart;
