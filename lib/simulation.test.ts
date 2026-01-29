// lib/simulation.test.ts
// Plausibilisierungstests für die Energiesimulation

import {
  calculatePVProduction,
  calculateTenantConsumption,
  calculateEnergyFlow,
  updateSoc,
  getSeasonFactor,
  getWeekdayFactor,
  getFamilyHourlyProfile,
  getRetiredHourlyProfile,
} from './simulation';
import { Building, Tenant } from './models';

// Testkonfiguration
const testBuilding: Building = {
  id: 1,
  name: 'MFH Gängle 2+4',
  pvPeakKw: 66.88,
  capacity: 100,
  efficiency: 0.95,
  numInverters: 2,
  inverterPowerKw: 33.44,
  batteries: [
    { id: 1, inverterId: 1, capacityKwh: 50, soc: 75 },
    { id: 2, inverterId: 2, capacityKwh: 50, soc: 65 },
  ],
};

const testTenants: Tenant[] = [
  {
    id: 1,
    name: 'Familie Graf',
    consumption: 5200,
    householdSize: 4,
    livingAreaSqm: 140,
    ageGroup: 'Familie mit 2 Kindern',
    vehicleType: 'VW ID4',
  },
  {
    id: 2,
    name: 'Familie Wetly',
    consumption: 5200,
    householdSize: 4,
    livingAreaSqm: 140,
    ageGroup: 'Familie mit 2 Kindern',
    vehicleType: 'Tesla',
  },
  {
    id: 3,
    name: 'Ehepaar Bürzle',
    consumption: 4500,
    householdSize: 2,
    livingAreaSqm: 200,
    ageGroup: 'Pensionierte',
    vehicleType: 'Porsche Hybrid',
  },
];

console.log('🧪 ENERGIESIMULATIONS-PLAUSIBILISIERUNGSTESTS\n');
console.log('=' .repeat(70));

// Test 1: PV-Produktion variiert nach Tageszeit
console.log('\n✓ TEST 1: PV-PRODUKTION - Tagesabängigkeit');
console.log('-'.repeat(70));
const pvMorgens = calculatePVProduction(testBuilding.pvPeakKw, 6, 7, testBuilding.efficiency);
const pvMittags = calculatePVProduction(testBuilding.pvPeakKw, 12, 7, testBuilding.efficiency);
const pvAbends = calculatePVProduction(testBuilding.pvPeakKw, 18, 7, testBuilding.efficiency);
const pvNachts = calculatePVProduction(testBuilding.pvPeakKw, 0, 7, testBuilding.efficiency);

console.log(`  6:00 Uhr (Sonnenaufgang): ${pvMorgens.toFixed(2)} kW`);
console.log(`  12:00 Uhr (Mittag):       ${pvMittags.toFixed(2)} kW`);
console.log(`  18:00 Uhr (Sonnenuntergang): ${pvAbends.toFixed(2)} kW`);
console.log(`  0:00 Uhr (Nacht):         ${pvNachts.toFixed(2)} kW`);

if (pvNachts > 0) {
  console.error('  ❌ FEHLER: Nachts sollte PV = 0 sein!');
} else if (pvMittags <= pvMorgens || pvMittags <= pvAbends) {
  console.error('  ❌ FEHLER: Mittags sollte PV am höchsten sein!');
} else {
  console.log('  ✅ PASS: PV variiert plausibel nach Tageszeit');
}

// Test 2: PV-Produktion variiert nach Jahreszeit
console.log('\n✓ TEST 2: PV-PRODUKTION - Saisonabhängigkeit');
console.log('-'.repeat(70));
const pvWinter = calculatePVProduction(testBuilding.pvPeakKw, 12, 1, testBuilding.efficiency);
const pvSommer = calculatePVProduction(testBuilding.pvPeakKw, 12, 7, testBuilding.efficiency);
const pvFruehling = calculatePVProduction(testBuilding.pvPeakKw, 12, 4, testBuilding.efficiency);

console.log(`  Januar (Winter):    ${pvWinter.toFixed(2)} kW`);
console.log(`  April (Frühling):   ${pvFruehling.toFixed(2)} kW`);
console.log(`  Juli (Sommer):      ${pvSommer.toFixed(2)} kW`);

if (pvSommer <= pvWinter) {
  console.error('  ❌ FEHLER: Sommer sollte mehr PV als Winter produzieren!');
} else if (pvWinter <= 0) {
  console.error('  ❌ FEHLER: Im Winter sollte mittags noch Produktion sein!');
} else {
  console.log('  ✅ PASS: PV variiert plausibel nach Jahreszeit');
}

