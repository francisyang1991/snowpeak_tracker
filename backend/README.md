# SnowPeak Backend API

Express.js + TypeScript + Prisma backend for SnowPeak Tracker.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Create a `.env` file:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/snowpeak?schema=public"
GEMINI_API_KEY="your-gemini-api-key"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

### 3. Set Up Database

**Option A: Local PostgreSQL with Docker**
```bash
docker run --name snowpeak-db \
  -e POSTGRES_USER=snowpeak \
  -e POSTGRES_PASSWORD=snowpeak \
  -e POSTGRES_DB=snowpeak \
  -p 5432:5432 \
  -d postgres:16

# Update .env
DATABASE_URL="postgresql://snowpeak:snowpeak@localhost:5432/snowpeak?schema=public"
```

**Option B: Supabase**
1. Create project at supabase.com
2. Get connection string from Settings > Database
3. Update DATABASE_URL in .env

### 4. Initialize Database
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed with 70+ US ski resorts
npm run seed

# Optional: View data
npm run db:studio
```

### 5. Start Server
```bash
npm run dev
```

Server runs at http://localhost:3001

## API Endpoints

### Health Check
```
GET /health
```

### Resorts
```
GET  /api/resorts              # List all resorts
GET  /api/resorts/:id          # Get resort with forecast
GET  /api/resorts/:id?refresh  # Force refresh
GET  /api/resorts/:id/forecast # Forecast only
```

### Forecasts
```
GET /api/forecasts/top              # Top 5 by snow
GET /api/forecasts/top?region=CO    # Filter by region
GET /api/forecasts/summary          # National summary
GET /api/forecasts/alerts           # Powder alerts
```

### Map Data
```
GET /api/map/resorts                # All with coordinates
GET /api/map/resorts?minSnow=6      # Filter by snow
GET /api/map/heatmap                # Heatmap format
GET /api/map/regions                # Regional summaries
```

### AI Chat
```
POST /api/chat                 # { question: "..." }
POST /api/chat/resort          # { resortName, question }
GET  /api/chat/suggestions     # Suggested questions
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to DB |
| `npm run db:migrate` | Run migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run seed` | Seed resort data |

## Database Schema

### Resort
- id, name, location, state, region
- latitude, longitude
- totalLifts, totalTrails
- verticalDrop, elevations

### SnowReport (daily)
- baseDepth, last24Hours, last48Hours
- liftsOpen, trailsOpen
- conditions, snowQuality

### Forecast (per day)
- predictedSnow, tempHigh, tempLow
- condition, snowProbability
- windSpeed, powderScore

## Deployment

### Railway
```bash
railway init
railway add postgresql
railway up
```

### Render
```bash
# Connect GitHub repo
# Set environment variables
# Deploy
```

### Environment Variables for Production
```
DATABASE_URL=<railway/supabase connection string>
GEMINI_API_KEY=<your key>
PORT=3001
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```
