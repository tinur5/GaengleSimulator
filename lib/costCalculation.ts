/**
 * Kostenberechnung für Stromverbrauch und Netznutzung
 * Basierend auf LKW Liechtenstein Tarifen 2025
 */

import {
  LKWTariffType,
  LKWTariffModel,
  NetworkUsageFees,
  FeedInTariff,
  getTariffModel,
  isHighTariffHour,
  getFlexTariffLevel,
  isWinterMonth,
  NETWORK_USAGE_FEES,
  FEED_IN_TARIFF,
} from './lkwTariffs';

export interface HourlyEnergyCost {
  hour: number;
  energyImportKwh: number;      // Netzbezug in kWh
  energyExportKwh: number;      // Einspeisung in kWh
  
  // Ausgaben/Kosten (Rappen)
  energyCost: number;           // Energiekosten (Ausgabe)
  networkCost: number;          // Netznutzungskosten (Ausgabe)
  totalCost: number;            // Gesamtkosten (Ausgabe)
  
  // Einnahmen (Rappen)
  feedInRevenue: number;        // Einspeisevergütung (Einnahme)
  
  // Details für Transparenz
  energyPriceRpKwh: number;     // Energiepreis in Rp./kWh
  networkPriceRpKwh: number;    // Netzpreis in Rp./kWh
  feedInPriceRpKwh: number;     // Einspeisevergütung in Rp./kWh
}

export interface DailyCostSummary {
  date: Date;
  
  // Energiemengen (kWh)
  totalImportKwh: number;       // Gesamt Netzbezug
  totalExportKwh: number;       // Gesamt Einspeisung
  netImportKwh: number;         // Netto Netzbezug
  
  // Ausgaben (Rappen)
  totalEnergyCost: number;      // Gesamt Energiekosten (Ausgabe)
  totalNetworkCost: number;     // Gesamt Netzkosten (Ausgabe)
  totalCost: number;            // Gesamtkosten (Ausgaben)
  
  // Einnahmen (Rappen)
  totalFeedInRevenue: number;   // Gesamt Einspeisevergütung (Einnahme)
  
  // Netto (Ausgaben - Einnahmen)
  netCost: number;              // Nettokosten (Ausgaben - Einnahmen)
  
  // Monatliche Fixkosten (anteilig)
  dailyFixedCost: number;       // Fixkosten pro Tag (CHF)
  
  hourlyDetails: HourlyEnergyCost[];
}

export interface MonthlyCostSummary {
  month: number;
  year: number;
  
  // Energiemengen (kWh)
  totalImportKwh: number;
  totalExportKwh: number;
  netImportKwh: number;
  
  // Ausgaben (CHF, inkl. MwSt. 8.1%)
  energyCostCHF: number;        // Energiekosten (Ausgabe)
  networkCostCHF: number;       // Netznutzungskosten (Ausgabe)
  fixedCostCHF: number;         // Fixkosten (Zähler + Grundgebühr) (Ausgabe)
  totalCostCHF: number;         // Gesamtkosten (Ausgaben)
  
  // Einnahmen (CHF, inkl. MwSt. 8.1%)
  feedInRevenueCHF: number;     // Einspeisevergütung (Einnahme)
  
  // Netto (Ausgaben - Einnahmen)
  netCostCHF: number;           // Nettokosten (Ausgaben - Einnahmen)
  
  // Ohne MwSt.
  totalCostExclVat: number;
  
  // Durchschnittswerte
  avgCostPerKwh: number;        // Durchschnittlicher Preis pro kWh
}

const VAT_RATE = 0.081; // 8.1% MwSt.

/**
 * Berechnet Energiepreis für eine Stunde basierend auf Tarifmodell
 */
export function calculateHourlyEnergyPrice(
  hour: number,
  dayOfWeek: number,
  tariffModel: LKWTariffModel,
  useEco: boolean = false
): number {
  let basePrice = 0;
  
  switch (tariffModel.type) {
    case 'classic':
      basePrice = isHighTariffHour(hour, dayOfWeek)
        ? (tariffModel.energyPrices.high || 0)
        : (tariffModel.energyPrices.low || 0);
      break;
      
    case 'flex':
      const level = getFlexTariffLevel(hour);
      if (level === 'saver') {
        basePrice = tariffModel.energyPrices.saver || 0;
      } else if (level === 'peak') {
        basePrice = tariffModel.energyPrices.peak || 0;
      } else {
        basePrice = tariffModel.energyPrices.normal || 0;
      }
      basePrice += tariffModel.energyPrices.dynamic || 0; // Dynamischer Aufschlag
      break;
      
    case 'free':
      // Für free nutzen wir einen Durchschnittswert + dynamischer Aufschlag
      // In einer echten Implementierung würde man hier EPEX Spot Preise abrufen
      basePrice = (tariffModel.energyPrices.baseMarket || 10.00) + (tariffModel.energyPrices.dynamic || 0);
      break;
  }
  
  // Ökologiebeitrag hinzufügen
  if (useEco) {
    basePrice += tariffModel.ecoSurcharge;
  }
  
  // Abwicklungsgebühr
  basePrice += tariffModel.processingFee;
  
  return basePrice; // Rp./kWh
}

