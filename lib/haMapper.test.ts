/**
 * Simple inline tests for haMapper normalization logic.
 * Run with: npx tsx lib/haMapper.test.ts
 *
 * No external test framework required – uses Node's built-in assert.
 */
import assert from 'assert';
import { parseHaFloat, parseHaFloatOr, mapHaStatesToOverview } from './haMapper';
import { HaEntityState } from '../types/homeAssistant';

// ---------------------------------------------------------------------------
// parseHaFloat
// ---------------------------------------------------------------------------
assert.ok(isNaN(parseHaFloat(null)), 'null → NaN');
assert.ok(isNaN(parseHaFloat(undefined)), 'undefined → NaN');
assert.ok(isNaN(parseHaFloat('')), 'empty string → NaN');
assert.ok(isNaN(parseHaFloat('unknown')), '"unknown" → NaN');
assert.ok(isNaN(parseHaFloat('unavailable')), '"unavailable" → NaN');
assert.ok(isNaN(parseHaFloat('UNKNOWN')), '"UNKNOWN" case-insensitive → NaN');
assert.strictEqual(parseHaFloat('3500'), 3500, 'numeric string → number');
assert.strictEqual(parseHaFloat('  42.5  '), 42.5, 'trimmed string → number');
assert.strictEqual(parseHaFloat('-100'), -100, 'negative value');

// ---------------------------------------------------------------------------
// parseHaFloatOr
// ---------------------------------------------------------------------------
assert.strictEqual(parseHaFloatOr('unavailable', 99), 99, 'unavailable → fallback');
assert.strictEqual(parseHaFloatOr('0', 99), 0, '"0" → 0 (not fallback)');
assert.strictEqual(parseHaFloatOr(null, 5), 5, 'null → fallback');

// ---------------------------------------------------------------------------
// mapHaStatesToOverview – real entity IDs
// ---------------------------------------------------------------------------
function makeState(entity_id: string, state: string): HaEntityState {
  return {
    entity_id,
    state,
    attributes: {},
    last_changed: '2026-01-01T12:00:00Z',
    last_updated: '2026-01-01T12:00:00Z',
  };
}

const states: Record<string, HaEntityState> = {
  'sensor.pv_power_raw_combined':           makeState('sensor.pv_power_raw_combined', '5000'),
  'sensor.battery_power_raw_combined':      makeState('sensor.battery_power_raw_combined', '-1500'),
  'sensor.grid_active_power_raw_combined':  makeState('sensor.grid_active_power_raw_combined', '-3200'),
  'sensor.netzbezug_leistung':              makeState('sensor.netzbezug_leistung', '0'),
  'sensor.netzeinspeisung_leistung':        makeState('sensor.netzeinspeisung_leistung', '3200'),
  'sensor.battery_charge_power':            makeState('sensor.battery_charge_power', '0'),
  'sensor.battery_discharge_power':         makeState('sensor.battery_discharge_power', '1500'),
  'sensor.hausverbrauch_berechnet':         makeState('sensor.hausverbrauch_berechnet', '1800'),
  'sensor.battery_status_clean':            makeState('sensor.battery_status_clean', 'Entladen'),
  'sensor.autarkiegrad_aktuell':            makeState('sensor.autarkiegrad_aktuell', '92.5'),
  'sensor.eigenverbrauch_aktuell':          makeState('sensor.eigenverbrauch_aktuell', '36.0'),
  'sensor.energie_status':                  makeState('sensor.energie_status', 'Überschuss'),
  'sensor.pv_total_generation_combined':    makeState('sensor.pv_total_generation_combined', '12345.6'),
  'sensor.battery_total_charge_combined':   makeState('sensor.battery_total_charge_combined', '3000.0'),
  'sensor.battery_total_discharge_combined': makeState('sensor.battery_total_discharge_combined', '2800.0'),
  'sensor.goodwe_meter_total_energy_import': makeState('sensor.goodwe_meter_total_energy_import', '500.0'),
  'sensor.goodwe_meter_total_energy_export': makeState('sensor.goodwe_meter_total_energy_export', '8000.0'),
  'sensor.epex_spot_ch_chf_kwh':            makeState('sensor.epex_spot_ch_chf_kwh', '0.085'),
  'sensor.lkw_netzbezug_gesamtpreis_chf_kwh': makeState('sensor.lkw_netzbezug_gesamtpreis_chf_kwh', '0.242'),
  'sensor.lkw_netzbezug_kostenrate_chf_h':  makeState('sensor.lkw_netzbezug_kostenrate_chf_h', '0.0'),
  'sensor.lkw_netzbezug_kosten_monat_geschaetzt_chf': makeState('sensor.lkw_netzbezug_kosten_monat_geschaetzt_chf', '12.50'),
};

