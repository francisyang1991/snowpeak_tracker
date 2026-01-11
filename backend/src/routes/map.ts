import { Router } from 'express';
import prisma from '../db/client.js';
import { geminiService } from '../services/gemini.js';

export const mapRoutes = Router();

// Cache for map data (refresh every hour)
const mapDataCache: {
  data: any[];
  timestamp: number;
} = {
  data: [],
  timestamp: 0,
};

const MAP_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/map/resorts
 * Get all resorts with coordinates and snow data for map visualization
 */
mapRoutes.get('/resorts', async (req, res) => {
  try {
    const { refresh, region, minSnow = '0' } = req.query;
    const minSnowNum = parseFloat(minSnow as string);

    const now = Date.now();
    
    // Check cache
    if (
      refresh !== 'true' &&
      mapDataCache.data.length > 0 &&
      now - mapDataCache.timestamp < MAP_CACHE_DURATION
    ) {
      let filteredData = mapDataCache.data;
      
      if (region && region !== 'All') {
        filteredData = filteredData.filter(r => 
          r.state === region || r.region === region
        );
      }
      
      if (minSnowNum > 0) {
        filteredData = filteredData.filter(r => r.snow48h >= minSnowNum);
      }

      return res.json({
        count: filteredData.length,
        resorts: filteredData,
        cached: true,
        cacheAge: Math.floor((now - mapDataCache.timestamp) / 1000),
      });
    }

    // Try to get from database first
    const dbResorts = await prisma.resort.findMany({
      where: {
        latitude: { not: 0 },
        longitude: { not: 0 },
      },
      include: {
        snowReports: {
          orderBy: { reportDate: 'desc' },
          take: 1,
        },
        forecasts: {
          where: {
            forecastDate: { gte: new Date() },
          },
          orderBy: { forecastDate: 'asc' },
          take: 5,
        },
      },
    });

    if (dbResorts.length > 20) {
      // Use database data
      const mapData = dbResorts.map(resort => ({
        id: resort.id,
        name: resort.name,
        state: resort.state,
        region: resort.region,
        latitude: resort.latitude,
        longitude: resort.longitude,
        currentBase: resort.snowReports[0]?.baseDepth || 0,
        snow24h: resort.forecasts[0]?.predictedSnow || 0,
        snow48h: resort.forecasts.slice(0, 2).reduce((sum, f) => sum + f.predictedSnow, 0),
        snow5day: resort.forecasts.reduce((sum, f) => sum + f.predictedSnow, 0),
        liftsOpen: resort.snowReports[0]?.liftsOpen || 0,
        totalLifts: resort.totalLifts,
      }));

      mapDataCache.data = mapData;
      mapDataCache.timestamp = now;

      return res.json({
        count: mapData.length,
        resorts: mapData,
        cached: false,
        source: 'database',
      });
    }

    // Fetch from Gemini if database is empty
    const mapData = await geminiService.fetchMapData(region as string || 'All');
    
    // Store in database
    for (const resort of mapData) {
      const id = resort.name.toLowerCase().replace(/\s+/g, '-');
      
      if (resort.latitude && resort.longitude) {
        await prisma.resort.upsert({
          where: { id },
          update: {
            latitude: resort.latitude,
            longitude: resort.longitude,
            updatedAt: new Date(),
          },
          create: {
            id,
            name: resort.name,
            location: `${resort.state}, USA`,
            state: resort.state,
            region: determineRegionFromState(resort.state),
            latitude: resort.latitude,
            longitude: resort.longitude,
          },
        });
      }
    }

    // Format for response
    const formattedData = mapData.map((r: any) => ({
      id: r.name.toLowerCase().replace(/\s+/g, '-'),
      name: r.name,
      state: r.state,
      latitude: r.latitude,
      longitude: r.longitude,
      currentBase: r.currentBase || 0,
      snow24h: r.snow24h || 0,
      snow48h: r.snow48h || 0,
      snow5day: r.snow5day || 0,
    }));

    mapDataCache.data = formattedData;
    mapDataCache.timestamp = now;

    res.json({
      count: formattedData.length,
      resorts: formattedData,
      cached: false,
      source: 'gemini',
    });
  } catch (error) {
    console.error('Error fetching map data:', error);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

/**
 * GET /api/map/heatmap
 * Get data formatted for heatmap visualization
 */
mapRoutes.get('/heatmap', async (req, res) => {
  try {
    const { metric = 'snow48h' } = req.query;
    
    const resorts = await prisma.resort.findMany({
      where: {
        latitude: { not: 0 },
        longitude: { not: 0 },
      },
      include: {
        forecasts: {
          where: {
            forecastDate: { gte: new Date() },
          },
          orderBy: { forecastDate: 'asc' },
          take: 5,
        },
      },
    });

    const heatmapData = resorts.map(resort => {
      let value = 0;
      
      switch (metric) {
        case 'snow24h':
          value = resort.forecasts[0]?.predictedSnow || 0;
          break;
        case 'snow48h':
          value = resort.forecasts.slice(0, 2).reduce((sum, f) => sum + f.predictedSnow, 0);
          break;
        case 'snow5day':
          value = resort.forecasts.reduce((sum, f) => sum + f.predictedSnow, 0);
          break;
      }

      return {
        lat: resort.latitude,
        lng: resort.longitude,
        value,
        name: resort.name,
      };
    }).filter(d => d.value > 0);

    res.json({
      metric,
      count: heatmapData.length,
      data: heatmapData,
    });
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

/**
 * GET /api/map/regions
 * Get regional snowfall summaries
 */
mapRoutes.get('/regions', async (req, res) => {
  try {
    const regions = ['Rockies', 'Pacific', 'Northeast', 'Midwest'];
    
    const regionData = await Promise.all(
      regions.map(async (region) => {
        const resorts = await prisma.resort.findMany({
          where: { region },
          include: {
            forecasts: {
              where: {
                forecastDate: { gte: new Date() },
              },
              take: 2,
            },
          },
        });

        const total48h = resorts.reduce((sum, r) => {
          const snow = r.forecasts.reduce((s, f) => s + f.predictedSnow, 0);
          return sum + snow;
        }, 0);

        return {
          region,
          resortCount: resorts.length,
          averageSnow48h: resorts.length > 0 
            ? Math.round(total48h / resorts.length * 10) / 10 
            : 0,
          topResort: resorts
            .map(r => ({
              name: r.name,
              snow: r.forecasts.reduce((s, f) => s + f.predictedSnow, 0),
            }))
            .sort((a, b) => b.snow - a.snow)[0]?.name || null,
        };
      })
    );

    res.json({
      regions: regionData,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching region data:', error);
    res.status(500).json({ error: 'Failed to fetch region data' });
  }
});

// Helper
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