/**
 * Berechnet Netznutzungspreis für eine Stunde
 */
export function calculateHourlyNetworkPrice(
  month: number,
  networkFees: NetworkUsageFees = NETWORK_USAGE_FEES
): number {
  const isWinter = isWinterMonth(month);
  const networkPrice = isWinter ? networkFees.winter : networkFees.summer;
  
  return networkPrice + networkFees.swissgridUsage + networkFees.swissgridReserve + networkFees.efficiencySurcharge;
}

/**
 * Berechnet Einspeisevergütung für eine Stunde
 * Basierend auf marktorientierter Vergütung nach EPEX SPOT Swissix
 * mit gesetzlich garantierter Mindestvergütung von 6 Rp./kWh
 */
export function calculateHourlyFeedInPrice(
  hour: number,
  feedInTariff: FeedInTariff = FEED_IN_TARIFF
): number {
  // In einer echten Implementierung würde man hier stündliche EPEX Spot Preise abrufen
  // Für die Simulation nutzen wir einen Durchschnittswert mit stündlicher Variation
  
  // Variation basierend auf Tageszeit (höhere Preise während Peak-Zeiten)
  let priceVariation = 1.0;
  if (hour >= 17 && hour < 20) {
    // Abendspitze: +30%
    priceVariation = 1.3;
  } else if (hour >= 11 && hour < 14) {
    // Mittagsspitze: +20%
    priceVariation = 1.2;
  } else if (hour >= 2 && hour < 6) {
    // Nacht: -20%
    priceVariation = 0.8;
  }
  
  const marketPrice = feedInTariff.averageMarketRate * priceVariation;
  
  // Gesetzliche Mindestvergütung gilt als Untergrenze
  return Math.max(marketPrice, feedInTariff.minimumRate);
}

/**
 * Berechnet Kosten für eine einzelne Stunde
 */
export function calculateHourlyCost(
  hour: number,
  dayOfWeek: number,
  month: number,
  energyImportKwh: number,
  energyExportKwh: number,
  tariffType: LKWTariffType,
  useEco: boolean = false
): HourlyEnergyCost {
  const tariffModel = getTariffModel(tariffType);
  
  // Energiepreis (Rp./kWh)
  const energyPriceRpKwh = calculateHourlyEnergyPrice(hour, dayOfWeek, tariffModel, useEco);
  
  // Netznutzungspreis (Rp./kWh)
  const networkPriceRpKwh = calculateHourlyNetworkPrice(month);
  
  // Einspeisevergütung (Rp./kWh)
  const feedInPriceRpKwh = calculateHourlyFeedInPrice(hour);
  
  // Ausgaben berechnen (nur für Import)
  const energyCost = energyImportKwh * energyPriceRpKwh;
  const networkCost = energyImportKwh * networkPriceRpKwh;
  const totalCost = energyCost + networkCost;
  
  // Einnahmen berechnen (für Export)
  const feedInRevenue = energyExportKwh * feedInPriceRpKwh;
  
  return {
    hour,
    energyImportKwh,
    energyExportKwh,
    energyCost,
    networkCost,
    totalCost,
    feedInRevenue,
    energyPriceRpKwh,
    networkPriceRpKwh,
    feedInPriceRpKwh,
  };
}

/**
 * Berechnet Tageskosten
 */
export function calculateDailyCost(
  date: Date,
  hourlyImports: number[],  // 24 Werte in kWh
  hourlyExports: number[],  // 24 Werte in kWh
  tariffType: LKWTariffType,
  useEco: boolean = false,
  networkFees: NetworkUsageFees = NETWORK_USAGE_FEES
): DailyCostSummary {
  const dayOfWeek = date.getDay();
  const month = date.getMonth() + 1;
  
  const hourlyDetails: HourlyEnergyCost[] = [];
  let totalImportKwh = 0;
  let totalExportKwh = 0;
  let totalEnergyCost = 0;
  let totalNetworkCost = 0;
  let totalFeedInRevenue = 0;
  
  for (let hour = 0; hour < 24; hour++) {
    const importKwh = hourlyImports[hour] || 0;
    const exportKwh = hourlyExports[hour] || 0;
    
    const hourlyCost = calculateHourlyCost(
      hour,
      dayOfWeek,
      month,
      importKwh,
      exportKwh,
      tariffType,
      useEco
    );
    
    hourlyDetails.push(hourlyCost);
    totalImportKwh += importKwh;
    totalExportKwh += exportKwh;
    totalEnergyCost += hourlyCost.energyCost;
    totalNetworkCost += hourlyCost.networkCost;
    totalFeedInRevenue += hourlyCost.feedInRevenue;
  }
  
  const totalCost = totalEnergyCost + totalNetworkCost;
  const netCost = totalCost - totalFeedInRevenue;
  const netImportKwh = totalImportKwh - totalExportKwh;
  
  // Fixkosten pro Tag (Zähler + Grundgebühr)
  const dailyFixedCost = (networkFees.meterFee + networkFees.basicFee) / 30; // CHF/Tag (vereinfacht)
  
  return {
    date,
    totalImportKwh,
    totalExportKwh,
    netImportKwh,
    totalEnergyCost,
    totalNetworkCost,
    totalCost,
    totalFeedInRevenue,
    netCost,
    dailyFixedCost,
    hourlyDetails,
  };
}

