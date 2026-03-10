// components/CostOverview.tsx
'use client';

import { useState } from 'react';
import { LKWTariffType, getTariffModel, NETWORK_USAGE_FEES } from '../lib/lkwTariffs';
import { 
  calculateDailyCost, 
  estimateMonthlyCostFromDay,
  estimateAnnualAverageMonthlyCost,
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

  // Mittlere monatliche Kosten über das ganze Jahr
  const annualAvgMonthlyCost = estimateAnnualAverageMonthlyCost(dailyCost);

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
            Netto: ~CHF {monthlyCost.netCostCHF.toFixed(2)}/Monat
          </span>
          <span className="text-xs text-gray-500">
            Ø Jahr: ~CHF {annualAvgMonthlyCost.netCostCHF.toFixed(2)}/Monat
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
              {/* AUSGABEN (Expenses) */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs text-red-800 mb-2 flex items-center gap-1">
                  📤 AUSGABEN (Kosten)
                </h5>
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
                <div className="flex justify-between items-center p-2 bg-red-100 rounded border-2 border-red-300">
                  <span className="font-bold text-sm">Total Ausgaben:</span>
                  <span className="font-bold text-lg text-red-700">
                    CHF {monthlyCost.totalCostCHF.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* EINNAHMEN (Income) */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs text-green-800 mb-2 flex items-center gap-1">
                  📥 EINNAHMEN (Vergütung)
                </h5>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span className="text-sm">Einspeisevergütung:</span>
                  <span className="font-bold text-green-700">
                    CHF {monthlyCost.feedInRevenueCHF.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded opacity-50">
                  <span className="text-sm text-gray-400">-</span>
                  <span className="font-bold text-gray-400">-</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded opacity-50">
                  <span className="text-sm text-gray-400">-</span>
                  <span className="font-bold text-gray-400">-</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-100 rounded border-2 border-green-300">
                  <span className="font-bold text-sm">Total Einnahmen:</span>
                  <span className="font-bold text-lg text-green-700">
                    CHF {monthlyCost.feedInRevenueCHF.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* NETTO (Net Cost) */}
            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-indigo-300">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-sm text-indigo-900">💵 NETTO (Ausgaben - Einnahmen):</span>
                  <p className="text-xs text-indigo-700 mt-1">
                    Effektive monatliche Kosten inkl. 8.1% MwSt.
                  </p>
                </div>
                <span className="font-bold text-2xl text-indigo-900">
                  CHF {monthlyCost.netCostCHF.toFixed(2)}
                </span>
              </div>
            </div>
            
            {/* Energiemengen */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h5 className="font-bold text-xs text-gray-800 mb-2">📊 Energiemengen</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                  <span className="text-xs">Netzbezug:</span>
                  <span className="font-semibold text-xs text-red-700">
                    {monthlyCost.totalImportKwh.toFixed(1)} kWh
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span className="text-xs">Einspeisung:</span>
                  <span className="font-semibold text-xs text-green-700">
                    {monthlyCost.totalExportKwh.toFixed(1)} kWh
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-indigo-50 rounded">
                  <span className="text-xs">Netto Bezug:</span>
                  <span className="font-semibold text-xs text-indigo-700">
                    {monthlyCost.netImportKwh.toFixed(1)} kWh
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                  <span className="text-xs">Ø Preis/kWh:</span>
                  <span className="font-semibold text-xs text-purple-700">
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

          {/* Mittlere Jahreskosten */}
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h4 className="font-bold text-sm text-blue-800 mb-3 flex items-center gap-2">
              📅 Mittlere monatliche Kosten über das ganze Jahr
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              {(() => {
                const summerRate = (NETWORK_USAGE_FEES.summer + NETWORK_USAGE_FEES.swissgridUsage + NETWORK_USAGE_FEES.swissgridReserve + NETWORK_USAGE_FEES.efficiencySurcharge).toFixed(2);
                const winterRate = (NETWORK_USAGE_FEES.winter + NETWORK_USAGE_FEES.swissgridUsage + NETWORK_USAGE_FEES.swissgridReserve + NETWORK_USAGE_FEES.efficiencySurcharge).toFixed(2);
                return `Jahresdurchschnitt: Sommer- (Apr–Sep, ${summerRate} Rp./kWh) und Winter-Netzpreise (Okt–März, ${winterRate} Rp./kWh) je 6 Monate, Ø 30 Tage/Monat.`;
              })()}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="font-bold text-xs text-red-800 mb-2">📤 AUSGABEN (Ø/Monat)</h5>
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                  <span className="text-sm">Energiekosten:</span>
                  <span className="font-bold text-blue-700">
                    CHF {annualAvgMonthlyCost.energyCostCHF.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                  <span className="text-sm">Netznutzung (Ø Sommer/Winter):</span>
                  <span className="font-bold text-orange-700">
                    CHF {annualAvgMonthlyCost.networkCostCHF.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">Fixkosten:</span>
                  <span className="font-bold text-gray-700">
                    CHF {annualAvgMonthlyCost.fixedCostCHF.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-red-100 rounded border-2 border-red-300">
                  <span className="font-bold text-sm">Total Ausgaben:</span>
                  <span className="font-bold text-lg text-red-700">
                    CHF {annualAvgMonthlyCost.totalCostCHF.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-xs text-green-800 mb-2">📥 EINNAHMEN (Ø/Monat)</h5>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span className="text-sm">Einspeisevergütung:</span>
                  <span className="font-bold text-green-700">
                    CHF {annualAvgMonthlyCost.feedInRevenueCHF.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded opacity-50">
                  <span className="text-sm text-gray-400">-</span>
                  <span className="font-bold text-gray-400">-</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded opacity-50">
                  <span className="text-sm text-gray-400">-</span>
                  <span className="font-bold text-gray-400">-</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-100 rounded border-2 border-green-300">
                  <span className="font-bold text-sm">Total Einnahmen:</span>
                  <span className="font-bold text-lg text-green-700">
                    CHF {annualAvgMonthlyCost.feedInRevenueCHF.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-indigo-300">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-sm text-indigo-900">💵 NETTO Ø/Monat (ganzes Jahr):</span>
                  <p className="text-xs text-indigo-700 mt-1">
                    Mittlere monatliche Nettokosten inkl. 8.1% MwSt.
                  </p>
                </div>
                <span className="font-bold text-2xl text-indigo-900">
                  CHF {annualAvgMonthlyCost.netCostCHF.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Tageskosten */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h4 className="font-bold text-sm text-green-800 mb-3">
              📅 Kosten für {selectedDate.toLocaleDateString('de-CH')}
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="text-xs text-gray-600">Ausgaben</div>
                <div className="font-bold text-red-700">
                  {((dailyCost.totalCost / 100) + dailyCost.dailyFixedCost).toFixed(2)} CHF
                </div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-xs text-gray-600">Einnahmen</div>
                <div className="font-bold text-green-700">
                  {(dailyCost.totalFeedInRevenue / 100).toFixed(2)} CHF
                </div>
              </div>
              <div className="text-center p-2 bg-indigo-100 rounded border border-indigo-300">
                <div className="text-xs text-gray-600">Netto</div>
                <div className="font-bold text-indigo-700">
                  {(((dailyCost.netCost / 100) + dailyCost.dailyFixedCost)).toFixed(2)} CHF
                </div>
              </div>
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

              {/* Einspeisevergütung */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-bold text-xs text-green-900 mb-2">
                  💚 Einspeisevergütung (ab 2025)
                </h4>
                <div className="space-y-2 text-xs text-green-800">
                  <p className="font-semibold">Marktorientierte Vergütung:</p>
                  <div className="ml-3 space-y-1">
                    <p>• Mindestvergütung: 6.00 Rp./kWh (gesetzlich garantiert)</p>
                    <p>• Durchschnitt (EPEX Spot): ~8.50 Rp./kWh (variiert stündlich)</p>
                    <p>• Variation nach Tageszeit:</p>
                    <div className="ml-4 space-y-0.5">
                      <p>- Abendspitze (17-20 Uhr): +30%</p>
                      <p>- Mittagsspitze (11-14 Uhr): +20%</p>
                      <p>- Nacht (2-6 Uhr): -20%</p>
                    </div>
                  </div>
                  
                  <p className="font-semibold mt-2">Wichtig:</p>
                  <div className="ml-3 space-y-1">
                    <p>• Basis: EPEX SPOT Swissix</p>
                    <p>• Nur positive Preise (keine negativen Preise ab 2025)</p>
                    <p>• Ausgleichszahlung bei Unterschreitung der Mindestvergütung</p>
                  </div>
                </div>
              </div>

              {/* Stündliche Kostenaufstellung */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h4 className="font-bold text-xs text-purple-900 mb-2">
                  🕐 Stündliche Kosten & Einnahmen (Auswahl)
                </h4>
                <div className="text-xs">
                  <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto">
                    {dailyCost.hourlyDetails
                      .filter((h, idx) => h.energyImportKwh > 0.01 || h.energyExportKwh > 0.01 || idx === currentHour)
                      .map((hourData) => (
                        <div
                          key={hourData.hour}
                          className={`p-2 rounded grid grid-cols-7 gap-1 items-center text-[10px] ${
                            hourData.hour === currentHour
                              ? 'bg-purple-200 border border-purple-400 font-bold'
                              : 'bg-white'
                          }`}
                        >
                          <span className="col-span-1">
                            {String(hourData.hour).padStart(2, '0')}:00
                            {hourData.hour === currentHour && ' 👈'}
                          </span>
                          <span className="col-span-1 text-right text-red-700">
                            ↓ {hourData.energyImportKwh.toFixed(2)}
                          </span>
                          <span className="col-span-1 text-right text-green-700">
                            ↑ {hourData.energyExportKwh.toFixed(2)}
                          </span>
                          <span className="col-span-1 text-right text-purple-700">
                            {hourData.energyPriceRpKwh.toFixed(1)}
                          </span>
                          <span className="col-span-1 text-right text-green-700">
                            {hourData.feedInPriceRpKwh.toFixed(1)}
                          </span>
                          <span className="col-span-1 text-right text-red-700">
                            -{(hourData.totalCost / 100).toFixed(3)}
                          </span>
                          <span className="col-span-1 text-right text-green-700 font-semibold">
                            +{(hourData.feedInRevenue / 100).toFixed(3)}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="mt-2 text-[10px] text-gray-600 bg-white p-2 rounded">
                    <p><strong>Legende:</strong> Zeit | Bezug↓ | Export↑ | Kaufpreis | Verkaufspreis | Ausgaben | Einnahmen</p>
                    <p className="mt-1">Alle Beträge in kWh bzw. Rp./kWh bzw. CHF. Nur Stunden mit Aktivität werden angezeigt.</p>
                  </div>
                </div>
              </div>

              {/* Berechnungsmethodik */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="font-bold text-xs text-gray-900 mb-2">
                  📐 Berechnungsmethodik
                </h4>
                <div className="space-y-2 text-xs text-gray-700">
                  <p className="font-semibold">Formel für Nettokosten:</p>
                  <div className="ml-3 space-y-1 font-mono text-[10px] bg-white p-2 rounded">
                    <p>AUSGABEN:</p>
                    <p>  Energiekosten = Σ(Netzbezug[h] × Energiepreis[h])</p>
                    <p>  Netzkosten = Σ(Netzbezug[h] × Netzpreis)</p>
                    <p>  Fixkosten = (Zählergebühr + Grundgebühr) / 30 Tage</p>
                    <p>  Total Ausgaben = (Energiekosten + Netzkosten + Fixkosten) × 1.081</p>
                    <p></p>
                    <p>EINNAHMEN:</p>
                    <p>  Einspeisevergütung = Σ(Einspeisung[h] × Vergütung[h]) × 1.081</p>
                    <p></p>
                    <p>NETTO = Ausgaben - Einnahmen</p>
                  </div>
                  
                  <p className="font-semibold mt-2">Wichtige Hinweise:</p>
                  <div className="ml-3 space-y-1">
                    <p>• Alle Preise exkl. 8.1% MwSt., wird am Ende aufgeschlagen</p>
                    <p>• Einspeisevergütung: mind. 6 Rp./kWh, durchschnittlich ~8.50 Rp./kWh</p>
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
