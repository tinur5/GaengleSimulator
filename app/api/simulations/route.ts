// app/api/simulations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Building, Tenant, SimulationResult } from '../../../lib/models';
import { runSimulation } from '../../../lib/simulation';

export async function POST(request: NextRequest) {
  const { building, tenants }: { building: Building; tenants: Tenant[] } = await request.json();
  const result: SimulationResult = runSimulation(building, tenants);
  return NextResponse.json(result);
}