/**
 * Berechnet Monatskosten
 */
export function calculateMonthlyCost(
  month: number,
  year: number,
  dailyCosts: DailyCostSummary[]
): MonthlyCostSummary {
  let totalImportKwh = 0;
  let totalExportKwh = 0;
  let totalEnergyCostRp = 0;
  let totalNetworkCostRp = 0;
  let totalFeedInRevenueRp = 0;
  
  for (const daily of dailyCosts) {
    totalImportKwh += daily.totalImportKwh;
    totalExportKwh += daily.totalExportKwh;
    totalEnergyCostRp += daily.totalEnergyCost;
    totalNetworkCostRp += daily.totalNetworkCost;
    totalFeedInRevenueRp += daily.totalFeedInRevenue;
  }
  
  const netImportKwh = totalImportKwh - totalExportKwh;
  
  // Konvertiere Rappen zu CHF
  const energyCostCHF = totalEnergyCostRp / 100;
  const networkCostCHF = totalNetworkCostRp / 100;
  const feedInRevenueCHF = totalFeedInRevenueRp / 100;
  
  // Fixkosten (Zähler + Grundgebühr)
  const fixedCostCHF = NETWORK_USAGE_FEES.meterFee + NETWORK_USAGE_FEES.basicFee;
  
  // Gesamtkosten ohne MwSt.
  const totalCostExclVat = energyCostCHF + networkCostCHF + fixedCostCHF;
  
  // Mit MwSt.
  const totalCostCHF = totalCostExclVat * (1 + VAT_RATE);
  const feedInRevenueCHFWithVat = feedInRevenueCHF * (1 + VAT_RATE);
  
  // Nettokosten (Ausgaben - Einnahmen)
  const netCostCHF = totalCostCHF - feedInRevenueCHFWithVat;
  
  // Durchschnittspreis pro kWh
  const avgCostPerKwh = totalImportKwh > 0 ? (totalCostCHF / totalImportKwh) : 0;
  
  return {
    month,
    year,
    totalImportKwh,
    totalExportKwh,
    netImportKwh,
    energyCostCHF: energyCostCHF * (1 + VAT_RATE),
    networkCostCHF: networkCostCHF * (1 + VAT_RATE),
    fixedCostCHF,
    totalCostCHF,
    feedInRevenueCHF: feedInRevenueCHFWithVat,
    netCostCHF,
    totalCostExclVat,
    avgCostPerKwh,
  };
}

/**
 * Schätzt Monatskosten basierend auf einem Tag (vereinfacht)
 */
export function estimateMonthlyCostFromDay(
  dailyCost: DailyCostSummary,
  daysInMonth: number = 30
): MonthlyCostSummary {
  const month = dailyCost.date.getMonth() + 1;
  const year = dailyCost.date.getFullYear();
  
  const totalImportKwh = dailyCost.totalImportKwh * daysInMonth;
  const totalExportKwh = dailyCost.totalExportKwh * daysInMonth;
  const netImportKwh = dailyCost.netImportKwh * daysInMonth;
  
  const energyCostCHF = (dailyCost.totalEnergyCost / 100) * daysInMonth;
  const networkCostCHF = (dailyCost.totalNetworkCost / 100) * daysInMonth;
  const feedInRevenueCHF = (dailyCost.totalFeedInRevenue / 100) * daysInMonth;
  const fixedCostCHF = NETWORK_USAGE_FEES.meterFee + NETWORK_USAGE_FEES.basicFee;
  
  const totalCostExclVat = energyCostCHF + networkCostCHF + fixedCostCHF;
  const totalCostCHF = totalCostExclVat * (1 + VAT_RATE);
  const feedInRevenueCHFWithVat = feedInRevenueCHF * (1 + VAT_RATE);
  
  // Nettokosten (Ausgaben - Einnahmen)
  const netCostCHF = totalCostCHF - feedInRevenueCHFWithVat;
  
  const avgCostPerKwh = totalImportKwh > 0 ? (totalCostCHF / totalImportKwh) : 0;
  
  return {
    month,
    year,
    totalImportKwh,
    totalExportKwh,
    netImportKwh,
    energyCostCHF: energyCostCHF * (1 + VAT_RATE),
    networkCostCHF: networkCostCHF * (1 + VAT_RATE),
    fixedCostCHF,
    totalCostCHF,
    feedInRevenueCHF: feedInRevenueCHFWithVat,
    netCostCHF,
    totalCostExclVat,
    avgCostPerKwh,
  };
}