const payload = mapHaStatesToOverview(states);

assert.strictEqual(payload.pvPowerW, 5000, 'pvPowerW');
assert.strictEqual(payload.batteryPowerW, -1500, 'batteryPowerW (negative = discharging)');
// Explicit discharge sensor is preferred over deriving from net power
assert.strictEqual(payload.batteryChargeW, 0, 'batteryChargeW from explicit sensor');
assert.strictEqual(payload.batteryDischargeW, 1500, 'batteryDischargeW from explicit sensor');
assert.strictEqual(payload.gridImportW, 0, 'gridImportW');
assert.strictEqual(payload.gridExportW, 3200, 'gridExportW');
assert.strictEqual(payload.houseLoadW, 1800, 'houseLoadW');
assert.strictEqual(payload.batteryStatus, 'Entladen', 'batteryStatus');
assert.strictEqual(payload.autarkyPct, 92.5, 'autarkyPct');
assert.strictEqual(payload.selfConsumptionPct, 36.0, 'selfConsumptionPct');
assert.strictEqual(payload.energyStatus, 'Überschuss', 'energyStatus');
assert.strictEqual(payload.pvTotalKwh, 12345.6, 'pvTotalKwh');
assert.strictEqual(payload.batteryChargeTotalKwh, 3000.0, 'batteryChargeTotalKwh');
assert.strictEqual(payload.batteryDischargeTotalKwh, 2800.0, 'batteryDischargeTotalKwh');
assert.strictEqual(payload.gridImportTotalKwh, 500.0, 'gridImportTotalKwh');
assert.strictEqual(payload.gridExportTotalKwh, 8000.0, 'gridExportTotalKwh');
assert.strictEqual(payload.currentSpotPriceChfKwh, 0.085, 'currentSpotPriceChfKwh');
assert.strictEqual(payload.totalGridPriceChfKwh, 0.242, 'totalGridPriceChfKwh');
assert.strictEqual(payload.gridCostRateChfH, 0.0, 'gridCostRateChfH');
assert.strictEqual(payload.estimatedMonthlyGridCostChf, 12.5, 'estimatedMonthlyGridCostChf');
assert.strictEqual(payload.source, 'home-assistant', 'source');

// Battery SOC is always null (no direct SOC entity mapped)
assert.strictEqual(payload.batterySocPct, null, 'batterySocPct is null when no SOC entity');

// warnings array is always present; SOC warning is always included
assert.ok(Array.isArray(payload.warnings), 'warnings is an array');
assert.ok(
  payload.warnings.some((w) => w.includes('Battery SOC sensor not mapped')),
  'SOC warning present in warnings array',
);

// Grid import/export: negative raw import must be clamped to 0
const statesNegImport = {
  ...states,
  'sensor.netzbezug_leistung': makeState('sensor.netzbezug_leistung', '-50'),
};
const p2 = mapHaStatesToOverview(statesNegImport);
assert.strictEqual(p2.gridImportW, 0, 'negative gridImportW clamped to 0');

// Unavailable sensor values default to 0
const statesUnavailable = {
  ...states,
  'sensor.pv_power_raw_combined': makeState('sensor.pv_power_raw_combined', 'unavailable'),
};
const p3 = mapHaStatesToOverview(statesUnavailable);
assert.strictEqual(p3.pvPowerW, 0, 'unavailable sensor → 0');

// Price sensor unavailable → 0 and warning added
const statesNoPrice = {
  ...states,
  'sensor.epex_spot_ch_chf_kwh': makeState('sensor.epex_spot_ch_chf_kwh', 'unavailable'),
};
const p4 = mapHaStatesToOverview(statesNoPrice);
assert.strictEqual(p4.currentSpotPriceChfKwh, 0, 'unavailable price sensor → 0');
assert.ok(
  p4.warnings.some((w) => w.includes('sensor.epex_spot_ch_chf_kwh')),
  'missing price sensor appears in warnings',
);

// fetchWarnings merged into payload warnings
const p5 = mapHaStatesToOverview(states, ['sensor.some_entity: fetch failed']);
assert.ok(
  p5.warnings.some((w) => w.includes('fetch failed')),
  'fetchWarnings merged into payload warnings',
);

console.log('✅ All haMapper tests passed');
