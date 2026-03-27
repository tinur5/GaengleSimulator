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
  pvPowerW: number;
  batteryPowerW: number;       // positive = charging, negative = discharging
  batterySocPct: number;
  gridImportW: number;
  gridExportW: number;
  houseLoadW: number;
  pvTodayKwh: number;
  importTodayKwh: number;
  exportTodayKwh: number;
  batteryChargeTodayKwh: number;
  batteryDischargeTodayKwh: number;
  systemStatus: string;
  source: 'home-assistant';
  // Derived convenience fields
  batteryChargeW: number;      // max(batteryPowerW, 0)
  batteryDischargeW: number;   // max(-batteryPowerW, 0)
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
