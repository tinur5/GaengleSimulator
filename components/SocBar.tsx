// components/SocBar.tsx
'use client';

interface SocBarProps {
  label: string;
  soc: number; // 0-100
  capacity: number; // in kWh
}

export default function SocBar({ label, soc, capacity }: SocBarProps) {
  const pct = Math.max(0, Math.min(100, Number(soc)));
  const energyStored = (pct / 100) * capacity;
  const color = pct > 66 ? 'bg-green-500' : pct > 33 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = pct > 66 ? 'text-green-600' : pct > 33 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = pct > 66 ? 'bg-green-100' : pct > 33 ? 'bg-yellow-100' : 'bg-red-100';
  const borderColor = pct > 66 ? 'border-green-400' : pct > 33 ? 'border-yellow-400' : 'border-red-400';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-800">{label}</span>
        <span className={`font-bold ${textColor}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className={`w-full ${bgColor} rounded-lg h-8 overflow-hidden border-2 ${borderColor} shadow-sm`}>
        <div 
          className={`${color} h-full transition-all duration-300 flex items-center justify-end pr-2`} 
          style={{ width: `${pct}%` }}
        >
          {pct > 10 && <span className="text-white font-bold text-xs">{energyStored.toFixed(1)} kWh</span>}
        </div>
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-600">
        <span>0 kWh</span>
        <span>{capacity} kWh</span>
      </div>
    </div>
  );
}