import { Router } from 'express';
import prisma from '../db/client.js';
import { geminiService } from '../services/gemini.js';

export const forecastRoutes = Router();

// In-memory cache for top resorts (refresh every 30 minutes)
const topResortsCache: {
  data: any[];
  region: string;
  timestamp: number;
} = {
  data: [],
  region: '',
  timestamp: 0,
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * GET /api/forecasts/top
 * Get top resorts by predicted snowfall
 */
forecastRoutes.get('/top', async (req, res) => {
  try {
    const { region = 'All', limit = '5', refresh } = req.query;
    const regionStr = region as string;
    const limitNum = parseInt(limit as string);

    // Check cache
    const now = Date.now();
    if (
      refresh !== 'true' &&
      topResortsCache.region === regionStr &&
      topResortsCache.data.length > 0 &&
      now - topResortsCache.timestamp < CACHE_DURATION
    ) {
      return res.json({
        region: regionStr,
        count: Math.min(topResortsCache.data.length, limitNum),
        resorts: topResortsCache.data.slice(0, limitNum),
        cached: true,
        cacheAge: Math.floor((now - topResortsCache.timestamp) / 1000),
      });
    }

    // Fetch fresh data from Gemini
    const topResorts = await geminiService.fetchTopSnowfallResorts(regionStr, limitNum);
    
    // Update cache
    topResortsCache.data = topResorts;
    topResortsCache.region = regionStr;
    topResortsCache.timestamp = now;

    // Store in database for persistence
    for (const resort of topResorts) {
      const id = resort.name.toLowerCase().replace(/\s+/g, '-');
      
      await prisma.resort.upsert({
        where: { id },
        update: {
          latitude: resort.latitude || 0,
          longitude: resort.longitude || 0,
          updatedAt: new Date(),
        },
        create: {
          id,
          name: resort.name,
          location: resort.location,
          state: resort.state || 'US',
          region: determineRegionFromState(resort.state),
          latitude: resort.latitude || 0,
          longitude: resort.longitude || 0,
        },
      });

      // Store 5-day forecast total
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await prisma.forecast.upsert({
        where: {
          resortId_forecastDate: {
            resortId: id,
            forecastDate: today,
          },
        },
        update: {
          predictedSnow: resort.predictedSnow,
        },
        create: {
          resortId: id,
          forecastDate: today,
          predictedSnow: resort.predictedSnow,
          condition: resort.summary,
        },
      });
    }

    res.json({
      region: regionStr,
      count: topResorts.length,
      resorts: topResorts,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching top forecasts:', error);
    res.status(500).json({ error: 'Failed to fetch top forecasts' });
  }
});

/**
 * GET /api/forecasts/summary
 * Get national snowfall summary
 */
forecastRoutes.get('/summary', async (req, res) => {
  try {
    // Get all forecasts for next 5 days
    const fiveDaysOut = new Date();
    fiveDaysOut.setDate(fiveDaysOut.getDate() + 5);

    const forecasts = await prisma.forecast.findMany({
      where: {
        forecastDate: {
          gte: new Date(),
          lte: fiveDaysOut,
        },
      },
      include: {
        resort: true,
      },
      orderBy: { predictedSnow: 'desc' },
    });

    // Aggregate by region
    const regionStats: Record<string, { totalSnow: number; resortCount: number; topResort: string }> = {};
    
    for (const forecast of forecasts) {
      const region = forecast.resort.region;
      if (!regionStats[region]) {
        regionStats[region] = { totalSnow: 0, resortCount: 0, topResort: '' };
      }
      regionStats[region].totalSnow += forecast.predictedSnow;
      regionStats[region].resortCount++;
      if (!regionStats[region].topResort && forecast.predictedSnow > 0) {
        regionStats[region].topResort = forecast.resort.name;
      }
    }

    res.json({
      period: '5-day',
      regions: Object.entries(regionStats).map(([region, stats]) => ({
        region,
        averageSnow: Math.round(stats.totalSnow / stats.resortCount * 10) / 10,
        resortCount: stats.resortCount,
        topResort: stats.topResort,
      })),
      totalResorts: forecasts.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching forecast summary:', error);
    res.status(500).json({ error: 'Failed to fetch forecast summary' });
  }
});

/**
 * GET /api/forecasts/alerts
 * Get resorts with significant snowfall predicted
 */
forecastRoutes.get('/alerts', async (req, res) => {
  try {
    const { threshold = '12', hours = '48' } = req.query;
    const thresholdNum = parseInt(threshold as string);
    const hoursNum = parseInt(hours as string);

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() + hoursNum);

    const forecasts = await prisma.forecast.findMany({
      where: {
        forecastDate: {
          gte: new Date(),
          lte: cutoff,
        },
        predictedSnow: { gte: thresholdNum },
      },
      include: {
        resort: {
          select: {
            id: true,
            name: true,
            location: true,
            state: true,
          },
        },
      },
      orderBy: { predictedSnow: 'desc' },
    });

    res.json({
      threshold: thresholdNum,
      timeframe: `${hoursNum} hours`,
      count: forecasts.length,
      alerts: forecasts.map(f => ({
        resort: f.resort,
        forecastDate: f.forecastDate,
        predictedSnow: f.predictedSnow,
        condition: f.condition,
      })),
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Helper function
function determineRegionFromState(state: string): string {
  const regionMap: Record<string, string> = {
    'CO': 'Rockies', 'UT': 'Rockies', 'WY': 'Rockies', 'MT': 'Rockies',
    'ID': 'Rockies', 'NM': 'Rockies', 'AZ': 'Rockies',
    'CA': 'Pacific', 'WA': 'Pacific', 'OR': 'Pacific', 'NV': 'Pacific',
    'VT': 'Northeast', 'NH': 'Northeast', 'ME': 'Northeast', 'NY': 'Northeast',
    'MA': 'Northeast', 'CT': 'Northeast', 'PA': 'Northeast',
    'MI': 'Midwest', 'WI': 'Midwest', 'MN': 'Midwest', 'OH': 'Midwest',
  };
  return regionMap[state] || 'Other';
}
