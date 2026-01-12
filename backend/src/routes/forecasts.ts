import { Router } from 'express';
import { supabase, getToday, getHoursAgo, getDaysFromNow } from '../db/supabase.js';
import { geminiService } from '../services/gemini.js';

export const forecastRoutes = Router();

type DbMode = 'snake' | 'prisma';
let dbMode: DbMode | null = null;

function isMissingTableError(error: any): boolean {
  return (
    error &&
    typeof error === 'object' &&
    (error.code === 'PGRST205' ||
      (typeof error.message === 'string' && error.message.includes('Could not find the table')))
  );
}

async function detectDbMode(): Promise<DbMode> {
  if (dbMode) return dbMode;
  const snakeProbe = await supabase.from('resorts').select('id').limit(1);
  if (!snakeProbe.error) {
    dbMode = 'snake';
    return dbMode;
  }
  if (isMissingTableError(snakeProbe.error)) {
    const prismaProbe = await supabase.from('Resort').select('id').limit(1);
    if (!prismaProbe.error) {
      dbMode = 'prisma';
      return dbMode;
    }
  }
  dbMode = 'snake';
  return dbMode;
}

// In-memory cache for top resorts by region (refresh every 1 hour)
const topResortsCache: Record<string, {
  data: any[];
  timestamp: number;
}> = {};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/forecasts/top
 * Get top resorts by predicted snowfall
 * Uses database cache first, only calls Gemini API when cache is stale (> 1 hour)
 */
