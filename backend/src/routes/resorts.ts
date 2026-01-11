import { Router } from 'express';
import { supabase, getToday, getHoursAgo, formatDateShort, getDayName } from '../db/supabase.js';
import { geminiService } from '../services/gemini.js';

export const resortRoutes = Router();

// Cache duration: 1 hour
const CACHE_DURATION_HOURS = 1;

/**
 * GET /api/resorts
 * List all resorts with optional filtering
 */
resortRoutes.get('/', async (req, res) => {
  try {
    const { region, state, limit = '50' } = req.query;
    
    let query = supabase
      .from('resorts')
      .select('*')
      .order('name', { ascending: true })
      .limit(parseInt(limit as string));
    
    if (region) {
      query = query.eq('region', region);
    }
    if (state) {
      query = query.eq('state', state);
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
 * Uses database cache (1 hour), only calls Gemini API when cache is stale
 */
resortRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { refresh } = req.query;
    const now = Date.now();
    const oneHourAgo = getHoursAgo(CACHE_DURATION_HOURS);

    // 1. Try to get resort from database
    const { data: resort, error: resortError } = await supabase
      .from('resorts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // Get latest snow report (within last hour)
    const { data: latestReport } = await supabase
      .from('snow_reports')
      .select('*')
      .eq('resort_id', id)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get forecasts
    const { data: forecasts } = await supabase
      .from('forecasts')
      .select('*')
      .eq('resort_id', id)
      .gte('forecast_date', getToday())
      .order('forecast_date', { ascending: true })
      .limit(10);

    // Check if we have fresh cached data
    const hasFreshCache = !!latestReport;
    const hasForecastData = forecasts && forecasts.length > 0;

    // If we have fresh cached data and user didn't request refresh, return cached data
    if (refresh !== 'true' && resort && hasFreshCache && hasForecastData) {
      const cacheAge = Math.floor((now - new Date(latestReport.created_at).getTime()) / 1000);
      console.log(`[Cache HIT] Resort: ${id}, Cache age: ${cacheAge}s`);
      
      return res.json({
        id: resort.id,
        name: resort.name,
        location: resort.location,
        state: resort.state,
        region: resort.region,
        websiteUrl: resort.website_url,
        totalLifts: resort.total_lifts,
        totalTrails: resort.total_trails,
        baseDepth: latestReport.base_depth || 0,
        last24Hours: latestReport.last_24_hours || 0,
        last48Hours: latestReport.last_48_hours || 0,
        liftsOpen: latestReport.lifts_open || 0,
        trailsOpen: latestReport.trails_open || 0,
        conditions: latestReport.conditions,
        forecast: forecasts.map((f: any) => ({
          date: formatDateShort(f.forecast_date),
          dayName: getDayName(f.forecast_date),
          snowInches: f.predicted_snow,
          tempHigh: f.temp_high,
          tempLow: f.temp_low,
          condition: f.condition,
        })),
        lastUpdated: latestReport.created_at,
        cached: true,
        cacheAge,
      });
    }

    // 2. Cache miss - fetch from Gemini
    console.log(`[Cache MISS] Resort: ${id}, Reason: ${refresh === 'true' ? 'refresh requested' : !hasFreshCache ? 'cache stale' : 'no forecast data'}`);
    
    const resortName = id.replace(/-/g, ' ');
    const freshData = await geminiService.fetchResortSnowData(resortName);

    // Upsert resort
    await supabase
      .from('resorts')
      .upsert({
        id,
        name: freshData.name || resortName,
        location: freshData.location || 'USA',
        state: extractState(freshData.location),
        region: determineRegion(freshData.location),
        website_url: freshData.websiteUrl,
        total_lifts: freshData.totalLifts || 0,
        total_trails: freshData.totalTrails || 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    // Insert snow report
    const today = getToday();
    await supabase
      .from('snow_reports')
      .upsert({
        resort_id: id,
        report_date: today,
        base_depth: freshData.baseDepth || 0,
        last_24_hours: freshData.last24Hours || 0,
        last_48_hours: freshData.last48Hours || 0,
        lifts_open: freshData.liftsOpen || 0,
        trails_open: freshData.trailsOpen || 0,
        conditions: freshData.conditions,
        data_source: 'gemini',
        raw_response: freshData,
      }, {
        onConflict: 'resort_id,report_date',
      });

    // Insert forecasts
    if (freshData.forecast && Array.isArray(freshData.forecast)) {
      for (const day of freshData.forecast) {
        const forecastDate = parseDate(day.date);
        if (forecastDate) {
          await supabase
            .from('forecasts')
            .upsert({
              resort_id: id,
              forecast_date: forecastDate,
              predicted_snow: day.snowInches || 0,
              temp_high: day.tempHigh,
              temp_low: day.tempLow,
              condition: day.condition,
              snow_probability: day.snowProbability,
              wind_speed: day.windSpeed,
              fetched_at: new Date().toISOString(),
            }, {
              onConflict: 'resort_id,forecast_date',
            });
        }
      }
    }

    // Return fresh data
    res.json({
      ...freshData,
      id,
      lastUpdated: new Date().toISOString(),
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

    const { data: forecasts, error } = await supabase
      .from('forecasts')
      .select('*')
      .eq('resort_id', id)
      .gte('forecast_date', getToday())
      .order('forecast_date', { ascending: true })
      .limit(parseInt(days as string));

    if (error) throw error;

    res.json({
      resortId: id,
      count: forecasts?.length || 0,
      forecasts: forecasts?.map((f: any) => ({
        date: formatDateShort(f.forecast_date),
        dayName: getDayName(f.forecast_date),
        snowInches: f.predicted_snow,
        tempHigh: f.temp_high,
        tempLow: f.temp_low,
        condition: f.condition,
        snowProbability: f.snow_probability,
        windSpeed: f.wind_speed,
        powderScore: f.powder_score,
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
    const year = new Date().getFullYear();
    const [month, day] = dateStr.split('/').map(Number);
    if (month && day) {
      const date = new Date(year, month - 1, day);
      return date.toISOString().split('T')[0];
    }
    return null;
  } catch {
    return null;
  }
}
