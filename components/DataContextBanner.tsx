// components/DataContextBanner.tsx
'use client';

import { useState } from 'react';
import { CALIBRATION_OCTOBER } from '../lib/realMeasurements';

interface DataContextBannerProps {
  selectedDate: Date;
  selectedHour: number;
}

export default function DataContextBanner({ selectedDate, selectedHour }: DataContextBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isOctober = selectedDate.getMonth() + 1 === 10;

  return (
    <div className="mb-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 rounded-lg shadow">
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-2xl">ℹ️</span>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-blue-900">Datenkontext & Simulationsgrundlage</h3>
              <p className="text-xs text-gray-700 mt-1">
                <strong>Modus:</strong> Simuliert (kalibriert) | <strong>Zeitpunkt:</strong> {selectedDate.toLocaleDateString('de-CH')} um {String(selectedHour).padStart(2, '0')}:00 Uhr
                {isOctober && <span className="ml-2 text-green-700 font-semibold">✅ Reale Messdaten aktiv</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 px-2 py-1 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors"
          >
            {isExpanded ? '▼ Weniger' : '▶ Mehr Info'}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-blue-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-white rounded p-2">
                <h4 className="font-bold text-blue-900 mb-1">📊 Datenquelle</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>Typ:</strong> Physikalische Simulation</li>
                  <li>• <strong>Basis:</strong> Lastprofile & Wetterdaten</li>
                  <li>• <strong>Kalibrierung:</strong> Reale WR-Messdaten (03.10.2026)</li>
                  <li>• <strong>Update:</strong> Echtzeit-Berechnung</li>
                </ul>
              </div>

              <div className="bg-white rounded p-2">
                <h4 className="font-bold text-blue-900 mb-1">☀️ PV-Annahmen</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>Peak:</strong> 59.8 kWp</li>
                  <li>• <strong>Module:</strong> Arres 3.2 / Premium L</li>
                  <li>• <strong>Effizienz:</strong> 95 %</li>
                  <li>• <strong>Standort:</strong> Baizers (46.5°N)</li>
                  <li>• <strong>Bewölkung:</strong> 45–65 % (Okt: 50 %, kalibriert)</li>
                </ul>
              </div>

              <div className="bg-white rounded p-2">
                <h4 className="font-bold text-blue-900 mb-1">🏠 Verbrauchsprofile</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>Familien:</strong> 5200 kWh/Jahr (4 Pers., 160 m²)</li>
                  <li>• <strong>Pensionierte:</strong> 4500 kWh/Jahr (2 Pers., 200 m²)</li>
                  <li>• <strong>Variation:</strong> Tages-/Wochenzeit, Saison</li>
                  <li>• <strong>Gemeinschaft:</strong> Garage, Heizung, Boiler</li>
                </ul>
              </div>

              <div className="bg-white rounded p-2">
                <h4 className="font-bold text-blue-900 mb-1">🔋 Batteriesystem</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>Kapazität:</strong> 2× 20 kWh = 40 kWh</li>
                  <li>• <strong>Lade-Rate:</strong> Max. 10 kW/Batterie</li>
                  <li>• <strong>Entlade-Rate:</strong> Max. 6 kW/Batterie</li>
                  <li>• <strong>Effizienz:</strong> 95 %</li>
                </ul>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded p-2">
              <h4 className="font-bold text-green-900 mb-1 text-xs">✅ Kalibrierung mit realen Messdaten (03.10.2026)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-green-800">
                <div>
                  <span className="font-semibold">Batterie Mitternacht</span><br/>
                  WR1: {CALIBRATION_OCTOBER.inv1MidnightSoc} % | WR2: {CALIBRATION_OCTOBER.inv2MidnightSoc} %
                </div>
                <div>
                  <span className="font-semibold">PV-Spitze (Mittag)</span><br/>
                  {CALIBRATION_OCTOBER.peakPvKw} kW kombiniert
                </div>
                <div>
                  <span className="font-semibold">Verbrauch Mittag</span><br/>
                  ~{CALIBRATION_OCTOBER.noonBuildingConsumptionKw} kW (Gebäude)
                </div>
                <div>
                  <span className="font-semibold">Verbrauch Nacht</span><br/>
                  ~{CALIBRATION_OCTOBER.nightBuildingConsumptionKw} kW (Gebäude)
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <p className="text-xs text-yellow-900">
                <strong>⚠️ Hinweis:</strong> Die Simulation ist mit realen Wechselrichter-Verlaufsdaten vom 03.10.2026 kalibriert.
                Für Oktober werden gemessene Batterie-SOC-Werte und PV-Parameter direkt verwendet.
                Abweichungen bei anderen Monaten oder Wetterbedingungen sind möglich.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
