/**
 * LKW Liechtenstein Stromtarif-Modelle für 2025
 * 
 * Basierend auf offiziellen LKW Preisblättern:
 * - https://www.lkw.li/angebot-und-leistungen/strom-und-waerme/strompreise.html
 * - Stand: Januar 2025
 */

export type LKWTariffType = 'classic' | 'flex' | 'free';

export interface TimeOfUsePrice {
  start: number;  // Stunde (0-23)
  end: number;    // Stunde (0-23)
  price: number;  // Rappen/kWh
}

export interface LKWTariffModel {
  type: LKWTariffType;
  name: string;
  description: string;
  
  // Energiepreise (Rappen/kWh, exkl. MwSt.)
  energyPrices: {
    high?: number;          // Hochtarif (nur classic)
    low?: number;           // Niedertarif (nur classic)
    saver?: number;         // Spartarif (nur flex)
    normal?: number;        // Normaltarif (nur flex)
    peak?: number;          // Spitzentarif (nur flex)
    dynamic?: number;       // Dynamischer Aufschlag (flex/free)
    baseMarket?: number;    // EPEX Spot Basis (nur free, variabel)
  };
  
  // Zeitfenster für Tarife
  timeWindows?: {
    high?: { days: number[]; hours: number[] };  // Mo-Fr 7-20, Sa 7-13
    low?: { days: number[]; hours: number[] };   // Mo-Fr 20-7, Sa 13-Mo 7
    saver?: number[];       // Spartarifzeiten (Stunden)
    normal?: number[];      // Normaltarifzeiten
    peak?: number[];        // Spitzentarifzeiten
  };
  
  // Zusätzliche Gebühren (Rappen/kWh)
  processingFee: number;    // Abwicklungsgebühr
  ecoSurcharge: number;     // Ökologiebeitrag (optional)
}

export interface NetworkUsageFees {
  // Grundgebühren (CHF/Monat)
  meterFee: number;         // Zählergebühr
  basicFee: number;         // Grundgebühr
  
  // Arbeitspreise (Rappen/kWh)
  summer: number;           // April-September
  winter: number;           // Oktober-März
  
  // System-Gebühren (Rappen/kWh)
  swissgridUsage: number;   // Swissgrid Systemnutzung
  swissgridReserve: number; // Swissgrid Leistungsreserve
  efficiencySurcharge: number; // Zuschlag Energieeffizienzgesetz
}

/**
 * LKWclassic - Festpreismodell mit Hoch-/Niedertarif
 * Für Kunden mit Planungssicherheit
 */
export const LKW_CLASSIC: LKWTariffModel = {
  type: 'classic',
  name: 'LKWclassic',
  description: 'Festpreismodell mit Planungssicherheit - Hoch-/Niedertarif',
  energyPrices: {
    high: 12.80,   // Rp./kWh Hochtarif
    low: 10.90,    // Rp./kWh Niedertarif
  },
  timeWindows: {
    high: {
      days: [1, 2, 3, 4, 5],  // Mo-Fr
      hours: Array.from({ length: 13 }, (_, i) => i + 7), // 7-20 Uhr
    },
    low: {
      days: [0, 1, 2, 3, 4, 5, 6], // Alle Tage
      hours: [], // Wird dynamisch berechnet (alles außer high)
    },
  },
  processingFee: 0,
  ecoSurcharge: 5.00, // +5 Rp./kWh für Liechtenstein-Naturstrom (optional)
};

/**
 * Samstag Hochtarif für classic (7-13 Uhr)
 */
export const LKW_CLASSIC_SATURDAY_HIGH_HOURS = Array.from({ length: 6 }, (_, i) => i + 7); // 7-13 Uhr

/**
 * LKWflex - Monatlich dynamischer Tarif
 * Orientiert an Marktpreisentwicklung mit drei Tarifstufen
 */
