// lib/models.ts
export interface Inverter {
  id: number;
  model: string;
  manufacturer: string;
  powerKw: number;
  efficiency?: number;
}

export interface Battery {
  id: number;
  inverterId: number;
  capacityKwh: number;
  soc: number; // State of Charge 0-100%
  model?: string;
  manufacturer?: string;
}

export interface Building {
  id: number;
  name: string;
  address?: string;
  pvPeakKw: number;
  pvModel?: string;
  pvManufacturer?: string;
  numInverters?: number; // Deprecated: use inverters array instead
  inverterPowerKw?: number; // Deprecated: use inverters array instead
  inverters?: Inverter[];
  batteries: Battery[];
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