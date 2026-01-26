// lib/simulation.ts
import { Building, Tenant, SimulationResult } from './models';

// Jahreszeiten-Faktoren (Winter höher wegen Heizung/Licht)
// Durchschnitt sollte ~1.0 sein: (1.2*3 + 1.05*3 + 0.85*3 + 1.05*3) / 12 = 1.06
export function getSeasonFactor(month: number): number {
  if (month === 12 || month === 1 || month === 2) return 1.2; // Winter (Heizung, weniger Licht)
  if (month === 3 || month === 4 || month === 5) return 1.05; // Frühling
  if (month === 6 || month === 7 || month === 8) return 0.85; // Sommer (weniger Heizung, mehr Licht)
  return 1.05; // Herbst
}

// Wochentag-Faktor (5 Werktage + 2 Wochenendtage)
// Durchschnitt sollte 1.0 sein: (1.0*5 + 1.10*2) / 7 = ~1.03
export function getWeekdayFactor(dayOfWeek: number): number {
  return (dayOfWeek === 0 || dayOfWeek === 6) ? 1.10 : 1.0; // Wochenende vs Werktag
}

// Tageszeit-Lastprofil für Familien mit Kindern
// Diese Werte sind relativer Verbrauch pro Stunde - sollten sich auf 1.0 Durchschnitt summieren
export function getFamilyHourlyProfile(hour: number, isWeekday: boolean): number {
  if (isWeekday) {
    // Werktag: Morgenspitze, dann niedrig, Abendspitze
    // Durchschnitt eines Tages sollte ~1.0 sein
    if (hour >= 6 && hour < 8) return 1.8; // Morgenroutine
    if (hour >= 8 && hour < 16) return 0.25; // Tagsüber niedrig (bei Arbeit/Schule)
    if (hour >= 16 && hour < 22) return 1.9; // Abend: Kochen, TV, Hausaufgaben
    if (hour >= 22 || hour < 6) return 0.15; // Nacht
    return 1.0;
  } else {
    // Wochenende: Ganztags höher aber immer noch gemittelt
    if (hour >= 7 && hour < 9) return 1.3; // Frühstück
    if (hour >= 9 && hour < 12) return 1.0; // Vormittag
    if (hour >= 12 && hour < 14) return 1.5; // Mittagessen
    if (hour >= 14 && hour < 18) return 1.1; // Nachmittag
    if (hour >= 18 && hour < 22) return 1.7; // Abendessen, TV
    if (hour >= 22 || hour < 7) return 0.2; // Nacht
    return 1.0;
  }
}

// Tageszeit-Lastprofil für Pensionierte
// Pensionierte sind ganztags zu Hause - aber gleichzeitig sparsamer
export function getRetiredHourlyProfile(hour: number): number {
  // Durchschnitt sollte ~1.0 sein, aber konstanter über den Tag
  if (hour >= 6 && hour < 9) return 1.1; // Frühstück
  if (hour >= 9 && hour < 12) return 0.8; // Vormittag
  if (hour >= 12 && hour < 14) return 1.3; // Mittagessen
  if (hour >= 14 && hour < 17) return 0.7; // Nachmittag
  if (hour >= 17 && hour < 20) return 1.2; // Abendessen
  if (hour >= 20 && hour < 23) return 0.9; // Abend TV
  if (hour >= 23 || hour < 6) return 0.15; // Nacht
  return 0.7;
}

// Berechne realistischen Verbrauch pro Haushalt und Stunde
export function calculateTenantConsumption(
  tenant: Tenant, 
  hour: number, 
  dayOfWeek: number, 
  month: number
): number {
  const isRetired = tenant.ageGroup?.includes('Pensionierte') || false;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  
  // Basis-Jahresverbrauch (kWh)
  let baseYearlyConsumption: number;
  if (isRetired) {
    // Pensionierte: 200m², 2 Personen → ca. 4500 kWh/Jahr
    baseYearlyConsumption = 4500;
  } else {
    // Familien: 160m², 4 Personen → ca. 5200 kWh/Jahr
    baseYearlyConsumption = 5200;
  }
  
  // Durchschnittsverbrauch pro Stunde
  const avgHourlyConsumption = baseYearlyConsumption / 8760; // kWh pro Stunde
  
  // Stündliches Profil
  const hourlyProfile = isRetired 
    ? getRetiredHourlyProfile(hour)
    : getFamilyHourlyProfile(hour, isWeekday);
  
  // Saison- und Wochentag-Faktoren
  const seasonFactor = getSeasonFactor(month);
  const weekdayFactor = getWeekdayFactor(dayOfWeek);
  
  // Finaler Verbrauch in kW
  return avgHourlyConsumption * hourlyProfile * seasonFactor * weekdayFactor;
}

