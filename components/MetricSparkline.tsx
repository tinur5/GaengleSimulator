'use client';

import { useMemo } from 'react';

interface MetricSparklineProps {
  data: number[]; // 24 hour values
  currentHour: number;
  color: string; // e.g., 'orange', 'red', 'purple'
  showCurrentMarker?: boolean;
}

export default function MetricSparkline({
  data,
  currentHour,
  color,
  showCurrentMarker = true,
}: MetricSparklineProps) {
  // Generate SVG path for the sparkline
  const { path, points, maxValue, minValue } = useMemo(() => {
    if (!data || data.length === 0) return { path: '', points: [], maxValue: 0, minValue: 0 };
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1; // Avoid division by zero
    
    const width = 100;
    const height = 20;
    const padding = 2;
    
    // Calculate points
    const pts = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - padding - ((value - min) / range) * (height - 2 * padding);
      return { x, y };
    });
    
    // Create SVG path
    const pathData = pts
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    
    return { path: pathData, points: pts, maxValue: max, minValue: min };
  }, [data]);
  
  const currentPoint = points[currentHour];
  
  // Color mapping
  const colorMap: Record<string, { stroke: string; fill: string; marker: string }> = {
    orange: { stroke: 'rgb(234, 88, 12)', fill: 'rgba(234, 88, 12, 0.15)', marker: 'rgb(234, 88, 12)' },
    red: { stroke: 'rgb(220, 38, 38)', fill: 'rgba(220, 38, 38, 0.15)', marker: 'rgb(220, 38, 38)' },
    purple: { stroke: 'rgb(147, 51, 234)', fill: 'rgba(147, 51, 234, 0.15)', marker: 'rgb(147, 51, 234)' },
    green: { stroke: 'rgb(34, 197, 94)', fill: 'rgba(34, 197, 94, 0.15)', marker: 'rgb(34, 197, 94)' },
  };
  
  const colors = colorMap[color] || colorMap.orange;
  
  return (
    <div className="w-full h-5 opacity-70">
      <svg viewBox="0 0 100 20" className="w-full h-full" preserveAspectRatio="none">
        {/* Fill area under the line */}
        <path
          d={`${path} L 100 20 L 0 20 Z`}
          fill={colors.fill}
          stroke="none"
        />
        
        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Current time marker */}
        {showCurrentMarker && currentPoint && (
          <>
            {/* Vertical line at current hour */}
            <line
              x1={currentPoint.x}
              y1="0"
              x2={currentPoint.x}
              y2="20"
              stroke={colors.marker}
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.5"
            />
            {/* Dot at current value */}
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r="2"
              fill={colors.marker}
              stroke="white"
              strokeWidth="1"
            />
          </>
        )}
      </svg>
    </div>
  );
}
