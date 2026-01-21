// lib/models.ts
export interface Building {
  id: number;
  name: string;
  address?: string;
  pvPeakKw: number;
  numInverters?: number;
  inverterPowerKw?: number;
  batteryCapacityKwh?: number;
  hasPool?: boolean;
  numHeatPumps?: number;
  numProbes?: number;
  numBoilers?: number;
  boilerCapacityLiters?: number;
  boilerManufacturer?: string;
  capacity: number;
  efficiency: number;
}

export interface Tenant {
  id: number;
  name: string;
  ageGroup?: string;
  householdSize?: number;
  livingAreaSqm?: number;
  hasFireplace?: boolean;
  vehicleType?: string;
  buildingId?: number;
  consumption: number;
}

export interface SimulationResult {
  energyFlow: number[];
  finalSoc: number;
}

export interface Simulation {
  id: number;
  buildingId: number;
  energyFlow: number[];
  soc: { battery1: number; battery2: number; car: number };
}