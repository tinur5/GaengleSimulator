'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { Chart as ChartInstance } from 'chart.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ConsumptionChartProps {
  tenants: any[];
  month: number;
  dayOfWeek: number;
  currentHour?: number;
  calculateTenantConsumption: (tenant: any, hour: number, dayOfWeek: number, month: number) => number;
}

export default function ConsumptionChart({
  tenants,
  month,
  dayOfWeek,
  currentHour = 0,
  calculateTenantConsumption,
}: ConsumptionChartProps) {
  const chartRef = useRef<ChartInstance<'line'> | null>(null);
  const currentHourRef = useRef<number>(currentHour);

  // Update currentHourRef wenn currentHour sich ändert
  useEffect(() => {
    currentHourRef.current = currentHour;
  }, [currentHour]);
  // Berechne 24h-Kurven für jeden Haushalt
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const colors = ['#3b82f6', '#10b981', '#f59e0b'];

  const datasets = tenants.map((tenant, idx) => {
    const data = hours.map((hour) =>
      calculateTenantConsumption(tenant, hour, dayOfWeek, month)
    );

    return {
      label: tenant.name,
      data,
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length] + '20',
      borderWidth: 2,
      tension: 0.4,
      fill: true,
      pointRadius: 3,
      pointBackgroundColor: colors[idx % colors.length],
    };
  });

  // Summe aller Haushalte
  const totalData = hours.map((hour) => {
    return tenants.reduce(
      (sum, tenant) => sum + calculateTenantConsumption(tenant, hour, dayOfWeek, month),
      0
    );
  });

  datasets.push({
    label: 'Total Haushalte',
    data: totalData,
    borderColor: '#dc2626',
    backgroundColor: '#dc262620',
    borderWidth: 3,
    borderDash: [5, 5],
    tension: 0.4,
    fill: false,
    pointRadius: 4,
    pointBackgroundColor: '#dc2626',
  } as any);

  const data = {
    labels: hours.map((h) => `${String(h).padStart(2, '0')}:00`),
    datasets,
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Haushalt-Verbrauch über 24 Stunden',
        font: { size: 14 } as const,
        weight: 'bold' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Verbrauch (kW)',
        },
      },
      x: {
        offset: false,
        title: {
          display: true,
          text: 'Tageszeit',
        },
      },
    },
  };

  // Plugin für vertikale Linie der aktuellen Zeit
  const verticalLinePlugin = useMemo(() => ({
    id: 'verticalLine',
    afterDatasetsDraw(chart: any) {
      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;

      if (!xScale || !chartArea) return;

      // Berechne Pixel-Position basierend auf Datenpunkt-Index
      const hourIndex = Math.max(0, Math.min(hours.length - 1, currentHourRef.current));
      
      // Für Category Scale: Position basierend auf Punkt-Abstand berechnen
      const totalWidth = chartArea.right - chartArea.left;
      const pointSpacing = totalWidth / (hours.length - 1 || 1);
      const xPixel = chartArea.left + (hourIndex * pointSpacing);

      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(xPixel, chartArea.top);
      ctx.lineTo(xPixel, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    },
  }), [hours.length]);

  // Trigger Chart-Update wenn currentHour sich ändert
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update();
    }
  }, [currentHour]);

  return <Line ref={chartRef} data={data} options={options as any} plugins={[verticalLinePlugin]} />;
}

