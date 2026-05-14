import React from 'react';

const cards = [
  {
    key: 'facturas',
    label: 'Facturas del mes',
    color: 'bg-[#A7C7E7]/10 border-[#A7C7E7]/30 text-[#74739E]',
  },
  {
    key: 'mayor',
    label: 'Mayor monto',
    color: 'bg-green-50 border-green-200 text-green-700',
  },
  {
    key: 'vencer',
    label: 'Por vencer',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  },
];

const MiniCards = ({ facturas, mayorMonto, porVencer }) => {
  const values = { facturas, mayor: `$${mayorMonto.toLocaleString()}`, vencer: porVencer };

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.key} className={`p-4 rounded-2xl border ${c.color}`}>
          <div className="text-2xl font-black">{values[c.key]}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide mt-1">{c.label}</div>
        </div>
      ))}
    </div>
  );
};

export default MiniCards;
