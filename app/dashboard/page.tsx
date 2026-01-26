'use client';

import { useState } from 'react';
import { Building, Tenant } from '../../lib/models';
import { calculateTenantConsumption, calculatePVProduction } from '../../lib/simulation';
import EnergyChart from '../../components/EnergyChart';
import ConsumptionChart from '../../components/ConsumptionChart';
import AnnualConsumptionStats from '../../components/AnnualConsumptionStats';
import SocBar from '../../components/SocBar';
import SankeyChart from '../../components/SankeyChart';

export default function Dashboard() {
  const [building] = useState<Building>({
    id: 1,
    name: 'MFH Gängle 2+4',
    pvPeakKw: 66.88,
    capacity: 100,
    efficiency: 0.95,
    numInverters: 2,
    inverterPowerKw: 33.44,
    batteries: [
      { id: 1, inverterId: 1, capacityKwh: 50, soc: 75 },
      { id: 2, inverterId: 2, capacityKwh: 50, soc: 65 },
    ],
  });

  const [tenants] = useState<Tenant[]>([
    { id: 1, name: 'Graf', consumption: 5200, householdSize: 4, livingAreaSqm: 160, ageGroup: 'Familie', vehicleType: 'Tesla' },
    { id: 2, name: 'Wetli', consumption: 4500, householdSize: 2, livingAreaSqm: 200, ageGroup: 'Pensionierte', vehicleType: 'VW' },
    { id: 3, name: 'Bürzle', consumption: 5200, householdSize: 4, livingAreaSqm: 160, ageGroup: 'Familie', vehicleType: 'E-Bike' },
  ]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState<number>(12);

  const getCommonAreaConsumption = (hour: number, month: number) => {
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
  };

  const month = selectedDate.getMonth() + 1;
  const dayOfWeek = selectedDate.getDay();
  const pvProduction = calculatePVProduction(building.pvPeakKw, selectedHour, month, building.efficiency);
  const houseConsumption = tenants.reduce((sum, t) => sum + calculateTenantConsumption(t, selectedHour, dayOfWeek, month), 0);
  const commonAreaData = getCommonAreaConsumption(selectedHour, month);
  const commonConsumption = Object.values(commonAreaData).reduce((a: number, b: any) => a + b, 0);
  const totalConsumption = houseConsumption + commonConsumption;
  const netFlow = pvProduction - totalConsumption;

  // Mock energy flow data for charts
  const energyFlowData = Array.from({ length: 24 }, (_, i) => 
    Math.max(0, 35 * Math.sin(Math.PI * (i - 6) / 12)) - (2 + 0.5 * Math.sin(i * Math.PI / 12))
  );

  // Berechne dynamische SOC-Werte basierend auf Netzfluss
  // Basis-SOC 50%, dann anpassen je nach netFlow
  const baseSoc = 50;
  const socAdjustment = netFlow * 15; // 15% pro kW Netzfluss
  const battery1Soc = Math.max(0, Math.min(100, baseSoc + socAdjustment + (selectedHour > 12 ? 5 : -5)));
  const battery2Soc = Math.max(0, Math.min(100, baseSoc + socAdjustment - (selectedHour > 12 ? 5 : -5)));
  const avgSoc = (battery1Soc + battery2Soc) / 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="sticky top-0 z-50 bg-white shadow-lg">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚡ MFH Gängle 2+4</h1>
              <p className="text-sm text-gray-600">66.88 kWp PV • 2× 50 kWh Batterien</p>
            </div>
            
            <div className="flex gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">DATUM</label>
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">UHRZEIT</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="23"
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-lg font-bold text-indigo-600 w-12">{String(selectedHour).padStart(2, '0')}:00</span>
                </div>
              </div>
            </div>
          </div>
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
            <h3 className="text-xs font-bold text-gray-600">🔋 BATTERIE (∅)</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">{avgSoc.toFixed(1)} <span className="text-sm">%</span></p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-3">📊 24h Energiefluss</h2>
            <div className="h-80">
              <EnergyChart data={energyFlowData} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-3">🔋 Batteriestand</h2>
            <div className="space-y-4">
              <SocBar label="Wechselrichter 1" soc={battery1Soc} capacity={building.batteries[0].capacityKwh} />
              <SocBar label="Wechselrichter 2" soc={battery2Soc} capacity={building.batteries[1].capacityKwh} />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-3">💡 24h Haushalt-Verbrauch</h2>
            <div className="h-80">
              <ConsumptionChart
                tenants={tenants}
                month={month}
                dayOfWeek={dayOfWeek}
                currentHour={selectedHour}
                calculateTenantConsumption={calculateTenantConsumption}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-3">🌊 Sankey Energiefluss</h2>
            <div className="h-80">
              <SankeyChart 
                data={{
                  nodes: [
                    { id: "pv", name: `PV\n${pvProduction.toFixed(1)}kW` },
                    { id: "battery", name: `Batterie\n${avgSoc.toFixed(0)}%` },
                    { id: "house", name: `Wohnungen\n${houseConsumption.toFixed(1)}kW` },
                    { id: "common", name: `Allgemein\n${commonConsumption.toFixed(1)}kW` },
                    { id: "grid", name: `Stromnetz` },
                  ],
                  links: [
                    { source: 0, target: 2, value: Math.max(1, houseConsumption * 5) },
                    { source: 0, target: 3, value: Math.max(1, commonConsumption * 5) },
                    ...(netFlow > 0.5 ? [{ source: 0, target: 1, value: Math.max(1, netFlow * 5) }] : []),
                    ...(netFlow < -0.5 ? [{ source: 4, target: 2, value: Math.max(1, Math.abs(netFlow) * 5) }] : []),
                  ]
                }} 
                width={600} 
                height={300} 
              />
            </div>
          </div>
        </div>

        {/* Annual Stats */}
        <div className="mb-6">
          <AnnualConsumptionStats
            tenants={tenants}
            calculateTenantConsumption={calculateTenantConsumption}
          />
        </div>

        {/* Info Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-3">👥 Wohnparteien</h2>
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-bold text-sm">{tenant.name}</p>
                    <p className="text-xs text-gray-600">{tenant.livingAreaSqm}m²</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{tenant.consumption} kWh/a</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-bold mb-3">🏢 Gebäude</h2>
            <div className="space-y-2 text-sm">
              <p><span className="font-bold">PV:</span> {building.pvPeakKw} kWp</p>
              <p><span className="font-bold">Batterie:</span> {building.capacity} kWh</p>
              <p><span className="font-bold">Effizienz:</span> {(building.efficiency * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