export const LKW_FLEX: LKWTariffModel = {
  type: 'flex',
  name: 'LKWflex',
  description: 'Monatlich dynamischer Tarif mit Spar-, Normal- und Spitzentarifen',
  energyPrices: {
    saver: 11.84,   // Rp./kWh Spartarif (günstige Zeiten)
    normal: 13.02,  // Rp./kWh Normaltarif
    peak: 15.39,    // Rp./kWh Spitzentarif
    dynamic: 1.00,  // +1 Rp./kWh dynamischer Aufschlag
  },
  timeWindows: {
    saver: [2, 3, 4, 5, 11, 12, 13, 14, 15, 16], // 2-5 Uhr, 11-16 Uhr
    normal: [0, 1, 6, 7, 8, 9, 10, 20, 21, 22, 23], // Übrige Zeit außer Peak
    peak: [17, 18, 19], // 17-20 Uhr (Abendspitze)
  },
  processingFee: 3.00, // Rp./kWh
  ecoSurcharge: 5.00,  // +5 Rp./kWh für Naturstrom (optional)
};

/**
 * LKWfree - Komplett flexibles Modell
 * Stündliche Preise nach EPEX Spot CH
 */
export const LKW_FREE: LKWTariffModel = {
  type: 'free',
  name: 'LKWfree',
  description: 'Komplett flexibel nach Börsenpreisen (EPEX Spot CH)',
  energyPrices: {
    baseMarket: 10.00, // Durchschnittlicher Marktpreis (variiert stündlich)
    dynamic: 1.00,     // +1 Rp./kWh Aufschlag
  },
  processingFee: 2.60, // Rp./kWh
  ecoSurcharge: 5.00,  // +5 Rp./kWh für Naturstrom (optional)
};

/**
 * Netznutzungsgebühren für Kundengruppe 2 (mit PV-Einspeisung)
 * Basierend auf LKW Preisblatt 2025
 */
export const NETWORK_USAGE_FEES: NetworkUsageFees = {
  meterFee: 7.00,        // CHF/Monat (Direktanschluss)
  basicFee: 3.50,        // CHF/Monat
  summer: 7.90,          // Rp./kWh (April-September)
  winter: 9.70,          // Rp./kWh (Oktober-März)
  swissgridUsage: 0.55,  // Rp./kWh
  swissgridReserve: 0.23, // Rp./kWh
  efficiencySurcharge: 1.50, // Rp./kWh
};

/**
 * Alle verfügbaren Tarifmodelle
 */
export const ALL_TARIFF_MODELS: Record<LKWTariffType, LKWTariffModel> = {
  classic: LKW_CLASSIC,
  flex: LKW_FLEX,
  free: LKW_FREE,
};

/**
 * Gibt das Tarifmodell für einen gegebenen Typ zurück
 */
export function getTariffModel(type: LKWTariffType): LKWTariffModel {
  return ALL_TARIFF_MODELS[type];
}

/**
 * Gibt alle verfügbaren Tarifmodelle als Array zurück
 */
export function getAllTariffModels(): LKWTariffModel[] {
  return Object.values(ALL_TARIFF_MODELS);
}

/**
 * Prüft ob eine Stunde zum Hochtarif gehört (für classic)
 */
export function isHighTariffHour(hour: number, dayOfWeek: number): boolean {
  // Mo-Fr 7-20 Uhr
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return hour >= 7 && hour < 20;
  }
  // Sa 7-13 Uhr
  if (dayOfWeek === 6) {
    return hour >= 7 && hour < 13;
  }
  // Sonntag: Niedertarif
  return false;
}

/**
 * Bestimmt die Tarifstufe für LKWflex basierend auf der Stunde
 */
export function getFlexTariffLevel(hour: number): 'saver' | 'normal' | 'peak' {
  if (LKW_FLEX.timeWindows?.saver?.includes(hour)) {
    return 'saver';
  }
  if (LKW_FLEX.timeWindows?.peak?.includes(hour)) {
    return 'peak';
  }
  return 'normal';
}

/**
 * Berechnet ob Sommer- oder Winterpreise gelten (für Netznutzung)
 */
export function isWinterMonth(month: number): boolean {
  // Winter: Oktober (10) bis März (3)
  return month >= 10 || month <= 3;
}
