// components/CostOverview.tsx
'use client';

import { useState } from 'react';
import { LKWTariffType, getTariffModel } from '../lib/lkwTariffs';
import { 
  calculateDailyCost, 
  estimateMonthlyCostFromDay,
  DailyCostSummary 
} from '../lib/costCalculation';

interface CostOverviewProps {
  selectedDate: Date;
  hourlyImports: number[];   // 24 Werte in kWh
  hourlyExports: number[];   // 24 Werte in kWh
  selectedTariff: LKWTariffType;
  useEco: boolean;
}

export default function CostOverview({
  selectedDate,
  hourlyImports,
  hourlyExports,
  selectedTariff,
  useEco,
}: CostOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate daily costs
  const dailyCost = calculateDailyCost(
    selectedDate,
    hourlyImports,
    hourlyExports,
    selectedTariff,
    useEco
  );

  // Estimate monthly costs
  const daysInMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    0
  ).getDate();
  
  const monthlyCost = estimateMonthlyCostFromDay(dailyCost, daysInMonth);

  const tariffModel = getTariffModel(selectedTariff);

  // Calculate grid import/export for current hour
  const currentHour = selectedDate.getHours();
  const currentImport = hourlyImports[currentHour] || 0;
  const currentExport = hourlyExports[currentHour] || 0;

  return (
    <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-600 rounded-lg shadow">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-left flex items-center justify-between hover:bg-green-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">💰</span>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Kostenübersicht</h3>
            <p className="text-xs text-gray-600">
              Stromkosten & Netznutzung ({tariffModel.name})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-green-700">
            ~CHF {monthlyCost.totalCostCHF.toFixed(2)}/Monat
          </span>
          <span className="text-xs font-medium text-gray-700">
            {isExpanded ? '▼ Schließen' : '▶ Öffnen'}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Monatliche Kostenübersicht */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h4 className="font-bold text-sm text-green-800 mb-3 flex items-center gap-2">
              📊 Geschätzte Monatskosten (basierend auf heutigem Tag)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kostenaufschlüsselung */}
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                  <span className="text-sm">Energiekosten:</span>
                  <span className="font-bold text-blue-700">
                    CHF {monthlyCost.energyCostCHF.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                  <span className="text-sm">Netznutzung:</span>
                  <span className="font-bold text-orange-700">
                    CHF {monthlyCost.networkCostCHF.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">Fixkosten (Zähler + Grundgebühr):</span>
                  <span className="font-bold text-gray-700">
                    CHF {monthlyCost.fixedCostCHF.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-100 rounded border-2 border-green-300">
                  <span className="font-bold text-sm">Total (inkl. 8.1% MwSt.):</span>
                  <span className="font-bold text-lg text-green-700">
                    CHF {monthlyCost.totalCostCHF.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Energiemengen */}
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                  <span className="text-sm">Netzbezug:</span>
                  <span className="font-semibold text-red-700">
                    {monthlyCost.totalImportKwh.toFixed(1)} kWh
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span className="text-sm">Einspeisung:</span>
                  <span className="font-semibold text-green-700">
                    {monthlyCost.totalExportKwh.toFixed(1)} kWh
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-indigo-50 rounded">
                  <span className="text-sm">Netto Bezug:</span>
                  <span className="font-semibold text-indigo-700">
                    {monthlyCost.netImportKwh.toFixed(1)} kWh
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                  <span className="text-sm">Ø Preis/kWh:</span>
                  <span className="font-semibold text-purple-700">
                    {(monthlyCost.avgCostPerKwh * 100).toFixed(2)} Rp.
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Hinweis:</strong> Diese Schätzung basiert auf dem aktuellen Tag und 
              multipliziert die Tageskosten mit {daysInMonth} Tagen. Tatsächliche Monatskosten 
              können je nach Wetter, Verbrauch und Tarifschwankungen variieren.
            </div>
          </div>

          {/* Tageskosten */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h4 className="font-bold text-sm text-green-800 mb-3">
              📅 Kosten für {selectedDate.toLocaleDateString('de-CH')}
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-xs text-gray-600">Energie</div>
                <div className="font-bold text-blue-700">
                  {(dailyCost.totalEnergyCost / 100).toFixed(2)} CHF
                </div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <div className="text-xs text-gray-600">Netz</div>
                <div className="font-bold text-orange-700">
                  {(dailyCost.totalNetworkCost / 100).toFixed(2)} CHF
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-600">Fix (anteilig)</div>
                <div className="font-bold text-gray-700">
                  {dailyCost.dailyFixedCost.toFixed(2)} CHF
                </div>
              </div>
              <div className="text-center p-2 bg-green-100 rounded border border-green-300">
                <div className="text-xs text-gray-600">Total</div>
                <div className="font-bold text-green-700">
                  {((dailyCost.totalCost / 100) + dailyCost.dailyFixedCost).toFixed(2)} CHF
                </div>
              </div>
            </div>
          </div>

          {/* Detail-Ansicht Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full p-2 bg-green-100 hover:bg-green-200 rounded-lg text-sm font-medium text-green-800 transition-colors"
          >
            {showDetails ? '▼ Detailansicht verbergen' : '▶ Detailansicht anzeigen (Tarife & Berechnung)'}
          </button>

          {/* Detaillierte Tarifberechnung */}
          {showDetails && (
            <div className="space-y-4">
              {/* Tarifmodell-Details */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-bold text-xs text-blue-900 mb-2">
                  📋 Tarifmodell: {tariffModel.name}
                </h4>
                <p className="text-xs text-blue-800 mb-3">{tariffModel.description}</p>
                
                <div className="space-y-2 text-xs text-blue-800">
                  <p className="font-semibold">Energiepreise (Rp./kWh, exkl. MwSt.):</p>
                  <div className="ml-3 space-y-1">
                    {tariffModel.type === 'classic' && (
                      <>
                        <p>• Hochtarif (Mo-Fr 7-20, Sa 7-13): {tariffModel.energyPrices.high} Rp./kWh</p>
                        <p>• Niedertarif (übrige Zeit): {tariffModel.energyPrices.low} Rp./kWh</p>
                      </>
                    )}
                    {tariffModel.type === 'flex' && (
                      <>
                        <p>• Spartarif (2-5, 11-16 Uhr): {tariffModel.energyPrices.saver} Rp./kWh</p>
                        <p>• Normaltarif: {tariffModel.energyPrices.normal} Rp./kWh</p>
                        <p>• Spitzentarif (17-20 Uhr): {tariffModel.energyPrices.peak} Rp./kWh</p>
                        <p>• Dynamischer Aufschlag: +{tariffModel.energyPrices.dynamic} Rp./kWh</p>
                      </>
                    )}
                    {tariffModel.type === 'free' && (
                      <>
                        <p>• Marktpreis (EPEX Spot CH): ~{tariffModel.energyPrices.baseMarket} Rp./kWh (variabel)</p>
                        <p>• Dynamischer Aufschlag: +{tariffModel.energyPrices.dynamic} Rp./kWh</p>
                      </>
                    )}
                    <p>• Abwicklungsgebühr: {tariffModel.processingFee > 0 ? `+${tariffModel.processingFee}` : '0'} Rp./kWh</p>
                    {useEco && (
                      <p className="text-green-700 font-semibold">
                        • Ökologiebeitrag (Naturstrom): +{tariffModel.ecoSurcharge} Rp./kWh
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Netznutzungsgebühren */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <h4 className="font-bold text-xs text-orange-900 mb-2">
                  🔌 Netznutzungsgebühren (2025)
                </h4>
                <div className="space-y-2 text-xs text-orange-800">
                  <p className="font-semibold">Fixkosten (pro Monat):</p>
                  <div className="ml-3 space-y-1">
                    <p>• Zählergebühr (Direktanschluss): CHF 7.00</p>
                    <p>• Grundgebühr: CHF 3.50</p>
                    <p className="font-semibold">→ Total: CHF 10.50/Monat</p>
                  </div>
                  
                  <p className="font-semibold mt-2">Arbeitspreise (Rp./kWh):</p>
                  <div className="ml-3 space-y-1">
                    <p>• Sommer (April-Sept.): 7.90 Rp./kWh</p>
                    <p>• Winter (Okt.-März): 9.70 Rp./kWh</p>
                    <p>• Swissgrid Systemnutzung: +0.55 Rp./kWh</p>
                    <p>• Swissgrid Leistungsreserve: +0.23 Rp./kWh</p>
                    <p>• Zuschlag Energieeffizienzgesetz: +1.50 Rp./kWh</p>
                  </div>
                  
                  <p className="font-semibold mt-2">
                    Aktueller Monat ({selectedDate.toLocaleDateString('de-CH', { month: 'long' })}): 
                    <span className="ml-1">
                      {(selectedDate.getMonth() + 1 >= 4 && selectedDate.getMonth() + 1 <= 9) ? 'Sommer' : 'Winter'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Stündliche Kostenaufstellung */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h4 className="font-bold text-xs text-purple-900 mb-2">
                  🕐 Stündliche Kosten (Auswahl)
                </h4>
                <div className="text-xs">
                  <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto">
                    {dailyCost.hourlyDetails
                      .filter((h, idx) => h.energyImportKwh > 0.01 || idx === currentHour)
                      .map((hourData) => (
                        <div
                          key={hourData.hour}
                          className={`p-2 rounded flex justify-between items-center ${
                            hourData.hour === currentHour
                              ? 'bg-purple-200 border border-purple-400 font-bold'
                              : 'bg-white'
                          }`}
                        >
                          <span className="w-16">
                            {String(hourData.hour).padStart(2, '0')}:00
                            {hourData.hour === currentHour && ' 👈'}
                          </span>
                          <span className="flex-1 text-center">
                            {hourData.energyImportKwh.toFixed(3)} kWh
                          </span>
                          <span className="w-20 text-right text-purple-700">
                            {hourData.energyPriceRpKwh.toFixed(2)} Rp.
                          </span>
                          <span className="w-20 text-right text-orange-700">
                            {hourData.networkPriceRpKwh.toFixed(2)} Rp.
                          </span>
                          <span className="w-24 text-right font-semibold">
                            {(hourData.totalCost / 100).toFixed(4)} CHF
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="mt-2 text-[10px] text-gray-600 bg-white p-2 rounded">
                    <p><strong>Legende:</strong> Zeit | Bezug | Energiepreis | Netzpreis | Gesamtkosten</p>
                    <p className="mt-1">Nur Stunden mit Netzbezug oder die aktuelle Stunde werden angezeigt.</p>
                  </div>
                </div>
              </div>

              {/* Berechnungsmethodik */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="font-bold text-xs text-gray-900 mb-2">
                  📐 Berechnungsmethodik
                </h4>
                <div className="space-y-2 text-xs text-gray-700">
                  <p className="font-semibold">Formel für Gesamtkosten:</p>
                  <div className="ml-3 space-y-1 font-mono text-[10px] bg-white p-2 rounded">
                    <p>Energiekosten = Σ(Netzbezug[h] × Energiepreis[h])</p>
                    <p>Netzkosten = Σ(Netzbezug[h] × Netzpreis)</p>
                    <p>Fixkosten = (Zählergebühr + Grundgebühr) / 30 Tage</p>
                    <p>Gesamtkosten = (Energiekosten + Netzkosten + Fixkosten) × 1.081</p>
                  </div>
                  
                  <p className="font-semibold mt-2">Wichtige Hinweise:</p>
                  <div className="ml-3 space-y-1">
                    <p>• Alle Preise exkl. 8.1% MwSt., wird am Ende aufgeschlagen</p>
                    <p>• Einspeisung ins Netz wird nicht vergütet (Kundengruppe 2)</p>
                    <p>• Netzpreise variieren nach Saison (Sommer/Winter)</p>
                    <p>• Energiepreise variieren nach Tarifmodell und Tageszeit</p>
                    <p>• Basis: LKW Liechtenstein Preisblätter 2025</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
