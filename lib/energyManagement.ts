/**
 * Optimiertes Energiemanagement für MFH Gängle 2+4
 * 
 * Ziele:
 * 1. Maximaler Eigenverbrauch der PV-Energie
 * 2. Minimaler Netzbezug
 * 3. Minimale Netzeinspeisung
 * 4. Optimale Batterienutzung
 */

export interface EnergyManagementConfig {
  // Batterie-Schwellwerte
  minSoc: number;           // Minimaler SOC (Reserve)
  maxSoc: number;           // Maximaler SOC (Schutz)
  targetNightSoc: number;   // Ziel-SOC für die Nacht
  targetDaySoc: number;     // Ziel-SOC für den Tag
  
  // Lade-/Entlade-Strategien
  maxChargeRate: number;    // Maximale Ladeleistung pro Batterie (kW)
  maxDischargeRate: number; // Maximale Entladeleistung pro Batterie (kW)
  
  // Tageszeiten für Strategiewechsel
  nightStart: number;       // Beginn Nachtmodus (Stunde)
  nightEnd: number;         // Ende Nachtmodus (Stunde)
  peakSolarStart: number;   // Beginn Hauptsolarzeit (Stunde)
  peakSolarEnd: number;     // Ende Hauptsolarzeit (Stunde)
}

export const DEFAULT_CONFIG: EnergyManagementConfig = {
  minSoc: 15,               // 15% Reserve (3 kWh pro Batterie)
  maxSoc: 95,               // 95% Maximum (Schutz vor Überladung)
  targetNightSoc: 70,       // 70% für die Nacht (14 kWh)
  targetDaySoc: 30,         // 30% Minimum am Tag (6 kWh)
  maxChargeRate: 10,        // 10 kW Ladeleistung
  maxDischargeRate: 5,      // 5 kW Entladeleistung
  nightStart: 20,           // 20:00 Uhr
  nightEnd: 6,              // 06:00 Uhr
  peakSolarStart: 10,       // 10:00 Uhr
  peakSolarEnd: 16,         // 16:00 Uhr
};

export interface BatteryState {
  soc: number;              // State of Charge (0-100%)
  energy: number;           // Energie in kWh
  canCharge: number;        // Verfügbare Ladekapazität (kWh)
  canDischarge: number;     // Verfügbare Entladekapazität (kWh)
}

export interface EnergyFlow {
  pvProduction: number;     // PV-Produktion (kW)
  consumption: number;      // Gesamtverbrauch (kW)
  batteryCharge: number;    // Batterie-Ladung (kW, positiv = laden)
  batteryDischarge: number; // Batterie-Entladung (kW, positiv = entladen)
  gridImport: number;       // Netzbezug (kW, positiv = Bezug)
  gridExport: number;       // Netzeinspeisung (kW, positiv = Einspeisung)
  decisionReason?: string;  // Erklärung der Energiemanagement-Entscheidung
}

/**
 * Berechnet den optimalen Energiefluss für eine gegebene Situation
 */
