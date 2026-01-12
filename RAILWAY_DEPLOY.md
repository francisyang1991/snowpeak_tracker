# 🚂 SnowPeak Tracker - Railway Full Deployment Guide

Deploy **both frontend and backend** on Railway, keeping Supabase as your database.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Railway Project                       │
├─────────────────────────┬───────────────────────────────┤
│   Frontend Service      │      Backend Service          │
│   (Vite/React)          │      (Express API)            │
│   Root: /               │      Root: /backend           │
│                         │                               │
│   snowpeak.up.railway   │   snowpeak-api.up.railway     │
└─────────────────────────┴───────────────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │    Supabase     │
                          │   (PostgreSQL)  │
                          │   (stays free)  │
                          └─────────────────┘
```

---

## Prerequisites

1. **GitHub repo** with your SnowPeak code pushed
2. **Supabase project** (free tier is fine)
3. **Gemini API key** (free from Google AI Studio)
4. **Resend API key** (optional, for email alerts)

---

## Step 1: Create Railway Account & Project

1. Go to https://railway.app
2. Sign up with GitHub
3. Click **"New Project"** → **"Empty Project"**
4. Name it: `snowpeak`

---

## Step 2: Deploy Backend Service

### 2.1 Add the Backend Service

1. In your Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select your `snowpeak_tracker` repository
3. **Important**: Click **"Add Root Directory"** and enter: `backend`
4. Click **"Deploy"**

### 2.2 Configure Backend Settings

Go to the backend service → **Settings**:

- **Build Command**: `npm run build`
- **Start Command**: `npm start`

### 2.3 Add Backend Environment Variables

Go to **Variables** tab and add:

```env
# Required - Supabase (your existing database)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Required - Gemini AI
GEMINI_API_KEY=AIzaSy...

# Required - Environment
NODE_ENV=production

# Will be set after frontend is deployed (Step 3)
FRONTEND_URL=https://your-frontend.up.railway.app

# Optional - Email alerts (Resend)
RESEND_API_KEY=re_...
ALERT_FROM_EMAIL=SnowPeak <alerts@yourdomain.com>

# Optional - Background refresh (recommended!)
REFRESH_SCHEDULER_ENABLED=true
REFRESH_INTERVAL_HOURS=6

# Optional - Cron security
CRON_SECRET=some-random-secret-string
```

### 2.4 Generate Backend Domain

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `snowpeak-backend-production.up.railway.app`)

---

## Step 3: Deploy Frontend Service

### 3.1 Add the Frontend Service

1. In the same Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select the **same** `snowpeak_tracker` repository
3. **DO NOT set a root directory** (frontend is at root)
4. Click **"Deploy"**

### 3.2 Configure Frontend Settings

Go to the frontend service → **Settings**:

- **Build Command**: `npm run build`
- **Start Command**: `npm start`

### 3.3 Add Frontend Environment Variables

Go to **Variables** tab and add:

```env
# Point to your backend service (from Step 2.4)
VITE_API_URL=https://snowpeak-backend-production.up.railway.app/api

# Optional - Gemini key for direct AI calls (usually not needed if using backend)
GEMINI_API_KEY=AIzaSy...
```

### 3.4 Generate Frontend Domain

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `snowpeak-production.up.railway.app`)

---

## Step 4: Update Backend CORS

Now that you have both URLs, go back to **Backend service → Variables** and update:

```env
FRONTEND_URL=https://snowpeak-production.up.railway.app
```

The backend will automatically allow CORS from this origin.

---

## Step 5: Initialize Supabase Database (if not done already)

If you haven't run the migrations yet:

1. Go to Supabase Dashboard → **SQL Editor**
2. Paste contents of `backend/supabase/migrations/001_initial_schema.sql`
3. Run the query

This creates all needed tables including:
- `Resort`, `SnowReport`, `Forecast` (for snow data)
- `AlertSubscription`, `AlertNotification` (for email alerts)

---

## Step 6: Verify Deployment

### Check Backend Health

```bash
curl https://YOUR-BACKEND.up.railway.app/health
```

Should return:
```json
{"status":"ok","service":"snowpeak-api","timestamp":"..."}
```

### Check Frontend

Open `https://YOUR-FRONTEND.up.railway.app` in browser.

You should see the SnowPeak Tracker with real data!

---

## Environment Variables Summary

### Backend Service (`/backend` root)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `NODE_ENV` | ✅ | Set to `production` |
| `FRONTEND_URL` | ✅ | Your frontend Railway URL |
| `RESEND_API_KEY` | ❌ | For email alerts |
| `ALERT_FROM_EMAIL` | ❌ | Email sender address |
| `REFRESH_SCHEDULER_ENABLED` | ❌ | Enable 6hr background refresh |
| `REFRESH_INTERVAL_HOURS` | ❌ | Refresh interval (default: 6) |
| `CRON_SECRET` | ❌ | Protect /api/refresh endpoint |

### Frontend Service (root `/`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend API URL with `/api` |
| `GEMINI_API_KEY` | ❌ | Usually not needed |

---

## Cost Breakdown

| Service | Cost |
|---------|------|
| Railway (Hobby Plan) | **$5/month** (includes both services) |
| Supabase | **FREE** (500MB database) |
| Gemini API | **FREE** (generous limits) |
| Resend | **FREE** (100 emails/day) |
| **Total** | **$5/month** |

---

## Troubleshooting

### "Failed to fetch" errors in frontend
- Check `VITE_API_URL` points to correct backend URL with `/api` suffix
- Check `FRONTEND_URL` in backend matches your frontend domain
- Verify backend is running: `curl https://backend.up.railway.app/health`

### Backend deployment fails
- Check Railway logs for error messages
- Ensure `backend/` root directory is set
- Verify all required env vars are set

### Frontend shows "No data"
- Backend might still be warming up (wait 30s)
- Check browser console for errors
- Verify Supabase connection is working

### Alerts/notifications not working
- Run the SQL migration in Supabase
- Verify `RESEND_API_KEY` is set (for email)
- Check subscriptions have valid email addresses

---

## Custom Domain (Optional)

1. Go to service → **Settings** → **Networking**
2. Click **"+ Custom Domain"**
3. Enter your domain (e.g., `snowpeak.yourdomain.com`)
4. Add the CNAME record to your DNS provider
5. Wait for SSL certificate (automatic)

---

## 🎉 You're Live!

Your SnowPeak Tracker is now running on Railway with:
- ✅ React frontend with real-time snow data
- ✅ Express backend with caching
- ✅ Supabase PostgreSQL database
- ✅ 6-hour background data refresh
- ✅ Email alerts (if configured)

**Happy powder hunting! 🏔️❄️**
