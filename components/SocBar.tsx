// components/SocBar.tsx
'use client';

interface SocBarProps {
  soc: number;
}

export default function SocBar({ soc }: SocBarProps) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-4">
      <div
        className="bg-blue-600 h-4 rounded-full transition-all duration-300"
        style={{ width: `${soc}%` }}
      ></div>
      <p className="text-sm mt-1">{soc.toFixed(1)}% SOC</p>
    </div>
  );
}