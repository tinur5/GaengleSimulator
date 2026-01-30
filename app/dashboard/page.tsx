'use client';

import { useState, useEffect, useRef } from 'react';
import { Building, Tenant } from '../../lib/models';
import { calculateTenantConsumption, calculatePVProduction } from '../../lib/simulation';
import ConsumptionChart from '../../components/ConsumptionChart';
import AnnualConsumptionStats from '../../components/AnnualConsumptionStats';
import SocBar from '../../components/SocBar';
import SankeyChart from '../../components/SankeyChart';
import DataContextBanner from '../../components/DataContextBanner';
import PlausibilityWarnings from '../../components/PlausibilityWarnings';
import DebugPanel from '../../components/DebugPanel';
import InfoTooltip from '../../components/InfoTooltip';
import IssueReportButton from '../../components/IssueReportButton';
import MetricSparkline from '../../components/MetricSparkline';
import { OptimizationStrategyType, getAllStrategies, getStrategy } from '../../lib/optimizationStrategies';
import { LiveModeState, LiveModeSpeed, DEFAULT_LIVE_MODE_STATE, getUpdateInterval, advanceTime } from '../../lib/liveMode';
import { APP_VERSION } from '../../lib/version';

export default function Dashboard() {
  const [building] = useState<Building>({
    id: 1,
    name: 'MFH Gängle 2+4',
    pvPeakKw: 66.88,
    capacity: 40,
    efficiency: 0.95,
    numInverters: 2,
    inverterPowerKw: 33.44,
    batteries: [
      { id: 1, inverterId: 1, capacityKwh: 20, soc: 75 },
      { id: 2, inverterId: 2, capacityKwh: 20, soc: 65 },
    ],
  });

  const [tenants] = useState<Tenant[]>([
    { id: 1, name: 'Graf', consumption: 5200, householdSize: 4, livingAreaSqm: 140, ageGroup: 'Familie', vehicleType: 'VW ID4' },
    { id: 2, name: 'Wetli', consumption: 5200, householdSize: 4, livingAreaSqm: 140, ageGroup: 'Familie', vehicleType: 'Tesla' },
    { id: 3, name: 'Bürzle', consumption: 4500, householdSize: 2, livingAreaSqm: 200, ageGroup: 'Pensionierte', vehicleType: 'Porsche Hybrid' },
  ]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState<number>(12);
  
  // Optimization strategy state
  const [selectedStrategy, setSelectedStrategy] = useState<OptimizationStrategyType>('balanced');
  const [aiOptimizationEnabled, setAiOptimizationEnabled] = useState<boolean>(true);
  
  // Live mode state
  const [liveMode, setLiveMode] = useState<LiveModeState>(DEFAULT_LIVE_MODE_STATE);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Control bar collapse state for mobile - starts expanded for better UX
  const [isControlBarExpanded, setIsControlBarExpanded] = useState<boolean>(true);
  
  // Live mode effect
  useEffect(() => {
    if (liveMode.isActive && !liveMode.isPaused) {
      const interval = getUpdateInterval(liveMode.speed);
      intervalRef.current = setInterval(() => {
        setLiveMode(prevState => {
          const newState = advanceTime(prevState);
          setSelectedHour(newState.currentHour);
          setSelectedDate(newState.currentDate);
          return newState;
        });
      }, interval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [liveMode.isActive, liveMode.isPaused, liveMode.speed]);
  
  // Toggle live mode
  const toggleLiveMode = () => {
    setLiveMode(prev => ({
      ...prev,
      isActive: !prev.isActive,
      currentHour: selectedHour,
      currentDate: selectedDate,
    }));
  };
  
  // Toggle pause
  const togglePause = () => {
    setLiveMode(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };
  
  // Change speed
  const changeSpeed = (speed: LiveModeSpeed) => {
    setLiveMode(prev => ({ ...prev, speed }));
  };

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

  // Get current strategy config
  const currentStrategy = getStrategy(selectedStrategy);
  const strategyConfig = aiOptimizationEnabled ? currentStrategy.config : {
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

  // Berechne realistische SOC-Werte über den Tag akkumuliert mit optimierter Strategie
  // Jede Batterie wird unabhängig simuliert basierend auf ihrem Wechselrichter

  // Um Plausibilität zu gewährleisten, simulieren wir vom Start des vorherigen Tages
  const calculateHourlySoc = (
    selectedDate: Date, 
    targetHour: number, 
    batteryCapacity: number, 
    inverterId: number // 1 or 2
  ) => {
    // Optimierte Energiemanagement-Parameter
    const config = {
      minSoc: 12,
      maxSoc: 95,
      targetNightSoc: 65,
      maxChargeRate: 10,
      maxDischargeRate: 6,
      nightStart: 21,
      nightEnd: 6,
    };

    
    // Starte Simulation am Vortag um 00:00, um kontinuierlichen Batteriezustand zu haben
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    previousDay.setHours(0, 0, 0, 0);
    
    // Berechne Start-SOC basierend auf Jahreszeit und Wochentag des Vortages
    const winterMonths = [12, 1, 2];
    const prevMonth = previousDay.getMonth() + 1;
    const prevDayOfWeek = previousDay.getDay();
    const isWinter = winterMonths.includes(prevMonth);
    const isWeekend = prevDayOfWeek === 0 || prevDayOfWeek === 6;
    
    let startSoc = 50; // Basis
    if (isWinter) startSoc += 15; // Winter: längere Nächte
    if (isWeekend) startSoc += 10; // Wochenende: mehr Tagesverbrauch
    
    // Add small variation between batteries (±3%)
    const batteryVariation = inverterId === 1 ? -2 : 2;
    startSoc = Math.min(85, Math.max(20, startSoc + batteryVariation));
    
    let soc = startSoc;
    
    // Simuliere vom Vortag 00:00 bis zur gewählten Stunde
    // totalHours ist die Anzahl der Stunden von previousDay 00:00 bis targetHour
    const totalHours = 24 + targetHour;
    
    for (let h = 0; h < totalHours; h++) {
      const currentDateTime = new Date(previousDay.getTime() + h * 60 * 60 * 1000);
      const currentHour = currentDateTime.getHours();
      const currentMonth = currentDateTime.getMonth() + 1;
      const currentDayOfWeek = currentDateTime.getDay();
      
      const pv = calculatePVProduction(building.pvPeakKw, currentHour, currentMonth, building.efficiency);
      const house = tenants.reduce((sum, t) => sum + calculateTenantConsumption(t, currentHour, currentDayOfWeek, currentMonth), 0);
      const common = Object.values(getCommonAreaConsumption(currentHour, currentMonth)).reduce((a: number, b: any) => a + b, 0);
      const consumption = house + common;
      
      // Energie pro Batterie (halber Verbrauch/Produktion)
      const pvPerBattery = pv / 2;
      const consumptionPerBattery = consumption / 2;
      const netFlow = pvPerBattery - consumptionPerBattery;
      
      // Bestimme Tageszeit-Strategie
      const isNight = currentHour >= config.nightStart || currentHour < config.nightEnd;
      
      let socChange = 0;
      
      // PV-Überschuss: Batterie laden
      if (netFlow > 0.05 && soc < config.maxSoc) {
        const chargeCapacity = ((config.maxSoc - soc) / 100) * batteryCapacity;
        const desiredCharge = Math.min(netFlow, config.maxChargeRate);
        const actualCharge = Math.min(desiredCharge, chargeCapacity);
        socChange = (actualCharge * building.efficiency / batteryCapacity) * 100;
      }
      // PV-Defizit: Batterie entladen (strategisch)
      else if (netFlow < -0.05) {
        const deficit = Math.abs(netFlow);
        
        if (isNight) {
          // Nachts: Nur entladen wenn SOC > targetNightSoc
          if (soc > config.targetNightSoc) {
            const availableDischarge = ((soc - config.minSoc) / 100) * batteryCapacity;
            const desiredDischarge = Math.min(deficit, config.maxDischargeRate);
            const actualDischarge = Math.min(desiredDischarge, availableDischarge);
            socChange = -(actualDischarge / building.efficiency / batteryCapacity) * 100;
          }
        } else {
          // Tagsüber: Entladen wenn SOC > minSoc
          if (soc > config.minSoc) {
            const availableDischarge = ((soc - config.minSoc) / 100) * batteryCapacity;
            const desiredDischarge = Math.min(deficit, config.maxDischargeRate);
            const actualDischarge = Math.min(desiredDischarge, availableDischarge);
            socChange = -(actualDischarge / building.efficiency / batteryCapacity) * 100;
          }
        }
      }
      
      // Aktualisiere SOC mit Grenzen
      soc = Math.max(0, Math.min(100, soc + socChange));
    }
    
    return soc;
  };

  // Calculate SOC for each battery independently
  const battery1Soc = calculateHourlySoc(selectedDate, selectedHour, 20, 1);
  const battery2Soc = calculateHourlySoc(selectedDate, selectedHour, 20, 2);
  const avgSoc = (battery1Soc + battery2Soc) / 2;
  
  // Calculate total battery energy stored
  const battery1Energy = (battery1Soc / 100) * building.batteries[0].capacityKwh;
  const battery2Energy = (battery2Soc / 100) * building.batteries[1].capacityKwh;
  const totalBatteryEnergy = battery1Energy + battery2Energy;

  // Calculate battery direction (charging/discharging/idle)
  const getBatteryDirection = (netFlow: number, soc: number): 'charging' | 'discharging' | 'idle' => {
    const config = strategyConfig;
    const isNight = selectedHour >= config.nightStart || selectedHour < config.nightEnd;
    
    if (netFlow > 0.05 && soc < config.maxSoc) {
      return 'charging'; // PV surplus and battery not full
    } else if (netFlow < -0.05) {
      // Check if battery should be used based on strategy
      const shouldUseBattery = isNight 
        ? soc > config.targetNightSoc 
        : soc > config.minSoc;
      
      if (shouldUseBattery) {
        return 'discharging'; // Deficit and battery is being used
      }
    }
    return 'idle'; // Battery not charging or discharging
  };

  const netFlowPerWR = netFlow / 2; // Half of total net flow per inverter
  const battery1Direction = getBatteryDirection(netFlowPerWR, battery1Soc);
  const battery2Direction = getBatteryDirection(netFlowPerWR, battery2Soc);

  // Generate 24-hour data for sparklines
  const generate24HourData = () => {
    const pvData: number[] = [];
    const consumptionData: number[] = [];
    const socData: number[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      // PV production for each hour
      const pv = calculatePVProduction(building.pvPeakKw, hour, month, building.efficiency);
      pvData.push(pv);
      
      // Total consumption for each hour
      const house = tenants.reduce((sum, t) => sum + calculateTenantConsumption(t, hour, dayOfWeek, month), 0);
      const common = Object.values(getCommonAreaConsumption(hour, month)).reduce((a: number, b: any) => a + b, 0);
      consumptionData.push(house + common);
      
      // Average battery SOC for each hour
      const bat1 = calculateHourlySoc(selectedDate, hour, 20, 1);
      const bat2 = calculateHourlySoc(selectedDate, hour, 20, 2);
      socData.push((bat1 + bat2) / 2);
    }
    
    return { pvData, consumptionData, socData };
  };
  
  const { pvData, consumptionData, socData } = generate24HourData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="sticky top-0 z-50 bg-white shadow-lg">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚡ MFH Gängle 2+4</h1>
              <p className="text-sm text-gray-600">66.88 kWp PV • 2× 20 kWh Batterien • <span className="text-xs text-gray-500">v{APP_VERSION}</span></p>

            </div>
            <button
              onClick={() => setIsControlBarExpanded(!isControlBarExpanded)}
              className="md:hidden p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
              aria-label={isControlBarExpanded ? "Steuerelemente einklappen" : "Steuerelemente ausklappen"}
            >
              {isControlBarExpanded ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>Einklappen</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>Ausklappen</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>

          {/* Collapsible controls section */}
          <div className={`${isControlBarExpanded ? 'block' : 'hidden'} md:block px-4 pb-4`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="hidden md:block">
                <h1 className="text-2xl font-bold text-gray-900">⚡ MFH Gängle 2+4</h1>
                <p className="text-sm text-gray-600">66.88 kWp PV • 2× 20 kWh Batterien</p>
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
                    disabled={liveMode.isActive}
                  />
                  <span className="text-lg font-bold text-indigo-600 w-12">{String(selectedHour).padStart(2, '0')}:00</span>
                </div>
              </div>
            </div>
          </div>
          </div>
          
          {/* Optimization and Live Mode Controls */}
          <div className={`${isControlBarExpanded ? 'block' : 'hidden'} md:block border-t border-gray-200 pt-3 px-4 pb-4`}>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Strategy Selection */}
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  ⚙️ OPTIMIERUNGSSTRATEGIE
                </label>
                <div className="flex flex-wrap gap-2">
                  {getAllStrategies().map(strategy => (
                    <button
                      key={strategy.type}
                      onClick={() => setSelectedStrategy(strategy.type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedStrategy === strategy.type
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={strategy.description}
                    >
                      {strategy.name}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="aiOptimization"
                    checked={aiOptimizationEnabled}
                    onChange={(e) => setAiOptimizationEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="aiOptimization" className="text-xs text-gray-600">
                    🤖 KI-Optimierung aktiviert
                  </label>
                </div>
                {aiOptimizationEnabled && (
                  <div className="mt-2 text-xs text-gray-500">
                    <strong>Aktiv:</strong> {currentStrategy.description}
                  </div>
                )}
              </div>
              
              {/* Live Mode Controls */}
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  🎮 LIVE-MODUS
                </label>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={toggleLiveMode}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      liveMode.isActive
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {liveMode.isActive ? '⏹ Stop' : '▶ Start'}
                  </button>
                  
                  {liveMode.isActive && (
                    <>
                      <button
                        onClick={togglePause}
                        className="px-4 py-1.5 rounded-lg text-xs font-medium bg-yellow-500 text-white hover:bg-yellow-600"
                      >
                        {liveMode.isPaused ? '▶ Resume' : '⏸ Pause'}
                      </button>
                      
                      <div className="flex gap-1">
                        {([1, 2, 5, 10] as LiveModeSpeed[]).map(speed => (
                          <button
                            key={speed}
                            onClick={() => changeSpeed(speed)}
                            className={`px-3 py-1.5 rounded text-xs font-medium ${
                              liveMode.speed === speed
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {liveMode.isActive && (
                  <div className="mt-2 text-xs text-gray-500">
                    Geschwindigkeit: {liveMode.speed}x • {liveMode.isPaused ? 'Pausiert' : 'Läuft'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Data Context Banner */}
        <DataContextBanner selectedDate={selectedDate} selectedHour={selectedHour} />

        {/* Plausibility Warnings */}
        <PlausibilityWarnings
          pvProduction={pvProduction}
          totalConsumption={totalConsumption}
          battery1Soc={battery1Soc}
          battery2Soc={battery2Soc}
          battery1Capacity={building.batteries[0].capacityKwh}
          battery2Capacity={building.batteries[1].capacityKwh}
          selectedHour={selectedHour}
        />

        {/* Debug Panel */}
        <DebugPanel
          pvProduction={pvProduction}
          houseConsumption={houseConsumption}
          commonConsumption={commonConsumption}
          totalConsumption={totalConsumption}
          netFlow={netFlow}
          battery1Soc={battery1Soc}
          battery2Soc={battery2Soc}
          avgSoc={avgSoc}
          battery1Capacity={building.batteries[0].capacityKwh}
          battery2Capacity={building.batteries[1].capacityKwh}
          selectedHour={selectedHour}
          selectedDate={selectedDate}
        />

        {/* Strategy Info Banner */}
        {aiOptimizationEnabled && (
          <div className="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 rounded-lg p-3 shadow">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-indigo-900">{currentStrategy.name}</h3>
                <p className="text-xs text-gray-700 mt-1">{currentStrategy.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  <div className="bg-white rounded px-2 py-1">
                    <div className="text-[10px] text-gray-600">Batteriesch.</div>
                    <div className="text-sm font-bold text-indigo-600">{currentStrategy.priority.batteryPreservation}/10</div>
                  </div>
                  <div className="bg-white rounded px-2 py-1">
                    <div className="text-[10px] text-gray-600">Netzunabh.</div>
                    <div className="text-sm font-bold text-indigo-600">{currentStrategy.priority.gridIndependence}/10</div>
                  </div>
                  <div className="bg-white rounded px-2 py-1">
                    <div className="text-[10px] text-gray-600">Kosteneinspar.</div>
                    <div className="text-sm font-bold text-indigo-600">{currentStrategy.priority.costSaving}/10</div>
                  </div>
                  <div className="bg-white rounded px-2 py-1">
                    <div className="text-[10px] text-gray-600">Flexibilität</div>
                    <div className="text-sm font-bold text-indigo-600">{currentStrategy.priority.flexibility}/10</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-orange-400">
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-600 flex items-center">
              ☀️ PV-LEISTUNG
              <InfoTooltip text="Aktuelle Photovoltaik-Produktionsleistung (kW = Kilowatt) basierend auf Tageszeit, Monat, Wetter und installierter Leistung (66.88 kWp). Berechnet mit realistischen Sonnenauf-/untergangszeiten und Bewölkungsfaktoren. kW ist eine Momentanleistung - über eine Stunde ergibt sich daraus die Energie in kWh (Kilowattstunden)." />
            </h3>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600 mt-1 md:mt-2">{pvProduction.toFixed(1)} <span className="text-xs sm:text-sm">kW</span></p>
            <div className="mt-1 text-[9px] sm:text-[10px] text-gray-600">
              <span className="font-semibold">Momentanleistung</span> • {(pvProduction * 1).toFixed(1)} kWh/h
            </div>
            <div className="mt-2">
              <MetricSparkline data={pvData} currentHour={selectedHour} color="orange" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-red-400">
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-600 flex items-center">
              🏠 VERBRAUCH
              <InfoTooltip text="Gesamtverbrauch aller Wohnungen plus Gemeinschaftsbereiche (Pool, Heizung, Garage, Boiler) in kW (Kilowatt). Dies ist die momentane Leistungsaufnahme. Variiert nach Tageszeit, Wochentag und Jahreszeit basierend auf realistischen Lastprofilen. Über eine Stunde ergibt sich daraus die Energie in kWh." />
            </h3>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 mt-1 md:mt-2">{totalConsumption.toFixed(1)} <span className="text-xs sm:text-sm">kW</span></p>
            <div className="mt-1 text-[9px] sm:text-[10px] text-gray-600">
              <span className="font-semibold">Momentanleistung</span> • {(totalConsumption * 1).toFixed(1)} kWh/h
            </div>
            <div className="mt-1 md:mt-2 text-[9px] sm:text-[10px] md:text-xs text-gray-600 space-y-0.5">
              <div className="flex justify-between">
                <span>Wohn.:</span>
                <span className="font-semibold">{houseConsumption.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pool:</span>
                <span className="font-semibold">{commonAreaData.pool.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span>Heiz.:</span>
                <span className="font-semibold">{commonAreaData.heating.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span>Garage:</span>
                <span className="font-semibold">{commonAreaData.garage.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span>Boiler:</span>
                <span className="font-semibold">{commonAreaData.boiler.toFixed(1)}</span>
              </div>
            </div>
            <div className="mt-2">
              <MetricSparkline data={consumptionData} currentHour={selectedHour} color="red" />
            </div>
          </div>

          <div className={`rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 ${netFlow > 0 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400' : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-400'}`}>
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-600 flex items-center">
              {netFlow > 0 ? '📈 +' : '📉 -'}
              <InfoTooltip text={netFlow > 0 ? 'PV-Überschuss: Energie, die in Batterien geladen oder ins Netz eingespeist wird. Berechnung: PV-Produktion minus Verbrauch.' : 'Energie-Defizit: Fehlende Energie wird aus Batterien oder vom Netz bezogen. Berechnung: Verbrauch minus PV-Produktion.'} />
            </h3>
            <p className={`text-xl sm:text-2xl md:text-3xl font-bold mt-1 md:mt-2 ${netFlow > 0 ? 'text-green-600' : 'text-gray-600'}`}>{Math.abs(netFlow).toFixed(1)} <span className="text-xs sm:text-sm">kW</span></p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-purple-400">
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-600 flex items-center">
              🔋 ∅ BATTERIE-SOC
              <InfoTooltip text="Durchschnittlicher State of Charge (SOC) beider Batterien. Berechnet basierend auf akkumuliertem Energiefluss seit Vortag 00:00 Uhr mit strategie-basierter Lade-/Entladesteuerung. 100% = vollständig geladen (40 kWh gesamt), 0% = leer. Formel: (Batterie1_SOC + Batterie2_SOC) / 2" />
            </h3>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600 mt-1 md:mt-2">{avgSoc.toFixed(1)} <span className="text-xs sm:text-sm">%</span></p>
            <div className="mt-1 text-[9px] sm:text-[10px] text-gray-600">
              <span className="font-semibold">{totalBatteryEnergy.toFixed(1)} kWh</span> gespeichert von {building.capacity} kWh
            </div>
            <div className="mt-2">
              <MetricSparkline data={socData} currentHour={selectedHour} color="purple" />
            </div>
          </div>
        </div>

        {/* Detaillierte Verbrauchsübersicht */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
          <div className="bg-white rounded-lg shadow p-2 md:p-3">
            <h3 className="text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">👨‍👩‍👧‍👦 Graf (Tesla)</h3>
            <div className="text-[10px] md:text-xs text-gray-600 space-y-0.5 md:space-y-1">
              <div className="flex justify-between">
                <span>Haushalt:</span>
                <span className="font-semibold">{(calculateTenantConsumption(tenants[0], selectedHour, dayOfWeek, month) * 0.7).toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between">
                <span>🚗 Tesla laden:</span>
                <span className="font-semibold">{(calculateTenantConsumption(tenants[0], selectedHour, dayOfWeek, month) * 0.3).toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-red-600">{calculateTenantConsumption(tenants[0], selectedHour, dayOfWeek, month).toFixed(2)} kW</span>
              </div>
              <div className="text-[9px] text-gray-500 mt-1">4 Personen, 160m²</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-2 md:p-3">
            <h3 className="text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">👴👵 Wetli (VW)</h3>
            <div className="text-[10px] md:text-xs text-gray-600 space-y-0.5 md:space-y-1">
              <div className="flex justify-between">
                <span>Haushalt:</span>
                <span className="font-semibold">{(calculateTenantConsumption(tenants[1], selectedHour, dayOfWeek, month) * 0.8).toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between">
                <span>🚗 VW laden:</span>
                <span className="font-semibold">{(calculateTenantConsumption(tenants[1], selectedHour, dayOfWeek, month) * 0.2).toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-red-600">{calculateTenantConsumption(tenants[1], selectedHour, dayOfWeek, month).toFixed(2)} kW</span>
              </div>
              <div className="text-[9px] text-gray-500 mt-1">2 Personen, 200m²</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-2 md:p-3">
            <h3 className="text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">👨‍👩‍👧‍👦 Bürzle (E-Bike)</h3>
            <div className="text-[10px] md:text-xs text-gray-600 space-y-0.5 md:space-y-1">
              <div className="flex justify-between">
                <span>Haushalt:</span>
                <span className="font-semibold">{(calculateTenantConsumption(tenants[2], selectedHour, dayOfWeek, month) * 0.98).toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between">
                <span>🚴 E-Bike laden:</span>
                <span className="font-semibold">{(calculateTenantConsumption(tenants[2], selectedHour, dayOfWeek, month) * 0.02).toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-red-600">{calculateTenantConsumption(tenants[2], selectedHour, dayOfWeek, month).toFixed(2)} kW</span>
              </div>
              <div className="text-[9px] text-gray-500 mt-1">3 Personen, 140m²</div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-2 md:p-4">
            <h2 className="text-sm md:text-lg font-bold mb-2 md:mb-3">⚡ Energiefluss</h2>
            <div className="w-full">
              <div className="w-full" style={{ height: 'clamp(250px, 40vw, 320px)' }}>
              <SankeyChart 
                data={{
                  nodes: [
                    { id: "pv", name: `PV ${pvProduction.toFixed(1)}kW` },
                    { id: "wr1", name: `WR1 ${(pvProduction/2).toFixed(1)}kW` },
                    { id: "wr2", name: `WR2 ${(pvProduction/2).toFixed(1)}kW` },
                    { id: "bat1", name: `Bat1 ${battery1Soc.toFixed(0)}%` },
                    { id: "bat2", name: `Bat2 ${battery2Soc.toFixed(0)}%` },
                    { id: "house", name: `Wohnungen ${houseConsumption.toFixed(1)}kW` },
                    { id: "common", name: `Allgemein ${commonConsumption.toFixed(1)}kW` },
                    { id: "grid", name: `Netz` },
                  ],
                  links: (() => {
                    const links = [];
                    
                    // Use the selected strategy config
                    const config = strategyConfig;
                    
                    const isNight = selectedHour >= config.nightStart || selectedHour < config.nightEnd;
                    
                    // Verbrauch pro WR (jeweils die Hälfte)
                    const housePerWR = houseConsumption / 2;
                    const commonPerWR = commonConsumption / 2;
                    const consumptionPerWR = housePerWR + commonPerWR;
                    
                    // PV-Leistung pro WR
                    const pvPerWR = pvProduction / 2;
                    
                    // Energiebilanz pro WR
                    const netFlowPerWR = pvPerWR - consumptionPerWR;
                    
                    // === Wechselrichter 1 ===
                    let wr1Input = 0;
                    let wr1Output = 0;
                    
                    // PV zu WR1
                    if (pvPerWR > 0.05) {
                      links.push({ source: 0, target: 1, value: pvPerWR * 10 });
                      wr1Input += pvPerWR;
                    }
                    
                    // Bei Defizit: Batterie1 oder Netz zu WR1 (optimiert)
                    if (netFlowPerWR < -0.05) {
                      const deficit = Math.abs(netFlowPerWR);
                      
                      // Intelligente Batterienutzung
                      const shouldUseBattery = isNight 
                        ? battery1Soc > config.targetNightSoc  // Nachts: Nur wenn über Ziel-SOC
                        : battery1Soc > config.minSoc;         // Tagsüber: Wenn über Minimum
                      
                      if (shouldUseBattery) {
                        const fromBattery = Math.min(deficit, config.maxDischargeRate);
                        links.push({ source: 3, target: 1, value: fromBattery * 10 });
                        wr1Input += fromBattery;
                        
                        const fromGrid = deficit - fromBattery;
                        if (fromGrid > 0.05) {
                          links.push({ source: 7, target: 1, value: fromGrid * 10 });
                          wr1Input += fromGrid;
                        }
                      } else {
                        // Batterie geschont -> alles vom Netz
                        links.push({ source: 7, target: 1, value: deficit * 10 });
                        wr1Input += deficit;
                      }
                    }
                    
                    // WR1 zu Verbrauchern
                    if (housePerWR > 0.05) {
                      links.push({ source: 1, target: 5, value: housePerWR * 10 });
                      wr1Output += housePerWR;
                    }
                    if (commonPerWR > 0.05) {
                      links.push({ source: 1, target: 6, value: commonPerWR * 10 });
                      wr1Output += commonPerWR;
                    }
                    
                    // Bei Überschuss: WR1 zu Batterie1 oder Netz
                    if (netFlowPerWR > 0.05) {
                      // Batterie laden wenn SOC < 95%
                      if (battery1Soc < 95) {
                        links.push({ source: 1, target: 3, value: netFlowPerWR * 10 });
                        wr1Output += netFlowPerWR;
                      } else {
                        // Ins Netz einspeisen
                        links.push({ source: 1, target: 7, value: netFlowPerWR * 10 });
                        wr1Output += netFlowPerWR;
                      }
                    }
                    
                    // === Wechselrichter 2 ===
                    let wr2Input = 0;
                    let wr2Output = 0;
                    
                    // PV zu WR2
                    if (pvPerWR > 0.05) {
                      links.push({ source: 0, target: 2, value: pvPerWR * 10 });
                      wr2Input += pvPerWR;
                    }
                    
                    // Bei Defizit: Batterie2 oder Netz zu WR2 (optimiert)
                    if (netFlowPerWR < -0.05) {
                      const deficit = Math.abs(netFlowPerWR);
                      
                      // Intelligente Batterienutzung
                      const shouldUseBattery = isNight 
                        ? battery2Soc > config.targetNightSoc  // Nachts: Nur wenn über Ziel-SOC
                        : battery2Soc > config.minSoc;         // Tagsüber: Wenn über Minimum
                      
                      if (shouldUseBattery) {
                        const fromBattery = Math.min(deficit, config.maxDischargeRate);
                        links.push({ source: 4, target: 2, value: fromBattery * 10 });
                        wr2Input += fromBattery;
                        
                        const fromGrid = deficit - fromBattery;
                        if (fromGrid > 0.05) {
                          links.push({ source: 7, target: 2, value: fromGrid * 10 });
                          wr2Input += fromGrid;
                        }
                      } else {
                        // Batterie geschont -> alles vom Netz
                        links.push({ source: 7, target: 2, value: deficit * 10 });
                        wr2Input += deficit;
                      }
                    }
                    
                    // WR2 zu Verbrauchern
                    if (housePerWR > 0.05) {
                      links.push({ source: 2, target: 5, value: housePerWR * 10 });
                      wr2Output += housePerWR;
                    }
                    if (commonPerWR > 0.05) {
                      links.push({ source: 2, target: 6, value: commonPerWR * 10 });
                      wr2Output += commonPerWR;
                    }
                    
                    // Bei Überschuss: WR2 zu Batterie2 oder Netz
                    if (netFlowPerWR > 0.05) {
                      // Batterie laden wenn SOC < 95%
                      if (battery2Soc < 95) {
                        links.push({ source: 2, target: 4, value: netFlowPerWR * 10 });
                        wr2Output += netFlowPerWR;
                      } else {
                        // Ins Netz einspeisen
                        links.push({ source: 2, target: 7, value: netFlowPerWR * 10 });
                        wr2Output += netFlowPerWR;
                      }
                    }
                    
                    return links;
                  })()
                }}
              />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 md:p-4">
            <h2 className="text-sm md:text-lg font-bold mb-2 md:mb-3">🔋 Batteriestand</h2>
            <div className="space-y-2 md:space-y-4">
              <SocBar 
                label="Wechselrichter 1" 
                soc={battery1Soc} 
                capacity={building.batteries[0].capacityKwh}
                direction={battery1Direction}
              />
              <SocBar 
                label="Wechselrichter 2" 
                soc={battery2Soc} 
                capacity={building.batteries[1].capacityKwh}
                direction={battery2Direction}
              />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-white rounded-lg shadow p-2 md:p-4">
            <h2 className="text-sm md:text-lg font-bold mb-2 md:mb-3">💡 24h Haushalt-Verbrauch</h2>
            <div className="h-48 sm:h-64 md:h-80">
              <ConsumptionChart
                tenants={tenants}
                month={month}
                dayOfWeek={dayOfWeek}
                currentHour={selectedHour}
                calculateTenantConsumption={calculateTenantConsumption}
              />
            </div>
          </div>
        </div>

        {/* Annual Stats */}
        <div className="mb-4 md:mb-6">
          <AnnualConsumptionStats
            tenants={tenants}
            calculateTenantConsumption={calculateTenantConsumption}
          />
        </div>

        {/* Info Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          <div className="bg-white rounded-lg shadow p-2 md:p-4">
            <h2 className="text-sm md:text-lg font-bold mb-2 md:mb-3">👥 Wohnparteien</h2>
            <div className="space-y-1 md:space-y-2">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex justify-between p-1.5 md:p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-bold text-xs md:text-sm">{tenant.name}</p>
                    <p className="text-[10px] md:text-xs text-gray-600">{tenant.livingAreaSqm}m²</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs md:text-sm font-bold">{tenant.consumption} kWh/a</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 md:p-4">
            <h2 className="text-sm md:text-lg font-bold mb-2 md:mb-3">🏢 Gebäude</h2>
            <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
              <p><span className="font-bold">PV:</span> {building.pvPeakKw} kWp</p>
              <p><span className="font-bold">Batterie:</span> {building.capacity} kWh (2× {building.batteries[0].capacityKwh} kWh)</p>
              <p><span className="font-bold">System-Effizienz:</span> {(building.efficiency * 100).toFixed(0)}% <span className="text-[10px] text-gray-600">(Wechselrichter & Batterie)</span></p>
              <p><span className="font-bold">Wechselrichter:</span> {building.numInverters}× {building.inverterPowerKw} kW</p>
            </div>
          </div>
        </div>
      </div>

      {/* Issue Report Button */}
      <IssueReportButton />
    </div>
  );
}
