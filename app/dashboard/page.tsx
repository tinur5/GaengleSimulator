'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Building, Tenant } from '../../lib/models';
import { calculateTenantConsumption, calculatePVProduction } from '../../lib/simulation';
import ConsumptionChart from '../../components/ConsumptionChart';
import AnnualConsumptionStats from '../../components/AnnualConsumptionStats';
import SocBar from '../../components/SocBar';
import SankeyChart from '../../components/SankeyChart';
import SankeyBreadcrumb from '../../components/SankeyBreadcrumb';
import DataContextBanner from '../../components/DataContextBanner';
import PlausibilityWarnings from '../../components/PlausibilityWarnings';
import DebugPanel from '../../components/DebugPanel';
import InfoTooltip from '../../components/InfoTooltip';
import IssueReportButton from '../../components/IssueReportButton';
import MetricSparkline from '../../components/MetricSparkline';
import { OptimizationStrategyType, getAllStrategies, getStrategy } from '../../lib/optimizationStrategies';
import { LiveModeState, LiveModeSpeed, DEFAULT_LIVE_MODE_STATE, getUpdateInterval, advanceTime } from '../../lib/liveMode';
import { APP_VERSION } from '../../lib/version';
import { buildConsumerTree, TenantConsumptionData, CommonAreaData } from '../../lib/consumerTreeBuilder';
import { buildSankeyData, EnergyFlowData, getBreadcrumbPath } from '../../lib/sankeyDataBuilder';
import { ConsumerNode } from '../../lib/consumerHierarchy';
import { LKWTariffType, getAllTariffModels } from '../../lib/lkwTariffs';
import CostOverview from '../../components/CostOverview';
import { calculateOptimalEnergyFlow, BatteryState } from '../../lib/energyManagement';
import HaStatusBanner from '../../components/HaStatusBanner';
import { HaOverviewPayload, isHaError } from '../../types/homeAssistant';

/** How often to poll /api/ha/overview in Live mode (milliseconds) */
const HA_POLL_INTERVAL_MS = 30_000;
/** Data is considered stale after this many milliseconds */
const HA_STALE_THRESHOLD_MS = 2 * 60 * 1000;
/** Watts to kilowatts conversion factor */
const W_TO_KW = 1000;

