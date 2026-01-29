/**
 * Jahressimulation für Energiemanagement-Optimierung
 * Testet verschiedene Strategien über ein komplettes Jahr
 */

const { calculateTenantConsumption, calculatePVProduction } = require('./lib/simulation');
const { 
  calculateOptimalEnergyFlow, 
  updateBatteryState, 
  calculateOptimalStartSoc,
  DEFAULT_CONFIG 
} = require('./lib/energyManagement');

// Gebäudekonfiguration
const building = {
  pvPeakKw: 66.88,
  efficiency: 0.95,
  batteryCapacityKwh: 20, // Pro Batterie
  numBatteries: 2,
};

// Mieter
const tenants = [
  { id: 1, name: 'Graf', consumption: 5200, householdSize: 4, livingAreaSqm: 140, ageGroup: 'Familie', vehicleType: 'VW ID4' },
  { id: 2, name: 'Wetly', consumption: 5200, householdSize: 4, livingAreaSqm: 140, ageGroup: 'Familie', vehicleType: 'Tesla' },
  { id: 3, name: 'Bürzle', consumption: 4500, householdSize: 2, livingAreaSqm: 200, ageGroup: 'Pensionierte', vehicleType: 'Porsche Hybrid' },
];

// Allgemeinverbrauch
function getCommonAreaConsumption(hour, month) {
  const poolActive = hour >= 8 && hour <= 22;
  const poolPower = poolActive 
    ? (month === 12 || month === 1 || month === 2 ? 0.3 : month === 3 || month === 11 ? 1.2 : 2.5) 
    : 0.05;
  const garage = hour >= 6 && hour <= 23 ? 0.3 : 0.05;
  let heating = 0;
  if (month === 12 || month === 1 || month === 2) {
    heating = (hour >= 6 && hour <= 22) ? 6.0 : 1.5;
  } else if (month === 3 || month === 11) {
    heating = (hour >= 6 && hour <= 22) ? 2.5 : 0.5;
  } else if (month >= 4 && month <= 10) {
    heating = (hour >= 6 && hour <= 22) ? 0.5 : 0.1;
  }
  let boiler = 0.2;
  if ((hour >= 6 && hour <= 8) || (hour >= 18 && hour <= 21)) {
    boiler = 1.2;
  } else if (hour >= 9 && hour <= 17) {
    boiler = 0.3;
  }
  return poolPower + garage + heating + boiler;
}

// Jahressimulation
function runYearSimulation(config = DEFAULT_CONFIG) {
  const metrics = {
    totalPvProduction: 0,
    totalConsumption: 0,
    totalGridImport: 0,
    totalGridExport: 0,
    totalBatteryCharge: 0,
    totalBatteryDischarge: 0,
    selfConsumptionRatio: 0,
    autarkyRatio: 0,
    gridDependency: 0,
  };

  // Simuliere jedes Monat
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(2026, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(2026, month - 1, day);
      const dayOfWeek = date.getDay();
      
      // Start-SOC für diesen Tag
      const startSoc = calculateOptimalStartSoc(month, dayOfWeek);
      
      // Batterie-Zustand pro Batterie
      let battery1 = {
        soc: startSoc,
        energy: (startSoc / 100) * building.batteryCapacityKwh,
        canCharge: ((100 - startSoc) / 100) * building.batteryCapacityKwh,
        canDischarge: ((startSoc - 15) / 100) * building.batteryCapacityKwh,
      };
      
      let battery2 = { ...battery1 };
      
      // Simuliere jede Stunde des Tages
      for (let hour = 0; hour < 24; hour++) {
        // Berechne Produktion und Verbrauch
        const pvProduction = calculatePVProduction(building.pvPeakKw, hour, month, building.efficiency);
        const houseConsumption = tenants.reduce((sum, t) => 
          sum + calculateTenantConsumption(t, hour, dayOfWeek, month), 0);
        const commonConsumption = getCommonAreaConsumption(hour, month);
        const totalConsumption = houseConsumption + commonConsumption;
        
        // Energie pro Wechselrichter/Batterie
        const pvPerWR = pvProduction / 2;
        const consumptionPerWR = totalConsumption / 2;
        
        // Berechne optimalen Energiefluss für beide Batterien
        const flow1 = calculateOptimalEnergyFlow(
          pvPerWR, consumptionPerWR, battery1, hour, month, config
        );
        const flow2 = calculateOptimalEnergyFlow(
          pvPerWR, consumptionPerWR, battery2, hour, month, config
        );
        
        // Aktualisiere Batterie-Zustände
        battery1 = updateBatteryState(battery1, flow1, building.batteryCapacityKwh, building.efficiency);
        battery2 = updateBatteryState(battery2, flow2, building.batteryCapacityKwh, building.efficiency);
        
        // Sammle Metriken
        metrics.totalPvProduction += pvProduction;
        metrics.totalConsumption += totalConsumption;
        metrics.totalGridImport += flow1.gridImport + flow2.gridImport;
        metrics.totalGridExport += flow1.gridExport + flow2.gridExport;
        metrics.totalBatteryCharge += flow1.batteryCharge + flow2.batteryCharge;
        metrics.totalBatteryDischarge += flow1.batteryDischarge + flow2.batteryDischarge;
      }
    }
  }
  
  // Berechne Kennzahlen
  metrics.selfConsumptionRatio = 
    ((metrics.totalPvProduction - metrics.totalGridExport) / metrics.totalPvProduction) * 100;
  metrics.autarkyRatio = 
    ((metrics.totalConsumption - metrics.totalGridImport) / metrics.totalConsumption) * 100;
  metrics.gridDependency = 
    (metrics.totalGridImport / metrics.totalConsumption) * 100;
  
  return metrics;
}

