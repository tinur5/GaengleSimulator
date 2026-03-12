/**
 * Reale Messdaten – MFH Gängle 2+4 (Baizers, Liechtenstein)
 *
 * Quelle: Wechselrichter-Verlaufsdaten vom 03.10.2026
 * Geräte: 2× Goodwe GW29.9KN-ET
 *   - Wechselrichter 1 (S/N 529K9ETT252S0018): Bürzle Graf
 *   - Wechselrichter 2 (S/N 529K9ETT252S0025)
 *
 * Messgrössen:
 *   backupLoadW  – Leistung an den EPS/Backup-Ausgängen des WR (W)
 *   gridPowerW   – Netto-Leistung am Einspeisepunkt (W, positiv = Einspeisung)
 *   soc          – Batterie-SOC gemessen vom BMS (%)
 *   battCurrentA – Batteriestrom (A, negativ = Laden)
 *
 * Stündliche Durchschnittswerte; null = kein Messwert in dieser Stunde vorhanden.
 */

export interface HourlyMeasurement {
  hour: number;
  backupLoadW: number | null;
  gridPowerW: number | null;
  soc: number | null;
  battCurrentA: number | null;
}

/** Stündliche Messdaten Wechselrichter 1 (S/N 529K9ETT252S0018) */
export const REAL_DATA_INV1_HOURLY: HourlyMeasurement[] = [
  { hour:  0, backupLoadW:  58.0, gridPowerW:     0.0, soc:  87.8, battCurrentA:  0.17 },
  { hour:  1, backupLoadW:  58.5, gridPowerW:     0.0, soc:  86.7, battCurrentA:  0.17 },
  { hour:  2, backupLoadW:  58.1, gridPowerW:     0.0, soc:  85.5, battCurrentA:  0.16 },
  { hour:  3, backupLoadW:  57.8, gridPowerW:     0.0, soc:  84.4, battCurrentA:  0.18 },
  { hour:  4, backupLoadW:  57.4, gridPowerW:     0.0, soc:  83.2, battCurrentA:  0.17 },
  { hour:  5, backupLoadW:  55.9, gridPowerW:     0.0, soc:  81.9, battCurrentA:  0.15 },
  { hour:  6, backupLoadW:  55.7, gridPowerW:     0.0, soc:  80.8, battCurrentA:  0.12 },
  { hour:  7, backupLoadW:  55.6, gridPowerW:     0.0, soc:  81.6, battCurrentA: -1.86 },
  { hour:  8, backupLoadW:  58.7, gridPowerW:     0.0, soc:  86.2, battCurrentA: -5.82 },
  { hour:  9, backupLoadW:  54.0, gridPowerW:  2779.4, soc:  98.3, battCurrentA: -3.86 },
  { hour: 10, backupLoadW: 171.4, gridPowerW:  9876.8, soc: 100.0, battCurrentA:  0.00 },
  { hour: 11, backupLoadW: 263.6, gridPowerW:  9661.6, soc: 100.0, battCurrentA:  0.00 },
  { hour: 12, backupLoadW:  62.5, gridPowerW: 11364.9, soc: 100.0, battCurrentA:  0.00 },
  { hour: 13, backupLoadW:  65.8, gridPowerW: 10727.6, soc: 100.0, battCurrentA:  0.00 },
  { hour: 14, backupLoadW:  60.4, gridPowerW:  9836.4, soc: 100.0, battCurrentA:  0.00 },
  { hour: 15, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 16, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 17, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 18, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 19, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 20, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 21, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 22, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 23, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
];

/** Stündliche Messdaten Wechselrichter 2 (S/N 529K9ETT252S0025) */
export const REAL_DATA_INV2_HOURLY: HourlyMeasurement[] = [
  { hour:  0, backupLoadW:  31.9, gridPowerW:     0.0, soc:  91.0, battCurrentA:  0.43 },
  { hour:  1, backupLoadW:  31.9, gridPowerW:     0.0, soc:  89.3, battCurrentA:  0.44 },
  { hour:  2, backupLoadW:  31.9, gridPowerW:     0.0, soc:  87.6, battCurrentA:  0.44 },
  { hour:  3, backupLoadW:  31.9, gridPowerW:     0.0, soc:  86.1, battCurrentA:  0.42 },
  { hour:  4, backupLoadW:  31.4, gridPowerW:     0.0, soc:  84.5, battCurrentA:  0.41 },
  { hour:  5, backupLoadW:  30.5, gridPowerW:     0.0, soc:  83.1, battCurrentA:  0.42 },
  { hour:  6, backupLoadW:  30.4, gridPowerW:     0.0, soc:  81.7, battCurrentA:  0.40 },
  { hour:  7, backupLoadW:  41.9, gridPowerW:     0.0, soc:  82.7, battCurrentA: -1.78 },
  { hour:  8, backupLoadW:  35.3, gridPowerW:     0.0, soc:  88.8, battCurrentA: -5.18 },
  { hour:  9, backupLoadW:  32.9, gridPowerW:  2521.7, soc:  99.9, battCurrentA: -0.04 },
  { hour: 10, backupLoadW: 347.2, gridPowerW:  9511.9, soc: 100.0, battCurrentA:  0.00 },
  { hour: 11, backupLoadW: 2098.8, gridPowerW: 9643.2, soc: 100.0, battCurrentA:  0.00 },
  { hour: 12, backupLoadW:  63.2, gridPowerW: 11381.2, soc: 100.0, battCurrentA:  0.00 },
  { hour: 13, backupLoadW:  59.9, gridPowerW: 10657.7, soc:  99.5, battCurrentA:  0.00 },
  { hour: 14, backupLoadW:  60.1, gridPowerW:  9908.8, soc:  99.0, battCurrentA:  0.00 },
  { hour: 15, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 16, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 17, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 18, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 19, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 20, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 21, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 22, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
  { hour: 23, backupLoadW:  null, gridPowerW:     null, soc:   null, battCurrentA: null },
];

/**
 * Kalibrierungspunkte aus realen Messdaten.
 *
 * Schlüsselwerte für Oktober (03.10.2026, sonniger Tag):
 *   - Batterie-SOC Mitternacht: WR1 = 88 %, WR2 = 92 %
 *   - PV-Startzeit: ~07:30 Uhr (Sonnenaufgang effektiv)
 *   - Batterie voll (100 %): ~09:30–10:00 Uhr
 *   - Spitzen-PV WR1 (12:00–13:00): ~9,1 kW  →  WR2: ~15,4 kW
 *   - Kombinierte Spitzen-PV (12:00): ~24,5 kW bei 59,8 kWp = 41 % des Nennwerts
 *   - Mittlere Netzeinspeisung Mittag: WR1 ~11,4 kW, WR2 ~11,4 kW
 *   - Gebäudeverbrauch Mittag (abgeleitet): ~1,75 kW
 *   - Gebäudeverbrauch Nacht (abgeleitet aus Batterieentladung): ~0,54 kW
 */
export const CALIBRATION_OCTOBER = {
  date: '03.10.2026',
  inv1MidnightSoc: 88,   // % – WR1 Batterie-SOC um 00:00 Uhr
  inv2MidnightSoc: 92,   // % – WR2 Batterie-SOC um 00:00 Uhr
  pvStartHour: 7.5,       // Uhr – effektiver PV-Start
  batteryFullHour: 9.75,  // Uhr – Batterie voll (100 %)
  peakPvKw: 24.5,         // kW – kombinierte Spitzenleistung beider WR
  cloudCoverOctober: 0.43, // Wolkenbedeckung für diesen klaren Tag
  avgCloudCoverOctober: 0.50, // Mittlere Wolkenbedeckung für Oktober (Durchschnitt)
  noonBuildingConsumptionKw: 1.75,  // kW – Gesamtverbrauch Mittag
  nightBuildingConsumptionKw: 0.54, // kW – Gesamtverbrauch Nacht
};

/**
 * Gibt den gemessenen SOC für einen Wechselrichter zu einer bestimmten Stunde zurück.
 * Gibt null zurück wenn kein Messwert vorhanden ist.
 *
 * @param inverterId 1 oder 2
 * @param hour 0–23
 */
export function getRealSoc(inverterId: 1 | 2, hour: number): number | null {
  const data = inverterId === 1 ? REAL_DATA_INV1_HOURLY : REAL_DATA_INV2_HOURLY;
  return data[hour]?.soc ?? null;
}

/**
 * Gibt den gemessenen Netto-Netzleistungswert für einen WR zurück (W).
 * Positiv = Einspeisung, null = kein Messwert.
 */
export function getRealGridPower(inverterId: 1 | 2, hour: number): number | null {
  const data = inverterId === 1 ? REAL_DATA_INV1_HOURLY : REAL_DATA_INV2_HOURLY;
  return data[hour]?.gridPowerW ?? null;
}
