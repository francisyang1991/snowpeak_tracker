# SnowPeak Tracker v1.0 - Launch Roadmap

## 🎯 Mission: Beat OpenSnow with a FREE Snow Forecasting App

**Core Value Proposition:**
- 100% FREE snow forecasts (no paywall)
- AI-powered predictions using Gemini
- Beautiful, modern UI
- Real-time data with Google Search grounding

---

## ✅ Recently Completed (Jan 2026)

### Performance & Caching
- [x] **1-hour database caching** - No more 5-10s wait times!
  - Resort data cached in PostgreSQL for 1 hour
  - Top resort rankings cached by region
  - Memory + DB dual-layer caching for instant loads
  - Manual refresh option for users who want fresh data

- [x] **Automatic Preloading System** - Data ready before users arrive!
  - Auto-preloads Top 5 lists for all regions on server startup
  - 30+ popular resorts can be preloaded (Vail, Aspen, Jackson Hole, etc.)
  - Background loading doesn't block server
  - Trigger preload via API: `POST /api/preload`
  - Set `AUTO_PRELOAD=false` to disable

### UI/UX Improvements  
- [x] **Color-coded snow amounts** - Visual indication of snowfall intensity
  
  **Daily Basis:**
  - 🔴 Red: 30"+ (Dangerous - too heavy!)
  - 🟣 Purple: 15-30" (Great snow)
  - 🔵 Blue: 5-15" (Good snow)  
  - 🩵 Cyan: 1-5" (Light snow)
  
  **5-Day Total (in Top Resorts list):**
  - 🔴 Red: 60"+ (Epic - 12"+ per day avg)
  - 🟣 Purple: 30-60" (Great - 6-12" per day avg)
  - 🔵 Blue: 15-30" (Good - 3-6" per day avg)  
  - 🩵 Cyan: 5-15" (Light - 1-3" per day avg)
- [x] **Fixed resort name truncation** - Full names now visible with tooltip
- [x] **Map mode disabled** - Temporarily disabled while being improved

---

## 📊 Phase 1: Backend + Database (IN PROGRESS)

### Priority Features
1. **Snow Forecast Engine** ✅ DONE
   - Store and cache forecast data (1-hour cache)
   - Regional aggregation
   - Multi-layer caching (memory + database)
   
2. **Resort Database** (Partial)
   - [x] Basic resort data storage
   - [ ] Comprehensive US ski resort list (need to seed ~200 resorts)
   - [ ] Location data (lat/lng) for map
   - [ ] Resort metadata (vertical, lifts, etc.)

3. **API Endpoints** ✅ DONE
   ```
   GET /api/resorts              # All resorts
   GET /api/resorts/:id          # Single resort (with caching)
   GET /api/resorts/:id/forecast # 10-day forecast
   GET /api/forecasts/top        # Top snowfall rankings (cached by region)
   GET /api/forecasts/map        # Map data (all resorts with snow)
   ```

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

### Week 1 ✅ COMPLETED
- [x] Project analysis
- [x] Backend setup (Express + TS)
- [x] Database schema (Prisma + PostgreSQL)
- [x] Core API endpoints
- [x] Frontend API integration
- [x] **Performance optimization** - 1-hour caching implemented

### Week 2 (IN PROGRESS)
- [ ] Seed comprehensive resort database (200+ resorts)
- [ ] Map mode implementation (currently disabled)
- [ ] Resort coordinates database
- [ ] Background data refresh job

