# Architecture & Technical Documentation

## System Architecture

### Overview
The GaengleSimulator is a Next.js-based energy management dashboard for the MFH Gängle 2+4 building complex with optimized battery management strategy.

```
┌─────────────────────────────────────────────┐
│         Next.js 14.2.35 Application         │
├─────────────────────────────────────────────┤
│  Dashboard (app/dashboard/page.tsx)         │
│  ├─ Controls (date, time slider)            │
│  ├─ KPI Cards (PV, consumption, SOC)       │
│  ├─ Consumption Details (tenants, cars)    │
│  └─ Charts (Consumption, Sankey)           │
├─────────────────────────────────────────────┤
│  Components (React + TypeScript)            │
│  ├─ SocBar (battery visualization)         │
│  ├─ ConsumptionChart (chart.js)            │
│  └─ SankeyChart (energy distribution)      │
├─────────────────────────────────────────────┤
│  Energy Management (lib/energyManagement)   │
│  ├─ Optimal energy flow calculation        │
│  ├─ Battery state management               │
│  └─ Day/night strategy switching           │
├─────────────────────────────────────────────┤
│  Simulation Engine (lib/simulation.ts)      │
│  ├─ PV production model                    │
│  ├─ Consumption calculations               │
│  └─ Seasonal/hourly profiles               │
├─────────────────────────────────────────────┤
│  Data Models (lib/models.ts)                │
│  ├─ Building + Batteries (2× 20kWh)       │
│  ├─ Tenant                                 │
│  └─ Simulation Result                      │
└─────────────────────────────────────────────┘
```

## Optimized Energy Management Strategy

### System Performance (Annual Simulation Results)

**Building Configuration:**
- PV System: 59.8 kWp (Arres 3.2 / Premium L modules)
- Inverters: 2× Goodwe GW29.9KN-ET (29.9 kW each)
- Batteries: 2× GoodWe Lynx D - 20.0 kWh = 40 kWh total
- Annual Consumption: ~43,743 kWh
- Annual PV Production: ~125,000 kWh (estimated based on capacity reduction from 66.88 to 59.8 kWp)

**Optimized Strategy Results:**
(Note: Metrics below are estimates based on proportional capacity adjustment; actual performance may vary)
- ✅ **Autarky Rate: ~78%** (grid dependency reduced)
- ✅ **Self-Consumption: ~28%** of PV production used directly
- ✅ **Grid Import: ~9,600 kWh/year** (78% reduction vs. no PV)
- ⚠️ **Grid Export: ~90,000 kWh/year** (surplus to grid)

### Optimization Parameters

```javascript
{
  minSoc: 12%,              // Minimum battery reserve
  maxSoc: 95%,              // Maximum charge level (battery protection)
  targetNightSoc: 65%,      // Target SOC for night period (13 kWh reserve)
  targetDaySoc: 25%,        // Minimum SOC during day
  maxChargeRate: 10 kW,     // Maximum charging power per battery
  maxDischargeRate: 6 kW,   // Maximum discharge power per battery
  nightStart: 21:00,        // Night mode begins
  nightEnd: 06:00,          // Night mode ends
}
```

### Strategy Logic

#### 1. **PV Surplus Mode** (Production > Consumption)
- **Priority 1:** Charge battery (if SOC < 95%)
  - Charge rate: min(surplus, 10 kW)
  - Efficiency: 95% (charge losses)
- **Priority 2:** Export to grid (if battery full)

#### 2. **PV Deficit Mode - Day** (06:00 - 21:00)
- **Priority 1:** Use battery (if SOC > 12%)
  - Discharge rate: min(deficit, 6 kW)
  - Efficiency: 95% (discharge losses)
- **Priority 2:** Import from grid (if battery low or insufficient)

#### 3. **PV Deficit Mode - Night** (21:00 - 06:00)
- **Strategy:** Preserve battery for next day
- **Priority 1:** Import from grid (default)
- **Priority 2:** Use battery only if SOC > 65%
  - Rationale: Save battery capacity for morning peak
  - Only discharge excess reserves

#### 4. **Dynamic Start SOC** (Midnight)
- **Base:** 50%
- **Winter Bonus:** +15% (longer nights, more heating)
- **Weekend Bonus:** +10% (more daytime consumption)
- **Result:** 50-85% depending on conditions

### Comparison of Strategies

| Strategy | Autarky Rate | Grid Import | Notes |
|----------|-------------|-------------|-------|
| **Optimized** | **81.4%** | **8,116 kWh** | Best balance |
| Aggressive | 79.8% | 8,840 kWh | Higher battery wear |
| Baseline | 78.8% | 9,279 kWh | Conservative |
| Conservative | 77.5% | 9,848 kWh | Battery-protecting |

### Energy Flow Visualization (Sankey Diagram)

The Sankey diagram shows real-time energy flows:

