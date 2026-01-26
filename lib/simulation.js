/**
 * Simulation functions (JavaScript version for tests)
 */

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
  
  const baseYearlyConsumption = isRetired ? 4500 : 5200;
  const avgHourlyConsumption = baseYearlyConsumption / 8760;
  
  const hourlyProfile = isRetired 
    ? getRetiredHourlyProfile(hour)
    : getFamilyHourlyProfile(hour, isWeekday);
  
  const seasonFactor = getSeasonFactor(month);
  const weekdayFactor = getWeekdayFactor(dayOfWeek);
  
  return avgHourlyConsumption * hourlyProfile * seasonFactor * weekdayFactor;
}

function calculatePVProduction(pvPeakKw, hour, month, efficiency = 0.95) {
  const sunTimes = {
    1: { sunrise: 8, sunset: 17 },
    2: { sunrise: 7.5, sunset: 18 },
    3: { sunrise: 6.5, sunset: 18.5 },
    4: { sunrise: 6, sunset: 20 },
    5: { sunrise: 5.5, sunset: 21 },
    6: { sunrise: 5.25, sunset: 21.5 },
    7: { sunrise: 5.5, sunset: 21.25 },
    8: { sunrise: 6, sunset: 20.5 },
    9: { sunrise: 7, sunset: 19 },
    10: { sunrise: 7.5, sunset: 18 },
    11: { sunrise: 8, sunset: 17 },
    12: { sunrise: 8.25, sunset: 16.75 },
  };
  
  const { sunrise, sunset } = sunTimes[month];
  const dayLength = sunset - sunrise;
  const solarNoon = (sunrise + sunset) / 2;
  
  if (hour < sunrise || hour > sunset) return 0;
  
  const hoursFromNoon = Math.abs(hour - solarNoon);
  const maxHoursFromNoon = dayLength / 2;
  const relativePosition = hoursFromNoon / maxHoursFromNoon;
  const productionFactor = Math.cos(relativePosition * Math.PI / 2) ** 1.5;
  
  const monthlyEfficiency = {
    1: 0.7, 2: 0.75, 3: 0.85, 4: 0.92, 5: 0.98, 6: 1.0,
    7: 0.98, 8: 0.95, 9: 0.88, 10: 0.80, 11: 0.72, 12: 0.68
  };
  
  const seasonalEfficiency = monthlyEfficiency[month];
  return pvPeakKw * productionFactor * seasonalEfficiency * efficiency;
}

module.exports = {
  calculateTenantConsumption,
  calculatePVProduction,
};
