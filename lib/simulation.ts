// lib/simulation.ts
import { Building, Tenant, SimulationResult } from './models';

export function calculateEnergyFlow(building: Building, tenants: Tenant[], hours: number = 24): number[] { 
  const flow: number[] = [];
  for (let h = 0; h < hours; h++) {
    const pvProduction = building.pvPeakKw * Math.max(0, Math.sin((h / 24) * Math.PI));
    const tenantConsumption = tenants.reduce((sum, t) => sum + t.consumption, 0);
    flow.push(pvProduction - tenantConsumption);
  }
  return flow;
}

export function updateSoc(currentSoc: number, energyFlow: number, capacity: number): number {
  let newSoc = currentSoc + (energyFlow / capacity) * 100;
  return Math.max(0, Math.min(100, newSoc));
}

export function runSimulation(building: Building, tenants: Tenant[]): SimulationResult {
  const energyFlow = calculateEnergyFlow(building, tenants);
  let soc = 50; // Initial SOC
  for (const flow of energyFlow) {
    soc = updateSoc(soc, flow, building.capacity);
  }
  return {
    energyFlow,
    finalSoc: soc,
  };
}