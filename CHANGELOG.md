# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-01-29

### Added
- ✅ Version number display in dashboard header
  - Shows current application version (v0.2.0)
  - Displayed in header alongside building information
  - Version automatically sourced from package.json
- ✅ Dual battery system with per-inverter tracking
  - Battery interface for independent 50kWh batteries (Inverter 1 & 2)
  - Independent SOC calculation for each battery
- ✅ Dynamic SOC calculation based on power flow
  - SOC adjusts based on net energy flow (PV production - consumption)
  - Varies by time of day for realistic behavior
- ✅ Enhanced battery visualization
  - Visual fill effect that changes with SOC percentage
  - Real-time energy display (kWh) in progress bars
  - Color-coded states: Green (>66%), Yellow (33-66%), Red (<33%)
  - Separate bars for each inverter/battery
- ✅ Dashboard statistics
  - Average SOC across all batteries
  - Per-battery capacity and current state display
  - Real-time energy metrics (PV production, consumption, net flow)
- ✅ ConsumptionChart improvements
  - Dynamic time cursor that syncs with time slider
  - Smooth visual updates without animation stutter
  - Vertical red dashed line indicating selected hour
  - Fixed positioning using calculated pixel offsets

### Changed
- Updated Building model to support Battery array instead of single capacity
- ConsumptionChart now uses React hooks (useRef, useMemo) for stable plugin state
- Dashboard displays dual battery system instead of single battery

### Technical Details
- Battery model: 2× 20kWh (40kWh total, per Wechselrichter)
- SOC range: 0-100%
- Dynamic adjustment: ±15% based on net power flow + time-of-day variation
- Chart cursor update mechanism: useRef for value persistence + useMemo for plugin stability

### Bug Fixes
- Fixed cursor not following time slider in ConsumptionChart
- Fixed recursive plugin rendering causing "Recursion detected" errors
- Resolved SOC values not updating when time changes

### Components Modified
- `lib/models.ts`: Added Battery interface
- `app/dashboard/page.tsx`: Dual battery integration, dynamic SOC calculation
- `components/SocBar.tsx`: Complete redesign with visual fill and energy display
- `components/ConsumptionChart.tsx`: Time cursor fix using React hooks

---

## [Initial Release]

### Features
- Energy consumption simulation
- PV production calculation
- Basic battery state visualization
- Building and tenant management
- Dashboard with charts and statistics