// Teste verschiedene Konfigurationen
console.log('='.repeat(80));
console.log('ENERGIEMANAGEMENT OPTIMIERUNG - MFH Gängle 2+4');
console.log('='.repeat(80));
console.log();

console.log('Gebäudedaten:');
console.log(`  PV-Anlage: ${building.pvPeakKw} kWp`);
console.log(`  Batterien: ${building.numBatteries}x ${building.batteryCapacityKwh} kWh = ${building.numBatteries * building.batteryCapacityKwh} kWh`);
console.log(`  Jahresverbrauch (geschätzt): ~${tenants.reduce((s, t) => s + t.consumption, 0)} kWh`);
console.log();

// Baseline: DEFAULT_CONFIG
console.log('TEST 1: Standard-Konfiguration (Baseline)');
console.log('-'.repeat(80));
const baseline = runYearSimulation(DEFAULT_CONFIG);
console.log(`  Eigenverbrauchsquote: ${baseline.selfConsumptionRatio.toFixed(1)}%`);
console.log(`  Autarkiegrad: ${baseline.autarkyRatio.toFixed(1)}%`);
console.log(`  Netzbezug: ${baseline.totalGridImport.toFixed(0)} kWh (${baseline.gridDependency.toFixed(1)}%)`);
console.log(`  Netzeinspeisung: ${baseline.totalGridExport.toFixed(0)} kWh`);
console.log(`  PV-Produktion: ${baseline.totalPvProduction.toFixed(0)} kWh`);
console.log(`  Gesamt-Verbrauch: ${baseline.totalConsumption.toFixed(0)} kWh`);
console.log();

// Test 2: Aggressivere Batterienutzung
console.log('TEST 2: Aggressivere Batterienutzung');
console.log('-'.repeat(80));
const aggressive = runYearSimulation({
  ...DEFAULT_CONFIG,
  minSoc: 10,
  targetNightSoc: 60,
  maxDischargeRate: 7,
});
console.log(`  Eigenverbrauchsquote: ${aggressive.selfConsumptionRatio.toFixed(1)}%`);
console.log(`  Autarkiegrad: ${aggressive.autarkyRatio.toFixed(1)}%`);
console.log(`  Netzbezug: ${aggressive.totalGridImport.toFixed(0)} kWh (${aggressive.gridDependency.toFixed(1)}%)`);
console.log(`  Netzeinspeisung: ${aggressive.totalGridExport.toFixed(0)} kWh`);
console.log();

// Test 3: Batterieschonend
console.log('TEST 3: Batterieschonende Strategie');
console.log('-'.repeat(80));
const conservative = runYearSimulation({
  ...DEFAULT_CONFIG,
  minSoc: 20,
  targetNightSoc: 75,
  maxDischargeRate: 4,
});
console.log(`  Eigenverbrauchsquote: ${conservative.selfConsumptionRatio.toFixed(1)}%`);
console.log(`  Autarkiegrad: ${conservative.autarkyRatio.toFixed(1)}%`);
console.log(`  Netzbezug: ${conservative.totalGridImport.toFixed(0)} kWh (${conservative.gridDependency.toFixed(1)}%)`);
console.log(`  Netzeinspeisung: ${conservative.totalGridExport.toFixed(0)} kWh`);
console.log();

// Test 4: Optimiert
console.log('TEST 4: Optimierte Strategie');
console.log('-'.repeat(80));
const optimized = runYearSimulation({
  minSoc: 12,
  maxSoc: 95,
  targetNightSoc: 65,
  targetDaySoc: 25,
  maxChargeRate: 10,
  maxDischargeRate: 6,
  nightStart: 21,
  nightEnd: 6,
  peakSolarStart: 10,
  peakSolarEnd: 16,
});
console.log(`  Eigenverbrauchsquote: ${optimized.selfConsumptionRatio.toFixed(1)}%`);
console.log(`  Autarkiegrad: ${optimized.autarkyRatio.toFixed(1)}%`);
console.log(`  Netzbezug: ${optimized.totalGridImport.toFixed(0)} kWh (${optimized.gridDependency.toFixed(1)}%)`);
console.log(`  Netzeinspeisung: ${optimized.totalGridExport.toFixed(0)} kWh`);
console.log();

// Vergleich
console.log('='.repeat(80));
console.log('VERGLEICH & EMPFEHLUNG');
console.log('='.repeat(80));

const configs = [
  { name: 'Baseline', metrics: baseline },
  { name: 'Aggressiv', metrics: aggressive },
  { name: 'Konservativ', metrics: conservative },
  { name: 'Optimiert', metrics: optimized },
];

// Finde beste Konfiguration (höchster Autarkiegrad)
const best = configs.reduce((prev, curr) => 
  curr.metrics.autarkyRatio > prev.metrics.autarkyRatio ? curr : prev
);

console.log(`\nBeste Strategie: ${best.name}`);
console.log(`  ✓ Autarkiegrad: ${best.metrics.autarkyRatio.toFixed(1)}%`);
console.log(`  ✓ Eigenverbrauch: ${best.metrics.selfConsumptionRatio.toFixed(1)}%`);
console.log(`  ✓ Netzbezug reduziert auf: ${best.metrics.totalGridImport.toFixed(0)} kWh/Jahr`);
console.log(`  ✓ Einsparung vs. ohne PV: ~${((1 - best.metrics.gridDependency / 100) * 100).toFixed(0)}%`);
console.log();

console.log('='.repeat(80));
