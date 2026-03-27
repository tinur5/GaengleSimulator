import { HaEntityState, HaOverviewPayload } from '../types/homeAssistant';

// ---------------------------------------------------------------------------
// Entity ID constants – single place to change sensor names
// ---------------------------------------------------------------------------

/**
 * Real Home Assistant sensor entity IDs used by this installation.
 * Required entities return 0 on unavailability; optional ones are annotated.
 */
export const HA_ENTITY_IDS = {
  // --- Live power (W) ---
  pvPower:          'sensor.pv_power_raw_combined',
  batteryPower:     'sensor.battery_power_raw_combined',
  gridActivePower:  'sensor.grid_active_power_raw_combined',
  gridImport:       'sensor.netzbezug_leistung',
  gridExport:       'sensor.netzeinspeisung_leistung',
  batteryCharge:    'sensor.battery_charge_power',
  batteryDischarge: 'sensor.battery_discharge_power',
  houseLoad:        'sensor.hausverbrauch_berechnet',

  // --- Status / percentages ---
  batteryStatus:    'sensor.battery_status_clean',
  autarky:          'sensor.autarkiegrad_aktuell',
  selfConsumption:  'sensor.eigenverbrauch_aktuell',
  energyStatus:     'sensor.energie_status',

  // --- Energy totals (kWh, lifetime) ---
  pvTotal:              'sensor.pv_total_generation_combined',
  batteryChargeTotal:   'sensor.battery_total_charge_combined',
  batteryDischargeTotal: 'sensor.battery_total_discharge_combined',
  gridImportTotal:      'sensor.goodwe_meter_total_energy_import',
  gridExportTotal:      'sensor.goodwe_meter_total_energy_export',

  // --- Price / cost (CHF) ---
  currentSpotPrice:          'sensor.epex_spot_ch_chf_kwh',
  totalGridPrice:            'sensor.lkw_netzbezug_gesamtpreis_chf_kwh',
  gridCostRate:              'sensor.lkw_netzbezug_kostenrate_chf_h',
  estimatedMonthlyGridCost:  'sensor.lkw_netzbezug_kosten_monat_geschaetzt_chf',
} as const;

/** All entity IDs as an ordered array – used for parallel fetching */
export const HA_ENTITY_ID_LIST: string[] = Object.values(HA_ENTITY_IDS);

// ---------------------------------------------------------------------------
// Safe numeric / string parsing
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

/**
 * Returns the HA state string when it is a valid (non-unavailable) value,
 * or a fallback string otherwise.
 */
export function parseHaString(
  state: string | null | undefined,
  fallback = '',
): string {
  if (state == null) return fallback;
  const trimmed = state.trim();
  if (INVALID_STATES.has(trimmed.toLowerCase())) return fallback;
  return trimmed;
}

// ---------------------------------------------------------------------------
// Entity-map → payload mapper
// ---------------------------------------------------------------------------

/**
 * Maps a Record<entityId, HaEntityState> to a normalized HaOverviewPayload.
 *
 * - Required sensor values default to 0 when unavailable.
 * - Optional sensor values (batterySocPct, price fields) return null / 0 and
 *   append an entry to the warnings array.
 * - fetchWarnings (from the HTTP fetch phase) are merged into the final
 *   warnings array so the caller only has to look in one place.
 */
