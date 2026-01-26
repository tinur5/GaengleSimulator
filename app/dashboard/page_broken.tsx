
'use client';

import { useState, useEffect } from 'react';
import { Building, Tenant, SimulationResult } from '../../lib/models';
import { 
  calculateTenantConsumption,
  calculatePVProduction
} from '../../lib/simulation';

export default function Dashboard() {
  const [building] = useState<Building>({
    id: 1,
    name: 'MFH Gängle 2+4',
    pvPeakKw: 66.88,
    capacity: 100,
    efficiency: 0.95,
    numInverters: 2,
    inverterPowerKw: 33.44,
  });

  const [tenants] = useState<Tenant[]>([
    { id: 1, name: 'Graf', consumption: 5200, householdSize: 4, livingAreaSqm: 160, ageGroup: 'Familien mit Kindern', vehicleType: 'Tesla Model 3' },
    { id: 2, name: 'Wetli', consumption: 4500, householdSize: 2, livingAreaSqm: 200, ageGroup: 'Pensionierte', vehicleType: 'VW ID.4' },
    { id: 3, name: 'Bürzle', consumption: 5200, householdSize: 4, livingAreaSqm: 160, ageGroup: 'Familien mit Kindern', vehicleType: 'E-Bike' },
  ]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState<number>(12);

  const getCommonAreaConsumption = (hour: number, month: number) => {
    const poolActive = hour >= 8 && hour <= 22;
    const poolPower = poolActive ? (month === 12 || month === 1 || month === 2 ? 0.3 : month === 3 || month === 11 ? 1.2 : 2.5) : 0.05;
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
  };

  const month = selectedDate.getMonth() + 1;
  const dayOfWeek = selectedDate.getDay();
  const pvProduction = calculatePVProduction(building.pvPeakKw, selectedHour, month, building.efficiency);
  const houseConsumption = tenants.reduce((sum, t) => sum + calculateTenantConsumption(t, selectedHour, dayOfWeek, month), 0);
  const commonAreaData = getCommonAreaConsumption(selectedHour, month);
  const commonConsumption = Object.values(commonAreaData).reduce((a: number, b: any) => a + b, 0);
  const totalConsumption = houseConsumption + commonConsumption;
  const netFlow = pvProduction - totalConsumption;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="sticky top-0 z-50 bg-white shadow-lg">
        <div className="max-w-7xl mx-auto p-4">
          <h1 className="text-2xl font-bold text-gray-900">⚡ MFH Gängle 2+4</h1>
          <p className="text-sm text-gray-600">Energie-Simulator</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow p-4 border-l-4 border-yellow-400">
                <h3 className="text-xs font-bold text-gray-600">☀️ PV-PRODUKTION</h3>
                <p className="text-3xl font-bold text-orange-600 mt-2">{pvProduction.toFixed(1)} <span className="text-sm">kW</span></p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg shadow p-4 border-l-4 border-red-400">
                <h3 className="text-xs font-bold text-gray-600">🏠 VERBRAUCH</h3>
                <p className="text-3xl font-bold text-red-600 mt-2">{totalConsumption.toFixed(1)} <span className="text-sm">kW</span></p>
              </div>

              <div className={`rounded-lg shadow p-4 border-l-4 ${netFlow > 0 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400' : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-400'}`}>
                <h3 className="text-xs font-bold text-gray-600">{netFlow > 0 ? '📈 ÜBERSCHUSS' : '📉 DEFIZIT'}</h3>
                <p className={`text-3xl font-bold mt-2 ${netFlow > 0 ? 'text-green-600' : 'text-gray-600'}`}>{Math.abs(netFlow).toFixed(1)} <span className="text-sm">kW</span></p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow p-4 border-l-4 border-purple-400">
                <h3 className="text-xs font-bold text-gray-600">🔋 BATTERIE</h3>
                <p className="text-3xl font-bold text-purple-600 mt-2">75 <span className="text-sm">%</span></p>
              </div>
            </div>
      </div>
    </div>
  );
}

