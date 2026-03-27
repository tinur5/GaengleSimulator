import { HaEntityState, HaOverviewPayload } from '../types/homeAssistant';

// ---------------------------------------------------------------------------
// Entity ID constants – single place to change sensor names
// ---------------------------------------------------------------------------
export const HA_ENTITY_IDS = {
  pvPower: 'sensor.dashboard_pv_power_total',
  batteryPower: 'sensor.dashboard_battery_power',
  batterySoc: 'sensor.dashboard_battery_soc',
  gridImport: 'sensor.dashboard_grid_import_power',
  gridExport: 'sensor.dashboard_grid_export_power',
  houseLoad: 'sensor.dashboard_house_load_power',
  pvToday: 'sensor.dashboard_pv_energy_today',
  importToday: 'sensor.dashboard_grid_import_energy_today',
  exportToday: 'sensor.dashboard_grid_export_energy_today',
  batteryChargeToday: 'sensor.dashboard_battery_charge_energy_today',
  batteryDischargeToday: 'sensor.dashboard_battery_discharge_energy_today',
} as const;

/** All entity IDs as an ordered array – used for parallel fetching */
export const HA_ENTITY_ID_LIST: string[] = Object.values(HA_ENTITY_IDS);

// ---------------------------------------------------------------------------
// Safe numeric parsing
// ---------------------------------------------------------------------------

const INVALID_STATES = new Set(['unknown', 'unavailable', '', 'null', 'undefined', 'nan']);

/**
 * Safely converts a Home Assistant state string to a number.
 * Returns NaN for unavailable / unknown / empty values.
 */
export function parseHaFloat(state: string | null | undefined): number {
  if (state == null) return NaN;
  const trimmed = state.trim();
  if (INVALID_STATES.has(trimmed.toLowerCase())) return NaN;
  const num = parseFloat(trimmed);
  return isNaN(num) ? NaN : num;
}

/**
 * Same as parseHaFloat but returns a fallback value instead of NaN.
 */
export function parseHaFloatOr(state: string | null | undefined, fallback: number): number {
  const val = parseHaFloat(state);
  return isNaN(val) ? fallback : val;
}

// ---------------------------------------------------------------------------
// Entity-map → payload mapper
// ---------------------------------------------------------------------------

/**
 * Maps a Record<entityId, HaEntityState> to a normalized HaOverviewPayload.
 * Invalid / unavailable sensor values default to 0.
 */
export function mapHaStatesToOverview(
  states: Record<string, HaEntityState>,
): HaOverviewPayload {
  const ids = HA_ENTITY_IDS;

  const pvPowerW = parseHaFloatOr(states[ids.pvPower]?.state, 0);
  const batteryPowerW = parseHaFloatOr(states[ids.batteryPower]?.state, 0);
  const batterySocPct = parseHaFloatOr(states[ids.batterySoc]?.state, 0);

  // Grid: import and export must never both be positive – guard defensively
  const rawImportW = parseHaFloatOr(states[ids.gridImport]?.state, 0);
  const rawExportW = parseHaFloatOr(states[ids.gridExport]?.state, 0);
  const gridImportW = Math.max(0, rawImportW);
  const gridExportW = Math.max(0, rawExportW);

  const houseLoadW = parseHaFloatOr(states[ids.houseLoad]?.state, 0);
  const pvTodayKwh = parseHaFloatOr(states[ids.pvToday]?.state, 0);
  const importTodayKwh = parseHaFloatOr(states[ids.importToday]?.state, 0);
  const exportTodayKwh = parseHaFloatOr(states[ids.exportToday]?.state, 0);
  const batteryChargeTodayKwh = parseHaFloatOr(states[ids.batteryChargeToday]?.state, 0);
  const batteryDischargeTodayKwh = parseHaFloatOr(states[ids.batteryDischargeToday]?.state, 0);

  // Determine system status from latest updated entity
  const systemStatus = deriveSystemStatus(pvPowerW, batteryPowerW, gridImportW, gridExportW);

  // Derived convenience fields
  const batteryChargeW = Math.max(batteryPowerW, 0);
  const batteryDischargeW = Math.max(-batteryPowerW, 0);

  // Use the most recent last_updated timestamp across all entities
  const timestamps = Object.values(states)
    .map((s) => s?.last_updated)
    .filter(Boolean);
  const timestamp =
    timestamps.length > 0
      ? new Date(Math.max(...timestamps.map((t) => new Date(t).getTime()))).toISOString()
      : new Date().toISOString();

  return {
    timestamp,
    pvPowerW,
    batteryPowerW,
    batterySocPct,
    gridImportW,
    gridExportW,
    houseLoadW,
    pvTodayKwh,
    importTodayKwh,
    exportTodayKwh,
    batteryChargeTodayKwh,
    batteryDischargeTodayKwh,
    systemStatus,
    source: 'home-assistant',
    batteryChargeW,
    batteryDischargeW,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveSystemStatus(
  pvPowerW: number,
  batteryPowerW: number,
  gridImportW: number,
  gridExportW: number,
): string {
  if (pvPowerW > 100 && batteryPowerW > 100) return 'Charging';
  if (pvPowerW > 100 && gridExportW > 100) return 'Exporting';
  if (pvPowerW > 100) return 'Self-consuming';
  if (batteryPowerW < -100) return 'Battery discharge';
  if (gridImportW > 100) return 'Grid import';
  return 'Idle';
}
