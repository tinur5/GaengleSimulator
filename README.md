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
| Annual PV Production | ~125,000 kWh (adjusted for new capacity) |

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