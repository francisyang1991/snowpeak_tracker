/**
 * SnowPeak API Client
 * Connects frontend to backend API
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Types
export interface ResortData {
  id: string;
  name: string;
  location: string;
  state?: string;
  region?: string;
  baseDepth: number;
  last24Hours: number;
  last48Hours: number;
  liftsOpen: number;
  totalLifts: number;
  trailsOpen: number;
  totalTrails: number;
  ticketPrice?: string;
  websiteUrl?: string;
  description?: string;
  conditions?: string;
  forecast: DailyForecast[];
  lastUpdated: string;
  sourceUrls?: string[];
}

export interface DailyForecast {
  date: string;
  dayName: string;
  snowInches: number;
  tempHigh: number;
  tempLow: number;
  condition: string;
  snowProbability?: number;
  windSpeed?: number;
}

export interface TopResort {
  name: string;
  location: string;
  state?: string;
  predictedSnow: number;
  summary: string;
  latitude?: number;
  longitude?: number;
}

export interface MapResort {
  id: string;
  name: string;
  state: string;
  region?: string;
  latitude: number;
  longitude: number;
  currentBase: number;
  snow24h: number;
  snow48h: number;
  snow5day: number;
  liftsOpen?: number;
  totalLifts?: number;
}

// API Functions

/**
 * Fetch resort snow data
 */
export async function fetchResortData(resortId: string, refresh = false): Promise<ResortData> {
  const url = `${API_BASE}/resorts/${resortId}${refresh ? '?refresh=true' : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch resort: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch top resorts by snowfall
 */
export async function fetchTopResorts(region = 'All', limit = 5): Promise<TopResort[]> {
  const url = `${API_BASE}/forecasts/top?region=${region}&limit=${limit}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch top resorts: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.resorts || [];
}

/**
 * Fetch map data (all resorts with coordinates)
 */
export async function fetchMapData(options?: {
  region?: string;
  minSnow?: number;
  refresh?: boolean;
}): Promise<MapResort[]> {
  const params = new URLSearchParams();
  if (options?.region) params.set('region', options.region);
  if (options?.minSnow) params.set('minSnow', options.minSnow.toString());
  if (options?.refresh) params.set('refresh', 'true');
  
  const url = `${API_BASE}/map/resorts?${params}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch map data: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.resorts || [];
}

/**
 * Fetch regional summary
 */
export async function fetchRegionSummary(): Promise<{
  regions: Array<{
    region: string;
    resortCount: number;
    averageSnow48h: number;
    topResort: string | null;
  }>;
}> {
  const url = `${API_BASE}/map/regions`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch regions: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * AI Ski Assistant
 */
export async function askSkiAssistant(question: string): Promise<string> {
  const url = `${API_BASE}/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  
  if (!response.ok) {
    throw new Error(`Chat failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.answer;
}

/**
 * Search resorts
 */
export async function searchResorts(query: string): Promise<ResortData[]> {
  // For now, just fetch the resort directly
  // TODO: Add proper search endpoint
  try {
    const id = query.toLowerCase().replace(/\s+/g, '-');
    const data = await fetchResortData(id);
    return [data];
  } catch {
    return [];
  }
}

/**
 * Get forecast alerts (significant snowfall)
 */
export async function fetchAlerts(threshold = 12, hours = 48): Promise<Array<{
  resort: { id: string; name: string; location: string };
  predictedSnow: number;
  condition: string;
}>> {
  const url = `${API_BASE}/forecasts/alerts?threshold=${threshold}&hours=${hours}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.alerts || [];
}

// Health check
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
