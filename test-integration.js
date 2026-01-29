/**
 * Integrations-Test: Überprüfe dass alle Komponenten funktionieren
 */

// Lade die Simulation-Funktionen
const { 
  calculateTenantConsumption, 
  calculatePVProduction,
  getSeasonFactor,
  getWeekdayFactor,
  getFamilyHourlyProfile,
  getRetiredHourlyProfile
} = require('./lib/simulation');

console.log('\n=== INTEGRATIONS-TEST: Dashboard-Funktionalität ===\n');

// Test-Tenants
const tenants = [
  { 
    name: 'Graf', 
    ageGroup: 'Familien mit Kindern',
    consumption: 5200,
    householdSize: 4,
    livingAreaSqm: 140,
    vehicleType: 'VW ID4'
  },
  { 
    name: 'Wetly', 
    ageGroup: 'Familien mit Kindern',
    consumption: 5200,
    householdSize: 4,
    livingAreaSqm: 140,
    vehicleType: 'Tesla'
  },
  { 
    name: 'Bürzle', 
    ageGroup: 'Pensionierte',
    consumption: 4500,
    householdSize: 2,
    livingAreaSqm: 200,
    vehicleType: 'Porsche Hybrid'
  }
];

console.log('📋 TEST 1: Haushalt-Verbrauch über den Tag\n');
const testDate = new Date('2026-01-15'); // Mittwoch
const month = testDate.getMonth() + 1; // Januar = 1
const dayOfWeek = testDate.getDay(); // 3 = Mittwoch

let passTenants = true;
tenants.forEach(tenant => {
  const night = calculateTenantConsumption(tenant, 3, dayOfWeek, month);
  const morning = calculateTenantConsumption(tenant, 7, dayOfWeek, month);
  const evening = calculateTenantConsumption(tenant, 20, dayOfWeek, month);
  
  const ratio = morning / night;
  console.log(`${tenant.name}:`);
  console.log(`  Nacht (3:00):  ${night.toFixed(3)} kW`);
  console.log(`  Morgen (7:00): ${morning.toFixed(3)} kW`);
  console.log(`  Abend (20:00): ${evening.toFixed(3)} kW`);
  console.log(`  Ratio M/N:     ${ratio.toFixed(1)}x ✓`);
  
  if (ratio < 3) {
    console.log('  ❌ WARN: Ratio zu niedrig, sollte > 3x sein\n');
    passTenants = false;
  } else {
    console.log('  ✅ PASS: Verbrauch variiert deutlich\n');
  }
});

console.log('📋 TEST 2: Pool-Saisonalität\n');
const getCommonAreaConsumption = (hour, month) => {
  const poolActive = hour >= 8 && hour <= 22;
  let poolPower = 0;
  if (poolActive) {
    if (month === 12 || month === 1 || month === 2) {
      poolPower = 0.3;
    } else if (month === 3 || month === 11) {
      poolPower = 1.2;
    } else {
      poolPower = 2.5;
    }
  } else {
    poolPower = 0.05;
  }
  
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
  
  return { pool: poolPower, garage, heating, boiler };
};

let passPool = true;
const poolWinter = getCommonAreaConsumption(12, 1); // Januar Mittags
const poolSommer = getCommonAreaConsumption(12, 6); // Juni Mittags

console.log(`Winter (Januar, 12:00): Pool = ${poolWinter.pool} kW`);
console.log(`Sommer (Juni, 12:00):   Pool = ${poolSommer.pool} kW`);

if (poolWinter.pool === 0.3 && poolSommer.pool === 2.5) {
  console.log('✅ PASS: Pool ist saisonal angepasst\n');
} else {
  console.log('❌ FAIL: Pool-Saisonalität funktioniert nicht\n');
  passPool = false;
}

console.log('📋 TEST 3: PV-Produktion über den Tag\n');
let passPV = true;

const pvNight = calculatePVProduction(66.88, 0, 6, 0.95); // Juni Mitternacht
const pvMorning = calculatePVProduction(66.88, 8, 6, 0.95); // Juni 8:00
const pvNoon = calculatePVProduction(66.88, 12, 6, 0.95); // Juni 12:00
const pvEvening = calculatePVProduction(66.88, 20, 6, 0.95); // Juni 20:00

console.log(`Juni um 12 Uhr (Spitze):  ${pvNoon.toFixed(1)} kW`);
console.log(`Juni um 8 Uhr (Morgen):   ${pvMorning.toFixed(1)} kW`);
console.log(`Juni um 20 Uhr (Abend):   ${pvEvening.toFixed(1)} kW`);
console.log(`Juni um 0 Uhr (Nacht):    ${pvNight.toFixed(1)} kW`);

