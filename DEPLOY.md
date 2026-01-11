# 🚀 SnowPeak Tracker - Deployment Guide

## Quick Deploy (15 minutes)

---

## Step 1: Get Your Gemini API Key (FREE)

1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)

---

## Step 2: Set Up Supabase Database (FREE)

1. Go to https://supabase.com
2. Sign up / Log in with GitHub
3. Click **"New Project"**
4. Fill in:
   - **Name**: `snowpeak`
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
5. Wait ~2 minutes for project to create
6. Go to **Settings** → **Database**
7. Under **Connection string**, select **URI** tab
8. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

---

## Step 3: Configure Backend

Create `/backend/.env` file:

```bash
cd backend
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
GEMINI_API_KEY="AIzaSy..."
PORT=3001
FRONTEND_URL="http://localhost:5173"
NODE_ENV=development
EOF
```

Replace:
- `YOUR_PASSWORD` with your Supabase password
- `xxxxx` with your Supabase project ID
- `AIzaSy...` with your Gemini API key

---

## Step 4: Initialize Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Push schema to Supabase
npx prisma db push

# Seed 70+ US ski resorts
npm run seed
```

You should see:
```
🌱 Starting database seed...
  ✓ Vail
  ✓ Breckenridge
  ...
✅ Seeded 70 ski resorts
```

---

## Step 5: Start Backend

```bash
npm run dev
```

Should show:
```
❄️  SnowPeak API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Running on: http://localhost:3001
```

---

## Step 6: Configure Frontend

Create `/.env.local`:

```bash
cd ..
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3001/api
GEMINI_API_KEY=AIzaSy...
EOF
```

---

## Step 7: Start Frontend

```bash
npm run dev
```

Open http://localhost:3000 - you should see real data now! 🎉

---

## Production Deployment

### Frontend → Vercel (FREE)

**Option A: Via Vercel Dashboard (Recommended)**

1. Go to https://vercel.com/dashboard
2. Click **"Add New" → "Project"**
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Add Environment Variables:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   GEMINI_API_KEY=AIzaSyArAfhHMf8XY5u26Gy4OSwFOhDB6KIOv7Q
   ```
6. Click **Deploy**!

**Option B: Via Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (follow prompts)
vercel

# Set environment variables
vercel env add VITE_API_URL production
vercel env add GEMINI_API_KEY production
```

### Backend → Railway ($5/month) or Vercel Functions

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your repo, select `backend` folder
5. Add environment variables:
   - `DATABASE_URL` (from Supabase)
   - `GEMINI_API_KEY`
   - `PORT=3001`
   - `FRONTEND_URL=https://your-app.vercel.app`
6. Deploy!

---

## Environment Variables Summary

### Frontend (`.env.local` or Vercel)
```
VITE_API_URL=http://localhost:3001/api  # or production URL
GEMINI_API_KEY=AIzaSy...
```

### Backend (`.env` or Railway)
```
DATABASE_URL=postgresql://...
GEMINI_API_KEY=AIzaSy...
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=production
```

---

## Troubleshooting

### "Failed to load map data"
→ Backend not running. Start with `cd backend && npm run dev`

### "Mock data" showing
→ No Gemini API key set. Add to `.env.local`

### Database connection error
→ Check `DATABASE_URL` in backend `.env`

### CORS error
→ Update `FRONTEND_URL` in backend `.env`

---

## Cost Breakdown

| Service | Cost |
|---------|------|
| Supabase | FREE (500MB) |
| Vercel | FREE |
| Railway | $5/month (or free with GitHub Student) |
| Gemini API | FREE (generous limits) |
| **Total** | **$0-5/month** |

---

**Ready to beat OpenSnow! 🏔️❄️**