export function calculateOptimalEnergyFlow(
  pvProduction: number,
  consumption: number,
  batteryState: BatteryState,
  hour: number,
  month: number,
  config: EnergyManagementConfig = DEFAULT_CONFIG
): EnergyFlow {
  const netFlow = pvProduction - consumption;
  
  // Initialisiere Energieflüsse
  const flow: EnergyFlow = {
    pvProduction,
    consumption,
    batteryCharge: 0,
    batteryDischarge: 0,
    gridImport: 0,
    gridExport: 0,
    decisionReason: '',
  };
  
  // Bestimme Tageszeit-Strategie
  const isNight = hour >= config.nightStart || hour < config.nightEnd;
  const isPeakSolar = hour >= config.peakSolarStart && hour <= config.peakSolarEnd;
  
  // Fall 1: PV-Überschuss (netFlow > 0)
  if (netFlow > 0.05) {
    // Priorität 1: Batterie laden (wenn noch Kapazität)
    if (batteryState.soc < config.maxSoc) {
      const chargeCapacity = batteryState.canCharge;
      const desiredCharge = Math.min(netFlow, config.maxChargeRate);
      flow.batteryCharge = Math.min(desiredCharge, chargeCapacity);
      
      // Überschuss nach Batterieladung ins Netz
      const remainingSurplus = netFlow - flow.batteryCharge;
      if (remainingSurplus > 0.05) {
        flow.gridExport = remainingSurplus;
        flow.decisionReason = `PV-Überschuss: ${netFlow.toFixed(2)} kW. Batterie wird geladen mit ${flow.batteryCharge.toFixed(2)} kW (max. ${config.maxChargeRate} kW). Überschuss von ${flow.gridExport.toFixed(2)} kW wird ins Netz eingespeist.`;
      } else {
        flow.decisionReason = `PV-Überschuss: ${netFlow.toFixed(2)} kW. Batterie wird vollständig geladen (SOC: ${batteryState.soc.toFixed(1)}% → ${config.maxSoc}%). Keine Netzeinspeisung.`;
      }
    } else {
      // Batterie voll -> gesamter Überschuss ins Netz
      flow.gridExport = netFlow;
      flow.decisionReason = `PV-Überschuss: ${netFlow.toFixed(2)} kW. Batterie ist voll (${batteryState.soc.toFixed(1)}% ≥ ${config.maxSoc}%). Gesamter Überschuss wird ins Netz eingespeist.`;
    }
  }
  // Fall 2: PV-Defizit (netFlow < 0)
  else if (netFlow < -0.05) {
    const deficit = Math.abs(netFlow);
    
    // Strategie basierend auf Tageszeit und SOC
    if (isNight) {
      // NACHTMODUS: Batterie schonen, bevorzugt Netz nutzen
      // Nur Batterie nutzen wenn SOC > targetNightSoc (Reserve aufgebraucht)
      if (batteryState.soc > config.targetNightSoc) {
        const availableDischarge = batteryState.canDischarge;
        const desiredDischarge = Math.min(deficit, config.maxDischargeRate);
        flow.batteryDischarge = Math.min(desiredDischarge, availableDischarge);
        
        const remainingDeficit = deficit - flow.batteryDischarge;
        if (remainingDeficit > 0.05) {
          flow.gridImport = remainingDeficit;
          flow.decisionReason = `🌙 NACHTMODUS (${String(hour).padStart(2, '0')}:00 Uhr): Defizit ${deficit.toFixed(2)} kW. Batterie-SOC (${batteryState.soc.toFixed(1)}%) > Nacht-Ziel (${config.targetNightSoc}%), daher wird Batterie genutzt: ${flow.batteryDischarge.toFixed(2)} kW (max. ${config.maxDischargeRate} kW). Restdefizit ${flow.gridImport.toFixed(2)} kW vom Netz.`;
        } else {
          flow.decisionReason = `🌙 NACHTMODUS (${String(hour).padStart(2, '0')}:00 Uhr): Defizit ${deficit.toFixed(2)} kW. Batterie-SOC (${batteryState.soc.toFixed(1)}%) > Nacht-Ziel (${config.targetNightSoc}%), daher wird vollständig aus Batterie gedeckt: ${flow.batteryDischarge.toFixed(2)} kW.`;
        }
      } else {
        // SOC zu niedrig -> komplett vom Netz
        flow.gridImport = deficit;
        flow.decisionReason = `🌙 NACHTMODUS (${String(hour).padStart(2, '0')}:00 Uhr): Defizit ${deficit.toFixed(2)} kW. ⚠️ BATTERIE WIRD GESCHONT: SOC (${batteryState.soc.toFixed(1)}%) ≤ Nacht-Ziel-SOC (${config.targetNightSoc}%). Kompletter Strombezug erfolgt vom Netz, um Batterieladung für die restliche Nacht zu bewahren (bis ${String(config.nightEnd).padStart(2, '0')}:00 Uhr).`;
      }
    } else {
      // TAGMODUS: Batterie bevorzugt nutzen wenn verfügbar
      if (batteryState.soc > config.minSoc) {
        const availableDischarge = batteryState.canDischarge;
        const desiredDischarge = Math.min(deficit, config.maxDischargeRate);
        flow.batteryDischarge = Math.min(desiredDischarge, availableDischarge);
        
        const remainingDeficit = deficit - flow.batteryDischarge;
        if (remainingDeficit > 0.05) {
          flow.gridImport = remainingDeficit;
          flow.decisionReason = `☀️ TAGMODUS (${String(hour).padStart(2, '0')}:00 Uhr): Defizit ${deficit.toFixed(2)} kW. Batterie-SOC (${batteryState.soc.toFixed(1)}%) > Minimum (${config.minSoc}%), daher wird Batterie genutzt: ${flow.batteryDischarge.toFixed(2)} kW (max. ${config.maxDischargeRate} kW). Restdefizit ${flow.gridImport.toFixed(2)} kW vom Netz.`;
        } else {
          flow.decisionReason = `☀️ TAGMODUS (${String(hour).padStart(2, '0')}:00 Uhr): Defizit ${deficit.toFixed(2)} kW. Batterie-SOC (${batteryState.soc.toFixed(1)}%) > Minimum (${config.minSoc}%), daher wird vollständig aus Batterie gedeckt: ${flow.batteryDischarge.toFixed(2)} kW.`;
        }
      } else {
        // SOC zu niedrig -> komplett vom Netz
        flow.gridImport = deficit;
        flow.decisionReason = `☀️ TAGMODUS (${String(hour).padStart(2, '0')}:00 Uhr): Defizit ${deficit.toFixed(2)} kW. ⚠️ BATTERIE-MINIMUM ERREICHT: SOC (${batteryState.soc.toFixed(1)}%) ≤ Minimum-SOC (${config.minSoc}%). Kompletter Strombezug erfolgt vom Netz, um Batterie-Reserve zu schützen.`;
      }
    }
  }
  // Fall 3: Ausgeglichen (netFlow ≈ 0)
  else {
    flow.decisionReason = `⚖️ AUSGEGLICHEN: PV-Produktion (${pvProduction.toFixed(2)} kW) deckt Verbrauch (${consumption.toFixed(2)} kW) vollständig. Kein Netz- oder Batterieaustausch erforderlich.`;
  }
  
  return flow;
}

