/**
 * Optimierungsstrategien für das Energiemanagement
 * 
 * Jede Strategie optimiert nach unterschiedlichen Zielen:
 * - Kosten: Minimale Stromkosten
 * - Eigenverbrauch: Maximaler Eigenverbrauch der PV-Energie
 * - Flexibilität: Maximale Flexibilität für unvorhersehbare Ereignisse
 * - Netzstabilität: Unterstützung der Netzstabilität
 * - Balanced: Ausgewogene Strategie
 */

import { EnergyManagementConfig } from './energyManagement';

export type OptimizationStrategyType = 
  | 'cost'            // Kostenoptimierung
  | 'selfConsumption' // Eigenverbrauch maximieren
  | 'flexibility'     // Maximale Flexibilität
  | 'gridStability'   // Netzstabilität unterstützen
  | 'balanced';       // Ausgewogene Strategie

export interface OptimizationStrategy {
  type: OptimizationStrategyType;
  name: string;
  description: string;
  config: EnergyManagementConfig;
  priority: {
    batteryPreservation: number;  // 0-10
    gridIndependence: number;     // 0-10
    costSaving: number;           // 0-10
    flexibility: number;          // 0-10
  };
}

/**
 * Kostenoptimierung: Minimiert Stromkosten durch intelligentes Laden/Entladen
 * - Batterie nachts nutzen statt teuren Netzstrom zu beziehen
 * - Maximale Nutzung von PV-Energie tagsüber
 * - Netzeinspeisung vermeiden (wenn Vergütung niedrig)
 */
export const COST_OPTIMIZATION: OptimizationStrategy = {
  type: 'cost',
  name: 'Kostenoptimierung',
  description: 'Minimiert Stromkosten durch intelligentes Energiemanagement',
  config: {
    minSoc: 10,
    maxSoc: 98,
    targetNightSoc: 15,  // Niedrig, damit Batterie nachts voll genutzt wird statt teuren Netzstrom
    targetDaySoc: 25,
    maxChargeRate: 11,
    maxDischargeRate: 7,
    nightStart: 22,
    nightEnd: 5,
    peakSolarStart: 10,
    peakSolarEnd: 16,
  },
  priority: {
    batteryPreservation: 3,
    gridIndependence: 8,
    costSaving: 10,
    flexibility: 5,
  },
};

/**
 * Eigenverbrauch: Maximiert den Eigenverbrauch der PV-Energie
 * - Sofortiges Laden bei PV-Überschuss
 * - Minimale Netzeinspeisung
 * - Bevorzugte Nutzung von Batteriestrom
 */
export const SELF_CONSUMPTION_OPTIMIZATION: OptimizationStrategy = {
  type: 'selfConsumption',
  name: 'Eigenverbrauch maximieren',
  description: 'Maximiert die Nutzung der eigenen PV-Energie',
  config: {
    minSoc: 15,
    maxSoc: 95,
    targetNightSoc: 70,
    targetDaySoc: 30,
    maxChargeRate: 10,
    maxDischargeRate: 5,
    nightStart: 20,
    nightEnd: 6,
    peakSolarStart: 10,
    peakSolarEnd: 16,
  },
  priority: {
    batteryPreservation: 5,
    gridIndependence: 9,
    costSaving: 7,
    flexibility: 6,
  },
};

/**
 * Flexibilität: Maximale Reaktionsfähigkeit auf Veränderungen
 * - Batterie bei mittlerem SOC halten
 * - Schnelle Lade-/Entladeraten
 * - Reserve für Notfälle
 */
export const FLEXIBILITY_OPTIMIZATION: OptimizationStrategy = {
  type: 'flexibility',
  name: 'Maximale Flexibilität',
  description: 'Hält System bereit für unvorhersehbare Ereignisse',
  config: {
    minSoc: 30,  // Höhere Reserve
    maxSoc: 85,  // Nicht voll, um Ladepotential zu haben
    targetNightSoc: 60,
    targetDaySoc: 50,
    maxChargeRate: 12,
    maxDischargeRate: 8,
    nightStart: 21,
    nightEnd: 6,
    peakSolarStart: 9,
    peakSolarEnd: 17,
  },
  priority: {
    batteryPreservation: 6,
    gridIndependence: 6,
    costSaving: 5,
    flexibility: 10,
  },
};

/**
 * Netzstabilität: Unterstützt das Stromnetz
 * - Netzentlastung zu Spitzenzeiten
 * - Gezielte Einspeisung
 * - Lastverschiebung
 */
export const GRID_STABILITY_OPTIMIZATION: OptimizationStrategy = {
  type: 'gridStability',
  name: 'Netzstabilität',
  description: 'Unterstützt die Stabilität des Stromnetzes',
  config: {
    minSoc: 20,
    maxSoc: 90,
    targetNightSoc: 75,
    targetDaySoc: 40,
    maxChargeRate: 9,
    maxDischargeRate: 6,
    nightStart: 20,
    nightEnd: 7,
    peakSolarStart: 11,
    peakSolarEnd: 15,
  },
  priority: {
    batteryPreservation: 7,
    gridIndependence: 5,
    costSaving: 6,
    flexibility: 7,
  },
};

/**
 * Balanced: Ausgewogene Strategie für den Alltag
 * - Guter Kompromiss zwischen allen Zielen
 * - Standardeinstellung
 */
export const BALANCED_OPTIMIZATION: OptimizationStrategy = {
  type: 'balanced',
  name: 'Ausgewogen',
  description: 'Ausgewogene Strategie für den Alltag',
  config: {
    minSoc: 15,
    maxSoc: 95,
    targetNightSoc: 70,
    targetDaySoc: 30,
    maxChargeRate: 10,
    maxDischargeRate: 5,
    nightStart: 20,
    nightEnd: 6,
    peakSolarStart: 10,
    peakSolarEnd: 16,
  },
  priority: {
    batteryPreservation: 6,
    gridIndependence: 7,
    costSaving: 7,
    flexibility: 6,
  },
};

/**
 * Alle verfügbaren Strategien
 */
export const ALL_STRATEGIES: Record<OptimizationStrategyType, OptimizationStrategy> = {
  cost: COST_OPTIMIZATION,
  selfConsumption: SELF_CONSUMPTION_OPTIMIZATION,
  flexibility: FLEXIBILITY_OPTIMIZATION,
  gridStability: GRID_STABILITY_OPTIMIZATION,
  balanced: BALANCED_OPTIMIZATION,
};

/**
 * Gibt die Strategie für einen gegebenen Typ zurück
 */
export function getStrategy(type: OptimizationStrategyType): OptimizationStrategy {
  const strategy = ALL_STRATEGIES[type];
  if (!strategy) {
    console.warn(`Strategy type '${type}' not found, falling back to balanced`);
    return BALANCED_OPTIMIZATION;
  }
  return strategy;
}

/**
 * Gibt alle verfügbaren Strategien als Array zurück
 */
export function getAllStrategies(): OptimizationStrategy[] {
  return Object.values(ALL_STRATEGIES);
}