// PV-Produktion mit detailliertem Wetter- und Tagesmodell
export function calculatePVProduction(
  pvPeakKw: number, 
  hour: number, 
  month: number,
  efficiency: number = 0.95
): number {
  // Sonnenauf-/Untergangszeiten pro Monat (für Baizers, 46.5°N)
  const sunTimes: Record<number, { sunrise: number; sunset: number }> = {
    1: { sunrise: 8, sunset: 17.5 },
    2: { sunrise: 7.5, sunset: 18.5 },
    3: { sunrise: 6.5, sunset: 19.5 },
    4: { sunrise: 5.5, sunset: 20.5 },
    5: { sunrise: 5, sunset: 21 },
    6: { sunrise: 4.75, sunset: 21.5 },
    7: { sunrise: 5, sunset: 21.25 },
    8: { sunrise: 5.75, sunset: 20.5 },
    9: { sunrise: 6.75, sunset: 19.25 },
    10: { sunrise: 7.75, sunset: 18 },
    11: { sunrise: 8.5, sunset: 17 },
    12: { sunrise: 8.75, sunset: 16.75 }
  };
  
  // Realistische Cloud-Coverage je nach Monat (Schweiz)
  const cloudCoverByMonth: { [key: number]: number } = {
    1: 0.65, 2: 0.62, 3: 0.58, 4: 0.55, 5: 0.50, 6: 0.48,
    7: 0.45, 8: 0.48, 9: 0.52, 10: 0.60, 11: 0.65, 12: 0.68
  };
  
  const sunTime = sunTimes[month];
  const cloudCover = cloudCoverByMonth[month] || 0.55;
  const clearSkyFactor = 1 - cloudCover;
  
  if (hour < sunTime.sunrise || hour > sunTime.sunset) {
    return 0; // Keine Produktion nachts
  }
  
  // Solarstrahlung über den Tag (Sinus-Kurve)
  const dayProgress = (hour - sunTime.sunrise) / (sunTime.sunset - sunTime.sunrise);
  const sunIntensity = Math.sin(dayProgress * Math.PI);
  
  // Jahreszeiten-Faktor (Sonnenhöhe)
  let seasonalFactor: number;
  if (month === 12 || month === 1 || month === 2) {
    seasonalFactor = 0.55; // Winter: flache Sonne
  } else if (month === 3 || month === 4 || month === 5) {
    seasonalFactor = 0.8; // Frühling
  } else if (month === 6 || month === 7 || month === 8) {
    seasonalFactor = 1.0; // Sommer: maximale Höhe
  } else {
    seasonalFactor = 0.75; // Herbst
  }
  
  return pvPeakKw * sunIntensity * seasonalFactor * clearSkyFactor * efficiency;
}


export function calculateEnergyFlow(
  building: Building, 
  tenants: Tenant[], 
  hours: number = 24,
  startMonth: number = 1,
  startDayOfWeek: number = 1
): number[] { 
  const flow: number[] = [];
  
  for (let h = 0; h < hours; h++) {
    const currentHour = h % 24;
    const currentDay = Math.floor(h / 24);
    const currentDayOfWeek = (startDayOfWeek + currentDay) % 7;
    
    // PV-Produktion
    const pvProduction = calculatePVProduction(
      building.pvPeakKw, 
      currentHour, 
      startMonth,
      building.efficiency
    );
    
    // Gesamt-Verbrauch aller Mieter
    const totalConsumption = tenants.reduce((sum, tenant) => {
      return sum + calculateTenantConsumption(tenant, currentHour, currentDayOfWeek, startMonth);
    }, 0);
    
    // Netto-Energiefluss (positiv = Überschuss, negativ = Defizit)
    flow.push(pvProduction - totalConsumption);
  }
  
  return flow;
}

export function updateSoc(currentSoc: number, energyFlow: number, capacity: number, efficiency: number = 0.95): number {
  // energyFlow in kW, Zeitschritt 1h
  const energyChange = energyFlow * efficiency; // kWh
  const socChange = (energyChange / capacity) * 100;
  let newSoc = currentSoc + socChange;
  return Math.max(0, Math.min(100, newSoc));
}

export function runSimulation(building: Building, tenants: Tenant[]): SimulationResult {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentDayOfWeek = currentDate.getDay(); // 0=Sonntag, 6=Samstag
  
  const energyFlow = calculateEnergyFlow(building, tenants, 24, currentMonth, currentDayOfWeek);
  let soc = 50; // Initial SOC at 50%
  
  for (const flow of energyFlow) {
    soc = updateSoc(soc, flow, building.capacity, building.efficiency);
  }
  
  return {
    energyFlow,
    finalSoc: soc,
  };
}