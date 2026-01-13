import express from 'express';
import cors from 'cors';
import { resortRoutes } from './routes/resorts.js';
import { forecastRoutes } from './routes/forecasts.js';
import { mapRoutes } from './routes/map.js';
import { chatRoutes } from './routes/chat.js';
import { alertRoutes } from './routes/alerts.js';
import { quickPreload, preloadAllData } from './services/preloader.js';
import { refreshAllCachedResorts, startBackgroundRefreshScheduler, populateKnownResorts } from './services/backgroundRefresh.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - Allow multiple origins for development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const env = process.env.NODE_ENV || 'development';
      console.warn(`CORS blocked origin: ${origin} (env=${env})`);
      if (env === 'development') {
        callback(null, true); // Allow all in development
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'snowpeak-api',
    timestamp: new Date().toISOString()
  });
});

// Preload endpoint (can be triggered by cron or manually)
app.post('/api/preload', async (req, res) => {
  try {
    const { mode = 'quick', maxResorts } = req.body;
    
    console.log(`\n🚀 Preload triggered via API (mode: ${mode})\n`);
    
    if (mode === 'full') {
      const result = await preloadAllData({ maxResorts });
      res.json({ success: true, ...result });
    } else {
      await quickPreload();
      res.json({ success: true, mode: 'quick' });
    }
  } catch (error) {
    console.error('Preload failed:', error);
    res.status(500).json({ error: 'Preload failed' });
  }
});

// Crawl endpoint - Discovery + Refresh
app.post('/api/crawl', async (req, res) => {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.header('authorization') || '';
      if (auth !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    console.log('[Crawl] Manual crawl requested');
    // Run in background so we don't timeout the request
    (async () => {
      try {
        await populateKnownResorts();
        await refreshAllCachedResorts({ maxResorts: 1000 });
      } catch (e) {
        console.error('[Crawl] Background job failed:', e);
      }
    })();

    res.json({ ok: true, message: 'Crawl started in background' });
  } catch (error) {
    console.error('Crawl trigger failed:', error);
    res.status(500).json({ error: 'Crawl trigger failed' });
  }
});

// Refresh endpoint (safe to call from cron). Protect with CRON_SECRET if set.
app.post('/api/refresh', async (req, res) => {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.header('authorization') || '';
      if (auth !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const { maxResorts } = req.body || {};
    const result = await refreshAllCachedResorts({ maxResorts: typeof maxResorts === 'number' ? maxResorts : undefined });
    // Avoid duplicate keys since `result` includes `{ success: number }`
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Refresh failed:', error);
    res.status(500).json({ error: 'Refresh failed' });
  }
});

// API Routes
app.use('/api/resorts', resortRoutes);
app.use('/api/forecasts', forecastRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/alerts', alertRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ❄️  SnowPeak API Server
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 Running on: http://localhost:${PORT}
  📊 Environment: ${process.env.NODE_ENV || 'development'}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
  
  // Auto-preload on startup (runs in background, doesn't block server)
  const AUTO_PRELOAD = process.env.AUTO_PRELOAD !== 'false';
  const FULL_STARTUP_REFRESH = process.env.FULL_STARTUP_REFRESH === 'true';
  
  if (AUTO_PRELOAD) {
    console.log('  🔄 Starting background preload...\n');
    
    // Run preload in background after 2 seconds
    setTimeout(() => {
      if (FULL_STARTUP_REFRESH) {
        console.log('  🔄 Full resort refresh on startup enabled');
        refreshAllCachedResorts({ maxResorts: 100 }).catch(err => {
          console.error('Startup refresh failed:', err);
        });
      } else {
        quickPreload().catch(err => {
          console.error('Background preload failed:', err);
        });
      }
    }, 2000);
  }

  // Background refresh scheduler (every 6h by default; only runs on long-lived servers)
  startBackgroundRefreshScheduler();
});

export default app;
