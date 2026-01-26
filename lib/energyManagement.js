/**
 * Energiemanagement-Funktionen (JavaScript-Version für Tests)
 */

const DEFAULT_CONFIG = {
  minSoc: 15,
  maxSoc: 95,
  targetNightSoc: 70,
  targetDaySoc: 30,
  maxChargeRate: 10,
  maxDischargeRate: 5,
  nightStart: 20,
  nightEnd: 6,
  peakSolarStart: 10,
  peakSolarEnd: 16,
};

function calculateOptimalEnergyFlow(
  pvProduction,
  consumption,
  batteryState,
  hour,
  month,
  config = DEFAULT_CONFIG
) {
  const netFlow = pvProduction - consumption;
  
  const flow = {
    pvProduction,
    consumption,
    batteryCharge: 0,
    batteryDischarge: 0,
    gridImport: 0,
    gridExport: 0,
  };
  
  const isNight = hour >= config.nightStart || hour < config.nightEnd;
  
  if (netFlow > 0.05) {
    if (batteryState.soc < config.maxSoc) {
      const chargeCapacity = batteryState.canCharge;
      const desiredCharge = Math.min(netFlow, config.maxChargeRate);
      flow.batteryCharge = Math.min(desiredCharge, chargeCapacity);
      
      const remainingSurplus = netFlow - flow.batteryCharge;
      if (remainingSurplus > 0.05) {
        flow.gridExport = remainingSurplus;
      }
    } else {
      flow.gridExport = netFlow;
    }
  }
  else if (netFlow < -0.05) {
    const deficit = Math.abs(netFlow);
    
    if (isNight) {
      if (batteryState.soc > config.targetNightSoc) {
        const availableDischarge = batteryState.canDischarge;
        const desiredDischarge = Math.min(deficit, config.maxDischargeRate);
        flow.batteryDischarge = Math.min(desiredDischarge, availableDischarge);
        
        const remainingDeficit = deficit - flow.batteryDischarge;
        if (remainingDeficit > 0.05) {
          flow.gridImport = remainingDeficit;
        }
      } else {
        flow.gridImport = deficit;
      }
    } else {
      if (batteryState.soc > config.minSoc) {
        const availableDischarge = batteryState.canDischarge;
        const desiredDischarge = Math.min(deficit, config.maxDischargeRate);
        flow.batteryDischarge = Math.min(desiredDischarge, availableDischarge);
        
        const remainingDeficit = deficit - flow.batteryDischarge;
        if (remainingDeficit > 0.05) {
          flow.gridImport = remainingDeficit;
        }
      } else {
        flow.gridImport = deficit;
      }
    }
  }
  
  return flow;
}

function updateBatteryState(state, flow, capacity, efficiency = 0.95) {
  let newSoc = state.soc;
  
  if (flow.batteryCharge > 0) {
    const energyAdded = flow.batteryCharge * efficiency;
    const socIncrease = (energyAdded / capacity) * 100;
    newSoc = Math.min(100, newSoc + socIncrease);
  }
  
  if (flow.batteryDischarge > 0) {
    const energyRemoved = flow.batteryDischarge / efficiency;
    const socDecrease = (energyRemoved / capacity) * 100;
    newSoc = Math.max(0, newSoc - socDecrease);
  }
  
  const newEnergy = (newSoc / 100) * capacity;
  const canCharge = ((100 - newSoc) / 100) * capacity;
  const canDischarge = ((newSoc - 15) / 100) * capacity;
  
  return {
    soc: newSoc,
    energy: newEnergy,
    canCharge: Math.max(0, canCharge),
    canDischarge: Math.max(0, canDischarge),
  };
}

function calculateOptimalStartSoc(month, dayOfWeek) {
  const winterMonths = [12, 1, 2];
  const isWinter = winterMonths.includes(month);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  let startSoc = 50;
  if (isWinter) startSoc += 15;
  if (isWeekend) startSoc += 10;
  
  return Math.min(85, startSoc);
}

module.exports = {
  DEFAULT_CONFIG,
  calculateOptimalEnergyFlow,
  updateBatteryState,
  calculateOptimalStartSoc,
};
