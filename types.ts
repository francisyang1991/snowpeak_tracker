export interface DailyForecast {
  date: string; // YYYY-MM-DD
  dayName: string; // e.g., "周一"
  snowInches: number;
  tempHigh: number;
  tempLow: number;
  condition: string; // e.g., "暴雪", "多云"
}

export interface ResortData {
  id: string;
  name: string;
  location: string;
  baseDepth: number; // in inches
  last24Hours: number; // in inches
  last48Hours: number; // in inches
  liftsOpen: number;
  totalLifts: number;
  trailsOpen: number;
  totalTrails: number;
  ticketPrice: string; // e.g., "$150-200"
  websiteUrl: string;
  description: string;
  forecast: DailyForecast[];
  lastUpdated: string;
  sourceUrls?: string[];
}

export interface SearchState {
  query: string;
  isLoading: boolean;
  error: string | null;
}

export interface TopResort {
  name: string;
  location: string;
  predictedSnow: number; // inches in next 5 days
  summary: string;
}
