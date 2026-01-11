import express from 'express';
import cors from 'cors';
import { resortRoutes } from './routes/resorts.js';
import { forecastRoutes } from './routes/forecasts.js';
import { mapRoutes } from './routes/map.js';
import { chatRoutes } from './routes/chat.js';
import { alertRoutes } from './routes/alerts.js';
import { quickPreload, preloadAllData } from './services/preloader.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
  
  if (AUTO_PRELOAD) {
    console.log('  🔄 Starting background preload...\n');
    
    // Run preload in background after 2 seconds
    setTimeout(() => {
      quickPreload().catch(err => {
        console.error('Background preload failed:', err);
      });
    }, 2000);
  }
});

export default app;