```
PV (59.8 kWp - Arres 3.2 / Premium L)
  ├─→ WR1 (Goodwe GW29.9KN-ET - 29.9 kW) - Allgemein
  │    ├─→ Shared Areas (Pool, Heating, etc.)
  │    ├─→ Batterie 1 (GoodWe Lynx D - 20 kWh, if surplus & SOC < 95%)
  │    └─→ Netz (if battery full)
  │
  └─→ WR2 (Goodwe GW29.9KN-ET - 29.9 kW) - Wohnungen
       ├─→ Apartments (Graf, Wetli, Bürzle)
       ├─→ Batterie 2 (GoodWe Lynx D - 20 kWh, if surplus & SOC < 95%)
       └─→ Netz (if battery full)

Netz
  ├─→ WR1 (if deficit & battery low/protected)
  └─→ WR2 (if deficit & battery low/protected)

Batterie 1/2
  └─→ WR1/2 (if deficit & SOC permits)
```

## Data Flow

### Time-Based Simulation
1. User selects date and hour via dashboard controls
2. Dashboard extracts month and day-of-week
3. **Optimal start SOC calculated** (month, weekend consideration)
4. **Hour-by-hour simulation** from 00:00 to selected hour:
   - Calculate PV production (seasonal model)
   - Calculate consumption (tenant profiles + common areas)
   - Determine optimal energy flow (surplus/deficit strategy)
   - Update battery SOC (charge/discharge with efficiency)
5. Dashboard renders with final SOC and energy flows

### Component Data Binding
```
Dashboard Page
  ├─ building (state) → Battery array
  ├─ selectedHour (state) → SocBar + ConsumptionChart
  ├─ selectedDate (state) → month, dayOfWeek
  ├─ Calculations:
  │   ├─ pvProduction = f(hour, month, efficiency)
  │   ├─ houseConsumption = Σ f(tenant, hour, day, month)
  │   ├─ commonConsumption = f(hour, month)
  │   ├─ netFlow = pvProduction - totalConsumption
  │   ├─ battery1Soc = f(netFlow, hour)
  │   └─ battery2Soc = f(netFlow, hour)
  └─ Pass to child components
```

## Key Features Implementation

### 1. Dual Battery System

**Model** (`lib/models.ts`):
```typescript
interface Battery {
  id: number;
  inverterId: number;        // 1 or 2
  capacityKwh: number;       // 20 kWh each
  soc: number;               // 0-100%
}
```

**Dashboard Storage**:
```typescript
batteries: [
  { id: 1, inverterId: 1, capacityKwh: 20, soc: 75 },
  { id: 2, inverterId: 2, capacityKwh: 20, soc: 65 }
]
```

### 2. Dynamic SOC Calculation

Formula (dashboard):
```
baseSoc = 50%
socAdjustment = netFlow × 15        // 15% per kW flow
battery1Soc = max(0, min(100, baseSoc + socAdjustment + (hour>12 ? 5 : -5)))
battery2Soc = max(0, min(100, baseSoc + socAdjustment - (hour>12 ? 5 : -5)))
avgSoc = (battery1Soc + battery2Soc) / 2
```

### 3. Time Cursor in Chart

**Challenge**: Chart.js plugin needs to update when `currentHour` changes

**Solution** (ConsumptionChart):
```typescript
const currentHourRef = useRef<number>(currentHour);
useEffect(() => {
  currentHourRef.current = currentHour;  // Always current
}, [currentHour]);

const verticalLinePlugin = useMemo(() => ({
  id: 'verticalLine',
  afterDatasetsDraw(chart: any) {
    const hourIndex = Math.max(0, Math.min(hours.length - 1, currentHourRef.current));
    const xPixel = chartArea.left + (hourIndex * pointSpacing);
    // Draw vertical line at xPixel
  }
}), []);

useEffect(() => {
  if (chartRef.current) {
    chartRef.current.update();  // Trigger plugin redraw
  }
}, [currentHour]);
```

### 4. Enhanced SocBar Component

**Features**:
- Per-battery display (one bar per Wechselrichter)
- Visual fill effect: `width: ${pct}%`
- Energy calculation: `(pct / 100) × capacity`
- Color coding based on SOC range
- Capacity labels (0-50 kWh)

## Performance Considerations

### Rendering
- Chart updates use `update()` without animation for smooth cursor movement
- Memoized plugin with useRef prevents closure issues
- Dashboard calculations are synchronous (fast)

### Storage
- No backend database required
- State only in React components
- Suitable for real-time visualization

### Future Optimizations
- Lazy load charts outside viewport
- Cache PV/consumption calculations
- Debounce time slider updates

## Testing

### Test Files
- `test-plausibility.js`: Validates consumption model
- `test-consumption-variation.js`: Monthly variation testing
- `test-dashboard-integration.js`: Component integration
- `lib/simulation.test.ts`: Unit tests for calculations

### Running Tests
```bash
node test-plausibility.js
npm run test
```

## Known Issues & Workarounds

### Node.js Version
- **Issue**: Node 24.13.0 may cause dev server instability
- **Workaround**: Use Node 18/20; run via background job on port 3001

### Build Size
- Next.js + Chart.js + Sankey can be large (~2MB)
- Consider splitting or lazy loading non-critical charts

## Future Enhancements

- [ ] Backend API for multi-day simulations
- [ ] Real weather data integration for PV
- [ ] Actual meter data import
- [ ] EV charging simulation
- [ ] Tariff-based cost calculation
- [ ] Historical data storage
