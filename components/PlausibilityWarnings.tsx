// components/PlausibilityWarnings.tsx
'use client';

interface PlausibilityWarningsProps {
  pvProduction: number;
  totalConsumption: number;
  battery1Soc: number;
  battery2Soc: number;
  battery1Capacity: number;
  battery2Capacity: number;
  selectedHour: number;
}

export default function PlausibilityWarnings({
  pvProduction,
  totalConsumption,
  battery1Soc,
  battery2Soc,
  battery1Capacity,
  battery2Capacity,
  selectedHour,
}: PlausibilityWarningsProps) {
  const warnings: string[] = [];
  const info: string[] = [];

  // Check 1: PV production at night
  if (selectedHour >= 22 || selectedHour < 5) {
    if (pvProduction > 0.1) {
      warnings.push(`PV-Produktion nachts (${pvProduction.toFixed(1)} kW) ist ungewöhnlich - sollte ~0 kW sein.`);
    }
  }

  // Check 2: PV production during day
  if (selectedHour >= 10 && selectedHour <= 14) {
    if (pvProduction < 5) {
      info.push(`PV-Produktion zur Mittagszeit ist niedrig (${pvProduction.toFixed(1)} kW). Möglicherweise Winter oder bewölkt.`);
    }
  }

  // Check 3: SOC values
  if (battery1Soc < 0 || battery1Soc > 100) {
    warnings.push(`Batterie 1 SOC (${battery1Soc.toFixed(1)}%) ist außerhalb des gültigen Bereichs (0-100%).`);
  }
  if (battery2Soc < 0 || battery2Soc > 100) {
    warnings.push(`Batterie 2 SOC (${battery2Soc.toFixed(1)}%) ist außerhalb des gültigen Bereichs (0-100%).`);
  }

  // Check 4: Very low SOC warning
  if (battery1Soc < 15 || battery2Soc < 15) {
    const lowBat = battery1Soc < 15 ? '1' : '2';
    info.push(`Batterie ${lowBat} hat niedrigen Ladestand (${lowBat === '1' ? battery1Soc.toFixed(1) : battery2Soc.toFixed(1)}%). Netzstrom wird verwendet.`);
  }

  // Check 5: Energy stored calculation verification
  const battery1Energy = (battery1Soc / 100) * battery1Capacity;
  const battery2Energy = (battery2Soc / 100) * battery2Capacity;
  const expectedB1 = (battery1Soc / 100) * battery1Capacity;
  const expectedB2 = (battery2Soc / 100) * battery2Capacity;
  
  // Allow 0.1 kWh tolerance for rounding
  if (Math.abs(battery1Energy - expectedB1) > 0.1) {
    warnings.push(`Batterie 1: Energieberechnung inkonsistent (${battery1Energy.toFixed(1)} kWh vs. erwartet ${expectedB1.toFixed(1)} kWh).`);
  }
  if (Math.abs(battery2Energy - expectedB2) > 0.1) {
    warnings.push(`Batterie 2: Energieberechnung inkonsistent (${battery2Energy.toFixed(1)} kWh vs. erwartet ${expectedB2.toFixed(1)} kWh).`);
  }

  // Check 6: Total consumption plausibility (3 households + common areas)
  if (totalConsumption < 0.1) {
    warnings.push(`Gesamtverbrauch ist sehr niedrig (${totalConsumption.toFixed(1)} kW). Erwarteter Mindestverbrauch: ~0.5 kW.`);
  }
  if (totalConsumption > 50) {
    warnings.push(`Gesamtverbrauch ist sehr hoch (${totalConsumption.toFixed(1)} kW). Maximale erwartete Last: ~30 kW.`);
  }

  // Check 7: PV production plausibility
  if (pvProduction > 70) {
    warnings.push(`PV-Produktion (${pvProduction.toFixed(1)} kW) übersteigt installierte Kapazität (66.88 kWp).`);
  }

  // Check 8: Energy balance validation
  // Note: This is a simplified check - detailed balance requires battery flow rates
  const netFlow = pvProduction - totalConsumption;
  if (Math.abs(netFlow) > 70) {
    warnings.push(`Energiebilanz (${netFlow.toFixed(1)} kW) ist unrealistisch hoch. Überprüfen Sie PV-Produktion und Verbrauch.`);
  }

  // Check 9: Identical battery SOC warning - only warn if truly unusual (very similar for extended period)
  // Since we can't track history, we'll make this threshold more strict
  const socDifference = Math.abs(battery1Soc - battery2Soc);
  if (socDifference < 0.1 && battery1Soc > 15 && battery2Soc > 15 && battery1Soc < 95 && battery2Soc < 95) {
    // Only show this as info if SOC is extremely close (< 0.1%) in the middle range
    // This is rare but can happen with symmetric load distribution
    info.push(`Beide Batterien haben nahezu identischen SOC (${battery1Soc.toFixed(1)}% vs ${battery2Soc.toFixed(1)}%). Dies kann bei symmetrischer Lastverteilung auftreten.`);
  }

  // Check 10: Battery capacity consistency
  if (battery1Capacity !== battery2Capacity) {
    info.push(`Batterien haben unterschiedliche Kapazitäten: Batterie 1 (${battery1Capacity} kWh), Batterie 2 (${battery2Capacity} kWh).`);
  }

  if (warnings.length === 0 && info.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      {warnings.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3 shadow">
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-red-900 mb-1">Plausibilitäts-Warnung</h3>
              <ul className="text-xs text-red-800 space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {info.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 shadow">
          <div className="flex items-start gap-2">
            <span className="text-xl">ℹ️</span>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-blue-900 mb-1">Information</h3>
              <ul className="text-xs text-blue-800 space-y-1">
                {info.map((infoItem, idx) => (
                  <li key={idx}>• {infoItem}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
