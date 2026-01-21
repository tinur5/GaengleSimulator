// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import EnergyChart from '../../components/EnergyChart';
import SocBar from '../../components/SocBar';
import { Building, Tenant, SimulationResult } from '../../lib/models';
import { runSimulation as runSimulationLib } from '../../lib/simulation';

export default function Dashboard() {
  const [building, setBuilding] = useState<Building>({
    id: 1,
    name: 'Sample Building',
    pvPeakKw: 50,
    capacity: 100,
    efficiency: 0.9,
  });
  const [tenants, setTenants] = useState<Tenant[]>([
    { id: 1, name: 'Tenant 1', consumption: 20 },
    { id: 2, name: 'Tenant 2', consumption: 15 },
  ]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runSim(building, tenants);
  }, [building, tenants]);

  const runSim = async (b: Building, t: Tenant[]) => {
    setLoading(true);
    try {
      // Use simulation from lib to compute results synchronously
      const result = runSimulationLib(b, t);
      setSimulationResult(result);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBuilding = (field: keyof Building, value: string | number) => {
    setBuilding(prev => ({ ...prev, [field]: value }));
  };

  const updateTenant = (id: number, field: keyof Tenant, value: string | number) => {
    setTenants(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const addTenant = () => {
    const newId = Math.max(...tenants.map(t => t.id)) + 1;
    setTenants(prev => [...prev, { id: newId, name: `Tenant ${newId}`, consumption: 10 }]);
  };

  const removeTenant = (id: number) => {
    setTenants(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Energy Simulator Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl mb-2">Building Settings</h2>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Name"
              value={building.name}
              onChange={(e) => updateBuilding('name', e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="number"
              placeholder="PV Peak (kW)"
              value={building.pvPeakKw}
              onChange={(e) => updateBuilding('pvPeakKw', parseFloat(e.target.value))}
              className="w-full p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Battery Capacity (kW)"
              value={building.capacity}
              onChange={(e) => updateBuilding('capacity', parseFloat(e.target.value))}
              className="w-full p-2 border rounded"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Efficiency"
              value={building.efficiency}
              onChange={(e) => updateBuilding('efficiency', parseFloat(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl mb-2">Tenants</h2>
          {tenants.map(tenant => (
            <div key={tenant.id} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                placeholder="Name"
                value={tenant.name}
                onChange={(e) => updateTenant(tenant.id, 'name', e.target.value)}
                className="flex-1 p-2 border rounded"
              />
              <input
                type="number"
                placeholder="Consumption (kW)"
                value={tenant.consumption}
                onChange={(e) => updateTenant(tenant.id, 'consumption', parseFloat(e.target.value))}
                className="w-24 p-2 border rounded"
              />
              <button
                onClick={() => removeTenant(tenant.id)}
                className="bg-red-500 text-white px-2 py-1 rounded"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={addTenant}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add Tenant
          </button>
        </div>
      </div>
      
      {simulationResult && (
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-xl mb-2">Simulation Results</h2>
          {loading ? (
            <p>Loading simulation...</p>
          ) : (
            <>
              <SocBar soc={simulationResult.finalSoc} />
              <EnergyChart data={simulationResult.energyFlow} />
            </>
          )}
        </div>
      )}
    </div>
  );
}