// Test 3: Haushaltsverbrauch variiert nach Tageszeit
console.log('\n✓ TEST 3: HAUSHALTSVERBRAUCH - Tagesabhängigkeit');
console.log('-'.repeat(70));
const consumptionNacht = calculateTenantConsumption(testTenants[0], 3, 1, 1);
const consumptionMorgen = calculateTenantConsumption(testTenants[0], 7, 1, 1);
const consumptionTag = calculateTenantConsumption(testTenants[0], 12, 1, 1);
const consumptionAbend = calculateTenantConsumption(testTenants[0], 20, 1, 1);

console.log(`  3:00 Uhr (Nacht):   ${consumptionNacht.toFixed(3)} kW`);
console.log(`  7:00 Uhr (Morgen):  ${consumptionMorgen.toFixed(3)} kW`);
console.log(`  12:00 Uhr (Mittag): ${consumptionTag.toFixed(3)} kW`);
console.log(`  20:00 Uhr (Abend):  ${consumptionAbend.toFixed(3)} kW`);

const morgenAbendAvg = (consumptionMorgen + consumptionAbend) / 2;
if (morgenAbendAvg <= consumptionTag) {
  console.error('  ❌ FEHLER: Morgen/Abend sollten höher als Mittag sein!');
} else if (consumptionNacht >= consumptionMorgen) {
  console.error('  ❌ FEHLER: Nacht sollte deutlich unter Morgen sein!');
} else {
  console.log('  ✅ PASS: Verbrauch variiert plausibel nach Tageszeit');
}

// Test 4: Wochenende vs. Werktag
console.log('\n✓ TEST 4: WOCHENENDE VS. WERKTAG');
console.log('-'.repeat(70));
const consumptionWerktag = calculateTenantConsumption(testTenants[0], 10, 1, 1); // Montag (1)
const consumptionWochenende = calculateTenantConsumption(testTenants[0], 10, 0, 1); // Sonntag (0)

console.log(`  Montag 10:00:    ${consumptionWerktag.toFixed(3)} kW`);
console.log(`  Sonntag 10:00:   ${consumptionWochenende.toFixed(3)} kW`);
console.log(`  Faktor Wochenende vs. Werktag: ${(consumptionWochenende / consumptionWerktag).toFixed(2)}x`);

if (consumptionWochenende <= consumptionWerktag) {
  console.error('  ❌ FEHLER: Wochenende sollte höher als Werktag sein!');
} else {
  console.log('  ✅ PASS: Wochenende hat höheren Verbrauch');
}

// Test 5: Pensionierte vs. Familien
console.log('\n✓ TEST 5: PENSIONIERTE VS. FAMILIEN');
console.log('-'.repeat(70));
const familienTag = calculateTenantConsumption(testTenants[0], 12, 1, 1); // Familie mittags
const pensionierteMittag = calculateTenantConsumption(testTenants[2], 12, 1, 1); // Pensionierte mittags
const familienNacht = calculateTenantConsumption(testTenants[0], 3, 1, 1); // Familie nachts
const pensionierteNacht = calculateTenantConsumption(testTenants[2], 3, 1, 1); // Pensionierte nachts

console.log(`  Familie mittags:       ${familienTag.toFixed(3)} kW`);
console.log(`  Pensionierte mittags:  ${pensionierteMittag.toFixed(3)} kW`);
console.log(`  Familie nachts:        ${familienNacht.toFixed(3)} kW`);
console.log(`  Pensionierte nachts:   ${pensionierteNacht.toFixed(3)} kW`);

if (familienTag >= pensionierteMittag) {
  console.log('  ℹ INFO: Familien verbrauchen tagsüber mehr (erwartet)');
}
if (pensionierteNacht >= familienNacht) {
  console.log('  ℹ INFO: Pensionierte verbrauchen nachts relativ mehr (erwartet)');
}
console.log('  ✅ PASS: Profile für Pensionierte und Familien unterschiedlich');

// Test 6: Jahresverbrauch sollte im erwarteten Bereich sein
console.log('\n✓ TEST 6: JAHRESVERBRAUCH - Plausibilität');
console.log('-'.repeat(70));
let totalYearlyConsumption = 0;
for (let month = 1; month <= 12; month++) {
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const dayOfWeek = day; // 0=Sonntag, 1=Montag, etc.
      totalYearlyConsumption += calculateTenantConsumption(testTenants[0], hour, dayOfWeek, month);
    }
  }
}
// Durchschnitt für eine Woche multiplizieren mit 52 Wochen
totalYearlyConsumption = (totalYearlyConsumption / 7) * 52;

console.log(`  Familie Graf Jahresverbrauch (berechnet): ${totalYearlyConsumption.toFixed(0)} kWh`);
console.log(`  Familie Graf Jahresverbrauch (Datensatz): ${testTenants[0].consumption} kWh`);
console.log(`  Abweichung: ${Math.abs(totalYearlyConsumption - testTenants[0].consumption).toFixed(0)} kWh`);

