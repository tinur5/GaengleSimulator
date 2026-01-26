# Architecture & Technical Documentation

## System Architecture

### Overview
The GaengleSimulator is a Next.js-based energy management dashboard for the MFH Gängle 2+4 building complex.

```
┌─────────────────────────────────────────────┐
│         Next.js 14.2.35 Application         │
├─────────────────────────────────────────────┤
│  Dashboard (app/dashboard/page.tsx)         │
│  ├─ Controls (date, time slider)            │
│  ├─ KPI Cards (PV, consumption, SOC)       │
│  └─ Charts (Energy, Consumption, Sankey)   │
├─────────────────────────────────────────────┤
│  Components (React + TypeScript)            │
│  ├─ SocBar (battery visualization)         │
│  ├─ ConsumptionChart (chart.js)            │
│  ├─ EnergyChart (net flow)                 │
│  └─ SankeyChart (energy distribution)      │
├─────────────────────────────────────────────┤
│  Simulation Engine (lib/simulation.ts)      │
│  ├─ PV production model                    │
│  ├─ Consumption calculations               │
│  └─ SOC dynamics                            │
├─────────────────────────────────────────────┤
│  Data Models (lib/models.ts)                │
│  ├─ Building + Battery                     │
│  ├─ Tenant                                 │
│  └─ Simulation Result                      │
└─────────────────────────────────────────────┘
```

## Data Flow

### Time-Based Simulation
1. User selects date and hour via dashboard controls
2. Dashboard extracts month and day-of-week
3. Simulation engine calculates:
   - PV production (hour, month, season)
   - Tenant consumption (hour, day, season)
   - Common area consumption (heating, pool, etc.)
4. Net flow computed: PV - (tenant + common consumption)
5. SOC calculated: base 50% + (netFlow × 15%) ± time-variation
6. Dashboard renders with updated values

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
  capacityKwh: number;       // 50 kWh each
  soc: number;               // 0-100%
}
```

**Dashboard Storage**:
```typescript
batteries: [
  { id: 1, inverterId: 1, capacityKwh: 50, soc: 75 },
  { id: 2, inverterId: 2, capacityKwh: 50, soc: 65 }
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
