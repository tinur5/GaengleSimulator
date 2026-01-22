// components/SocBar.tsx
'use client';

interface SocBarProps {
  soc: number; // 0-100
}

export default function SocBar({ soc }: SocBarProps) {
  const pct = Math.max(0, Math.min(100, Number(soc)));
  const color = pct > 66 ? 'bg-green-500' : pct > 33 ? 'bg-yellow-400' : 'bg-red-500';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">Battery SOC</span>
        <span className="text-sm">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded h-4 overflow-hidden">
        <div className={`${color} h-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}