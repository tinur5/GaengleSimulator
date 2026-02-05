// components/DebugPanel.tsx
'use client';

import { useState } from 'react';

interface DebugPanelProps {
  pvProduction: number;
  houseConsumption: number;
  commonConsumption: number;
  totalConsumption: number;
  netFlow: number;
  battery1Soc: number;
  battery2Soc: number;
  avgSoc: number;
  battery1Capacity: number;
  battery2Capacity: number;
  selectedHour: number;
  selectedDate: Date;
  strategyConfig?: {
    minSoc: number;
    maxSoc: number;
    targetNightSoc: number;
    maxChargeRate: number;
    maxDischargeRate: number;
    nightStart: number;
    nightEnd: number;
  };
  inverterPowerKw?: number;
  pvPeakKw?: number;
}

export default function DebugPanel({
  pvProduction,
  houseConsumption,
  commonConsumption,
  totalConsumption,
  netFlow,
  battery1Soc,
  battery2Soc,
  avgSoc,
  battery1Capacity,
  battery2Capacity,
  selectedHour,
  selectedDate,
  strategyConfig,
  inverterPowerKw = 29.9,
  pvPeakKw = 59.8,
}: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const battery1Energy = (battery1Soc / 100) * battery1Capacity;
  const battery2Energy = (battery2Soc / 100) * battery2Capacity;
  const totalBatteryEnergy = battery1Energy + battery2Energy;
  const totalBatteryCapacity = battery1Capacity + battery2Capacity;

  // Calculate if we're in night mode
  const isNight = strategyConfig 
    ? (selectedHour >= strategyConfig.nightStart || selectedHour < strategyConfig.nightEnd)
    : false;

  return (
    <div className="mb-4 bg-gradient-to-r from-gray-50 to-slate-50 border-l-4 border-gray-500 rounded-lg shadow">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🔍</span>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Debug-Ansicht</h3>
            <p className="text-xs text-gray-600">Detaillierte Berechnungen & Energiefluss</p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-700">
          {isExpanded ? '▼ Schließen' : '▶ Öffnen'}
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* PV Production Details */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h4 className="font-bold text-xs text-orange-700 mb-2">☀️ PV-Produktion</h4>
              <div className="space-y-1 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Gesamt:</span>
                  <span className="font-semibold">{pvProduction.toFixed(3)} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Pro WR:</span>
                  <span className="font-semibold">{(pvProduction / 2).toFixed(3)} kW</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span>Peak-Leistung:</span>
                  <span className="font-semibold">{pvPeakKw} kWp</span>
                </div>
                <div className="flex justify-between">
                  <span>Auslastung:</span>
                  <span className="font-semibold">{((pvProduction / pvPeakKw) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Consumption Details */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h4 className="font-bold text-xs text-red-700 mb-2">🏠 Verbrauch</h4>
              <div className="space-y-1 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Wohnungen:</span>
                  <span className="font-semibold">{houseConsumption.toFixed(3)} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Allgemein:</span>
                  <span className="font-semibold">{commonConsumption.toFixed(3)} kW</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span>Total:</span>
                  <span className="font-semibold">{totalConsumption.toFixed(3)} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Pro WR:</span>
                  <span className="font-semibold">{(totalConsumption / 2).toFixed(3)} kW</span>
                </div>
              </div>
            </div>

            {/* Energy Balance */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h4 className="font-bold text-xs text-green-700 mb-2">⚖️ Energiebilanz</h4>
              <div className="space-y-1 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>PV:</span>
                  <span className="font-semibold text-orange-600">+{pvProduction.toFixed(3)} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Verbrauch:</span>
                  <span className="font-semibold text-red-600">-{totalConsumption.toFixed(3)} kW</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span>Netto:</span>
                  <span className={`font-bold ${netFlow >= 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {netFlow >= 0 ? '+' : ''}{netFlow.toFixed(3)} kW
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>{netFlow > 0 ? '→ Überschuss' : '→ Defizit'}</span>
                  <span>{netFlow > 0 ? '(Laden/Netz)' : '(Batterie/Netz)'}</span>
                </div>
              </div>
            </div>

            {/* Battery 1 Details */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h4 className="font-bold text-xs text-purple-700 mb-2">🔋 Batterie 1 (WR1)</h4>
              <div className="space-y-1 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>SOC:</span>
                  <span className="font-semibold">{battery1Soc.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Energie:</span>
                  <span className="font-semibold">{battery1Energy.toFixed(2)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span>Kapazität:</span>
                  <span className="font-semibold">{battery1Capacity} kWh</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1 text-[10px] text-gray-500">
                  <span>Berechnung:</span>
                  <span>{battery1Soc.toFixed(1)}% × {battery1Capacity} kWh</span>
                </div>
              </div>
            </div>

            {/* Battery 2 Details */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h4 className="font-bold text-xs text-purple-700 mb-2">🔋 Batterie 2 (WR2)</h4>
              <div className="space-y-1 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>SOC:</span>
                  <span className="font-semibold">{battery2Soc.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Energie:</span>
                  <span className="font-semibold">{battery2Energy.toFixed(2)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span>Kapazität:</span>
                  <span className="font-semibold">{battery2Capacity} kWh</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1 text-[10px] text-gray-500">
                  <span>Berechnung:</span>
                  <span>{battery2Soc.toFixed(1)}% × {battery2Capacity} kWh</span>
                </div>
              </div>
            </div>

            {/* Combined Battery Stats */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h4 className="font-bold text-xs text-purple-700 mb-2">🔋 Gesamt-Batterie</h4>
              <div className="space-y-1 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Ø SOC:</span>
                  <span className="font-semibold">{avgSoc.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Gesamt-Energie:</span>
                  <span className="font-semibold">{totalBatteryEnergy.toFixed(2)} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span>Gesamt-Kapazität:</span>
                  <span className="font-semibold">{totalBatteryCapacity} kWh</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span>Frei:</span>
                  <span className="font-semibold">{(totalBatteryCapacity - totalBatteryEnergy).toFixed(2)} kWh</span>
                </div>
              </div>
            </div>
          </div>

          {/* Calculation Formula */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-bold text-xs text-blue-900 mb-2">📐 Berechnungsformeln</h4>
            <div className="space-y-1 text-xs text-blue-800">
              <p><strong>Netto-Energiefluss:</strong> PV - Verbrauch = {pvProduction.toFixed(2)} kW - {totalConsumption.toFixed(2)} kW = {netFlow.toFixed(2)} kW</p>
              <p><strong>Batterie-Energie:</strong> SOC% × Kapazität = {avgSoc.toFixed(1)}% × {totalBatteryCapacity} kWh = {totalBatteryEnergy.toFixed(2)} kWh</p>
              <p><strong>PV-Auslastung:</strong> (Produktion / Peak) × 100 = ({pvProduction.toFixed(2)} / {pvPeakKw}) × 100 = {((pvProduction / pvPeakKw) * 100).toFixed(1)}%</p>
              <p><strong>System-Effizienz:</strong> 95% (Wechselrichter & Batterie-Wandlungsverluste)</p>
            </div>
          </div>

          {/* System Limits & Constraints */}
          {strategyConfig && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <h4 className="font-bold text-xs text-purple-900 mb-2">⚙️ System-Limits & Strategie</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 text-xs text-purple-800">
                  <p className="font-semibold">Hardware-Limits:</p>
                  <div className="ml-3 space-y-1">
                    <p>• WR-Leistung: 2× {inverterPowerKw} kW = {(inverterPowerKw * 2).toFixed(1)} kW</p>
                    <p>• PV-Peak: {pvPeakKw} kWp</p>
                    <p>• Batterie-Total: {totalBatteryCapacity} kWh</p>
                    <p className={pvProduction > (inverterPowerKw * 2) ? 'text-red-600 font-bold' : ''}>
                      {pvProduction > (inverterPowerKw * 2) && '⚠️ '}
                      PV-Limit Status: {pvProduction.toFixed(1)} / {(inverterPowerKw * 2).toFixed(1)} kW ({((pvProduction / (inverterPowerKw * 2)) * 100).toFixed(0)}%)
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-purple-800">
                  <p className="font-semibold">Batterie-Strategie:</p>
                  <div className="ml-3 space-y-1">
                    <p>• SOC-Range: {strategyConfig.minSoc}% - {strategyConfig.maxSoc}%</p>
                    <p>• Nacht-Ziel-SOC: {strategyConfig.targetNightSoc}%</p>
                    <p>• Max Lade-Rate: {strategyConfig.maxChargeRate} kW</p>
                    <p>• Max Entlade-Rate: {strategyConfig.maxDischargeRate} kW</p>
                    <p>• Nachtmodus: {String(strategyConfig.nightStart).padStart(2, '0')}:00 - {String(strategyConfig.nightEnd).padStart(2, '0')}:00 Uhr</p>
                    <p className={isNight ? 'font-bold text-purple-900' : ''}>
                      {isNight && '🌙 '}
                      Aktuell: {isNight ? 'Nacht-Modus' : 'Tag-Modus'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-purple-700 bg-white/50 rounded p-2">
                <p><strong>Aktive Regeln:</strong></p>
                <ul className="ml-3 mt-1 space-y-0.5">
                  {netFlow > 0.05 && battery1Soc < strategyConfig.maxSoc && (
                    <li>✓ PV-Überschuss → Batterie laden (bis {strategyConfig.maxSoc}% SOC)</li>
                  )}
                  {netFlow < -0.05 && isNight && battery1Soc > strategyConfig.targetNightSoc && (
                    <li>✓ Nacht-Defizit → Batterie entladen (nur wenn SOC &gt; {strategyConfig.targetNightSoc}%)</li>
                  )}
                  {netFlow < -0.05 && !isNight && battery1Soc > strategyConfig.minSoc && (
                    <li>✓ Tag-Defizit → Batterie entladen (nur wenn SOC &gt; {strategyConfig.minSoc}%)</li>
                  )}
                  {netFlow < -0.05 && battery1Soc <= (isNight ? strategyConfig.targetNightSoc : strategyConfig.minSoc) && (
                    <li>⚠️ Batterie geschont → Netzbezug aktiv</li>
                  )}
                  {netFlow > 0.05 && battery1Soc >= strategyConfig.maxSoc && (
                    <li>⚠️ Batterie voll → Netzeinspeisung aktiv</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Energy Balance Validation */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h4 className="font-bold text-xs text-green-900 mb-2">✓ Energieerhaltung</h4>
            <div className="space-y-2 text-xs text-green-800">
              <p className="font-semibold">Momentan-Bilanz (kW):</p>
              <div className="ml-3 space-y-1">
                <p>Eingang: PV-Produktion = {pvProduction.toFixed(2)} kW</p>
                <p>Ausgang: Haushalte + Gemeinschaft = {totalConsumption.toFixed(2)} kW</p>
                <p>Differenz: {netFlow.toFixed(2)} kW {netFlow > 0.05 ? '(→ Batterie/Netz laden)' : netFlow < -0.05 ? '(→ Batterie/Netz entladen)' : '(→ ausgeglichen)'}</p>
              </div>
              <p className="text-[10px] mt-2 text-gray-600">
                Hinweis: Die Differenz wird durch Batterieladung/-entladung und Netzaustausch ausgeglichen.
                Bei Überschuss (positiv): Energie geht in Batterie oder Netz.
                Bei Defizit (negativ): Energie kommt aus Batterie oder Netz.
              </p>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-500 text-center">
            Simulationszeitpunkt: {selectedDate.toLocaleDateString('de-CH')} {String(selectedHour).padStart(2, '0')}:00 Uhr
          </div>
        </div>
      )}
    </div>
  );
}
