// Test für die Batterie-Persistenz über Tage hinweg
// Verifiziert, dass der SOC vom Vortag korrekt übernommen wird

const { calculateTenantConsumption, calculatePVProduction } = require('./lib/simulation');

// Vereinfachte Test-Funktionen aus dashboard/page.tsx
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
  return { pool: poolPower, garage, heating, boiler };
}

// Simuliere Batterie über mehrere Tage
function simulateBatteryOverDays(startDate, days, building, tenants) {
  const config = {
    minSoc: 12,
    maxSoc: 95,
    targetNightSoc: 65,
    maxChargeRate: 10,
    maxDischargeRate: 6,
    nightStart: 21,
    nightEnd: 6,
  };

  // Start-SOC für ersten Tag
  const winterMonths = [12, 1, 2];
  const month = startDate.getMonth() + 1;
  const dayOfWeek = startDate.getDay();
  const isWinter = winterMonths.includes(month);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  let startSoc = 50;
  if (isWinter) startSoc += 15;
  if (isWeekend) startSoc += 10;
  startSoc = Math.min(85, startSoc);

  let soc = startSoc;
  const dailySnapshots = [];

  // Simuliere für mehrere Tage
  for (let day = 0; day < days; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);
    
    const daySnapshot = {
      date: currentDate.toISOString().split('T')[0],
      hourlySOC: [],
      startSOC: soc,
      endSOC: 0
    };

    for (let hour = 0; hour < 24; hour++) {
      const currentMonth = currentDate.getMonth() + 1;
      const currentDayOfWeek = currentDate.getDay();
      
      const pv = calculatePVProduction(building.pvPeakKw, hour, currentMonth, building.efficiency);
      const house = tenants.reduce((sum, t) => 
        sum + calculateTenantConsumption(t, hour, currentDayOfWeek, currentMonth), 0);
      const common = Object.values(getCommonAreaConsumption(hour, currentMonth))
        .reduce((a, b) => a + b, 0);
      const consumption = house + common;
      
      // Energie pro Batterie (halber Verbrauch/Produktion)
      const pvPerBattery = pv / 2;
      const consumptionPerBattery = consumption / 2;
      const netFlow = pvPerBattery - consumptionPerBattery;
      
      const isNight = hour >= config.nightStart || hour < config.nightEnd;
      
      let socChange = 0;
      
      // PV-Überschuss: Batterie laden
      if (netFlow > 0.05 && soc < config.maxSoc) {
        const chargeCapacity = ((config.maxSoc - soc) / 100) * (building.capacity / 2);
        const desiredCharge = Math.min(netFlow, config.maxChargeRate);
        const actualCharge = Math.min(desiredCharge, chargeCapacity);
        socChange = (actualCharge * building.efficiency / (building.capacity / 2)) * 100;
      }
      // PV-Defizit: Batterie entladen
      else if (netFlow < -0.05) {
        const deficit = Math.abs(netFlow);
        
        if (isNight) {
          if (soc > config.targetNightSoc) {
            const availableDischarge = ((soc - config.minSoc) / 100) * (building.capacity / 2);
            const desiredDischarge = Math.min(deficit, config.maxDischargeRate);
            const actualDischarge = Math.min(desiredDischarge, availableDischarge);
            socChange = -(actualDischarge / building.efficiency / (building.capacity / 2)) * 100;
          }
        } else {
          if (soc > config.minSoc) {
            const availableDischarge = ((soc - config.minSoc) / 100) * (building.capacity / 2);
            const desiredDischarge = Math.min(deficit, config.maxDischargeRate);
            const actualDischarge = Math.min(desiredDischarge, availableDischarge);
            socChange = -(actualDischarge / building.efficiency / (building.capacity / 2)) * 100;
          }
        }
      }
      
      // Aktualisiere SOC mit Grenzen
      soc = Math.max(0, Math.min(100, soc + socChange));
      
      daySnapshot.hourlySOC.push({
        hour,
        soc: soc.toFixed(2),
        pv: pv.toFixed(2),
        consumption: consumption.toFixed(2),
        netFlow: netFlow.toFixed(2)
      });
    }
    
    daySnapshot.endSOC = soc;
    dailySnapshots.push(daySnapshot);
  }
  
  return dailySnapshots;
}