forecastRoutes.get('/top', async (req, res) => {
  try {
    const { region = 'All', limit = '5', refresh } = req.query;
    const regionStr = region as string;
    const limitNum = parseInt(limit as string);
    const now = Date.now();
    const mode = await detectDbMode();

    // 1. Check in-memory cache first (fastest)
    const memoryCache = topResortsCache[regionStr];
    if (
      refresh !== 'true' &&
      memoryCache &&
      memoryCache.data.length > 0 &&
      now - memoryCache.timestamp < CACHE_DURATION
    ) {
      console.log(`[Cache HIT] Memory cache for region: ${regionStr}`);
      return res.json({
        region: regionStr,
        count: Math.min(memoryCache.data.length, limitNum),
        resorts: memoryCache.data.slice(0, limitNum),
        cached: true,
        cacheSource: 'memory',
        cacheAge: Math.floor((now - memoryCache.timestamp) / 1000),
      });
    }

    // 2. Check database cache (within last hour)
    const oneHourAgo = getHoursAgo(1);

    const resortsTable = mode === 'prisma' ? 'Resort' : 'resorts';
    const forecastsTable = mode === 'prisma' ? 'Forecast' : 'forecasts';
    const forecastDateCol = mode === 'prisma' ? 'forecastDate' : 'forecast_date';
    const fetchedAtCol = mode === 'prisma' ? 'fetchedAt' : 'fetched_at';
    const predictedSnowCol = mode === 'prisma' ? 'predictedSnow' : 'predicted_snow';
    const resortIdCol = mode === 'prisma' ? 'resortId' : 'resort_id';

    // Use a 5-day window to compute the "top 5-day total" ranking.
    const today = getToday();
    const fiveDaysOut = getDaysFromNow(5);

    // Build query for forecasts with resort data
    // Prisma mode: join via Resort relationship
    // Snake mode: join via resorts relationship
    let query =
      mode === 'prisma'
        ? supabase
            .from(forecastsTable)
            .select(`*, ${resortsTable}!inner(*)`)
            .gte(fetchedAtCol, oneHourAgo)
            .gte(forecastDateCol, today)
            .lte(forecastDateCol, fiveDaysOut)
            .order(predictedSnowCol, { ascending: false })
            .limit(limitNum * 40)
        : supabase
            .from(forecastsTable)
            .select('*, resorts!inner(*)')
            .gte(fetchedAtCol, oneHourAgo)
            .gte(forecastDateCol, today)
            .lte(forecastDateCol, fiveDaysOut)
            .order(predictedSnowCol, { ascending: false })
            .limit(limitNum * 40);

    // Filter by region/state if specified
    if (regionStr !== 'All') {
      // IMPORTANT: When filtering on a joined (foreign) table in PostgREST, you must use `foreignTable`
      // and refer to columns without the table prefix.
      const safe = regionStr.replace(/[^A-Za-z]/g, ''); // basic hardening for PostgREST filter syntax
      query =
        mode === 'prisma'
          ? (query as any).or(`state.eq.${safe},region.eq.${safe}`, { foreignTable: 'Resort' })
          : (query as any).or(`state.eq.${safe},region.eq.${safe}`, { foreignTable: 'resorts' });
    }

    const { data: dbForecasts, error } = await query;

    if (error && !isMissingTableError(error)) {
      throw error;
    }

    if (!error && dbForecasts && dbForecasts.length > 0) {
      // Group forecasts by resort and sum predicted snow
      const resortSnowMap = new Map<string, { resort: any; totalSnow: number; fetchedAt: string }>();
      
      for (const forecast of dbForecasts) {
        const resortId = (forecast as any)[resortIdCol];
        const existing = resortSnowMap.get(resortId);
        if (existing) {
          existing.totalSnow += (forecast as any)[predictedSnowCol] || 0;
        } else {
          resortSnowMap.set(resortId, {
            resort: mode === 'prisma' ? (forecast as any).Resort : (forecast as any).resorts,
            totalSnow: (forecast as any)[predictedSnowCol] || 0,
            fetchedAt: (forecast as any)[fetchedAtCol],
          });
        }
      }

      // Convert to array and check if we have enough data
      const dbResorts = Array.from(resortSnowMap.values())
        .sort((a, b) => b.totalSnow - a.totalSnow)
        .slice(0, limitNum);

      if (refresh !== 'true' && dbResorts.length >= limitNum) {
        console.log(`[Cache HIT] Database cache for region: ${regionStr}`);
        const formattedResorts = dbResorts.map(item => ({
          name: item.resort.name,
          location: item.resort.location,
          state: item.resort.state,
          predictedSnow: Math.round(item.totalSnow),
          summary: `Based on cached forecast data`,
          latitude: item.resort.latitude,
          longitude: item.resort.longitude,
        }));

        // Update memory cache
        topResortsCache[regionStr] = {
          data: formattedResorts,
          timestamp: now,
        };

        return res.json({
          region: regionStr,
          count: formattedResorts.length,
          resorts: formattedResorts,
          cached: true,
          cacheSource: 'database',
        });
      }
    }

    // 3. Cache miss or refresh requested - fetch fresh data from Gemini
    console.log(`[Cache MISS] Fetching fresh data for region: ${regionStr}`);
    const topResorts = await geminiService.fetchTopSnowfallResorts(regionStr, limitNum);
    
    // Update memory cache
    topResortsCache[regionStr] = {
      data: topResorts,
      timestamp: now,
    };

    // Store in database for persistence
    const nowTimestamp = new Date().toISOString();
    
    for (const resort of topResorts) {
      const id = resort.name.toLowerCase().replace(/\s+/g, '-');
      
      // Upsert resort
      const resortUpsert = await supabase
        .from(mode === 'prisma' ? 'Resort' : 'resorts')
        .upsert(
          mode === 'prisma'
            ? {
                id,
                name: resort.name,
                location: resort.location,
                state: resort.state || 'US',
                region: determineRegionFromState(resort.state),
                latitude: resort.latitude || 0,
                longitude: resort.longitude || 0,
                updatedAt: nowTimestamp,
              }
            : {
                id,
                name: resort.name,
                location: resort.location,
                state: resort.state || 'US',
                region: determineRegionFromState(resort.state),
                latitude: resort.latitude || 0,
                longitude: resort.longitude || 0,
                updated_at: nowTimestamp,
              },
          { onConflict: 'id' },
        );
      if (resortUpsert.error && !isMissingTableError(resortUpsert.error)) throw resortUpsert.error;

      // Store forecast with explicit fetched_at
      const forecastUpsert = await supabase
        .from(mode === 'prisma' ? 'Forecast' : 'forecasts')
        .upsert(
          mode === 'prisma'
            ? {
                resortId: id,
                forecastDate: today,
                predictedSnow: resort.predictedSnow,
                condition: resort.summary,
                fetchedAt: nowTimestamp,
              }
            : {
                resort_id: id,
                forecast_date: today,
                predicted_snow: resort.predictedSnow,
                condition: resort.summary,
                fetched_at: nowTimestamp,
              },
          { onConflict: mode === 'prisma' ? 'resortId,forecastDate' : 'resort_id,forecast_date' },
        );
      if (forecastUpsert.error && !isMissingTableError(forecastUpsert.error)) throw forecastUpsert.error;
    }
    
    console.log(`[Cache STORED] Saved ${topResorts.length} resorts to database for region: ${regionStr}`);

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
    const today = getToday();
    const fiveDaysOut = getDaysFromNow(5);
    const mode = await detectDbMode();

    // Get forecasts with resort data
    const { data: forecasts, error } =
      mode === 'prisma'
        ? await supabase
            .from('Forecast')
            .select('*, Resort!inner(*)')
            .gte('forecastDate', today)
            .lte('forecastDate', fiveDaysOut)
            .order('predictedSnow', { ascending: false })
        : await supabase
            .from('forecasts')
            .select('*, resorts!inner(*)')
            .gte('forecast_date', today)
            .lte('forecast_date', fiveDaysOut)
            .order('predicted_snow', { ascending: false });

    if (error) throw error;

    // Aggregate by region
    const regionStats: Record<string, { totalSnow: number; resortCount: number; topResort: string }> = {};
    
    for (const forecast of forecasts || []) {
      const region = mode === 'prisma' ? (forecast as any).Resort.region : (forecast as any).resorts.region;
      if (!regionStats[region]) {
        regionStats[region] = { totalSnow: 0, resortCount: 0, topResort: '' };
      }
      regionStats[region].totalSnow += mode === 'prisma' ? (forecast as any).predictedSnow : (forecast as any).predicted_snow;
      regionStats[region].resortCount++;
      const predicted = mode === 'prisma' ? (forecast as any).predictedSnow : (forecast as any).predicted_snow;
      if (!regionStats[region].topResort && predicted > 0) {
        regionStats[region].topResort = mode === 'prisma' ? (forecast as any).Resort.name : (forecast as any).resorts.name;
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
      totalResorts: forecasts?.length || 0,
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

    const today = getToday();
    const cutoffDays = Math.ceil(hoursNum / 24);
    const cutoffDate = getDaysFromNow(cutoffDays);

    const { data: forecasts, error } = await supabase
      .from('forecasts')
      .select('*, resorts!inner(id, name, location, state)')
      .gte('forecast_date', today)
      .lte('forecast_date', cutoffDate)
      .gte('predicted_snow', thresholdNum)
      .order('predicted_snow', { ascending: false });

    if (error) throw error;

    res.json({
      threshold: thresholdNum,
      timeframe: `${hoursNum} hours`,
      count: forecasts?.length || 0,
      alerts: (forecasts || []).map((f: any) => ({
        resort: {
          id: f.resorts.id,
          name: f.resorts.name,
          location: f.resorts.location,
          state: f.resorts.state,
        },
        forecastDate: f.forecast_date,
        predictedSnow: f.predicted_snow,
        condition: f.condition,
      })),
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Helper function
function determineRegionFromState(state: string | undefined): string {
  if (!state) return 'Other';
  
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
