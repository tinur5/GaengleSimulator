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
// mapHaStatesToOverview
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
  'sensor.dashboard_pv_power_total': makeState('sensor.dashboard_pv_power_total', '5000'),
  'sensor.dashboard_battery_power': makeState('sensor.dashboard_battery_power', '-1500'),
  'sensor.dashboard_battery_soc': makeState('sensor.dashboard_battery_soc', '72'),
  'sensor.dashboard_grid_import_power': makeState('sensor.dashboard_grid_import_power', '0'),
  'sensor.dashboard_grid_export_power': makeState('sensor.dashboard_grid_export_power', '3200'),
  'sensor.dashboard_house_load_power': makeState('sensor.dashboard_house_load_power', '1800'),
  'sensor.dashboard_pv_energy_today': makeState('sensor.dashboard_pv_energy_today', '28.5'),
  'sensor.dashboard_grid_import_energy_today': makeState('sensor.dashboard_grid_import_energy_today', '0.3'),
  'sensor.dashboard_grid_export_energy_today': makeState('sensor.dashboard_grid_export_energy_today', '15.2'),
  'sensor.dashboard_battery_charge_energy_today': makeState('sensor.dashboard_battery_charge_energy_today', '12.1'),
  'sensor.dashboard_battery_discharge_energy_today': makeState('sensor.dashboard_battery_discharge_energy_today', '8.4'),
};

const payload = mapHaStatesToOverview(states);

assert.strictEqual(payload.pvPowerW, 5000, 'pvPowerW');
assert.strictEqual(payload.batteryPowerW, -1500, 'batteryPowerW (negative = discharging)');
assert.strictEqual(payload.batteryChargeW, 0, 'batteryChargeW = max(-1500, 0) = 0');
assert.strictEqual(payload.batteryDischargeW, 1500, 'batteryDischargeW = max(1500, 0) = 1500');
assert.strictEqual(payload.batterySocPct, 72, 'batterySocPct');
assert.strictEqual(payload.gridImportW, 0, 'gridImportW');
assert.strictEqual(payload.gridExportW, 3200, 'gridExportW');
assert.strictEqual(payload.houseLoadW, 1800, 'houseLoadW');
assert.strictEqual(payload.pvTodayKwh, 28.5, 'pvTodayKwh');
assert.strictEqual(payload.source, 'home-assistant', 'source');

// Grid import/export: both can never be simultaneously positive from real data
// If raw import is negative, it should be clamped to 0
const statesNegImport = {
  ...states,
  'sensor.dashboard_grid_import_power': makeState('sensor.dashboard_grid_import_power', '-50'),
};
const p2 = mapHaStatesToOverview(statesNegImport);
assert.strictEqual(p2.gridImportW, 0, 'negative gridImportW clamped to 0');

// Unavailable sensor values default to 0
const statesUnavailable = {
  ...states,
  'sensor.dashboard_pv_power_total': makeState('sensor.dashboard_pv_power_total', 'unavailable'),
};
const p3 = mapHaStatesToOverview(statesUnavailable);
assert.strictEqual(p3.pvPowerW, 0, 'unavailable sensor → 0');

console.log('✅ All haMapper tests passed');