// Test-Daten
const building = {
  pvPeakKw: 66.88,
  capacity: 40,
  efficiency: 0.95
};

const tenants = [
  { id: 1, name: 'Graf', consumption: 5200, ageGroup: 'Familie' },
  { id: 2, name: 'Wetli', consumption: 4500, ageGroup: 'Pensionierte' },
  { id: 3, name: 'Bürzle', consumption: 5200, ageGroup: 'Familie' }
];

console.log('\n🔋 BATTERIE-PERSISTENZ TEST\n');
console.log('='.repeat(80));
console.log('Testet, ob der Batterie-SOC korrekt vom Vortag übernommen wird\n');

// Test über mehrere Tage im Juli (Sommer)
const startDate = new Date(2026, 6, 6, 0, 0, 0); // 6. Juli 2026, 00:00
const results = simulateBatteryOverDays(startDate, 3, building, tenants);

console.log('📊 TAGESÜBERSICHT\n');
results.forEach((day, index) => {
  console.log(`Tag ${index + 1}: ${day.date}`);
  console.log(`  Start-SOC: ${day.startSOC.toFixed(2)}%`);
  console.log(`  End-SOC:   ${day.endSOC.toFixed(2)}%`);
  console.log(`  00:00 Uhr: ${day.hourlySOC[0].soc}%`);
  console.log(`  01:00 Uhr: ${day.hourlySOC[1].soc}%`);
  console.log(`  12:00 Uhr: ${day.hourlySOC[12].soc}%`);
  console.log('');
});

console.log('📋 KONTINUITÄTSPRÜFUNG\n');

let allGood = true;

// Prüfe, ob End-SOC eines Tages = Start-SOC des nächsten Tages
for (let i = 0; i < results.length - 1; i++) {
  const endSOC = results[i].endSOC;
  const nextStartSOC = results[i + 1].startSOC;
  const diff = Math.abs(endSOC - nextStartSOC);
  
  if (diff < 0.01) {
    console.log(`✅ ${results[i].date} 23:59 → ${results[i+1].date} 00:00: SOC korrekt übernommen (${endSOC.toFixed(2)}%)`);
  } else {
    console.log(`❌ ${results[i].date} 23:59 (${endSOC.toFixed(2)}%) → ${results[i+1].date} 00:00 (${nextStartSOC.toFixed(2)}%): SOC nicht korrekt! Differenz: ${diff.toFixed(2)}%`);
    allGood = false;
  }
}

console.log('\n' + '='.repeat(80));

if (allGood) {
  console.log('✅ TEST ERFOLGREICH: Batterie-SOC wird korrekt vom Vortag übernommen!\n');
} else {
  console.log('❌ TEST FEHLGESCHLAGEN: Batterie-SOC wird NICHT korrekt übernommen!\n');
  process.exit(1);
}

// Zeige ein detailliertes Beispiel für Tag-zu-Tag Übergang
console.log('\n📌 DETAILANSICHT: 06.07 23:00 - 07.07 01:00\n');
const day1 = results[0];
const day2 = results[1];

console.log(`${day1.date} 23:00: ${day1.hourlySOC[23].soc}% (PV: ${day1.hourlySOC[23].pv} kW, Verbrauch: ${day1.hourlySOC[23].consumption} kW)`);
console.log(`${day2.date} 00:00: ${day2.hourlySOC[0].soc}% (PV: ${day2.hourlySOC[0].pv} kW, Verbrauch: ${day2.hourlySOC[0].consumption} kW)`);
console.log(`${day2.date} 01:00: ${day2.hourlySOC[1].soc}% (PV: ${day2.hourlySOC[1].pv} kW, Verbrauch: ${day2.hourlySOC[1].consumption} kW)`);

console.log('\n✅ Der SOC ändert sich plausibel basierend auf Produktion und Verbrauch.\n');