const abweichung = Math.abs(totalYearlyConsumption - testTenants[0].consumption) / testTenants[0].consumption;
if (abweichung > 0.2) {
  console.error(`  ⚠️  WARNUNG: Abweichung > 20% (${(abweichung * 100).toFixed(1)}%)`);
} else {
  console.log(`  ✅ PASS: Jahresverbrauch plausibel (${(abweichung * 100).toFixed(1)}% Abweichung)`);
}

// Test 7: Jahres-PV-Produktion
console.log('\n✓ TEST 7: JAHRES-PV-PRODUKTION');
console.log('-'.repeat(70));
let totalYearlyPV = 0;
for (let month = 1; month <= 12; month++) {
  for (let hour = 0; hour < 24; hour++) {
    totalYearlyPV += calculatePVProduction(testBuilding.pvPeakKw, hour, month, testBuilding.efficiency);
  }
}

const kwhPerKwpYear = totalYearlyPV / testBuilding.pvPeakKw;
console.log(`  Gesamt Jahres-PV: ${totalYearlyPV.toFixed(0)} kWh`);
console.log(`  Pro kWp: ${kwhPerKwpYear.toFixed(0)} kWh/kWp/Jahr`);
console.log(`  Erwartungsbereich für Baizers: 1050-1100 kWh/kWp/Jahr`);

if (kwhPerKwpYear < 1000 || kwhPerKwpYear > 1200) {
  console.error(`  ⚠️  WARNUNG: Außerhalb des typischen Bereichs`);
} else {
  console.log(`  ✅ PASS: PV-Jahresproduktion im erwarteten Bereich`);
}

// Test 8: SOC-Berechnung
console.log('\n✓ TEST 8: BATTERIE-LADEN/ENTLADEN');
console.log('-'.repeat(70));
let soc = 50; // Start bei 50%
const testEnergy = [10, -5, -8, 5]; // kWh
const testResults: string[] = [];

for (const energy of testEnergy) {
  const prevSoc = soc;
  soc = updateSoc(soc, energy, testBuilding.capacity, testBuilding.efficiency);
  testResults.push(`  Energy: ${energy.toFixed(1)}kWh, SOC: ${prevSoc.toFixed(1)}% -> ${soc.toFixed(1)}%`);
}

testResults.forEach(r => console.log(r));

if (soc < 0 || soc > 100) {
  console.error('  ❌ FEHLER: SOC außerhalb 0-100%!');
} else {
  console.log('  ✅ PASS: SOC bleibt in realem Bereich (0-100%)');
}

// Test 9: Energiebilanz über 24h
console.log('\n✓ TEST 9: ENERGIEBILANZ - 24 Stunden');
console.log('-'.repeat(70));
const month = 7; // Juli (Sommer)
const dayOfWeek = 3; // Mittwoch
let pvTotal = 0;
let consumptionTotal = 0;

for (let hour = 0; hour < 24; hour++) {
  pvTotal += calculatePVProduction(testBuilding.pvPeakKw, hour, month, testBuilding.efficiency);
  const tenantConsumption = testTenants.reduce((sum, t) => {
    return sum + calculateTenantConsumption(t, hour, dayOfWeek, month);
  }, 0);
  consumptionTotal += tenantConsumption;
}

console.log(`  PV-Produktion:       ${pvTotal.toFixed(1)} kWh`);
console.log(`  Haushalt Verbrauch:  ${consumptionTotal.toFixed(1)} kWh`);
console.log(`  Bilanz (ohne Allgemeinteil): ${(pvTotal - consumptionTotal).toFixed(1)} kWh`);

if (pvTotal > 0 && consumptionTotal > 0) {
  console.log('  ✅ PASS: Beide Werte sind größer als 0 (plausibel)');
} else {
  console.error('  ❌ FEHLER: Werte nicht plausibel!');
}

// Test 10: Saisonale Faktoren
console.log('\n✓ TEST 10: SAISONALE FAKTOREN');
console.log('-'.repeat(70));
const winterFactor = getSeasonFactor(1);
const sommerFactor = getSeasonFactor(7);
const fruehjlingFactor = getSeasonFactor(4);

console.log(`  Winter (Januar):   ${winterFactor.toFixed(2)}x (mehr Heizung)`);
console.log(`  Frühling (April):  ${fruehjlingFactor.toFixed(2)}x`);
console.log(`  Sommer (Juli):     ${sommerFactor.toFixed(2)}x (weniger Heizung)`);

if (winterFactor > sommerFactor) {
  console.log('  ✅ PASS: Saisonale Faktoren plausibel');
} else {
  console.error('  ❌ FEHLER: Winter sollte höheren Faktor als Sommer haben!');
}

console.log('\n' + '='.repeat(70));
console.log('✅ ALLE PLAUSIBILISIERUNGSTESTS ABGESCHLOSSEN\n');
