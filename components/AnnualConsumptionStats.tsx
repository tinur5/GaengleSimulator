'use client';

import { useMemo } from 'react';

interface AnnualConsumptionStatsProps {
  tenants: any[];
  calculateTenantConsumption: (tenant: any, hour: number, dayOfWeek: number, month: number) => number;
}

export default function AnnualConsumptionStats({
  tenants,
  calculateTenantConsumption,
}: AnnualConsumptionStatsProps) {
  // Berechne jährliche Statistiken
  const stats = useMemo(() => {
    const results = tenants.map((tenant) => {
      let minDaily = Infinity;
      let maxDaily = -Infinity;
      let totalYearly = 0;

      // Iteriere durch alle Tage des Jahres
      for (let day = 1; day <= 365; day++) {
        // Berechne Monat und Wochentag
        const date = new Date(2024, 0, day); // 2024 ist Schaltjahr
        const month = date.getMonth() + 1;
        const dayOfWeek = date.getDay(); // 0 = Sonntag

        // Tagesverbrauch
        let dailyConsumption = 0;
        for (let hour = 0; hour < 24; hour++) {
          dailyConsumption += calculateTenantConsumption(
            tenant,
            hour,
            dayOfWeek,
            month
          );
        }

        minDaily = Math.min(minDaily, dailyConsumption);
        maxDaily = Math.max(maxDaily, dailyConsumption);
        totalYearly += dailyConsumption;
      }

      return {
        name: tenant.name,
        minDaily,
        maxDaily,
        avgDaily: totalYearly / 365,
        totalYearly,
        variation: ((maxDaily - minDaily) / (totalYearly / 365)).toFixed(1),
      };
    });

    return results;
  }, [tenants, calculateTenantConsumption]);

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h3 className="text-lg font-bold text-gray-800">📊 Jahresverbrauch-Statistik</h3>

      <div className="space-y-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="border rounded-lg p-3 bg-gray-50 space-y-2">
            <p className="font-bold text-blue-600">{stat.name}</p>

            {/* Bandbreite Visualisierung */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Min {stat.minDaily.toFixed(1)} kWh/Tag</span>
                <span>Durchschnitt {stat.avgDaily.toFixed(1)} kWh/Tag</span>
                <span>Max {stat.maxDaily.toFixed(1)} kWh/Tag</span>
              </div>

              {/* Visueller Balken */}
              <div className="relative bg-gray-300 h-6 rounded overflow-hidden">
                {/* Min-Max Range */}
                <div
                  className="absolute h-full bg-gradient-to-r from-blue-200 to-blue-300 opacity-60"
                  style={{
                    left: `${((stat.minDaily - stat.minDaily) / (stat.maxDaily - stat.minDaily)) * 100}%`,
                    right: `${(1 - (stat.maxDaily - stat.minDaily) / (stat.maxDaily - stat.minDaily)) * 100}%`,
                  }}
                />

                {/* Durchschnitt Marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-blue-600"
                  style={{
                    left: `${((stat.avgDaily - stat.minDaily) / (stat.maxDaily - stat.minDaily)) * 100}%`,
                  }}
                  title={`Durchschnitt: ${stat.avgDaily.toFixed(1)} kWh`}
                />
              </div>
            </div>

            {/* Jahresverbrauch */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-700">Jahresverbrauch:</span>
              <span className="font-bold text-blue-600">{stat.totalYearly.toFixed(0)} kWh</span>
            </div>

            {/* Variation */}
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Variation (Max-Min):</span>
              <span className="font-semibold">{stat.variation}x des Durchschnitts</span>
            </div>

            {/* Saisonal Info */}
            <div className="text-xs text-gray-500 mt-2">
              <p>
                Winter schwerer: {(stat.maxDaily - stat.minDaily > stat.avgDaily * 0.5 ? '✓ Ja' : '✗ Nein')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Gesamt-Zusammenfassung */}
      <div className="border-t pt-3">
        <p className="font-bold text-sm text-gray-700 mb-2">Gesamthaushalt:</p>
        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-blue-50 p-2 rounded">
              <p className="text-gray-600">Jahresverbrauch:</p>
              <p className="font-bold text-blue-600">
                {stats.reduce((sum, s) => sum + s.totalYearly, 0).toFixed(0)} kWh
              </p>
            </div>
            <div className="bg-green-50 p-2 rounded">
              <p className="text-gray-600">Ø pro Haushalt:</p>
              <p className="font-bold text-green-600">
                {(stats.reduce((sum, s) => sum + s.totalYearly, 0) / stats.length).toFixed(0)} kWh
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
