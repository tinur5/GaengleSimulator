// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import EnergyChart from '../../components/EnergyChart';
import SocBar from '../../components/SocBar';
import SankeyChart from '../../components/SankeyChart';
import { Building, Tenant, SimulationResult } from '../../lib/models';
import { runSimulation as runSimulationLib } from '../../lib/simulation';

export default function Dashboard() {
  const [building, setBuilding] = useState<Building>({
    id: 1,
    name: 'MFH Gängle 2+4 - Baizers',
    pvPeakKw: 66.88,
    capacity: 100,
    efficiency: 0.95,
    numInverters: 2,
    inverterPowerKw: 33.44,
  });
  const [tenants, setTenants] = useState<Tenant[]>([
    { 
      id: 1, 
      name: 'Familie Graf', 
      consumption: 5200, // kWh/Jahr Haushalt
      householdSize: 4,
      livingAreaSqm: 160,
      ageGroup: 'Familie mit 2 Kindern',
      vehicleType: 'Tesla Model 3 (60 kWh)'
    },
    { 
      id: 2, 
      name: 'Familie Wetli', 
      consumption: 5200, // kWh/Jahr Haushalt
      householdSize: 4,
      livingAreaSqm: 160,
      ageGroup: 'Familie mit 2 Kindern',
      vehicleType: 'VW ID.4 (77 kWh)'
    },
    { 
      id: 3, 
      name: 'Ehepaar Bürzle', 
      consumption: 4500, // kWh/Jahr Haushalt
      householdSize: 2,
      livingAreaSqm: 200,
      ageGroup: 'Pensionierte',
      vehicleType: 'Kein Elektroauto'
    },
  ]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Datum und Zeit Steuerung
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">⚡ Energy Simulator</h1>
          <p className="text-gray-600 text-lg">Optimieren Sie Ihren Energiefluss in Echtzeit</p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <h2 className="text-xl font-bold mb-3">📊 Intelligente Verbrauchsschätzung</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="font-semibold mb-1">🌤️ Jahreszeiten</p>
              <p className="text-xs">Winter: +40% (Heizung, Licht)<br/>Sommer: -10% (weniger Bedarf)</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="font-semibold mb-1">📅 Wochentage</p>
              <p className="text-xs">Werktag: Normal<br/>Wochenende: +30% (ganztags)</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3">
              <p className="font-semibold mb-1">🕐 Tageszeiten</p>
              <p className="text-xs">Lastspitzen: 6-8 Uhr, 17-22 Uhr<br/>Nachtabsenkung: 22-6 Uhr</p>
            </div>
          </div>
        </div>

        {/* Datum und Zeit Steuerung */}
        <div className="mb-6 bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
              <span className="text-xl">🕐</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Simulation: Datum & Uhrzeit</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Uhrzeit</label>
              <input
                type="range"
                min="0"
                max="23"
                value={selectedHour}
                onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-center text-2xl font-bold text-indigo-600 mt-2">{selectedHour}:00 Uhr</p>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Building Settings Card */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-xl">🏢</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Gebäudeeinstellungen</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gebäudename</label>
                <input
                  type="text"
                  placeholder="z.B. Mein Haus"
                  value={building.name}
                  onChange={(e) => updateBuilding('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PV-Leistung (kWp)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="z.B. 66.88"
                    value={building.pvPeakKw}
                    onChange={(e) => updateBuilding('pvPeakKw', parseFloat(e.target.value))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="px-3 py-2 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700 font-semibold">
                    152 Module
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">à 440 Wp = 66.88 kWp</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batteriekapazität (kWh)</label>
                <input
                  type="number"
                  placeholder="z.B. 100"
                  value={building.capacity}
                  onChange={(e) => updateBuilding('capacity', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effizienz</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="z.B. 0.95"
                  value={building.efficiency}
                  onChange={(e) => updateBuilding('efficiency', parseFloat(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="pt-3 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-2">🔌 Wechselrichter</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-50 p-2 rounded border border-green-200">
                    <p className="text-gray-600 font-semibold">Inverter 1:</p>
                    <p className="font-bold text-green-700">Wohnparteien</p>
                    <p className="text-gray-500 text-xs">33.44 kW</p>
                  </div>
                  <div className="bg-orange-50 p-2 rounded border border-orange-200">
                    <p className="text-gray-600 font-semibold">Inverter 2:</p>
                    <p className="font-bold text-orange-700">Pool, Garage, Heizung</p>
                    <p className="text-gray-500 text-xs">33.44 kW</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tenants Card */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                <span className="text-xl">👥</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Wohnparteien (3 Einheiten)</h2>
            </div>
            <div className="space-y-4">
              {tenants.map((tenant, index) => (
                <div key={tenant.id} className="p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{tenant.name}</h3>
                      <p className="text-sm text-gray-600">{tenant.ageGroup}</p>
                    </div>
                    <div className="text-right bg-white px-3 py-1 rounded-lg border border-green-200">
                      <p className="text-xs text-gray-500">Einheit {index + 1}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold">Wohnfläche</p>
                      <p className="text-lg font-bold text-gray-900">{tenant.livingAreaSqm} m²</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold">Haushalt</p>
                      <p className="text-lg font-bold text-gray-900">{tenant.householdSize} <span className="text-sm">Personen</span></p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200 md:col-span-2">
                      <p className="text-xs text-gray-600 font-semibold mb-1">Jahresverbrauch (kWh/Jahr)</p>
                      <input
                        type="number"
                        step="100"
                        placeholder="z.B. 5200"
                        value={tenant.consumption}
                        onChange={(e) => updateTenant(tenant.id, 'consumption', parseFloat(e.target.value))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-bold"
                      />
                      <p className="text-xs text-gray-500 mt-1">⌀ {(tenant.consumption / 8760).toFixed(2)} kW</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold">🚗 E-Auto</p>
                      <p className="text-xs font-bold text-gray-900">{tenant.vehicleType || 'Kein'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">Gesamt-Jahresverbrauch:</span>
                  </p>
                  <p className="text-2xl font-bold text-blue-600">{tenants.reduce((sum, t) => sum + t.consumption, 0)} kWh/Jahr</p>
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-bold">⌀ Leistung:</span>
                  </p>
                  <p className="text-2xl font-bold text-blue-600">{(tenants.reduce((sum, t) => sum + t.consumption, 0) / 8760).toFixed(2)} kW</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {simulationResult && (
          <div className="space-y-6">
            {/* Live Energiefluss - NEUE SEKTION */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xl">⚡</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Aktueller Energiefluss - {selectedHour}:00 Uhr</h2>
              </div>
              {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* PV Produktion */}
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-lg border-2 border-yellow-300">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900">☀️ PV-Produktion</h3>
                      <span className="text-3xl">→</span>
                    </div>
                    <p className="text-4xl font-bold text-orange-600">
                      {simulationResult.energyFlow[selectedHour] > 0 
                        ? Math.abs(simulationResult.energyFlow[selectedHour]).toFixed(2) 
                        : '0.00'} kW
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Aktuell erzeugt</p>
                  </div>

                  {/* Verbrauch */}
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-lg border-2 border-red-300">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900">🏠 Verbrauch</h3>
                      <span className="text-3xl">←</span>
                    </div>
                    <p className="text-4xl font-bold text-red-600">
                      {(tenants.reduce((sum, t) => sum + t.consumption, 0) / 8760).toFixed(2)} kW
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Alle Wohnungen + E-Autos</p>
                  </div>

                  {/* Netto-Bilanz */}
                  <div className={`bg-gradient-to-br ${simulationResult.energyFlow[selectedHour] > 0 ? 'from-green-50 to-emerald-50 border-green-300' : 'from-gray-50 to-slate-50 border-gray-300'} p-6 rounded-lg border-2`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        {simulationResult.energyFlow[selectedHour] > 0 ? '📈 Überschuss' : '📉 Defizit'}
                      </h3>
                      <span className="text-3xl">{simulationResult.energyFlow[selectedHour] > 0 ? '✓' : '⚠'}</span>
                    </div>
                    <p className={`text-4xl font-bold ${simulationResult.energyFlow[selectedHour] > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                      {Math.abs(simulationResult.energyFlow[selectedHour]).toFixed(2)} kW
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {simulationResult.energyFlow[selectedHour] > 0 ? '→ Batterie / Netz' : '← Batterie / Netz'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* SOC Bar */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xl">🔋</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Batteriestand</h2>
              </div>
              {loading ? (
                <p className="text-gray-600">Simulation lädt...</p>
              ) : (
                <SocBar soc={simulationResult.finalSoc} />
              )}
            </div>

            {/* Energy Chart */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xl">📊</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Energiefluss</h2>
              </div>
              <div className="h-96">
                {!loading && <EnergyChart data={simulationResult.energyFlow} />}
              </div>
            </div>

            {/* Sankey Chart */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-indigo-500">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xl">🌊</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Energiefluss-Diagramm</h2>
              </div>
              <div className="h-96 overflow-x-auto">
                {!loading && (() => {
                  const pvProduction = Math.abs(simulationResult.energyFlow[selectedHour] > 0 ? simulationResult.energyFlow[selectedHour] : 0);
                  const consumption = tenants.reduce((sum, t) => sum + t.consumption, 0) / 8760;
                  const toBattery = Math.min(pvProduction * 0.3, 10); // 30% zur Batterie
                  const toHouse = Math.min(consumption, pvProduction);
                  const toGrid = Math.max(0, pvProduction - toHouse - toBattery);
                  const fromGrid = Math.max(0, consumption - pvProduction);
                  
                  const sankeyData = {
                    nodes: [
                      { id: "pv", name: "☀️ PV-Anlage" },
                      { id: "battery", name: "🔋 Batterie" },
                      { id: "house", name: "🏠 Wohnungen" },
                      { id: "grid", name: "⚡ Stromnetz" },
                      { id: "cars", name: "🚗 E-Autos" }
                    ],
                    links: [
                      ...(pvProduction > 0 ? [
                        { source: 0, target: 2, value: Math.max(1, toHouse) },
                        { source: 0, target: 1, value: Math.max(1, toBattery) },
                        ...(toGrid > 0 ? [{ source: 0, target: 3, value: Math.max(1, toGrid) }] : [])
                      ] : []),
                      ...(fromGrid > 0 ? [{ source: 3, target: 2, value: Math.max(1, fromGrid) }] : []),
                      { source: 2, target: 4, value: Math.max(1, consumption * 0.2) }
                    ]
                  };
                  
                  return <SankeyChart data={sankeyData} width={800} height={400} />;
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}