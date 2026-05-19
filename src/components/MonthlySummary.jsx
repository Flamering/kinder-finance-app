import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MonthlySummary = ({ total, vsAnterior }) => {
  const diff = total - vsAnterior;
  const pct = vsAnterior > 0 ? ((diff / vsAnterior) * 100).toFixed(1) : null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-card transition-shadow flex flex-col justify-between">
      <h5 className="text-[10px] font-black text-slate-600 mb-4 uppercase tracking-tighter">
        Acumulado del mes
      </h5>
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-4xl font-black text-slate-600">
          ${total.toLocaleString()}
        </div>
        {pct !== null && (
          <div className={`flex items-center gap-1 mt-2 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {diff >= 0 ? <TrendingUp size={20} className="font-black" /> : <TrendingDown size={20} className="font-black" />}
            <span className="text-sm font-bold">{Math.abs(Number(pct))}% vs mes anterior</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-500 mt-4">
        Mes anterior: ${vsAnterior.toLocaleString()}
      </p>
    </div>
  );
};

export default MonthlySummary;