if (pvNoon > 30 && pvNight === 0) {
  console.log('✅ PASS: PV variiert realistisch\n');
} else {
  console.log('❌ FAIL: PV-Produktion unrealistisch\n');
  passPV = false;
}

console.log('📋 TEST 4: Allgemeinteil-Verbrauch\n');
let passCommon = true;

const commonNight = getCommonAreaConsumption(3, 1);
const commonDay = getCommonAreaConsumption(12, 1);
const commonEvening = getCommonAreaConsumption(19, 1);

const commonNightTotal = commonNight.pool + commonNight.garage + commonNight.heating + commonNight.boiler;
const commonDayTotal = commonDay.pool + commonDay.garage + commonDay.heating + commonDay.boiler;
const commonEveningTotal = commonEvening.pool + commonEvening.garage + commonEvening.heating + commonEvening.boiler;

console.log(`Nacht (3:00):  ${commonNightTotal.toFixed(2)} kW`);
console.log(`Tag (12:00):   ${commonDayTotal.toFixed(2)} kW`);
console.log(`Abend (19:00): ${commonEveningTotal.toFixed(2)} kW`);

if (commonDayTotal > commonNightTotal) {
  console.log('✅ PASS: Allgemeinteil variiert mit Tageszeit\n');
} else {
  console.log('❌ FAIL: Allgemeinteil variiert nicht korrekt\n');
  passCommon = false;
}

console.log('📋 TEST 5: 24h Verbrauch-Kurve\n');
let passDay = true;

console.log('Familie "Graf" - 24h Verbrauch (Januar, Mittwoch):');
let dayTotal = 0;
let maxConsumption = 0;
let minConsumption = Infinity;

const graphData = [];
for (let hour = 0; hour < 24; hour++) {
  const consumption = calculateTenantConsumption(tenants[0], hour, dayOfWeek, month);
  dayTotal += consumption;
  maxConsumption = Math.max(maxConsumption, consumption);
  minConsumption = Math.min(minConsumption, consumption);
  graphData.push({ hour, consumption });
  
  if (hour % 4 === 0) {
    console.log(`  ${String(hour).padStart(2, '0')}:00 - ${String(hour+3).padStart(2, '0')}:59: ${[...Array(Math.round(consumption * 5))].map(() => '█').join('')} ${consumption.toFixed(2)} kW`);
  }
}

console.log(`\nTagesverbrauch: ${dayTotal.toFixed(1)} kWh`);
console.log(`Min: ${minConsumption.toFixed(2)} kW, Max: ${maxConsumption.toFixed(2)} kW`);

if (dayTotal > 10 && dayTotal < 20) {
  console.log('✅ PASS: Tagesverbrauch im erwarteten Bereich\n');
} else {
  console.log('❌ FAIL: Tagesverbrauch unrealistisch\n');
  passDay = false;
}

console.log('📋 TEST 6: Jahresverbrauch-Statistik\n');
let passYear = true;

const allTenantYearly = tenants.map(tenant => {
  let total = 0;
  // Berechne durchschnittlichen Tagesverbrauch für jeden Monat
  for (let month = 1; month <= 12; month++) {
    for (let hour = 0; hour < 24; hour++) {
      total += calculateTenantConsumption(tenant, hour, 3, month); // Alle Mittwoche
    }
  }
  return { name: tenant.name, yearly: total.toFixed(0) };
});

allTenantYearly.forEach(t => {
  console.log(`${t.name}: ~${t.yearly} kWh/Jahr`);
});

if (allTenantYearly.every(t => parseInt(t.yearly) > 4000 && parseInt(t.yearly) < 6000)) {
  console.log('✅ PASS: Jahresverbrauch realistisch\n');
} else {
  console.log('❌ FAIL: Jahresverbrauch unrealistisch\n');
  passYear = false;
}

console.log('\n=== ERGEBNIS ===\n');
const allPass = passTenants && passPool && passPV && passCommon && passDay && passYear;

if (allPass) {
  console.log('✅ ALLE TESTS BESTANDEN - Dashboard sollte funktionieren!\n');
} else {
  console.log('⚠️ EINIGE TESTS FEHLGESCHLAGEN:\n');
  if (!passTenants) console.log('  ❌ Haushalt-Verbrauch variiert nicht ausreichend');
  if (!passPool) console.log('  ❌ Pool-Saisonalität funktioniert nicht');
  if (!passPV) console.log('  ❌ PV-Produktion ist unrealistisch');
  if (!passCommon) console.log('  ❌ Allgemeinteil variiert nicht korrekt');
  if (!passDay) console.log('  ❌ Tagesverbrauch ist unrealistisch');
  if (!passYear) console.log('  ❌ Jahresverbrauch ist unrealistisch');
  console.log();
}
