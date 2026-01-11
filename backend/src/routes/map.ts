import { Router } from 'express';
import { supabase, getToday } from '../db/supabase.js';
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

    // Get resorts with coordinates from database
    const { data: dbResorts, error } = await supabase
      .from('resorts')
      .select('*')
      .neq('latitude', 0)
      .neq('longitude', 0);

    if (!error && dbResorts && dbResorts.length > 20) {
      // Get forecasts for all resorts
      const today = getToday();
      const { data: forecasts } = await supabase
        .from('forecasts')
        .select('*')
        .gte('forecast_date', today);

      // Get latest snow reports
      const { data: snowReports } = await supabase
        .from('snow_reports')
        .select('*')
        .order('created_at', { ascending: false });

      // Build map data
      const mapData = dbResorts.map((resort: any) => {
        const resortForecasts = forecasts?.filter((f: any) => f.resort_id === resort.id) || [];
        const latestReport = snowReports?.find((r: any) => r.resort_id === resort.id);
        
        return {
          id: resort.id,
          name: resort.name,
          state: resort.state,
          region: resort.region,
          latitude: resort.latitude,
          longitude: resort.longitude,
          currentBase: latestReport?.base_depth || 0,
          snow24h: resortForecasts[0]?.predicted_snow || 0,
          snow48h: resortForecasts.slice(0, 2).reduce((sum: number, f: any) => sum + f.predicted_snow, 0),
          snow5day: resortForecasts.slice(0, 5).reduce((sum: number, f: any) => sum + f.predicted_snow, 0),
          liftsOpen: latestReport?.lifts_open || 0,
          totalLifts: resort.total_lifts,
        };
      });

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
        await supabase
          .from('resorts')
          .upsert({
            id,
            name: resort.name,
            location: `${resort.state}, USA`,
            state: resort.state,
            region: determineRegionFromState(resort.state),
            latitude: resort.latitude,
            longitude: resort.longitude,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id',
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
    const today = getToday();
    
    // Get resorts with forecasts
    const { data: resorts, error } = await supabase
      .from('resorts')
      .select('*')
      .neq('latitude', 0)
      .neq('longitude', 0);

    if (error) throw error;

    // Get forecasts
    const { data: forecasts } = await supabase
      .from('forecasts')
      .select('*')
      .gte('forecast_date', today)
      .order('forecast_date', { ascending: true });

    const heatmapData = (resorts || []).map((resort: any) => {
      const resortForecasts = forecasts?.filter((f: any) => f.resort_id === resort.id) || [];
      let value = 0;
      
      switch (metric) {
        case 'snow24h':
          value = resortForecasts[0]?.predicted_snow || 0;
          break;
        case 'snow48h':
          value = resortForecasts.slice(0, 2).reduce((sum: number, f: any) => sum + f.predicted_snow, 0);
          break;
        case 'snow5day':
          value = resortForecasts.slice(0, 5).reduce((sum: number, f: any) => sum + f.predicted_snow, 0);
          break;
      }

      return {
        lat: resort.latitude,
        lng: resort.longitude,
        value,
        name: resort.name,
      };
    }).filter((d: any) => d.value > 0);

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
    const today = getToday();
    
    // Get all resorts and forecasts at once
    const { data: allResorts } = await supabase
      .from('resorts')
      .select('*');

    const { data: allForecasts } = await supabase
      .from('forecasts')
      .select('*')
      .gte('forecast_date', today)
      .order('forecast_date', { ascending: true });

    const regionData = regions.map(region => {
      const resorts = allResorts?.filter((r: any) => r.region === region) || [];
      
      const resortsWithSnow = resorts.map((resort: any) => {
        const forecasts = allForecasts?.filter((f: any) => f.resort_id === resort.id).slice(0, 2) || [];
        const snow48h = forecasts.reduce((sum: number, f: any) => sum + f.predicted_snow, 0);
        return { name: resort.name, snow: snow48h };
      });

      const totalSnow = resortsWithSnow.reduce((sum: number, r: any) => sum + r.snow, 0);
      const topResort = resortsWithSnow.sort((a: any, b: any) => b.snow - a.snow)[0];

      return {
        region,
        resortCount: resorts.length,
        averageSnow48h: resorts.length > 0 
          ? Math.round(totalSnow / resorts.length * 10) / 10 
          : 0,
        topResort: topResort?.name || null,
      };
    });

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
