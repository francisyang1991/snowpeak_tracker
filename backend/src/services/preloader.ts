/**
 * Preloader Service
 * Fetches and caches forecast data for popular resorts at startup
 * This eliminates the 5-10s wait time for users
 */

import { supabase, getToday } from '../db/supabase.js';
import { geminiService } from './gemini.js';

// Popular resorts to preload (these are most commonly searched)
const POPULAR_RESORTS = [
  // Colorado
  { name: 'Vail', state: 'CO', region: 'Rockies' },
  { name: 'Aspen Snowmass', state: 'CO', region: 'Rockies' },
  { name: 'Breckenridge', state: 'CO', region: 'Rockies' },
  { name: 'Keystone', state: 'CO', region: 'Rockies' },
  { name: 'Copper Mountain', state: 'CO', region: 'Rockies' },
  { name: 'Steamboat', state: 'CO', region: 'Rockies' },
  { name: 'Winter Park', state: 'CO', region: 'Rockies' },
  { name: 'Telluride', state: 'CO', region: 'Rockies' },
  
  // Utah
  { name: 'Park City', state: 'UT', region: 'Rockies' },
  { name: 'Snowbird', state: 'UT', region: 'Rockies' },
  { name: 'Alta', state: 'UT', region: 'Rockies' },
  { name: 'Deer Valley', state: 'UT', region: 'Rockies' },
  { name: 'Brighton', state: 'UT', region: 'Rockies' },
  
  // California
  { name: 'Mammoth Mountain', state: 'CA', region: 'Pacific' },
  { name: 'Squaw Valley', state: 'CA', region: 'Pacific' },
  { name: 'Heavenly', state: 'CA', region: 'Pacific' },
  { name: 'Northstar', state: 'CA', region: 'Pacific' },
  { name: 'Big Bear', state: 'CA', region: 'Pacific' },
  
  // Wyoming/Montana
  { name: 'Jackson Hole', state: 'WY', region: 'Rockies' },
  { name: 'Big Sky', state: 'MT', region: 'Rockies' },
  
  // Washington/Oregon
  { name: 'Crystal Mountain', state: 'WA', region: 'Pacific' },
  { name: 'Stevens Pass', state: 'WA', region: 'Pacific' },
  { name: 'Mt. Baker', state: 'WA', region: 'Pacific' },
  { name: 'Mt. Hood Meadows', state: 'OR', region: 'Pacific' },
  
  // Vermont/Northeast
  { name: 'Stowe', state: 'VT', region: 'Northeast' },
  { name: 'Killington', state: 'VT', region: 'Northeast' },
  { name: 'Sugarbush', state: 'VT', region: 'Northeast' },
  { name: 'Jay Peak', state: 'VT', region: 'Northeast' },
  { name: 'Sunday River', state: 'ME', region: 'Northeast' },
];

// Regions to preload for Top 5 list
const REGIONS_TO_PRELOAD = ['All', 'CO', 'UT', 'CA', 'WA', 'VT'];

interface PreloadResult {
  success: boolean;
  resort?: string;
  region?: string;
  error?: string;
}

/**
 * Preload a single resort's forecast data
 */
