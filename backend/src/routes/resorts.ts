import { Router } from 'express';
import { supabase, getToday, getHoursAgo, formatDateShort, getDayName } from '../db/supabase.js';
import { geminiService } from '../services/gemini.js';
import { onTheSnowScraper } from '../services/onTheSnow.js';

export const resortRoutes = Router();

// Cache duration: 1 hour
const CACHE_DURATION_HOURS = 1;

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

  // Prefer snake_case tables (what this backend was originally written for),
  // but fall back to Prisma-style PascalCase tables if those are what exist.
  const snakeProbe = await supabase.from('resorts').select('id').limit(1);
  if (!snakeProbe.error) {
    dbMode = 'snake';
    return dbMode;
  }
  if (!isMissingTableError(snakeProbe.error)) {
    // Unexpected error (permissions, etc.) — still treat as snake to keep behavior stable.
    dbMode = 'snake';
    return dbMode;
  }

  const prismaProbe = await supabase.from('Resort').select('id').limit(1);
  if (!prismaProbe.error) {
    dbMode = 'prisma';
    return dbMode;
  }

  // Default to snake, but we'll likely fail with clearer errors later.
  dbMode = 'snake';
  return dbMode;
}

function parseDbTimestamp(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;

  // Supabase/PostgREST can return `timestamp without time zone` values like
  // `2026-01-12T03:19:40.195` (no timezone). JS interprets that as local time,
  // which can make cache ages negative depending on machine TZ.
  const hasTz = value.endsWith('Z') || value.includes('+') || /-\d\d:\d\d$/.test(value);
  const iso = hasTz ? value : `${value}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * GET /api/resorts
 * List all resorts with optional filtering
 */
resortRoutes.get('/', async (req, res) => {
  try {
    const { region, state, limit = '50' } = req.query;

    const mode = await detectDbMode();
    const resortsTable = mode === 'prisma' ? 'Resort' : 'resorts';
    const stateCol = mode === 'prisma' ? 'state' : 'state';
    const regionCol = mode === 'prisma' ? 'region' : 'region';

    let query = supabase.from(resortsTable).select('*').order('name', { ascending: true }).limit(parseInt(limit as string));
    
    if (region) {
      query = query.eq(regionCol, region);
    }
    if (state) {
      query = query.eq(stateCol, state);
    }
    
    const { data: resorts, error } = await query;
    
    if (error) throw error;

    res.json({
      count: resorts?.length || 0,
      resorts,
    });
  } catch (error) {
    console.error('Error fetching resorts:', error);
    res.status(500).json({ error: 'Failed to fetch resorts' });
  }
});

/**
 * GET /api/resorts/:id
 * Get single resort with full details
 * Uses database cache (1 hour), tries OnTheSnow scraper first, then Gemini
 */
resortRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { refresh } = req.query;
    const now = Date.now();
    const oneHourAgo = getHoursAgo(CACHE_DURATION_HOURS);
    const mode = await detectDbMode();

    const resortsTable = mode === 'prisma' ? 'Resort' : 'resorts';
    const reportsTable = mode === 'prisma' ? 'SnowReport' : 'snow_reports';
    const forecastsTable = mode === 'prisma' ? 'Forecast' : 'forecasts';

    const reportResortIdCol = mode === 'prisma' ? 'resortId' : 'resort_id';
    const reportCreatedAtCol = mode === 'prisma' ? 'createdAt' : 'created_at';

    const forecastResortIdCol = mode === 'prisma' ? 'resortId' : 'resort_id';
    const forecastDateCol = mode === 'prisma' ? 'forecastDate' : 'forecast_date';
    const forecastFetchedAtCol = mode === 'prisma' ? 'fetchedAt' : 'fetched_at';

    // 1. Try to get resort from database
    const { data: resort, error: resortError } = await supabase.from(resortsTable).select('*').eq('id', id).maybeSingle();
    if (resortError && !isMissingTableError(resortError)) throw resortError;

    // Get latest snow report (we compute freshness in code; avoids fragile server-side timestamp filtering)
    const { data: latestReport, error: reportError } = await supabase
      .from(reportsTable)
      .select('*')
      .eq(reportResortIdCol, id)
      .order(reportCreatedAtCol, { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reportError && !isMissingTableError(reportError)) throw reportError;

    // Get forecasts
    const { data: forecasts, error: forecastError } = await supabase
      .from(forecastsTable)
      .select('*')
      .eq(forecastResortIdCol, id)
      .gte(forecastDateCol, getToday())
      .order(forecastDateCol, { ascending: true })
      .limit(10);
    if (forecastError && !isMissingTableError(forecastError)) throw forecastError;

    // Check if we have fresh cached data
    const cacheAgeSeconds = latestReport
      ? Math.floor((now - parseDbTimestamp((latestReport as any)[reportCreatedAtCol])) / 1000)
      : null;
    const hasFreshCache = cacheAgeSeconds !== null && cacheAgeSeconds < CACHE_DURATION_HOURS * 3600;

    const hasForecastData = forecasts && forecasts.length > 0;
    const newestForecastFetchedAt = hasForecastData
      ? Math.max(...(forecasts as any[]).map((f) => parseDbTimestamp((f as any)[forecastFetchedAtCol])))
      : 0;
    const forecastCacheAgeSeconds = newestForecastFetchedAt ? Math.floor((now - newestForecastFetchedAt) / 1000) : null;
    const hasFreshForecastCache =
      forecastCacheAgeSeconds !== null && forecastCacheAgeSeconds < CACHE_DURATION_HOURS * 3600;

    // If we have fresh cached data and user didn't request refresh, return cached data
    if (refresh !== 'true' && resort && hasFreshCache && hasForecastData && hasFreshForecastCache) {
      console.log(`[Cache HIT] Resort: ${id}, Cache age: ${cacheAgeSeconds}s`);
      
      return res.json({
        id: (resort as any).id,
        name: (resort as any).name,
        location: (resort as any).location,
        state: (resort as any).state,
        region: (resort as any).region,
        websiteUrl: mode === 'prisma' ? (resort as any).websiteUrl : (resort as any).website_url,
        totalLifts: mode === 'prisma' ? (resort as any).totalLifts : (resort as any).total_lifts,
        totalTrails: mode === 'prisma' ? (resort as any).totalTrails : (resort as any).total_trails,
        baseDepth: mode === 'prisma' ? (latestReport as any)?.baseDepth || 0 : (latestReport as any)?.base_depth || 0,
        last24Hours: mode === 'prisma' ? (latestReport as any)?.last24Hours || 0 : (latestReport as any)?.last_24_hours || 0,
        last48Hours: mode === 'prisma' ? (latestReport as any)?.last48Hours || 0 : (latestReport as any)?.last_48_hours || 0,
        liftsOpen: mode === 'prisma' ? (latestReport as any)?.liftsOpen || 0 : (latestReport as any)?.lifts_open || 0,
        trailsOpen: mode === 'prisma' ? (latestReport as any)?.trailsOpen || 0 : (latestReport as any)?.trails_open || 0,
        conditions: (latestReport as any)?.conditions,
        forecast: (forecasts || []).map((f: any) => ({
          date: formatDateShort(mode === 'prisma' ? f.forecastDate : f.forecast_date),
          dayName: getDayName(mode === 'prisma' ? f.forecastDate : f.forecast_date),
          snowInches: mode === 'prisma' ? f.predictedSnow : f.predicted_snow,
          tempHigh: mode === 'prisma' ? f.tempHigh : f.temp_high,
          tempLow: mode === 'prisma' ? f.tempLow : f.temp_low,
          condition: f.condition,
        })),
        lastUpdated: new Date((latestReport as any)?.[reportCreatedAtCol] || new Date()).toLocaleString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        cached: true,
        cacheAge: cacheAgeSeconds,
      });
    }

    // 2. Cache miss - fetch from scraper or Gemini
    console.log(
      `[Cache MISS] Resort: ${id}, Reason: ${
        refresh === 'true'
          ? 'refresh requested'
          : !hasFreshCache
            ? 'cache stale'
            : !hasForecastData
              ? 'no forecast data'
              : 'forecast cache stale'
      }`,
    );
    
    const resortName = id.replace(/-/g, ' ');
    let freshData: any;
    
    // Try scraper first
    try {
      const state = (resort as any)?.state; // Use state from DB if available
      freshData = await onTheSnowScraper.fetchResortSnowData(resortName, state);
      console.log(`[Source] Fetched ${resortName} from OnTheSnow`);
    } catch (scraperError) {
      console.warn(`[Source] Scraper failed for ${resortName}, falling back to Gemini:`, scraperError);
      freshData = await geminiService.fetchResortSnowData(resortName);
    }

    // Upsert resort
    const nowTimestamp = new Date().toISOString();
    const resortUpsert = await supabase
      .from(resortsTable)
      .upsert(
        mode === 'prisma'
          ? {
              id,
              name: freshData.name || resortName,
              location: freshData.location || 'USA',
              state: extractState(freshData.location),
              region: determineRegion(freshData.location),
              latitude: (freshData as any).latitude ?? 0,
              longitude: (freshData as any).longitude ?? 0,
              websiteUrl: freshData.websiteUrl,
              totalLifts: freshData.totalLifts || 0,
              totalTrails: freshData.totalTrails || 0,
              updatedAt: nowTimestamp,
            }
          : {
              id,
              name: freshData.name || resortName,
              location: freshData.location || 'USA',
              state: extractState(freshData.location),
              region: determineRegion(freshData.location),
              website_url: freshData.websiteUrl,
              total_lifts: freshData.totalLifts || 0,
              total_trails: freshData.totalTrails || 0,
              updated_at: nowTimestamp,
            },
        { onConflict: 'id' },
      );
    if (resortUpsert.error) throw resortUpsert.error;

    // Insert snow report with explicit created_at to ensure cache works properly
    const today = getToday();
    const reportUpsert = await supabase
      .from(reportsTable)
      .upsert(
        mode === 'prisma'
          ? {
              resortId: id,
              reportDate: today,
              baseDepth: freshData.baseDepth || 0,
              last24Hours: freshData.last24Hours || 0,
              last48Hours: freshData.last48Hours || 0,
              last7Days: (freshData as any).last7Days || 0,
              liftsOpen: freshData.liftsOpen || 0,
              trailsOpen: freshData.trailsOpen || 0,
              conditions: freshData.conditions,
              dataSource: freshData.sourceUrls ? 'onthesnow' : 'gemini',
              rawResponse: freshData,
              createdAt: nowTimestamp,
            }
          : {
              resort_id: id,
              report_date: today,
              base_depth: freshData.baseDepth || 0,
              last_24_hours: freshData.last24Hours || 0,
              last_48_hours: freshData.last48Hours || 0,
              lifts_open: freshData.liftsOpen || 0,
              trails_open: freshData.trailsOpen || 0,
              conditions: freshData.conditions,
              data_source: freshData.sourceUrls ? 'onthesnow' : 'gemini',
              raw_response: freshData,
              created_at: nowTimestamp,
            },
        {
          onConflict: mode === 'prisma' ? 'resortId,reportDate' : 'resort_id,report_date',
        },
      );
    if (reportUpsert.error) throw reportUpsert.error;

    // Insert forecasts with explicit fetched_at
    if (freshData.forecast && Array.isArray(freshData.forecast)) {
      for (const day of freshData.forecast) {
        const forecastDate = parseDate(day.date);
        if (forecastDate) {
          const forecastUpsert = await supabase
            .from(forecastsTable)
            .upsert(
              mode === 'prisma'
                ? {
                    resortId: id,
                    forecastDate,
                    predictedSnow: day.snowInches || 0,
                    tempHigh: day.tempHigh,
                    tempLow: day.tempLow,
                    condition: day.condition,
                    snowProbability: day.snowProbability,
                    windSpeed: day.windSpeed,
                    fetchedAt: nowTimestamp,
                  }
                : {
                    resort_id: id,
                    forecast_date: forecastDate,
                    predicted_snow: day.snowInches || 0,
                    temp_high: day.tempHigh,
                    temp_low: day.tempLow,
                    condition: day.condition,
                    snow_probability: day.snowProbability,
                    wind_speed: day.windSpeed,
                    fetched_at: nowTimestamp,
                  },
              {
                onConflict: mode === 'prisma' ? 'resortId,forecastDate' : 'resort_id,forecast_date',
              },
            );
          if (forecastUpsert.error) throw forecastUpsert.error;
        }
      }
      console.log(`[Cache STORED] Saved resort ${id} with ${freshData.forecast.length} forecast days`);
    }

    // Return fresh data
    res.json({
      ...freshData,
      id,
      lastUpdated: new Date().toLocaleString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching resort:', error);
    res.status(500).json({ error: 'Failed to fetch resort data' });
  }
});

/**
 * GET /api/resorts/:id/forecast
 * Get forecast data for a resort
 */
resortRoutes.get('/:id/forecast', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = '10' } = req.query;

    const mode = await detectDbMode();
    const forecastsTable = mode === 'prisma' ? 'Forecast' : 'forecasts';
    const forecastResortIdCol = mode === 'prisma' ? 'resortId' : 'resort_id';
    const forecastDateCol = mode === 'prisma' ? 'forecastDate' : 'forecast_date';

    const { data: forecasts, error } = await supabase
      .from(forecastsTable)
      .select('*')
      .eq(forecastResortIdCol, id)
      .gte(forecastDateCol, getToday())
      .order(forecastDateCol, { ascending: true })
      .limit(parseInt(days as string));

    if (error) throw error;

    res.json({
      resortId: id,
      count: forecasts?.length || 0,
      forecasts: forecasts?.map((f: any) => ({
        date: formatDateShort(mode === 'prisma' ? f.forecastDate : f.forecast_date),
        dayName: getDayName(mode === 'prisma' ? f.forecastDate : f.forecast_date),
        snowInches: mode === 'prisma' ? f.predictedSnow : f.predicted_snow,
        tempHigh: mode === 'prisma' ? f.tempHigh : f.temp_high,
        tempLow: mode === 'prisma' ? f.tempLow : f.temp_low,
        condition: f.condition,
        snowProbability: mode === 'prisma' ? f.snowProbability : f.snow_probability,
        windSpeed: mode === 'prisma' ? f.windSpeed : f.wind_speed,
        powderScore: mode === 'prisma' ? f.powderScore : f.powder_score,
      })) || [],
    });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractState(location: string): string {
  if (!location) return 'US';
  
  const stateMap: Record<string, string> = {
    'colorado': 'CO', 'utah': 'UT', 'california': 'CA', 'wyoming': 'WY',
    'montana': 'MT', 'idaho': 'ID', 'washington': 'WA', 'oregon': 'OR',
    'vermont': 'VT', 'new hampshire': 'NH', 'maine': 'ME', 'new york': 'NY',
    'new mexico': 'NM', 'arizona': 'AZ', 'nevada': 'NV', 'michigan': 'MI',
    'wisconsin': 'WI', 'minnesota': 'MN',
  };
  
  const lower = location.toLowerCase();
  for (const [state, abbr] of Object.entries(stateMap)) {
    if (lower.includes(state)) return abbr;
  }
  
  // Check for abbreviations
  const abbrs = ['CO', 'UT', 'CA', 'WY', 'MT', 'ID', 'WA', 'OR', 'VT', 'NH', 'ME', 'NY', 'NM', 'AZ', 'NV'];
  for (const abbr of abbrs) {
    if (location.includes(abbr)) return abbr;
  }
  
  return 'US';
}

function determineRegion(location: string): string {
  if (!location) return 'Other';
  
  const lower = location.toLowerCase();
  
  if (/colorado|utah|wyoming|montana|idaho|new mexico|arizona/.test(lower)) {
    return 'Rockies';
  }
  if (/california|washington|oregon|nevada/.test(lower)) {
    return 'Pacific';
  }
  if (/vermont|new hampshire|maine|new york|massachusetts|connecticut/.test(lower)) {
    return 'Northeast';
  }
  if (/michigan|wisconsin|minnesota|ohio/.test(lower)) {
    return 'Midwest';
  }
  
  return 'Other';
}

function parseDate(dateStr: string): string | null {
  try {
    if (!dateStr) return null;
    
    // Check if already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    const year = new Date().getFullYear();
    const [month, day] = dateStr.split('/').map(Number);
    if (month && day) {
      // Handle year rollover (e.g. today is Dec, forecast is Jan)
      // If the parsed date is more than 6 months in the past, assume it's next year
      const now = new Date();
      let date = new Date(year, month - 1, day);
      
      const diffMonths = (now.getMonth() - (month - 1)) + (12 * (now.getFullYear() - year));
      if (diffMonths > 6) {
         date = new Date(year + 1, month - 1, day);
      } else if (diffMonths < -6) {
         // Rare: forecast says Dec when we are in Jan (maybe old data?)
         date = new Date(year - 1, month - 1, day);
      }

      return date.toISOString().split('T')[0];
    }
    return null;
  } catch {
    return null;
  }
}
