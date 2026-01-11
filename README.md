# ❄️ SnowPeak Tracker

**FREE Snow Forecasting App - Beat OpenSnow!**

<div align="center">
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/Gemini%20AI-Powered-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</div>

<div align="center">
  <h3>🎿 Real-time snow conditions • 📊 10-day forecasts • 🗺️ Interactive map</h3>
</div>

---

## ✨ Features

| Feature | OpenSnow Free | OpenSnow Paid ($30/yr) | SnowPeak (FREE) |
|---------|---------------|------------------------|-----------------|
| 5-day forecast | ✅ | ✅ | ✅ |
| **10-day forecast** | ❌ | ✅ | ✅ |
| Hourly snow | ❌ | ✅ | ✅ |
| Snow alerts | ❌ | ✅ | ✅ (coming) |
| **Interactive map** | Basic | Enhanced | ✅ |
| **AI Assistant** | ❌ | ❌ | ✅ Unique! |
| Ads | Heavy | None | **None** |

### 🏔️ Core Features
- **Real-time Snow Data** - 24hr/48hr snowfall, base depth, lifts & trails open
- **10-Day Forecast** - Detailed daily predictions with charts
- **Top 5 Rankings** - Best snowfall by region (CO, UT, CA, etc.)
- **Interactive Snow Map** - Visual overview of all US ski resorts
- **AI Ski Assistant** - Ask questions about gear, technique, conditions
- **Favorites** - Save your favorite resorts
- **Powder Score** - Unique algorithm to rate current conditions

---

## 🚀 Quick Start

### Option 1: Frontend Only (Gemini Direct)

```bash
# Clone the repo
git clone <your-repo-url>
cd snowpeak_tracker

# Install dependencies
npm install

# Set your Gemini API key
echo "GEMINI_API_KEY=your-key-here" > .env.local

# Start the app
npm run dev
```

Open http://localhost:5173

### Option 2: Full Stack (Recommended)

```bash
# 1. Start the backend
cd backend
npm install
cp .env.example .env  # Edit with your keys
npx prisma generate
npx prisma db push    # Requires PostgreSQL
npm run seed          # Seed resort data
npm run dev

# 2. Start the frontend (new terminal)
cd ..
npm install
echo "VITE_API_URL=http://localhost:3001/api" > .env.local
echo "GEMINI_API_KEY=your-key-here" >> .env.local
npm run dev
```

---

## 🗄️ Database Setup

### Local PostgreSQL (Docker)
```bash
docker run --name snowpeak-db \
  -e POSTGRES_USER=snowpeak \
  -e POSTGRES_PASSWORD=snowpeak \
  -e POSTGRES_DB=snowpeak \
  -p 5432:5432 \
  -d postgres:16
```

### Cloud Options
- **Supabase** (recommended) - Free tier, built-in auth
- **Neon** - Serverless PostgreSQL
- **Railway** - Easy deployment

---

## 📁 Project Structure

```
snowpeak_tracker/
├── 📱 Frontend (React + Vite)
│   ├── App.tsx              # Main app
│   ├── components/
│   │   ├── ResortCard.tsx   # Resort detail card
│   │   ├── SnowChart.tsx    # Forecast chart
│   │   ├── TopSnowList.tsx  # Rankings
│   │   └── MapView.tsx      # Interactive map
│   ├── services/
│   │   ├── api.ts           # Backend API client
│   │   └── geminiService.ts # Direct Gemini calls
│   └── types.ts
│
├── 🖥️ Backend (Express + Prisma)
│   └── backend/
│       ├── src/
│       │   ├── index.ts         # Server entry
│       │   ├── routes/          # API endpoints
│       │   ├── services/gemini.ts
│       │   └── db/
│       │       ├── client.ts    # Prisma client
│       │       └── seed.ts      # 70+ US resorts
│       └── prisma/schema.prisma
│
└── 📚 Docs
    └── docs/
        ├── PROJECT_ANALYSIS.md
        ├── BACKEND_RECOMMENDATIONS.md
        ├── IMPROVEMENT_IDEAS.md
        ├── DEVELOPMENT_LOG.md
        └── ROADMAP_V1.md
```

---

## 🔌 API Endpoints

### Resorts
```
GET  /api/resorts              # List all resorts
GET  /api/resorts/:id          # Resort details + forecast
GET  /api/resorts/:id?refresh  # Force refresh from Gemini
```

### Forecasts
```
GET  /api/forecasts/top        # Top 5 by snowfall
GET  /api/forecasts/top?region=CO
GET  /api/forecasts/alerts     # Significant snow alerts
GET  /api/forecasts/summary    # National summary
```

### Map
```
GET  /api/map/resorts          # All resorts with coordinates
GET  /api/map/heatmap          # Heatmap data
GET  /api/map/regions          # Regional summaries
```

### AI Chat
```
POST /api/chat                 # Ask ski assistant
GET  /api/chat/suggestions     # Suggested questions
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Build | Vite 6 |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL + Prisma |
| AI | Google Gemini API |

---

## 🌐 Deployment

### Frontend → Vercel
```bash
npm run build
vercel deploy
```

### Backend → Railway
```bash
railway init
railway add postgresql
railway up
```

### Environment Variables

**Frontend (.env.local)**
```
VITE_API_URL=https://your-backend.railway.app/api
GEMINI_API_KEY=your-gemini-key
```

**Backend (.env)**
```
DATABASE_URL=postgresql://...
GEMINI_API_KEY=your-gemini-key
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
```

---

## 📊 Covered Resorts

70+ major US ski resorts with coordinates:

| Region | States | Resorts |
|--------|--------|---------|
| Rockies | CO, UT, WY, MT, ID, NM | 35 |
| Pacific | CA, WA, OR, NV | 15 |
| Northeast | VT, NH, ME, NY | 18 |
| Midwest | MI, WI, MN | 4 |

---

## 🗺️ Roadmap

- [x] Real-time snow data via Gemini AI
- [x] 10-day forecasts
- [x] Interactive snow map
- [x] Backend + Database
- [ ] Push notifications for powder alerts
- [ ] User accounts & sync
- [ ] Mobile app (React Native)
- [ ] Storm tracking visualization

---

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

---

## 📄 License

MIT License - use freely, attribution appreciated.

---

<div align="center">
  <p>Built with ❄️ to beat OpenSnow</p>
  <p><strong>100% FREE • No Ads • AI-Powered</strong></p>
</div>
