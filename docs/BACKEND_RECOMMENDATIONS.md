# Backend & Database Recommendations

## 🎯 Recommended Architecture

### Option A: Node.js + PostgreSQL (Recommended)

Best for: Full control, scalability, and complex queries.

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   React     │────▶│   Express.js    │────▶│  PostgreSQL  │
│   Frontend  │     │   Backend       │     │   Database   │
└─────────────┘     └─────────────────┘     └──────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Gemini AI    │
                    │  (Server-side)│
                    └───────────────┘
```

**Tech Stack:**
- Runtime: Node.js 20+
- Framework: Express.js or Fastify
- ORM: Prisma or Drizzle
- Database: PostgreSQL (Supabase, Neon, or Railway)
- Caching: Redis (optional)

### Option B: Supabase (Quick Setup)

Best for: Rapid development with built-in auth.

```
┌─────────────┐     ┌─────────────────┐     
│   React     │────▶│    Supabase     │
│   Frontend  │     │  (BaaS + DB)    │
└─────────────┘     └─────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      ┌──────────────┐           ┌──────────────┐
      │  PostgreSQL  │           │  Edge Funcs  │
      │  (built-in)  │           │  (Gemini AI) │
      └──────────────┘           └──────────────┘
```

### Option C: Firebase (Serverless)

Best for: Simple setup, real-time updates.

```
┌─────────────┐     ┌─────────────────┐     
│   React     │────▶│    Firebase     │
│   Frontend  │     │   Functions     │
└─────────────┘     └─────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Firestore   │
                    │   (NoSQL)     │
                    └───────────────┘
```

---

## 📦 Recommended Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ski Resorts (Master Data)
CREATE TABLE resorts (
    id VARCHAR(100) PRIMARY KEY,  -- slug like 'vail', 'jackson-hole'
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    state VARCHAR(50),
    region VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    website_url VARCHAR(500),
    total_lifts INTEGER,
    total_trails INTEGER,
    vertical_drop INTEGER,
    base_elevation INTEGER,
    summit_elevation INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Snow Reports (Historical Data)
CREATE TABLE snow_reports (
    id SERIAL PRIMARY KEY,
    resort_id VARCHAR(100) REFERENCES resorts(id),
    report_date DATE NOT NULL,
    base_depth INTEGER,           -- inches
    last_24h_snow INTEGER,        -- inches
    last_48h_snow INTEGER,        -- inches
    lifts_open INTEGER,
    trails_open INTEGER,
    conditions TEXT,
    data_source VARCHAR(100),     -- 'gemini', 'official', 'onthesnow'
    raw_response JSONB,           -- store full AI response
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(resort_id, report_date)
);

-- Snow Forecasts
CREATE TABLE snow_forecasts (
    id SERIAL PRIMARY KEY,
    resort_id VARCHAR(100) REFERENCES resorts(id),
    forecast_date DATE NOT NULL,
    predicted_snow INTEGER,       -- inches
    temp_high INTEGER,            -- fahrenheit
    temp_low INTEGER,
    condition VARCHAR(100),
    fetched_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(resort_id, forecast_date, fetched_at::DATE)
);

-- User Favorites
CREATE TABLE user_favorites (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resort_id VARCHAR(100) REFERENCES resorts(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, resort_id)
);

-- Search History (for analytics)
CREATE TABLE search_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    search_query VARCHAR(255),
    resort_id VARCHAR(100),
    searched_at TIMESTAMP DEFAULT NOW()
);

-- Chat History (AI Assistant)
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    question TEXT NOT NULL,
    answer TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_snow_reports_resort_date ON snow_reports(resort_id, report_date DESC);
CREATE INDEX idx_forecasts_resort_date ON snow_forecasts(resort_id, forecast_date);
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
```

---

## 🗂️ Recommended Backend Folder Structure

```
snowpeak_tracker/
├── frontend/                # Move current code here
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── index.ts         # Entry point
│   │   ├── routes/
│   │   │   ├── resorts.ts   # GET /api/resorts, GET /api/resorts/:id
│   │   │   ├── forecasts.ts # GET /api/forecasts/:resortId
│   │   │   ├── auth.ts      # POST /api/auth/login, signup
│   │   │   └── chat.ts      # POST /api/chat
│   │   ├── services/
│   │   │   ├── gemini.ts    # Gemini AI integration
│   │   │   ├── weather.ts   # External weather APIs
│   │   │   └── cache.ts     # Redis caching
│   │   ├── db/
│   │   │   ├── schema.ts    # Prisma/Drizzle schema
│   │   │   └── client.ts    # DB connection
│   │   ├── middleware/
│   │   │   ├── auth.ts      # JWT validation
│   │   │   └── rateLimit.ts # API rate limiting
│   │   └── utils/
│   │       └── logger.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml       # Local development
└── README.md
```

---

## 🔌 API Endpoints Design

### Resorts
```
GET    /api/resorts                    # List all resorts
GET    /api/resorts/:id                # Get resort details
GET    /api/resorts/:id/snow-report    # Latest snow report
GET    /api/resorts/:id/forecast       # 10-day forecast
GET    /api/resorts/top                # Top 5 by snowfall
```

### User
```
POST   /api/auth/register              # Create account
POST   /api/auth/login                 # Login
GET    /api/user/favorites             # Get favorites
POST   /api/user/favorites/:resortId   # Add favorite
DELETE /api/user/favorites/:resortId   # Remove favorite
```

### AI Assistant
```
POST   /api/chat                       # Ask ski assistant
GET    /api/chat/history               # Get chat history
```

---

## ⚡ Quick Start Implementation

### Step 1: Set up backend folder

```bash
mkdir -p backend/src/{routes,services,db,middleware}
cd backend
npm init -y
npm install express typescript @types/express @types/node prisma @prisma/client
npm install -D tsx nodemon
```

### Step 2: Basic Express server (`backend/src/index.ts`)

```typescript
import express from 'express';
import cors from 'cors';
import { resortRoutes } from './routes/resorts';
import { chatRoutes } from './routes/chat';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/resorts', resortRoutes);
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🏔️ SnowPeak API running on port ${PORT}`);
});
```

### Step 3: Update frontend to use API

```typescript
// frontend/src/services/api.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const fetchResortData = async (resortId: string) => {
  const res = await fetch(`${API_BASE}/resorts/${resortId}/snow-report`);
  return res.json();
};
```

---

## 🔐 Security Considerations

1. **Move API keys to backend** - Never expose Gemini API key in frontend
2. **Implement rate limiting** - Prevent abuse (e.g., 100 requests/min per user)
3. **Add JWT authentication** - Secure user-specific endpoints
4. **Validate inputs** - Use Zod or Joi for request validation
5. **CORS configuration** - Restrict to your frontend domain

---

## 📅 Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1 | 1 week | Basic Express server, PostgreSQL setup, migrate Gemini calls |
| Phase 2 | 1 week | User auth (Supabase Auth or JWT), favorites sync |
| Phase 3 | 1 week | Historical data storage, snow report caching |
| Phase 4 | 1 week | Analytics, search history, performance optimization |

---

## 💰 Hosting Recommendations

| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Vercel** | Frontend hosting | React app deployment |
| **Railway** | $5/month | Backend + PostgreSQL |
| **Supabase** | 500MB DB free | Database + Auth |
| **Neon** | 0.5GB free | Serverless PostgreSQL |
| **Render** | Free tier available | Full-stack hosting |