export function mapHaStatesToOverview(
  states: Record<string, HaEntityState>,
  fetchWarnings: string[] = [],
): HaOverviewPayload {
  const ids = HA_ENTITY_IDS;
  const warnings: string[] = [...fetchWarnings];

  // --- Live power ---
  const pvPowerW    = parseHaFloatOr(states[ids.pvPower]?.state, 0);
  const batteryPowerW = parseHaFloatOr(states[ids.batteryPower]?.state, 0);

  // Grid: prefer explicit import/export sensors; clamp to ≥ 0
  const gridImportW  = Math.max(0, parseHaFloatOr(states[ids.gridImport]?.state, 0));
  const gridExportW  = Math.max(0, parseHaFloatOr(states[ids.gridExport]?.state, 0));

  const houseLoadW = parseHaFloatOr(states[ids.houseLoad]?.state, 0);

  // Battery charge/discharge: prefer explicit sensors, fall back to net power
  const rawChargeW    = parseHaFloat(states[ids.batteryCharge]?.state);
  const rawDischargeW = parseHaFloat(states[ids.batteryDischarge]?.state);
  const batteryChargeW    = isNaN(rawChargeW)    ? Math.max(batteryPowerW, 0)  : Math.max(0, rawChargeW);
  const batteryDischargeW = isNaN(rawDischargeW) ? Math.max(-batteryPowerW, 0) : Math.max(0, rawDischargeW);

  // --- Battery SOC (optional) ---
  // No confirmed direct SOC entity exists in this installation.
  // When a real entity is available, add it to HA_ENTITY_IDS.batterySoc and
  // replace the null below with: parseHaFloat(states[ids.batterySoc]?.state) ?? null
  const batterySocPct: number | null = null;

  // --- Status strings ---
  const batteryStatus = parseHaString(states[ids.batteryStatus]?.state, '');
  const energyStatus  = parseHaString(states[ids.energyStatus]?.state, '');

  // --- Live percentages ---
  const autarkyPct         = parseHaFloatOr(states[ids.autarky]?.state, 0);
  const selfConsumptionPct = parseHaFloatOr(states[ids.selfConsumption]?.state, 0);

  // --- Energy totals ---
  const pvTotalKwh              = parseHaFloatOr(states[ids.pvTotal]?.state, 0);
  const batteryChargeTotalKwh   = parseHaFloatOr(states[ids.batteryChargeTotal]?.state, 0);
  const batteryDischargeTotalKwh = parseHaFloatOr(states[ids.batteryDischargeTotal]?.state, 0);
  const gridImportTotalKwh      = parseHaFloatOr(states[ids.gridImportTotal]?.state, 0);
  const gridExportTotalKwh      = parseHaFloatOr(states[ids.gridExportTotal]?.state, 0);

  // --- Price / cost (optional) ---
  const rawSpot = parseHaFloat(states[ids.currentSpotPrice]?.state);
  if (isNaN(rawSpot)) {
    warnings.push(`${ids.currentSpotPrice}: sensor unavailable – currentSpotPriceChfKwh set to 0`);
  }
  const currentSpotPriceChfKwh = isNaN(rawSpot) ? 0 : rawSpot;

  const rawTotalPrice = parseHaFloat(states[ids.totalGridPrice]?.state);
  if (isNaN(rawTotalPrice)) {
    warnings.push(`${ids.totalGridPrice}: sensor unavailable – totalGridPriceChfKwh set to 0`);
  }
  const totalGridPriceChfKwh = isNaN(rawTotalPrice) ? 0 : rawTotalPrice;

  const rawCostRate = parseHaFloat(states[ids.gridCostRate]?.state);
  if (isNaN(rawCostRate)) {
    warnings.push(`${ids.gridCostRate}: sensor unavailable – gridCostRateChfH set to 0`);
  }
  const gridCostRateChfH = isNaN(rawCostRate) ? 0 : rawCostRate;

  const rawMonthly = parseHaFloat(states[ids.estimatedMonthlyGridCost]?.state);
  if (isNaN(rawMonthly)) {
    warnings.push(`${ids.estimatedMonthlyGridCost}: sensor unavailable – estimatedMonthlyGridCostChf set to 0`);
  }
  const estimatedMonthlyGridCostChf = isNaN(rawMonthly) ? 0 : rawMonthly;

  // Battery SOC warning (always, since no SOC entity is mapped)
  warnings.push('Battery SOC sensor not mapped – batterySocPct returned as null');

  // --- Timestamp: most recent last_updated across all entities ---
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
    batteryChargeW,
    batteryDischargeW,
    gridImportW,
    gridExportW,
    houseLoadW,
    batterySocPct,
    batteryStatus,
    energyStatus,
    autarkyPct,
    selfConsumptionPct,
    pvTotalKwh,
    batteryChargeTotalKwh,
    batteryDischargeTotalKwh,
    gridImportTotalKwh,
    gridExportTotalKwh,
    currentSpotPriceChfKwh,
    totalGridPriceChfKwh,
    gridCostRateChfH,
    estimatedMonthlyGridCostChf,
    source: 'home-assistant',
    warnings,
  };
}
