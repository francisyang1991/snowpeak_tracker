import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { resortRoutes } from './routes/resorts.js';
import { forecastRoutes } from './routes/forecasts.js';
import { mapRoutes } from './routes/map.js';
import { chatRoutes } from './routes/chat.js';

// Load environment variables
dotenv.config();

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

// API Routes
app.use('/api/resorts', resortRoutes);
app.use('/api/forecasts', forecastRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/chat', chatRoutes);

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
});

export default app;
