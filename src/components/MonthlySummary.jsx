import React from 'react';

const MonthlySummary = ({ total, vsAnterior }) => {
  const diff = total - vsAnterior;
  const pct = vsAnterior > 0 ? ((diff / vsAnterior) * 100).toFixed(1) : null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#EAEAEA] flex flex-col justify-between">
      <h5 className="text-[10px] font-black text-[#74739E] mb-4 uppercase tracking-tighter">
        Acumulado del mes
      </h5>
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-4xl font-black text-[#74739E]">
          ${total.toLocaleString()}
        </div>
        {pct !== null && (
          <div className={`flex items-center gap-1 mt-2 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span className="text-lg font-black">{diff >= 0 ? '↑' : '↓'}</span>
            <span className="text-sm font-bold">{Math.abs(Number(pct))}% vs mes anterior</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-400 mt-4">
        Mes anterior: ${vsAnterior.toLocaleString()}
      </p>
    </div>
  );
};

export default MonthlySummary;
