# Energy Simulator - MFH Gängle 2+4

A Next.js application for simulating energy consumption and storage in buildings with dual battery systems.

## System Overview

**Building:** MFH Gängle 2+4  
**PV System:** 66.88 kWp  
**Battery Storage:** 2× 20 kWh (one per inverter, 40 kWh total)  
**Tenants:** 3 residential units

## Features

### 🔋 Dual Battery System
- Independent battery tracking per inverter (Wechselrichter 1 & 2)
- Real-time State of Charge (SOC) visualization
- Dynamic SOC calculation based on power flow
- Visual fill effect with energy display (kWh)
- Color-coded status (Green: >66%, Yellow: 33-66%, Red: <33%)

### ⚡ Energy Management
- Real-time PV production calculation
- Consumption tracking per tenant and common areas
- Net flow monitoring (surplus/deficit)
- 24-hour energy flow visualization

### 📊 Dashboard
- Time slider for hour-by-hour simulation (0-23:00)
- Dynamic cursor in consumption chart
- Individual battery state bars
- Average SOC indicator
- Energy statistics cards

### 🏠 Building Management
- Multi-tenant support
- Common area consumption (heating, pool, garage, boiler)
- Seasonal consumption variations
- Household consumption profiles

## Getting Started

### Prerequisites
- Node.js (v18+ recommended; tested with v24.13.0)
- npm

### Installation

```bash
# Clone repository
git clone <repository>
cd GaengleSimulator

# Install dependencies
npm install

# Build
npm run build
```

### Running the Application

```bash
# Development mode
npm run dev

# Production mode
npm run start
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) in your browser.

## Architecture

### Data Models (`lib/models.ts`)
- **Building**: Main entity with PV system, batteries, efficiency
- **Battery**: Per-inverter battery with capacity and SOC
- **Tenant**: Household profile with consumption, size, demographics
- **SimulationResult**: Energy flow and battery state output

### Components

#### Dashboard (`app/dashboard/page.tsx`)
- Main page with controls and layout
- Time/date selection
- Energy calculations
- Dynamic SOC computation

#### SocBar (`components/SocBar.tsx`)
- Visual battery level indicator
- Dual battery display
- Energy stored display
- Color-coded status

#### ConsumptionChart (`components/ConsumptionChart.tsx`)
- 24-hour consumption profile
- Individual tenant curves + total
- Time cursor synchronized with slider
- Chart.js with custom plugin

#### Additional Charts
- EnergyChart: Net power flow visualization
- SankeyChart: Energy flow diagram
- AnnualConsumptionStats: Yearly consumption per tenant

### Simulation Engine (`lib/simulation.ts`)
- PV production model with seasonal variation
- Consumption calculation per tenant
- Common area energy modeling
- Efficiency calculations

## Recent Updates

See [CHANGELOG.md](CHANGELOG.md) for detailed changes.

### Latest (v0.2.0)
- ✅ Dual battery system implementation
- ✅ Dynamic SOC calculation
- ✅ Fixed time cursor in charts
- ✅ Enhanced battery visualization

## Deployment

This app can be deployed on:
- **Vercel**: `vercel deploy`
- **Netlify**: Connect GitHub repository
- **Traditional VPS**: `npm run build && npm run start`

## Troubleshooting

### Dev server won't start
- Clear cache: `rm -r .next .turbo`
- Reinstall: `npm install`
- Check Node version: `node --version` (v18-20 recommended)

### Charts not displaying
- Ensure chart.js dependencies: `npm install chart.js react-chartjs-2`
- Clear browser cache and reload

## Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Commit changes: `git commit -m "feat: description"`
3. Push to branch: `git push origin feature/name`
4. Create Pull Request

## License

MIT