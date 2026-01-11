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

// ============================================
// ALERT SUBSCRIPTION API
// ============================================

export interface AlertSubscription {
  id: number;
  resortId: string;
  resortName: string;
  threshold: 'light' | 'good' | 'great';
  thresholdLabel: string;
  timeframe: number;
  isActive: boolean;
  createdAt: string;
  unreadNotifications: number;
  notifications: AlertNotification[];
}

export interface AlertNotification {
  id: number;
  title: string;
  message: string;
  predictedSnow: number;
  forecastDate: string;
  resortId?: string;
  resortName?: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Get or create a visitor ID for anonymous users
 */
export function getVisitorId(): string {
  const STORAGE_KEY = 'snowpeak_visitor_id';
  let visitorId = localStorage.getItem(STORAGE_KEY);
  
  if (!visitorId) {
    visitorId = 'visitor_' + Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
    localStorage.setItem(STORAGE_KEY, visitorId);
  }
  
  return visitorId;
}

/**
 * Subscribe to snow alerts for a resort
 */
export async function subscribeToAlert(params: {
  resortId: string;
  resortName: string;
  threshold: 'light' | 'good' | 'great';
  timeframe: 5 | 10;
  email?: string;
}): Promise<{ subscription: AlertSubscription; immediateAlert: boolean }> {
  const visitorId = getVisitorId();
  
  const response = await fetch(`${API_BASE}/alerts/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId,
      ...params,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to subscribe: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get all alert subscriptions for the current visitor
 */
export async function getMyAlerts(): Promise<AlertSubscription[]> {
  const visitorId = getVisitorId();
  const url = `${API_BASE}/alerts/my?visitorId=${visitorId}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.subscriptions || [];
}

/**
 * Unsubscribe from an alert
 */
export async function unsubscribeAlert(alertId: number): Promise<void> {
  const visitorId = getVisitorId();
  
  const response = await fetch(`${API_BASE}/alerts/${alertId}?visitorId=${visitorId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to unsubscribe: ${response.statusText}`);
  }
}

/**
 * Get all notifications for the current visitor
 */
export async function getNotifications(includeRead = false): Promise<AlertNotification[]> {
  const visitorId = getVisitorId();
  const url = `${API_BASE}/alerts/notifications?visitorId=${visitorId}&includeRead=${includeRead}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.notifications || [];
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/alerts/notifications/${notificationId}/read`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to mark as read: ${response.statusText}`);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<void> {
  const visitorId = getVisitorId();
  
  const response = await fetch(`${API_BASE}/alerts/notifications/read-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to mark all as read: ${response.statusText}`);
  }
}

/**
 * Check if user is subscribed to a specific resort
 */
export async function isSubscribedToResort(resortId: string): Promise<AlertSubscription | null> {
  const alerts = await getMyAlerts();
  return alerts.find(a => a.resortId === resortId) || null;
}
