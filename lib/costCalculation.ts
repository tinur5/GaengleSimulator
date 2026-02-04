/**
 * Kostenberechnung für Stromverbrauch und Netznutzung
 * Basierend auf LKW Liechtenstein Tarifen 2025
 */

import {
  LKWTariffType,
  LKWTariffModel,
  NetworkUsageFees,
  getTariffModel,
  isHighTariffHour,
  getFlexTariffLevel,
  isWinterMonth,
  NETWORK_USAGE_FEES,
} from './lkwTariffs';

export interface HourlyEnergyCost {
  hour: number;
  energyImportKwh: number;      // Netzbezug in kWh
  energyExportKwh: number;      // Einspeisung in kWh
  
  // Energiekosten (Rappen)
  energyCost: number;           // Energiekosten
  networkCost: number;          // Netznutzungskosten
  totalCost: number;            // Gesamtkosten
  
  // Details für Transparenz
  energyPriceRpKwh: number;     // Energiepreis in Rp./kWh
  networkPriceRpKwh: number;    // Netzpreis in Rp./kWh
}

export interface DailyCostSummary {
  date: Date;
  
  // Energiemengen (kWh)
  totalImportKwh: number;       // Gesamt Netzbezug
  totalExportKwh: number;       // Gesamt Einspeisung
  netImportKwh: number;         // Netto Netzbezug
  
  // Kosten (Rappen)
  totalEnergyCost: number;      // Gesamt Energiekosten
  totalNetworkCost: number;     // Gesamt Netzkosten
  totalCost: number;            // Gesamtkosten
  
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
  
  // Kosten (CHF, inkl. MwSt. 8.1%)
  energyCostCHF: number;        // Energiekosten
  networkCostCHF: number;       // Netznutzungskosten
  fixedCostCHF: number;         // Fixkosten (Zähler + Grundgebühr)
  totalCostCHF: number;         // Gesamtkosten
  
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
  
  // Kosten berechnen (nur für Import, Export wird nicht vergütet in diesem Modell)
  const energyCost = energyImportKwh * energyPriceRpKwh;
  const networkCost = energyImportKwh * networkPriceRpKwh;
  const totalCost = energyCost + networkCost;
  
  return {
    hour,
    energyImportKwh,
    energyExportKwh,
    energyCost,
    networkCost,
    totalCost,
    energyPriceRpKwh,
    networkPriceRpKwh,
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
  }
  
  const totalCost = totalEnergyCost + totalNetworkCost;
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
  
  for (const daily of dailyCosts) {
    totalImportKwh += daily.totalImportKwh;
    totalExportKwh += daily.totalExportKwh;
    totalEnergyCostRp += daily.totalEnergyCost;
    totalNetworkCostRp += daily.totalNetworkCost;
  }
  
  const netImportKwh = totalImportKwh - totalExportKwh;
  
  // Konvertiere Rappen zu CHF
  const energyCostCHF = totalEnergyCostRp / 100;
  const networkCostCHF = totalNetworkCostRp / 100;
  
  // Fixkosten (Zähler + Grundgebühr)
  const fixedCostCHF = NETWORK_USAGE_FEES.meterFee + NETWORK_USAGE_FEES.basicFee;
  
  // Gesamtkosten ohne MwSt.
  const totalCostExclVat = energyCostCHF + networkCostCHF + fixedCostCHF;
  
  // Mit MwSt.
  const totalCostCHF = totalCostExclVat * (1 + VAT_RATE);
  
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
  const fixedCostCHF = NETWORK_USAGE_FEES.meterFee + NETWORK_USAGE_FEES.basicFee;
  
  const totalCostExclVat = energyCostCHF + networkCostCHF + fixedCostCHF;
  const totalCostCHF = totalCostExclVat * (1 + VAT_RATE);
  
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
    totalCostExclVat,
    avgCostPerKwh,
  };
}
