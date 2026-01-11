# SnowPeak Tracker v1.0 - Launch Roadmap

## 🎯 Mission: Beat OpenSnow with a FREE Snow Forecasting App

**Core Value Proposition:**
- 100% FREE snow forecasts (no paywall)
- AI-powered predictions using Gemini
- Beautiful, modern UI
- Real-time data with Google Search grounding

---

## 📊 Phase 1: Backend + Database (THIS WEEK)

### Priority Features
1. **Snow Forecast Engine**
   - Store and cache forecast data
   - Historical accuracy tracking
   - Regional aggregation

2. **Resort Database**
   - Comprehensive US ski resort list
   - Location data (lat/lng) for map
   - Resort metadata (vertical, lifts, etc.)

3. **API Endpoints**
   ```
   GET /api/resorts              # All resorts
   GET /api/resorts/:id          # Single resort
   GET /api/resorts/:id/forecast # 10-day forecast
   GET /api/forecasts/top        # Top snowfall rankings
   GET /api/forecasts/map        # Map data (all resorts with snow)
   ```

---

## 🗺️ Phase 2: Map Mode (NEXT)

### Features
- Interactive map of all US ski resorts
- Color-coded markers by predicted snowfall
- Click to view resort details
- Filter by:
  - Region (West, Rockies, Midwest, East)
  - Snow amount (6"+, 12"+, 24"+)
  - Time range (24hr, 48hr, 5-day, 7-day)

### Tech
- Mapbox GL JS (free tier: 50k loads/month)
- Custom snow intensity layers
- Animated storm tracking (stretch goal)

---

## ❄️ Phase 3: Enhanced Snow Stats

### Current vs Target

| Feature | OpenSnow | SnowPeak Target |
|---------|----------|-----------------|
| 10-day forecast | ✅ Paid | ✅ FREE |
| Hourly breakdown | ✅ Paid | ✅ FREE |
| Snow quality index | ❌ | ✅ Unique |
| AI-powered insights | ❌ | ✅ Unique |
| Storm tracking | ✅ | 🔲 Phase 4 |

### New Metrics to Add
- **Snow Quality Score** (0-100)
  - Based on: temp, humidity, wind, snow type
- **Powder Probability** 
  - ML prediction for exceptional days
- **Crowd Factor**
  - Expected crowds based on forecast + day of week

---

## 🆓 Free vs OpenSnow Comparison

| Feature | OpenSnow Free | OpenSnow All-Access ($30/yr) | SnowPeak (FREE) |
|---------|---------------|------------------------------|-----------------|
| 5-day forecast | ✅ | ✅ | ✅ |
| 10-day forecast | ❌ | ✅ | ✅ |
| Hourly snow | ❌ | ✅ | ✅ |
| Snow alerts | ❌ | ✅ | ✅ (planned) |
| Resort map | ✅ Basic | ✅ Enhanced | ✅ |
| AI Assistant | ❌ | ❌ | ✅ Unique! |
| Ads | ✅ Heavy | ❌ | ❌ |

---

## 🏗️ Technical Architecture

```
                    ┌─────────────────────────────────────┐
                    │           FRONTEND                   │
                    │  React 19 + Vite + Tailwind         │
                    │  ┌─────────┐ ┌─────────┐ ┌────────┐│
                    │  │ Forecast│ │   Map   │ │  Stats ││
                    │  │  View   │ │  Mode   │ │ Module ││
                    │  └─────────┘ └─────────┘ └────────┘│
                    └──────────────┬──────────────────────┘
                                   │ API Calls
                    ┌──────────────▼──────────────────────┐
                    │           BACKEND                    │
                    │  Express.js + TypeScript            │
                    │  ┌─────────────────────────────────┐│
                    │  │  /api/resorts                   ││
                    │  │  /api/forecasts                 ││
                    │  │  /api/map                       ││
                    │  └─────────────────────────────────┘│
                    │              │                       │
                    │  ┌───────────▼───────────────────┐  │
                    │  │      Gemini AI Service        │  │
                    │  │  (with Google Search)         │  │
                    │  └───────────────────────────────┘  │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │         DATABASE                     │
                    │  PostgreSQL (Supabase/Railway)      │
                    │  ┌─────────┐ ┌─────────┐ ┌────────┐│
                    │  │ Resorts │ │Forecasts│ │  Users ││
                    │  └─────────┘ └─────────┘ └────────┘│
                    └─────────────────────────────────────┘
```

---

## 📅 Timeline

### Week 1 (Current)
- [x] Project analysis
- [ ] Backend setup (Express + TS)
- [ ] Database schema
- [ ] Core API endpoints
- [ ] Frontend API integration

### Week 2
- [ ] Map mode implementation
- [ ] Resort coordinates database
- [ ] Enhanced forecast UI

### Week 3
- [ ] Snow quality algorithm
- [ ] Performance optimization
- [ ] Beta testing

### Week 4
- [ ] Production deployment
- [ ] Domain setup
- [ ] Launch! 🚀

---

## 🎨 Design Goals

- **Clean & Modern** - No clutter, focus on data
- **Mobile-First** - 60%+ users on mobile
- **Fast** - Sub-second load times
- **Accessible** - Works for everyone

---

## 📈 Success Metrics

1. **User Engagement**
   - Daily active users > 1000
   - Average session > 3 minutes
   - Return rate > 40%

2. **Data Quality**
   - Forecast accuracy > 80%
   - Data freshness < 1 hour

3. **Performance**
   - Lighthouse score > 90
   - API response < 500ms

---

*Let's build something amazing! ❄️🏔️*