export default function Dashboard() {
  const [building] = useState<Building>({
    id: 1,
    name: 'MFH Gängle 2+4',
    pvPeakKw: 59.8, // 2x Goodwe GW29.9KN-ET inverters
    pvModel: 'Arres 3.2 / Premium L',
    pvManufacturer: 'Arres',
    capacity: 40,
    efficiency: 0.95,
    numInverters: 2, // Kept for backward compatibility
    inverterPowerKw: 29.9, // Kept for backward compatibility
    inverters: [
      { id: 1, model: 'GW29.9KN-ET', manufacturer: 'Goodwe', powerKw: 29.9, efficiency: 0.97 },
      { id: 2, model: 'GW29.9KN-ET', manufacturer: 'Goodwe', powerKw: 29.9, efficiency: 0.97 },
    ],
    batteries: [
      { id: 1, inverterId: 1, capacityKwh: 20, soc: 75, model: 'Lynx D - 20.0 kWh', manufacturer: 'GoodWe' },
      { id: 2, inverterId: 2, capacityKwh: 20, soc: 65, model: 'Lynx D - 20.0 kWh', manufacturer: 'GoodWe' },
    ],
  });

  const [tenants] = useState<Tenant[]>([
    { id: 1, name: 'Graf', consumption: 5200, householdSize: 4, livingAreaSqm: 140, ageGroup: 'Familie', vehicleType: 'VW ID4 77kWh', hasFireplace: true },
    { id: 2, name: 'Wetli', consumption: 5200, householdSize: 4, livingAreaSqm: 140, ageGroup: 'Familie', vehicleType: 'Tesla M3 LR' },
    { id: 3, name: 'Bürzle', consumption: 4500, householdSize: 2, livingAreaSqm: 200, ageGroup: 'Pensionierte', vehicleType: 'Porsche Hybrid' },
  ]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState<number>(12);
  
  // Optimization strategy state
  const [selectedStrategy, setSelectedStrategy] = useState<OptimizationStrategyType>('balanced');
  const [aiOptimizationEnabled, setAiOptimizationEnabled] = useState<boolean>(true);
  
  // Tariff model state
  const [selectedTariff, setSelectedTariff] = useState<LKWTariffType>('classic');
  const [useEcoTariff, setUseEcoTariff] = useState<boolean>(false);
  
  // Live mode state
  const [liveMode, setLiveMode] = useState<LiveModeState>(DEFAULT_LIVE_MODE_STATE);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Control bar collapse state for mobile - starts collapsed by default for mobile optimization
  const [isControlBarExpanded, setIsControlBarExpanded] = useState<boolean>(false);
  
  // Hierarchical consumer structure state
  const [sankeyFocusNodeId, setSankeyFocusNodeId] = useState<string | null>(null);
  const [showAssumptions, setShowAssumptions] = useState<boolean>(true);
  
  // Sankey detailed view state - shows individual tenants when enabled (legacy, will be replaced by hierarchy)
  const [sankeyDetailedView, setSankeyDetailedView] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Home Assistant Live mode state
  // ---------------------------------------------------------------------------
  /** 'live' = fetch real HA data; 'simulator' = use simulation only */
  const [dataSource, setDataSource] = useState<'live' | 'simulator'>('live');
  const [haData, setHaData] = useState<HaOverviewPayload | null>(null);
  const [haLoading, setHaLoading] = useState<boolean>(false);
  const [haError, setHaError] = useState<string | null>(null);
  /** true when HA failed and we display simulated values as fallback */
  const [haFallback, setHaFallback] = useState<boolean>(false);
  const haPollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHaOverview = useCallback(async () => {
    setHaLoading(true);
    try {
      const res = await fetch('/api/ha/overview');
      const json = await res.json();
      if (!res.ok || isHaError(json)) {
        // HA unavailable → show fallback banner but keep last data if present
        setHaError((json as { error?: string }).error ?? 'Home Assistant nicht erreichbar');
        setHaFallback(true);
      } else {
        setHaData(json as HaOverviewPayload);
        setHaError(null);
        setHaFallback(false);
      }
    } catch {
      setHaError('Netzwerkfehler beim Abrufen der Live-Daten');
      setHaFallback(true);
    } finally {
      setHaLoading(false);
    }
  }, []);

  // Start/stop HA polling when data source changes
  useEffect(() => {
    if (dataSource === 'live') {
      fetchHaOverview();
      haPollRef.current = setInterval(fetchHaOverview, HA_POLL_INTERVAL_MS);
    } else {
      if (haPollRef.current) {
        clearInterval(haPollRef.current);
        haPollRef.current = null;
      }
      setHaFallback(false);
    }
    return () => {
      if (haPollRef.current) {
        clearInterval(haPollRef.current);
        haPollRef.current = null;
      }
    };
  }, [dataSource, fetchHaOverview]);

  /** Whether live HA data is stale (older than HA_STALE_THRESHOLD_MS) */
  const isHaStale = useMemo(() => {
    if (!haData?.timestamp) return false;
    return Date.now() - new Date(haData.timestamp).getTime() > HA_STALE_THRESHOLD_MS;
  }, [haData]);

  /** True when we should display HA live values instead of simulation values */
  const isLiveActive = dataSource === 'live' && haData !== null && !haFallback;
  
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
    // Pool: nur berücksichtigen wenn Gebäude einen Pool hat (reale Daten zeigen keinen signifikanten Pool-Verbrauch)
    const hasPool = building.hasPool ?? false;
    const poolActive = hasPool && hour >= 8 && hour <= 22;
    const poolPower = poolActive
      ? (month === 12 || month === 1 || month === 2 ? 0.3 : month === 3 || month === 11 ? 1.2 : 2.5)
      : 0;
    const garage = hour >= 6 && hour <= 23 ? 0.3 : 0.05;
    let heating = 0;
    if (month === 12 || month === 1 || month === 2) {
      heating = (hour >= 6 && hour <= 22) ? 6.0 : 1.5;
    } else if (month === 3 || month === 11) {
      heating = (hour >= 6 && hour <= 22) ? 2.5 : 0.5;
    } else if (month >= 4 && month <= 10) {
      heating = (hour >= 6 && hour <= 22) ? 0.5 : 0.1;
    }
    // Boiler-Grundlast reduziert auf realistischen Wert (kalibriert anhand realer Nachtmessung 03.10.2026)
    let boiler = 0.05;
    if ((hour >= 6 && hour <= 8) || (hour >= 18 && hour <= 21)) {
      boiler = 1.2;
    } else if (hour >= 9 && hour <= 17) {
      boiler = 0.3;
    }
    return { pool: poolPower, garage, heating, boiler };
  };

  const month = selectedDate.getMonth() + 1;
  const dayOfWeek = selectedDate.getDay();
  const simPvProduction = calculatePVProduction(building.pvPeakKw, selectedHour, month, building.efficiency);
  const houseConsumption = tenants.reduce((sum, t) => sum + calculateTenantConsumption(t, selectedHour, dayOfWeek, month), 0);
  const commonAreaData = getCommonAreaConsumption(selectedHour, month);
  const commonConsumption = Object.values(commonAreaData).reduce((a: number, b: any) => a + b, 0);
  const simTotalConsumption = houseConsumption + commonConsumption;
  const simNetFlow = simPvProduction - simTotalConsumption;

  // ---------------------------------------------------------------------------
  // Live HA data overlay – when live mode is active, replace simulation values
  // ---------------------------------------------------------------------------
  /** PV production in kW (display) */
  const pvProduction = isLiveActive ? (haData!.pvPowerW / W_TO_KW) : simPvProduction;
  /** Total house load in kW (display) */
  const totalConsumption = isLiveActive ? (haData!.houseLoadW / W_TO_KW) : simTotalConsumption;
  /** Net flow in kW (positive = surplus, negative = deficit) */
  const netFlow = isLiveActive
    ? ((haData!.pvPowerW - haData!.houseLoadW) / W_TO_KW)
    : simNetFlow;

  // Build hierarchical consumer tree
  const consumerTree = useMemo(() => {
    // Prepare tenant consumption data
    const tenantsData: TenantConsumptionData[] = tenants.map((tenant, index) => {
      const householdPowerW = calculateTenantConsumption(tenant, selectedHour, dayOfWeek, month) * 1000; // Convert kW to W
      
      // Calculate EV charging power for each tenant
      let evChargingPowerW = 0;
      if (index === 0) { // Graf
        const isChargingWindow = selectedHour >= 18 && selectedHour <= 22;
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        evChargingPowerW = (isChargingWindow && isWeekday) ? 11000 : 0;
      } else if (index === 1) { // Wetli
        const isChargingWindow = selectedHour >= 19 && selectedHour <= 23;
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        evChargingPowerW = (isChargingWindow && isWeekday) ? 11000 : 0;
      } else if (index === 2) { // Bürzle
        const isChargingWindow = selectedHour >= 20 && selectedHour <= 22;
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        evChargingPowerW = (isChargingWindow && isWeekday && (selectedDate.getDate() % 3 === 0)) ? 3700 : 0;
      }
      
      return {
        tenant,
        householdPowerW,
        evChargingPowerW,
      };
    });
    
    // Prepare common area data (convert kW to W)
    const commonData: CommonAreaData = {
      pool: commonAreaData.pool * 1000,
      heating: commonAreaData.heating * 1000,
      garage: commonAreaData.garage * 1000,
      boiler: commonAreaData.boiler * 1000,
    };
    
    return buildConsumerTree(tenantsData, commonData, showAssumptions);
  }, [tenants, selectedHour, dayOfWeek, month, commonAreaData, showAssumptions, selectedDate]);

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
    // Use the selected optimization strategy config
    const config = strategyConfig;

    
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
    
    // Kalibrierte Mitternacht-SOC-Werte aus realen Messdaten (03.10.2026)
    // WR1 = 88 %, WR2 = 92 % – repräsentiert typische Batteriesituation nach einem
    // sonnigen Oktober-Tag mit vollständiger Ladung am Vormittag.
    // Schlüssel = Monatsnummer (1=Jan … 10=Okt … 12=Dez)
    const calibratedMidnightSoc: Record<number, { inv1: number; inv2: number }> = {
      10: { inv1: 88, inv2: 92 }, // Oktober (Monat 10): direkt aus realen Messdaten 03.10.2026
    };
    const calibrated = calibratedMidnightSoc[prevMonth];
    
    let startSoc: number;
    if (calibrated) {
      // Verwende kalibrierte Werte aus realen Messdaten
      startSoc = inverterId === 1 ? calibrated.inv1 : calibrated.inv2;
    } else {
      let baseSoc = 50; // Basis
      if (isWinter) baseSoc += 15; // Winter: längere Nächte
      if (isWeekend) baseSoc += 10; // Wochenende: mehr Tagesverbrauch
      // Different starting SOC based on load profile
      // WR1 (Allgemein) has more consistent load from heating/pool
      // WR2 (Wohnungen) has more variable tenant consumption
      const batteryVariation = inverterId === 1 ? -5 : 3;
      startSoc = Math.min(85, Math.max(20, baseSoc + batteryVariation));
    }
    
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
      
      // WR1 (inverterId 1) -> Allgemein (common areas)
      // WR2 (inverterId 2) -> Wohnungen (apartments)
      // PV production split equally (each inverter connected to ~half the panels)
      const pvPerBattery = pv / 2;
      // Consumption assigned based on actual inverter load assignment
      const consumptionPerBattery = inverterId === 1 ? common : house;
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

  // Calculate SOC for each battery independently at the START of the selected hour
  // This represents where we are at the beginning of this hour, before this hour's energy flows
  const battery1SocStart = selectedHour > 0 
    ? calculateHourlySoc(selectedDate, selectedHour - 1, 20, 1)
    : (() => {
        // For midnight (hour 0), get the previous day's final hour (23)
        const previousDay = new Date(selectedDate);
        previousDay.setDate(previousDay.getDate() - 1);
        return calculateHourlySoc(previousDay, 23, 20, 1);
      })();
  const battery2SocStart = selectedHour > 0
    ? calculateHourlySoc(selectedDate, selectedHour - 1, 20, 2)
    : (() => {
        const previousDay = new Date(selectedDate);
        previousDay.setDate(previousDay.getDate() - 1);
        return calculateHourlySoc(previousDay, 23, 20, 2);
      })();
  
  const avgSocStart = (battery1SocStart + battery2SocStart) / 2;
  
  // Calculate total battery energy stored at start of hour
  const battery1EnergyStart = (battery1SocStart / 100) * building.batteries[0].capacityKwh;
  const battery2EnergyStart = (battery2SocStart / 100) * building.batteries[1].capacityKwh;
  const totalBatteryEnergyStart = battery1EnergyStart + battery2EnergyStart;

  // Calculate decision reason for current state using energy management logic
  const totalBatteryCapacity = building.batteries[0].capacityKwh + building.batteries[1].capacityKwh;
  const batteryState: BatteryState = {
    soc: avgSocStart,
    energy: totalBatteryEnergyStart,
    canCharge: ((100 - avgSocStart) / 100) * totalBatteryCapacity,
    canDischarge: Math.max(0, ((avgSocStart - strategyConfig.minSoc) / 100) * totalBatteryCapacity),
  };
  
  const energyFlow = calculateOptimalEnergyFlow(
    pvProduction,
    totalConsumption,
    batteryState,
    selectedHour,
    month,
    strategyConfig
  );
  
  const decisionReason = energyFlow.decisionReason || '';
  
  // Calculate current SOC after this hour's energy flow (for display)
  // Calculate per-battery SOC based on actual loads
  const houseTotalConsumption = tenants.reduce((sum, t) => sum + calculateTenantConsumption(t, selectedHour, dayOfWeek, month), 0);
  const commonAreaConsumption = Object.values(getCommonAreaConsumption(selectedHour, month)).reduce((a: number, b: any) => a + b, 0);
  
  // Battery 1 (WR1) handles common areas, Battery 2 (WR2) handles apartments
  const pvPerBattery = pvProduction / 2;
  const netFlow1 = pvPerBattery - commonAreaConsumption;  // WR1/Battery 1
  const netFlow2 = pvPerBattery - houseTotalConsumption;   // WR2/Battery 2
  
  // Calculate individual battery SOC changes
  let battery1SocChange = 0;
  let battery2SocChange = 0;
  
  if (netFlow1 > 0.05 && battery1SocStart < strategyConfig.maxSoc) {
    const chargeRate = Math.min(netFlow1, strategyConfig.maxChargeRate / 2);
    battery1SocChange = (chargeRate / building.batteries[0].capacityKwh) * 100 * building.efficiency;
  } else if (netFlow1 < -0.05) {
    const isNight = selectedHour >= strategyConfig.nightStart || selectedHour < strategyConfig.nightEnd;
    const shouldDischarge = isNight 
      ? battery1SocStart > strategyConfig.targetNightSoc 
      : battery1SocStart > strategyConfig.minSoc;
    if (shouldDischarge) {
      const dischargeRate = Math.min(Math.abs(netFlow1), strategyConfig.maxDischargeRate / 2);
      battery1SocChange = -(dischargeRate / building.batteries[0].capacityKwh) * 100 / building.efficiency;
    }
  }
  
  if (netFlow2 > 0.05 && battery2SocStart < strategyConfig.maxSoc) {
    const chargeRate = Math.min(netFlow2, strategyConfig.maxChargeRate / 2);
    battery2SocChange = (chargeRate / building.batteries[1].capacityKwh) * 100 * building.efficiency;
  } else if (netFlow2 < -0.05) {
    const isNight = selectedHour >= strategyConfig.nightStart || selectedHour < strategyConfig.nightEnd;
    const shouldDischarge = isNight 
      ? battery2SocStart > strategyConfig.targetNightSoc 
      : battery2SocStart > strategyConfig.minSoc;
    if (shouldDischarge) {
      const dischargeRate = Math.min(Math.abs(netFlow2), strategyConfig.maxDischargeRate / 2);
      battery2SocChange = -(dischargeRate / building.batteries[1].capacityKwh) * 100 / building.efficiency;
    }
  }
  
  // Current SOC after this hour's flow (clamped to valid range)
  const simBattery1Soc = Math.max(0, Math.min(100, battery1SocStart + battery1SocChange));
  const simBattery2Soc = Math.max(0, Math.min(100, battery2SocStart + battery2SocChange));

  // Override with live HA data when active (HA provides single combined SOC)
  const battery1Soc = isLiveActive ? haData!.batterySocPct : simBattery1Soc;
  const battery2Soc = isLiveActive ? haData!.batterySocPct : simBattery2Soc;
  const avgSoc = (battery1Soc + battery2Soc) / 2;
  
  const battery1Energy = (battery1Soc / 100) * building.batteries[0].capacityKwh;
  const battery2Energy = (battery2Soc / 100) * building.batteries[1].capacityKwh;
  const totalBatteryEnergy = battery1Energy + battery2Energy;

  // Calculate battery direction (charging/discharging/idle) with reason
  const getBatteryDirection = (netFlow: number, soc: number): { direction: 'charging' | 'discharging' | 'idle'; reason: string } => {
    const config = strategyConfig;
    const isNight = selectedHour >= config.nightStart || selectedHour < config.nightEnd;
    
    if (netFlow > 0.05 && soc < config.maxSoc) {
      return { direction: 'charging', reason: 'PV-Überschuss vorhanden' };
    } else if (netFlow > 0.05 && soc >= config.maxSoc) {
      return { direction: 'idle', reason: `Batterie bereits voll (${config.maxSoc}%)` };
    } else if (netFlow < -0.05) {
      // Check if battery should be used based on strategy
      const shouldUseBattery = isNight 
        ? soc > config.targetNightSoc 
        : soc > config.minSoc;
      
      if (shouldUseBattery) {
        return { direction: 'discharging', reason: 'Stromdefizit wird ausgeglichen' };
      } else {
        // Battery is too low to discharge
        if (isNight) {
          return { direction: 'idle', reason: `SOC nicht über Nacht-Schwelle (${soc.toFixed(0)}% ≤ ${config.targetNightSoc}%)` };
        } else {
          return { direction: 'idle', reason: `SOC nicht über Minimum (${soc.toFixed(0)}% ≤ ${config.minSoc}%)` };
        }
      }
    } else {
      // Net flow is very small
      return { direction: 'idle', reason: 'Kein nennenswerter Energiefluss' };
    }
  };

  // Use individual battery net flows for accurate direction status
  const battery1Result = getBatteryDirection(netFlow1, battery1Soc);
  const battery2Result = getBatteryDirection(netFlow2, battery2Soc);

  // Override battery direction with live HA data when available
  const liveHaBatteryDirection = (): 'charging' | 'discharging' | 'idle' => {
    if (!isLiveActive || !haData) return battery1Result.direction;
    if (haData.batteryChargeW > 100) return 'charging';
    if (haData.batteryDischargeW > 100) return 'discharging';
    return 'idle';
  };
  const liveHaBatteryReason = (dir: 'charging' | 'discharging' | 'idle'): string => {
    if (dir === 'charging') return 'Live: PV-Überschuss (HA)';
    if (dir === 'discharging') return 'Live: Entladen (HA)';
    return 'Live: Ruhezustand (HA)';
  };

  const liveDir = liveHaBatteryDirection();
  const battery1Direction = isLiveActive ? liveDir : battery1Result.direction;
  const battery2Direction = isLiveActive ? liveDir : battery2Result.direction;
  const battery1Reason = isLiveActive ? liveHaBatteryReason(liveDir) : battery1Result.reason;
  const battery2Reason = isLiveActive ? battery1Reason : battery2Result.reason;

  // Build Sankey data using hierarchical tree
  const sankeyData = useMemo(() => {
    const energyFlow: EnergyFlowData = {
      pvProductionW: pvProduction * W_TO_KW,
      battery1SocPercent: battery1Soc,
      battery2SocPercent: battery2Soc,
      battery1Direction,
      battery2Direction,
      netFlowW: netFlow * W_TO_KW,
    };
    
    return buildSankeyData(consumerTree, sankeyFocusNodeId, energyFlow, showAssumptions);
  }, [consumerTree, sankeyFocusNodeId, pvProduction, battery1Soc, battery2Soc, battery1Direction, battery2Direction, netFlow, showAssumptions]);

  // Get breadcrumb path for current focus
  const breadcrumbPath = useMemo(() => {
    if (!sankeyFocusNodeId) {
      return [consumerTree]; // Root path
    }
    return getBreadcrumbPath(consumerTree, sankeyFocusNodeId);
  }, [consumerTree, sankeyFocusNodeId]);

  // Generate 24-hour data for sparklines - memoized to avoid expensive recalculation on every render
  const { pvData, consumptionData, socData } = useMemo(() => {
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
  }, [building.pvPeakKw, building.efficiency, month, dayOfWeek, selectedDate, tenants]);

  // Calculate hourly grid import/export for cost calculations
  const { hourlyImports, hourlyExports } = useMemo(() => {
    const imports: number[] = [];
    const exports: number[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const pv = pvData[hour];
      const consumption = consumptionData[hour];
      const netFlow = pv - consumption;
      
      // Calculate battery state and behavior for this hour
      const bat1Soc = calculateHourlySoc(selectedDate, hour, 20, 1);
      const bat2Soc = calculateHourlySoc(selectedDate, hour, 20, 2);
      const avgSocAtHour = (bat1Soc + bat2Soc) / 2;
      
      // Determine if battery is charging, discharging, or idle
      const config = strategyConfig;
      const isNight = hour >= config.nightStart || hour < config.nightEnd;
      
      let gridImport = 0;
      let gridExport = 0;
      
      if (netFlow > 0.05) {
        // PV surplus
        if (avgSocAtHour < config.maxSoc) {
          // Battery can charge - calculate how much goes to grid
          const maxBatteryCharge = config.maxChargeRate;
          const batteryCharge = Math.min(netFlow, maxBatteryCharge);
          const surplus = netFlow - batteryCharge;
          gridExport = Math.max(0, surplus);
        } else {
          // Battery full - all surplus to grid
          gridExport = netFlow;
        }
      } else if (netFlow < -0.05) {
        // PV deficit
        const deficit = Math.abs(netFlow);
        const shouldUseBattery = isNight 
          ? avgSocAtHour > config.targetNightSoc 
          : avgSocAtHour > config.minSoc;
        
        if (shouldUseBattery) {
          const maxBatteryDischarge = config.maxDischargeRate;
          const batteryDischarge = Math.min(deficit, maxBatteryDischarge);
          const remainingDeficit = deficit - batteryDischarge;
          gridImport = Math.max(0, remainingDeficit);
        } else {
          // Battery protected - all from grid
          gridImport = deficit;
        }
      }
      
      imports.push(gridImport);
      exports.push(gridExport);
    }
    
    return { hourlyImports: imports, hourlyExports: exports };
  }, [pvData, consumptionData, selectedDate, strategyConfig]);

  // Calculate self-sufficiency rate (Autarkiegrad)
  const selfSufficiency = useMemo(() => {
    const totalConsumption = consumptionData.reduce((sum, c) => sum + c, 0);
    const totalGridImport = hourlyImports.reduce((sum, i) => sum + i, 0);
    
    if (totalConsumption === 0) return 0;
    
    // Self-sufficiency = (Total Consumption - Grid Import) / Total Consumption * 100
    const selfProduced = totalConsumption - totalGridImport;
    return (selfProduced / totalConsumption) * 100;
  }, [consumptionData, hourlyImports]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">

      <div className="sticky top-0 z-50 bg-white shadow-lg">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚡ MFH Gängle 2+4</h1>
              <p className="text-sm text-gray-600">59.8 kWp PV • 2× 20 kWh Batterien • 2× Goodwe GW29.9KN-ET • <span className="text-xs text-gray-500">v{APP_VERSION}</span></p>

            </div>
            <div className="flex items-center gap-3">
              {/* Data source toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setDataSource('live')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    dataSource === 'live'
                      ? 'bg-white text-green-700 shadow font-bold'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Live-Daten von Home Assistant"
                >
                  🟢 Live
                </button>
                <button
                  onClick={() => setDataSource('simulator')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    dataSource === 'simulator'
                      ? 'bg-white text-indigo-700 shadow font-bold'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Simulierte Werte"
                >
                  🧪 Simulator
                </button>
              </div>
              <button
                onClick={() => setIsControlBarExpanded(!isControlBarExpanded)}
                className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
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
          </div>

          {/* Date and Time controls - always visible for mobile optimization */}
          <div className="mt-4 px-4">
            <div className="flex flex-col sm:flex-row gap-4">
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

          {/* Collapsible advanced controls section */}
          <div className={`${isControlBarExpanded ? 'block' : 'hidden'} border-t border-gray-200 mt-4 pt-3 px-4 pb-4`}>
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
              
              {/* Tariff Model Selection */}
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  💰 TARIFMODELL (LKW)
                </label>
                <div className="flex flex-wrap gap-2">
                  {getAllTariffModels().map(tariff => (
                    <button
                      key={tariff.type}
                      onClick={() => setSelectedTariff(tariff.type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedTariff === tariff.type
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={tariff.description}
                    >
                      {tariff.name}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ecoTariff"
                    checked={useEcoTariff}
                    onChange={(e) => setUseEcoTariff(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="ecoTariff" className="text-xs text-gray-600">
                    🌿 Naturstrom (+5 Rp./kWh)
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* HA Live / Simulator status banner */}
        <HaStatusBanner
          mode={dataSource}
          liveData={haData}
          isLoading={haLoading}
          hasError={haError !== null}
          errorMessage={haError ?? undefined}
          isFallback={haFallback}
          isStale={isHaStale}
        />

        {/* Live HA KPI summary when live data is available */}
        {isLiveActive && haData && (
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: 'PV', value: (haData.pvPowerW / W_TO_KW).toFixed(1), unit: 'kW', cardCls: 'border-orange-200', valCls: 'text-orange-600' },
              { label: 'Last', value: (haData.houseLoadW / W_TO_KW).toFixed(1), unit: 'kW', cardCls: 'border-red-200', valCls: 'text-red-600' },
              { label: 'Netz-Bezug', value: (haData.gridImportW / W_TO_KW).toFixed(1), unit: 'kW', cardCls: 'border-gray-200', valCls: 'text-gray-600' },
              { label: 'Netz-Einsp.', value: (haData.gridExportW / W_TO_KW).toFixed(1), unit: 'kW', cardCls: 'border-green-200', valCls: 'text-green-600' },
              { label: 'Bat. SOC', value: haData.batterySocPct.toFixed(0), unit: '%', cardCls: 'border-purple-200', valCls: 'text-purple-600' },
              { label: 'PV heute', value: haData.pvTodayKwh.toFixed(1), unit: 'kWh', cardCls: 'border-yellow-200', valCls: 'text-yellow-600' },
            ].map(({ label, value, unit, cardCls, valCls }) => (
              <div key={label} className={`bg-white border ${cardCls} rounded-lg p-2 text-center shadow-sm`}>
                <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{label}</div>
                <div className={`text-lg font-bold ${valCls}`}>{value}</div>
                <div className="text-[10px] text-gray-400">{unit}</div>
              </div>
            ))}
          </div>
        )}

        {/* Data Context Banner (simulator only) */}
        {!isLiveActive && <DataContextBanner selectedDate={selectedDate} selectedHour={selectedHour} />}

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
          strategyConfig={strategyConfig}
          inverterPowerKw={building.inverterPowerKw}
          pvPeakKw={building.pvPeakKw}
          decisionReason={decisionReason}
        />

        {/* Cost Overview */}
        <CostOverview
          selectedDate={selectedDate}
          hourlyImports={hourlyImports}
          hourlyExports={hourlyExports}
          selectedTariff={selectedTariff}
          useEco={useEcoTariff}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-orange-400">
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-600 flex items-center">
              ☀️ PV-LEISTUNG
              <InfoTooltip text="Aktuelle Photovoltaik-Produktionsleistung (kW = Kilowatt) basierend auf Tageszeit, Monat, Wetter und installierter Leistung (59.8 kWp - Arres 3.2 / Premium L Module). Berechnet mit realistischen Sonnenauf-/untergangszeiten und Bewölkungsfaktoren. kW ist eine Momentanleistung - über eine Stunde ergibt sich daraus die Energie in kWh (Kilowattstunden)." />
            </h3>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600 mt-1 md:mt-2">{pvProduction.toFixed(1)} <span className="text-xs sm:text-sm">kW</span></p>
            <div className="mt-1 text-[9px] sm:text-[10px] text-gray-600">
              <span className="font-semibold">Momentanleistung</span>
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
              <span className="font-semibold">Momentanleistung</span>
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
              {netFlow > 0 ? '⚡ ÜBERSCHUSS' : '📊 DEFIZIT'}
              <InfoTooltip text={netFlow > 0 ? 'PV-Überschuss: Energie, die in Batterien geladen oder ins Netz eingespeist wird. Berechnung: PV-Produktion minus Verbrauch.' : 'Energie-Defizit: Fehlende Energie wird aus Batterien oder vom Netz bezogen. Berechnung: Verbrauch minus PV-Produktion.'} />
            </h3>
            <p className={`text-xl sm:text-2xl md:text-3xl font-bold mt-1 md:mt-2 ${netFlow > 0 ? 'text-green-600' : 'text-gray-600'}`}>{Math.abs(netFlow).toFixed(1)} <span className="text-xs sm:text-sm">kW</span></p>
            <div className="mt-1 text-[9px] sm:text-[10px] text-gray-600">
              <span className="font-semibold">{netFlow > 0 ? 'PV − Verbrauch' : 'Verbrauch − PV'}</span>
            </div>
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

          <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg shadow p-2 sm:p-3 md:p-4 border-l-4 border-green-500">
            <h3 className="text-[10px] sm:text-xs font-bold text-gray-600 flex items-center">
              🌱 AUTARKIEGRAD
              <InfoTooltip text="Autarkiegrad (Selbstversorgungsgrad) über 24 Stunden. Zeigt, wie viel Prozent des Strombedarfs aus eigener PV-Produktion und Batteriespeicher gedeckt wird. 100% = vollständig autark, 0% = komplett netzabhängig. Formel: ((Verbrauch - Netzbezug) / Verbrauch) × 100" />
            </h3>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600 mt-1 md:mt-2">{selfSufficiency.toFixed(1)} <span className="text-xs sm:text-sm">%</span></p>
            <div className="mt-1 text-[9px] sm:text-[10px] text-gray-600">
              <span className="font-semibold">24h Durchschnitt</span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, selfSufficiency))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Detaillierte Verbrauchsübersicht */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
          <div className="bg-white rounded-lg shadow p-2 md:p-3">
            <h3 className="text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">👨‍👩‍👧‍👦 Graf (VW ID4)</h3>
            <div className="text-[10px] md:text-xs text-gray-600 space-y-0.5 md:space-y-1">
              <div className="flex justify-between">
                <span>Haushalt:</span>
                <span className="font-semibold">{calculateTenantConsumption(tenants[0], selectedHour, dayOfWeek, month).toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between">
                <span>🚗 VW ID4 laden:</span>
                <span className="font-semibold">{(() => {
                  // EV charging: Realistic 11kW AC charging during evening hours (18-22)
                  const isChargingWindow = selectedHour >= 18 && selectedHour <= 22;
                  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
                  return isChargingWindow && isWeekday ? '11.0' : '0.0';
                })()} kW</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-red-600">{(() => {
                  const household = calculateTenantConsumption(tenants[0], selectedHour, dayOfWeek, month);
                  const isChargingWindow = selectedHour >= 18 && selectedHour <= 22;
                  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
                  const evCharging = isChargingWindow && isWeekday ? 11.0 : 0.0;
                  return (household + evCharging).toFixed(2);
                })()} kW</span>
              </div>
              <div className="text-[9px] text-gray-500 mt-1">4 Personen, 140m² • 🔥 Kachelofen</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-2 md:p-3">
            <h3 className="text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">👨‍👩‍👧‍👦 Wetli (Tesla M3)</h3>
            <div className="text-[10px] md:text-xs text-gray-600 space-y-0.5 md:space-y-1">
              <div className="flex justify-between">
                <span>Haushalt:</span>
                <span className="font-semibold">{calculateTenantConsumption(tenants[1], selectedHour, dayOfWeek, month).toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between">
                <span>🚗 Tesla laden:</span>
                <span className="font-semibold">{(() => {
                  // EV charging: Realistic 11kW AC charging, evening hours, longer commute means more frequent charging
                  const isChargingWindow = selectedHour >= 19 && selectedHour <= 23;
                  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
                  return isChargingWindow && isWeekday ? '11.0' : '0.0';
                })()} kW</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-red-600">{(() => {
                  const household = calculateTenantConsumption(tenants[1], selectedHour, dayOfWeek, month);
                  const isChargingWindow = selectedHour >= 19 && selectedHour <= 23;
                  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
                  const evCharging = isChargingWindow && isWeekday ? 11.0 : 0.0;
                  return (household + evCharging).toFixed(2);
                })()} kW</span>
              </div>
              <div className="text-[9px] text-gray-500 mt-1">4 Personen, 140m² • Längster Arbeitsweg</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-2 md:p-3">
            <h3 className="text-xs md:text-sm font-bold text-gray-700 mb-1 md:mb-2">👴👵 Bürzle (Porsche)</h3>
            <div className="text-[10px] md:text-xs text-gray-600 space-y-0.5 md:space-y-1">
              <div className="flex justify-between">
                <span>Haushalt:</span>
                <span className="font-semibold">{calculateTenantConsumption(tenants[2], selectedHour, dayOfWeek, month).toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between">
                <span>🚗 Porsche laden:</span>
                <span className="font-semibold">{(() => {
                  // Hybrid: Less frequent charging, lighter usage (retired, shorter trips)
                  const isChargingWindow = selectedHour >= 20 && selectedHour <= 22;
                  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
                  // Hybrid charges at lower power, less frequently
                  return isChargingWindow && isWeekday && (selectedDate.getDate() % 3 === 0) ? '3.7' : '0.0';
                })()} kW</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-red-600">{(() => {
                  const household = calculateTenantConsumption(tenants[2], selectedHour, dayOfWeek, month);
                  const isChargingWindow = selectedHour >= 20 && selectedHour <= 22;
                  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
                  const evCharging = isChargingWindow && isWeekday && (selectedDate.getDate() % 3 === 0) ? 3.7 : 0.0;
                  return (household + evCharging).toFixed(2);
                })()} kW</span>
              </div>
              <div className="text-[9px] text-gray-500 mt-1">2 Personen, 200m²</div>
            </div>
          </div>
        </div>

        {/* Shared Loads Explanation */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-lg shadow p-3 mb-4 md:mb-6">
          <div className="flex items-start gap-2">
            <span className="text-xl">🏢</span>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-amber-900 mb-2 flex items-center">
                Gemeinschaftslasten (Shared Loads)
                <InfoTooltip text="Diese Lasten werden vom Gebäude verursacht und sind nicht in den individuellen Wohnpartei-Totals enthalten. Sie machen den Großteil des Gesamtverbrauchs aus." />
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="bg-white rounded p-2">
                  <div className="text-[10px] text-gray-600">Heizung</div>
                  <div className="font-bold text-orange-600">{commonAreaData.heating.toFixed(1)} kW</div>
                </div>
                <div className="bg-white rounded p-2">
                  <div className="text-[10px] text-gray-600">Pool</div>
                  <div className="font-bold text-blue-600">{commonAreaData.pool.toFixed(1)} kW</div>
                </div>
                <div className="bg-white rounded p-2">
                  <div className="text-[10px] text-gray-600">Garage</div>
                  <div className="font-bold text-gray-600">{commonAreaData.garage.toFixed(1)} kW</div>
                </div>
                <div className="bg-white rounded p-2">
                  <div className="text-[10px] text-gray-600">Boiler</div>
                  <div className="font-bold text-red-600">{commonAreaData.boiler.toFixed(1)} kW</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-amber-900 bg-white/50 rounded p-2">
                <div className="flex justify-between">
                  <span>Wohnparteien Total:</span>
                  <span className="font-semibold">{houseConsumption.toFixed(1)} kW</span>
                </div>
                <div className="flex justify-between">
                  <span>Gemeinschaftslasten Total:</span>
                  <span className="font-semibold">{commonConsumption.toFixed(1)} kW</span>
                </div>
                <div className="flex justify-between border-t border-amber-200 pt-1 mt-1">
                  <span className="font-bold">Gesamtverbrauch:</span>
                  <span className="font-bold text-red-600">{totalConsumption.toFixed(1)} kW</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-2 md:p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2 md:mb-3 flex-wrap gap-2">
              <h2 className="text-sm md:text-lg font-bold">⚡ Energiefluss</h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs md:text-sm">
                  <input
                    type="checkbox"
                    checked={showAssumptions}
                    onChange={(e) => {
                      setShowAssumptions(e.target.checked);
                      // Reset to root when toggling assumptions
                      if (!e.target.checked) {
                        setSankeyFocusNodeId(null);
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700 font-medium">Annahmen anzeigen</span>
                  <InfoTooltip text="Wenn aktiviert, werden angenommene Verbraucher-Details basierend auf Durchschnittswerten angezeigt. Wenn deaktiviert, werden nur gemessene/simulierte Werte gezeigt." />
                </label>
                <button
                  onClick={() => setSankeyFocusNodeId(null)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium text-gray-700"
                  aria-label="Zur Übersicht zurückkehren"
                >
                  🏠 Übersicht
                </button>
              </div>
            </div>
            
            {/* Breadcrumb Navigation */}
            <SankeyBreadcrumb 
              path={breadcrumbPath}
              onNavigate={(nodeId) => setSankeyFocusNodeId(nodeId)}
            />
            
            <div className="w-full">
              <SankeyChart 
                data={sankeyData}
                onNodeClick={(nodeId) => {
                  // Handle node click for drill-down
                  // Only drill down into group nodes (apartments, shared, or specific consumers)
                  if (nodeId && nodeId !== 'pv' && nodeId !== 'grid' && !nodeId.includes('bat')) {
                    setSankeyFocusNodeId(nodeId);
                  }
                }}
                minHeight={250}
              />
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
                reason={battery1Reason}
              />
              <SocBar 
                label="Wechselrichter 2" 
                soc={battery2Soc} 
                capacity={building.batteries[1].capacityKwh}
                direction={battery2Direction}
                reason={battery2Reason}
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
            <p className="text-[10px] md:text-xs text-gray-600 mb-2">Konfigurierte Jahresverbräuche (Eingabewerte):</p>
            <div className="space-y-1 md:space-y-2">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex justify-between p-1.5 md:p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-bold text-xs md:text-sm">{tenant.name}</p>
                    <p className="text-[10px] md:text-xs text-gray-600">{tenant.livingAreaSqm}m² • {tenant.householdSize} Pers.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs md:text-sm font-bold">{tenant.consumption} kWh/a</p>
                    <p className="text-[10px] text-gray-500">Konfiguration</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 md:p-4">
            <h2 className="text-sm md:text-lg font-bold mb-2 md:mb-3">🏢 Gebäude</h2>
            <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
              <p><span className="font-bold">PV:</span> {building.pvPeakKw} kWp {building.pvModel && `(${building.pvModel})`}</p>
              <p><span className="font-bold">Batterie:</span> {building.capacity} kWh (2× {building.batteries[0].capacityKwh} kWh) {building.batteries[0].manufacturer && `- ${building.batteries[0].manufacturer} ${building.batteries[0].model}`}</p>
              <p><span className="font-bold">System-Effizienz:</span> {(building.efficiency * 100).toFixed(0)}% <span className="text-[10px] text-gray-600">(Wechselrichter & Batterie)</span></p>
              {building.inverters && building.inverters.length > 0 ? (
                <div>
                  <p className="font-bold">Wechselrichter:</p>
                  {building.inverters.map((inv, idx) => (
                    <p key={inv.id} className="ml-2 text-[11px] md:text-xs">
                      • WR{idx + 1}: {inv.manufacturer} {inv.model} ({inv.powerKw} kW) - {inv.id === 1 ? 'Allgemein' : 'Wohnungen'}
                    </p>
                  ))}
                </div>
              ) : (
                <p><span className="font-bold">Wechselrichter:</span> {building.numInverters}× {building.inverterPowerKw} kW</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Issue Report Button */}
      <IssueReportButton />
    </div>
  );
}