/**
 * Aktualisiert den Batterie-Zustand basierend auf dem Energiefluss
 */
export function updateBatteryState(
  state: BatteryState,
  flow: EnergyFlow,
  capacity: number,
  efficiency: number = 0.95
): BatteryState {
  let newSoc = state.soc;
  
  // Batterie laden
  if (flow.batteryCharge > 0) {
    const energyAdded = flow.batteryCharge * efficiency; // Ladeverluste
    const socIncrease = (energyAdded / capacity) * 100;
    newSoc = Math.min(100, newSoc + socIncrease);
  }
  
  // Batterie entladen
  if (flow.batteryDischarge > 0) {
    const energyRemoved = flow.batteryDischarge / efficiency; // Entladeverluste
    const socDecrease = (energyRemoved / capacity) * 100;
    newSoc = Math.max(0, newSoc - socDecrease);
  }
  
  const newEnergy = (newSoc / 100) * capacity;
  const canCharge = ((100 - newSoc) / 100) * capacity;
  const canDischarge = ((newSoc - 15) / 100) * capacity; // 15% Reserve
  
  return {
    soc: newSoc,
    energy: newEnergy,
    canCharge: Math.max(0, canCharge),
    canDischarge: Math.max(0, canDischarge),
  };
}

/**
 * Berechnet den optimalen Start-SOC basierend auf Monat und Wochentag
 */
export function calculateOptimalStartSoc(month: number, dayOfWeek: number): number {
  // Im Winter höherer Start-SOC (mehr Reserve für lange Nächte)
  const winterMonths = [12, 1, 2];
  const isWinter = winterMonths.includes(month);
  
  // Am Wochenende höherer Start-SOC (mehr Verbrauch tagsüber)
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  let startSoc = 50; // Basis
  
  if (isWinter) startSoc += 15; // Winter: 65%
  if (isWeekend) startSoc += 10; // Wochenende: +10%
  
  return Math.min(85, startSoc);
}