### Week 3
- [ ] Snow quality algorithm
- [x] **Smart Alert System** ✅ IMPLEMENTED
  - Alert subscription modal on resort cards
  - Notification bell in header with badge
  - Subscribe to light (1-5"), good (5-15"), great (15-30") snow
  - 5-day or 10-day forecast window
  - Database storage with PostgreSQL
- [ ] User authentication (Google/Apple Sign-In)
- [ ] Beta testing

### Week 4
- [ ] Production deployment
- [ ] Domain setup
- [ ] Launch! 🚀

### Post-Launch (Phase 2)
- [ ] **Reviews & Tips** system
- [ ] **Historical Comparison** (vs last year / 5-year avg)
- [ ] Push notifications (browser + email)
- [ ] Map mode improvements

---

## 🚀 Future Improvements (Backlog)

### Performance Enhancements
1. **Background Data Preloading**
   - Cron job to refresh popular resorts every hour
   - Pre-warm cache for peak usage times
   - Batch API calls for efficiency

2. **Progressive Loading**
   - Skeleton loading states
   - Optimistic UI updates
   - Service worker for offline access

### Feature Ideas

#### 1. 🔔 Smart Alert System (Priority: High)
Subscribe to snow alerts for your favorite resorts!

**User Flow:**
1. User clicks on a resort → sees "Subscribe to Alerts" button
2. User selects alert threshold:
   - 🩵 Light Snow (1-5" predicted)
   - 🔵 Good Snow (5-15" predicted)
   - 🟣 Great Snow (15-30" predicted)
3. User chooses timeframe: Next 5 days or Next 10 days
4. System monitors forecasts and sends notifications

**Technical Implementation:**
```
Database:
- AlertSubscription table (userId, resortId, threshold, timeframe, isActive)

API Endpoints:
- POST /api/alerts/subscribe     # Create alert subscription
- GET  /api/alerts/my            # Get user's subscriptions
- DELETE /api/alerts/:id         # Unsubscribe

Notification Options:
- Email notifications (via SendGrid/Resend)
- Browser push notifications (Web Push API)
- In-app notification center
```

**UI Components:**
- Alert subscription modal on ResortCard
- "My Alerts" dashboard page
- Notification bell icon in header with badge count

---

#### 2. 📊 Enhanced Analytics - Historical Comparison (Priority: Medium)
Compare current conditions with historical data!

**Features:**
- "How does this compare?" section on each resort
- Compare current snowfall to:
  - Same week last year
  - 5-year average for this week
  - Best/worst year on record

**Data Display:**
```
Example UI:
┌─────────────────────────────────────────┐
│  📊 Historical Comparison               │
├─────────────────────────────────────────┤
│  This Week: 24" ████████████ 🟣 Great!  │
│  Last Year: 12" ██████                  │
│  5yr Avg:   18" █████████               │
│  Best Ever: 48" (2019)                  │
├─────────────────────────────────────────┤
│  ✨ 33% above average - Great season!   │
└─────────────────────────────────────────┘
```

**Data Sources:**
- OpenSnow historical data (if available via API)
- NOAA historical weather data
- Manual data collection for major resorts
- Store our own forecasts over time for future comparison

**Technical Implementation:**
```
Database:
- HistoricalSnow table (resortId, seasonYear, weekNumber, totalSnow)
- Import historical data as seed

API Endpoints:
- GET /api/resorts/:id/history    # Historical comparison data
- GET /api/resorts/:id/trends     # Season trends
```

---

#### 3. 💬 Social Features - Reviews & Tips (Priority: Medium)

**A. Resort Reviews**
Users can leave reviews for resorts they've visited:
- Overall rating (1-5 stars)
- Categories: Terrain, Crowds, Value, Snow Quality
- Written review (optional)
- Photos (optional)
- Date visited

**Review UI:**
```
┌─────────────────────────────────────────┐
│  💬 Community Reviews          4.5 ⭐    │
├─────────────────────────────────────────┤
│  ⭐⭐⭐⭐⭐ "Best powder day ever!"      │
│  @SkiLover42 • Jan 5, 2026              │
│  Terrain: ⭐⭐⭐⭐⭐  Crowds: ⭐⭐⭐⭐     │
│  "Hit the back bowls early morning..."  │
├─────────────────────────────────────────┤
│  [Write a Review] [See All 127 Reviews] │
└─────────────────────────────────────────┘
```

**B. Tips Section**
Curated tips for each resort:
- Best runs for beginners/intermediate/expert
- Secret powder stashes
- Best time to arrive to avoid crowds
- Parking tips
- Restaurant recommendations
- Gear rental suggestions

**Tips UI:**
```
┌─────────────────────────────────────────┐
│  💡 Local Tips                          │
├─────────────────────────────────────────┤
│  🎿 Best Powder: "Blue Sky Basin opens  │
│     late - go there after 11am"         │
│                                         │
│  🚗 Parking: "Arrive before 8am on      │
│     weekends or use Town of Vail lot"   │
│                                         │
│  🍔 Food: "Mid-Vail has the best        │
│     views but Two Elks is less crowded" │
├─────────────────────────────────────────┤
│  [Add a Tip] [See All Tips]             │
└─────────────────────────────────────────┘
```

**Technical Implementation:**
```
Database:
- Review table (userId, resortId, rating, categories, text, photos, visitDate)
- Tip table (userId, resortId, category, content, upvotes)
- Report table (for moderation)

API Endpoints:
- GET  /api/resorts/:id/reviews   # Get reviews
- POST /api/resorts/:id/reviews   # Add review
- GET  /api/resorts/:id/tips      # Get tips
- POST /api/resorts/:id/tips      # Add tip
- POST /api/tips/:id/upvote       # Upvote a tip

Moderation:
- Flag inappropriate content
- Admin review queue
- Spam detection
```

**Authentication Required:**
- Reviews and tips require user login
- Can use Google/Apple Sign-In for easy onboarding
- Guest users can read but not write

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
