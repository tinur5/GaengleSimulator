// Raw Home Assistant entity state as returned by the REST API
export interface HaEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

// Normalized dashboard payload returned by /api/ha/overview
export interface HaOverviewPayload {
  timestamp: string;

  // Live power (W)
  pvPowerW: number;
  batteryPowerW: number;          // signed net battery power (positive = charging)
  batteryChargeW: number;         // explicit positive-only charging power
  batteryDischargeW: number;      // explicit positive-only discharging power
  gridImportW: number;
  gridExportW: number;
  houseLoadW: number;

  // Battery SOC – optional (null when sensor is unavailable)
  batterySocPct: number | null;

  // Status strings from HA
  batteryStatus: string;          // sensor.battery_status_clean
  energyStatus: string;           // sensor.energie_status

  // Live percentages from HA
  autarkyPct: number;             // sensor.autarkiegrad_aktuell
  selfConsumptionPct: number;     // sensor.eigenverbrauch_aktuell

  // Energy totals (lifetime / all-time cumulative kWh)
  pvTotalKwh: number;
  batteryChargeTotalKwh: number;
  batteryDischargeTotalKwh: number;
  gridImportTotalKwh: number;
  gridExportTotalKwh: number;

  // Price / cost (CHF)
  currentSpotPriceChfKwh: number;
  totalGridPriceChfKwh: number;
  gridCostRateChfH: number;
  estimatedMonthlyGridCostChf: number;

  source: 'home-assistant';

  // Warnings for missing optional entities
  warnings: string[];
}

// KPI card data for UI display
export interface HaKpiCard {
  label: string;
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
}

// Power flow snapshot for visualization
export interface HaPowerFlow {
  pvPowerW: number;
  batteryChargeW: number;
  batteryDischargeW: number;
  gridImportW: number;
  gridExportW: number;
  houseLoadW: number;
}

// Chart series data point
export interface HaChartSeries {
  label: string;
  data: number[];
  color?: string;
}

// Structured error response from /api/ha/overview
export interface HaErrorResponse {
  error: string;
  code: 'ha_unavailable' | 'ha_auth' | 'ha_timeout' | 'unknown';
  timestamp: string;
}

// Combined API response (success or error)
export type HaApiResponse = HaOverviewPayload | HaErrorResponse;

// Helper type guard
export function isHaError(res: HaApiResponse): res is HaErrorResponse {
  return 'error' in res;
}
