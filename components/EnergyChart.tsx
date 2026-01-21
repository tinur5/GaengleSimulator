// components/EnergyChart.tsx
'use client';

import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface EnergyChartProps {
  data: number[];
}

export default function EnergyChart({ data }: EnergyChartProps) {
  const chartData = {
    labels: data.map((_, i) => `${i}:00`),
    datasets: [{
      label: 'Netto-Energiefluss (kW)',
      data,
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      fill: true,
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Energiefluss über 24 Stunden',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Stunde',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Energie (kW)',
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
