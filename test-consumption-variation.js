/**
 * Teste ob Haushalts-Verbrauche über den Tag variieren
 */

// Kopiere die Funktionen von lib/simulation.ts
function getSeasonFactor(month) {
  if (month === 12 || month === 1 || month === 2) return 1.2;
  if (month === 3 || month === 4 || month === 5) return 1.05;
  if (month === 6 || month === 7 || month === 8) return 0.85;
  return 1.05;
}

function getWeekdayFactor(dayOfWeek) {
  return (dayOfWeek === 0 || dayOfWeek === 6) ? 1.10 : 1.0;
}

function getFamilyHourlyProfile(hour, isWeekday) {
  if (isWeekday) {
    if (hour >= 6 && hour < 8) return 1.8;
    if (hour >= 8 && hour < 16) return 0.25;
    if (hour >= 16 && hour < 22) return 1.9;
    if (hour >= 22 || hour < 6) return 0.15;
    return 1.0;
  } else {
    if (hour >= 7 && hour < 9) return 1.3;
    if (hour >= 9 && hour < 12) return 1.0;
    if (hour >= 12 && hour < 14) return 1.5;
    if (hour >= 14 && hour < 18) return 1.1;
    if (hour >= 18 && hour < 22) return 1.7;
    if (hour >= 22 || hour < 7) return 0.2;
    return 1.0;
  }
}

function getRetiredHourlyProfile(hour) {
  if (hour >= 6 && hour < 9) return 1.1;
  if (hour >= 9 && hour < 12) return 0.8;
  if (hour >= 12 && hour < 14) return 1.3;
  if (hour >= 14 && hour < 17) return 0.7;
  if (hour >= 17 && hour < 20) return 1.2;
  if (hour >= 20 && hour < 23) return 0.9;
  if (hour >= 23 || hour < 6) return 0.15;
  return 0.7;
}

function calculateTenantConsumption(tenant, hour, dayOfWeek, month) {
  const isRetired = tenant.ageGroup?.includes('Pensionierte') || false;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  
  let baseYearlyConsumption;
  if (isRetired) {
    baseYearlyConsumption = 4500;
  } else {
    baseYearlyConsumption = 5200;
  }
  
  const avgHourlyConsumption = baseYearlyConsumption / 8760;
  const hourlyProfile = isRetired 
    ? getRetiredHourlyProfile(hour)
    : getFamilyHourlyProfile(hour, isWeekday);
  
  const seasonFactor = getSeasonFactor(month);
  const weekdayFactor = getWeekdayFactor(dayOfWeek);
  
  return avgHourlyConsumption * hourlyProfile * seasonFactor * weekdayFactor;
}

// Test-Tenants
const tenants = [
  { 
    name: 'Graf', 
    ageGroup: ['Familien mit Kindern'],
    eva: 160,
    baseDemand: 5200,
    nPersons: 4
  },
  { 
    name: 'Wetli', 
    ageGroup: ['Pensionierte'],
    eva: 200,
    baseDemand: 4500,
    nPersons: 2
  },
  { 
    name: 'Bürzle', 
    ageGroup: ['Familien mit Kindern'],
    eva: 160,
    baseDemand: 5200,
    nPersons: 4
  }
];

console.log('\n=== TEST: Haushalts-Verbrauch variiert über den Tag ===\n');

// Test für jeden Haushalt
tenants.forEach(tenant => {
  console.log(`\n📊 Haushalt "${tenant.name}" (${tenant.ageGroup.join(', ')}):`);
  console.log('Stunde | Verbrauch (kW)');
  console.log('-------|---------------');
  
  const hourlyValues = [];
  for (let hour = 0; hour < 24; hour++) {
    const consumption = calculateTenantConsumption(tenant, hour, 3, 1); // Mittwoch, Januar
    hourlyValues.push(consumption);
    console.log(`  ${String(hour).padStart(2, '0')}:00 | ${consumption.toFixed(3)} kW`);
  }
  
  const min = Math.min(...hourlyValues);
  const max = Math.max(...hourlyValues);
  const avg = hourlyValues.reduce((a, b) => a + b) / 24;
  const ratio = max / min;
  
  console.log('-------|---------------');
  console.log(`Min:    ${min.toFixed(3)} kW`);
  console.log(`Max:    ${max.toFixed(3)} kW`);
  console.log(`Durch:  ${avg.toFixed(3)} kW`);
  console.log(`Ratio:  ${ratio.toFixed(1)}x (Min zu Max)`);
  
  if (ratio > 3) {
    console.log('✅ PASS: Verbrauch variiert deutlich über den Tag');
  } else {
    console.log('❌ FAIL: Verbrauch variiert zu wenig');
  }
});

console.log('\n=== Pool Saisonal Anpassung ===\n');
const poolScenarios = [
  { month: 1, monthName: 'Januar' },
  { month: 6, monthName: 'Juni' },
  { month: 12, monthName: 'Dezember' }
];

poolScenarios.forEach(({ month, monthName }) => {
  console.log(`\n🏊 Pool im ${monthName}:`);
  console.log('Stunde | Pool (kW)');
  console.log('-------|----------');
  
  let totalPool = 0;
  for (let hour = 0; hour < 24; hour++) {
    let poolPower = 0;
    const poolActive = hour >= 8 && hour <= 22;
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
    totalPool += poolPower;
    if (hour >= 7 && hour <= 22) {
      console.log(`  ${String(hour).padStart(2, '0')}:00 | ${poolPower.toFixed(2)} kW`);
    }
  }
  
  const dailyPool = totalPool / 24 * 24; // Simple Summe für 24h
  console.log(`Tages-Durchschnitt: ${(totalPool / 24).toFixed(3)} kW`);
  console.log(`Jahres-Verbrauch: ~${((totalPool / 24) * 365).toFixed(0)} kWh`);
});

console.log('\n✅ Tests abgeschlossen\n');