async function preloadResort(resortInfo: { name: string; state: string; region: string }): Promise<PreloadResult> {
  const resortId = resortInfo.name.toLowerCase().replace(/\s+/g, '-');
  
  try {
    console.log(`  📥 Preloading: ${resortInfo.name}...`);
    
    // Check if we have fresh data (less than 1 hour old)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: existingReport } = await supabase
      .from('snow_reports')
      .select('id')
      .eq('resort_id', resortId)
      .gte('created_at', oneHourAgo)
      .limit(1);
    
    if (existingReport && existingReport.length > 0) {
      console.log(`  ✅ ${resortInfo.name} - Already cached (skipped)`);
      return { success: true, resort: resortInfo.name };
    }
    
    // Fetch fresh data from Gemini
    const freshData = await geminiService.fetchResortSnowData(resortInfo.name);
    
    // Store resort data
    await supabase
      .from('resorts')
      .upsert({
        id: resortId,
        name: freshData.name || resortInfo.name,
        location: freshData.location || `${resortInfo.state}, USA`,
        state: resortInfo.state,
        region: resortInfo.region,
        website_url: freshData.websiteUrl,
        total_lifts: freshData.totalLifts || 0,
        total_trails: freshData.totalTrails || 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });
    
    // Store today's snow report
    const today = getToday();
    
    await supabase
      .from('snow_reports')
      .upsert({
        resort_id: resortId,
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
    
    // Store forecasts
    if (freshData.forecast && Array.isArray(freshData.forecast)) {
      for (const day of freshData.forecast) {
        const forecastDate = parseDate(day.date);
        if (forecastDate) {
          await supabase
            .from('forecasts')
            .upsert({
              resort_id: resortId,
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
    
    console.log(`  ✅ ${resortInfo.name} - Preloaded successfully`);
    return { success: true, resort: resortInfo.name };
  } catch (error) {
    console.error(`  ❌ ${resortInfo.name} - Failed:`, error);
    return { success: false, resort: resortInfo.name, error: String(error) };
  }
}

/**
 * Preload Top 5 list for a region
 */
async function preloadTopResorts(region: string): Promise<PreloadResult> {
  try {
    console.log(`  📊 Preloading Top 5 for: ${region}...`);
    
    const topResorts = await geminiService.fetchTopSnowfallResorts(region, 10);
    
    const today = getToday();
    
    // Store each resort in the database
    for (const resort of topResorts) {
      const id = resort.name.toLowerCase().replace(/\s+/g, '-');
      
      await supabase
        .from('resorts')
        .upsert({
          id,
          name: resort.name,
          location: resort.location,
          state: resort.state || 'US',
          region: determineRegion(resort.state),
          latitude: resort.latitude || 0,
          longitude: resort.longitude || 0,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      // Store 5-day forecast total
      await supabase
        .from('forecasts')
        .upsert({
          resort_id: id,
          forecast_date: today,
          predicted_snow: resort.predictedSnow,
          condition: resort.summary,
          fetched_at: new Date().toISOString(),
        }, {
          onConflict: 'resort_id,forecast_date',
        });
    }
    
    console.log(`  ✅ Top 5 ${region} - Preloaded ${topResorts.length} resorts`);
    return { success: true, region };
  } catch (error) {
    console.error(`  ❌ Top 5 ${region} - Failed:`, error);
    return { success: false, region, error: String(error) };
  }
}

function determineRegion(state: string | undefined): string {
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

/**
 * Main preload function - call at server startup or via cron
 */
export async function preloadAllData(options?: { 
  resortsOnly?: boolean; 
  topListOnly?: boolean;
  maxResorts?: number;
}): Promise<{
  totalResorts: number;
  successfulResorts: number;
  totalRegions: number;
  successfulRegions: number;
  duration: number;
}> {
  const startTime = Date.now();
  
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ❄️  SnowPeak Preloader Starting...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n');
  
  let resortResults: PreloadResult[] = [];
  let regionResults: PreloadResult[] = [];
  
  // Preload Top 5 lists first (faster, provides immediate value)
  if (!options?.resortsOnly) {
    console.log('📊 Preloading Top 5 Lists by Region...\n');
    
    for (const region of REGIONS_TO_PRELOAD) {
      const result = await preloadTopResorts(region);
      regionResults.push(result);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n');
  }
  
  // Preload individual resorts
  if (!options?.topListOnly) {
    const resortsToLoad = options?.maxResorts 
      ? POPULAR_RESORTS.slice(0, options.maxResorts) 
      : POPULAR_RESORTS;
    
    console.log(`🏔️  Preloading ${resortsToLoad.length} Popular Resorts...\n`);
    
    for (const resort of resortsToLoad) {
      const result = await preloadResort(resort);
      resortResults.push(result);
      
      // Delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const duration = Math.round((Date.now() - startTime) / 1000);
  const successfulResorts = resortResults.filter(r => r.success).length;
  const successfulRegions = regionResults.filter(r => r.success).length;
  
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Preload Complete!');
  console.log(`  📊 Regions: ${successfulRegions}/${regionResults.length}`);
  console.log(`  🏔️  Resorts: ${successfulResorts}/${resortResults.length}`);
  console.log(`  ⏱️  Duration: ${duration}s`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n');
  
  return {
    totalResorts: resortResults.length,
    successfulResorts,
    totalRegions: regionResults.length,
    successfulRegions,
    duration,
  };
}

/**
 * Quick preload - just top lists (faster startup)
 */
export async function quickPreload(): Promise<void> {
  await preloadAllData({ topListOnly: true });
}

/**
 * Full preload - all resorts (slower but comprehensive)
 */
export async function fullPreload(): Promise<void> {
  await preloadAllData();
}

export { POPULAR_RESORTS, REGIONS_TO_PRELOAD };
