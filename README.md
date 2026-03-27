# Energy Simulator - MFH Gängle 2+4

A modern energy management dashboard for real-time simulation of consumption, solar production, and battery storage.

**🌍 Live App:** [gaengle-simulator.vercel.app](https://gaengle-simulator.vercel.app)  
**📱 Works on:** Desktop, Tablet, Smartphone

---

## 🚀 Quick Start

### For Users (No Technical Skills)
Simply open the link above in your browser - that's it! 
- Choose a date and time with the sliders
- See real-time energy flows
- Check battery status
- No login required, no installation

**See:** [USERGUIDE.md](./USERGUIDE.md)

### For Developers
```bash
# Clone & setup
git clone https://github.com/[your-user]/gaengle-simulator.git
cd gaengle-simulator
npm install

# Development
npm run dev         # Runs on localhost:3000

# Production
npm run build
npm start

# Deploy to Vercel
# See DEPLOYMENT.md
```

**See:** [QUICKSTART.md](./QUICKSTART.md) & [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Building Overview

**MFH Gängle 2+4**  
| Parameter | Value |
|-----------|-------|
| PV System | 59.8 kWp (Arres 3.2 / Premium L modules) |
| Inverters | 2× Goodwe GW29.9KN-ET (29.9 kW each) |
| Battery | 2× GoodWe Lynx D - 20.0 kWh (40 kWh total) |
| Tenants | 3 residential units |
| Annual Consumption | ~43,743 kWh |
| Annual PV Production | ~125,000 kWh* |

*Estimated based on proportional capacity adjustment (59.8 kWp vs. previous 66.88 kWp)

---

## ⚡ Optimized Energy Management

### Performance Metrics (Annual Simulation)
- **Autarky Rate:** 81.4% ✅
- **Grid Independence:** Only 18.6% external grid
- **Grid Import:** 8,116 kWh/year (81% reduction)
- **Self-Consumption:** 25% of PV production

### Smart Strategy
- **Day Mode (06:00-21:00):** Maximize battery usage
- **Night Mode (21:00-06:00):** Preserve battery, use grid
- **Seasonal Optimization:** Dynamic start SOC (50-85%)
- **Efficient Charging:** Max 10 kW per battery
- **Controlled Discharge:** Max 6 kW per battery

**See:** [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📊 Dashboard Features

### System Overview
- 📊 KPI Cards (PV, Consumption, SOC, Balance)
- 🌊 Sankey Energy Flow Diagram
- 💡 24-hour Consumption Profile
- 🔋 Battery Status (per inverter)

### Detailed Breakdown
- 👨‍👩‍👧‍👦 Consumption per tenant (with EV/E-bike charging)
- 🏊 Common areas (Pool, Heating, Garage, Boiler)
- ☀️ Solar production (seasonal model)
- 🔌 Grid import/export

### Interactive Controls
- 📅 Date picker
- ⏱️ Time slider (hourly resolution)
- 📈 Real-time energy visualization

---

## 🎯 Features

### 🔋 Dual Battery System
- Independent battery tracking per inverter
- Real-time State of Charge (SOC) visualization
- Dynamic SOC calculation based on power flow
- Visual fill effect with energy display (kWh)
- Color-coded status (Green: >66%, Yellow: 33-66%, Red: <33%)

### ⚡ Energy Management
- Real-time PV production calculation
- Consumption tracking per tenant and common areas
- Net flow monitoring (surplus/deficit)
- 24-hour energy flow visualization
- Average SOC indicator
- Energy statistics cards

### 🏠 Building Management
- Multi-tenant support
- Common area consumption (heating, pool, garage, boiler)
- Seasonal consumption variations
- Household consumption profiles

### 🐛 Issue Reporting
- In-app issue reporting button
- Dual reporting modes:
  - **GitHub Integration**: Direct GitHub issue creation
  - **Email Fallback**: Email notification when GitHub is not configured
- Automatic metadata capture (timestamp, user agent)
- User-friendly feedback system

**See:** [ISSUE_REPORTING.md](./ISSUE_REPORTING.md) for configuration

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

# Configure environment variables (optional, for issue reporting)
cp .env.example .env.local
# Edit .env.local and add your GitHub token or email configuration
# See ISSUE_REPORTING.md for details

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

### Environment Variables

For the issue reporting feature to work, configure the following environment variables:

```bash
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_REPO=tinur5/GaengleSimulator
```

**Creating a GitHub Token:**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "GaengleSimulator Issue Reporter")
4. Select the `repo` scope
5. Click "Generate token"
6. Copy the token to your `.env` file

**Note:** The app works without the token, but the issue reporting feature will not function.

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
---

## 🏠 Home Assistant Live Integration

The dashboard supports fetching **real-time energy data** directly from a [Home Assistant](https://www.home-assistant.io/) instance. When configured, a **Live / Simulator** toggle appears in the top-right corner of the dashboard header.

### Required Environment Variables

| Variable | Description |
|---|---|
| `HOME_ASSISTANT_URL` | Base URL of your Home Assistant instance (e.g. `https://my-ha.duckdns.org:8123`) |
| `HOME_ASSISTANT_TOKEN` | Long-Lived Access Token from Home Assistant (see below) |

### Sensor Entity IDs

The following Home Assistant sensors must exist in your setup:

| Entity ID | Meaning |
|---|---|
| `sensor.dashboard_pv_power_total` | Current PV production (W) |
| `sensor.dashboard_battery_power` | Battery power: positive=charging, negative=discharging (W) |
| `sensor.dashboard_battery_soc` | Battery state of charge (%) |
| `sensor.dashboard_grid_import_power` | Grid import power (W) |
| `sensor.dashboard_grid_export_power` | Grid export power (W) |
| `sensor.dashboard_house_load_power` | Total house load (W) |
| `sensor.dashboard_pv_energy_today` | PV energy produced today (kWh) |
| `sensor.dashboard_grid_import_energy_today` | Grid energy imported today (kWh) |
| `sensor.dashboard_grid_export_energy_today` | Grid energy exported today (kWh) |
| `sensor.dashboard_battery_charge_energy_today` | Battery charge energy today (kWh) |
| `sensor.dashboard_battery_discharge_energy_today` | Battery discharge energy today (kWh) |

Entity IDs are configurable as constants in `lib/haMapper.ts` (`HA_ENTITY_IDS`).

### How to Create a Long-Lived Access Token

1. Open Home Assistant → click your profile (bottom-left)
2. Scroll to **Long-lived access tokens**
3. Click **Create Token**, give it a name (e.g. `GaengleSimulator`)
4. Copy the token — it is only shown once

### Running Locally

```bash
# Copy and fill in the env variables
cp .env.example .env.local

# Edit .env.local and set HOME_ASSISTANT_URL and HOME_ASSISTANT_TOKEN
nano .env.local

# Start dev server
npm run dev
```

The dashboard will default to **Live** mode on startup. If Home Assistant is unreachable, it falls back to **Simulator** mode automatically and shows a warning banner.

### Deploying on Vercel

1. In the Vercel project → **Settings → Environment Variables**
2. Add `HOME_ASSISTANT_URL` and `HOME_ASSISTANT_TOKEN` as **Production** secrets
3. **Do not** add them to client-side environment (no `NEXT_PUBLIC_` prefix)

The API route (`/api/ha/overview`) uses 15-second ISR revalidation, which keeps the Vercel edge cache fresh without hammering Home Assistant.

### Security Architecture

```
Browser  →  /api/ha/overview  →  Home Assistant REST API
              (server-side)        Bearer token never leaves server
```

- The `HOME_ASSISTANT_TOKEN` is **never exposed to the browser**
- All Home Assistant communication happens in `app/api/ha/overview/route.ts` and `lib/homeAssistant.ts` (server-side only)
- The frontend (`app/dashboard/page.tsx`) only calls internal `/api/ha/overview`
- The token is read exclusively from server-side environment variables

### Architecture Files

| File | Role |
|---|---|
| `lib/homeAssistant.ts` | Server-side HA client (fetch + Bearer token + timeout + error classes) |
| `lib/haMapper.ts` | Normalization helpers, entity ID constants |
| `types/homeAssistant.ts` | TypeScript types for HA data |
| `app/api/ha/overview/route.ts` | Next.js route handler (server-side only) |
| `components/HaStatusBanner.tsx` | Live/fallback/stale status banner component |
| `lib/haMapper.test.ts` | Normalization unit tests (`npx tsx lib/haMapper.test.ts`) |
