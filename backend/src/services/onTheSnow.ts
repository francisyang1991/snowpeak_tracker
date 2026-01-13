
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ForecastDay {
  date: string;
  dayName: string;
  snowInches: number;
  tempHigh: number;
  tempLow: number;
  condition: string;
  snowProbability: number;
  windSpeed: number;
}

export interface ScrapedResortData {
  name: string;
  location: string;
  baseDepth: number;
  last24Hours: number;
  last48Hours: number;
  last7Days: number;
  liftsOpen: number;
  totalLifts: number;
  trailsOpen: number;
  totalTrails: number;
  ticketPrice: string;
  websiteUrl: string;
  conditions: string;
  description: string;
  forecast: ForecastDay[];
  sourceUrls?: string[];
}

export class OnTheSnowScraper {
  private baseUrl = 'https://www.onthesnow.com';

  /**
   * Fetch snow data for a resort by name and optional state
   */
  async fetchResortSnowData(resortName: string, state?: string): Promise<ScrapedResortData> {
    const slug = this.toSlug(resortName);
    let url = '';

    // Try to construct URL based on state if provided
    if (state) {
      const region = this.mapStateToRegion(state);
      url = `${this.baseUrl}/${region}/${slug}/skireport`;
    } else {
      // Default to trying Colorado or search (simplified for now to default to colorado if not known, or try a few)
      // For MVP, we might need a better discovery mechanism or just failover to Gemini if this fails.
      // Let's try to search or just guess common regions.
      url = `${this.baseUrl}/colorado/${slug}/skireport`;
    }

    try {
      console.log(`[Scraper] Fetching ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        validateStatus: (status) => status === 200 || status === 404
      });

      if (response.status === 404) {
        // Fallback: Try searching or another region (not implemented for MVP, throwing to let Gemini handle it)
        console.warn(`[Scraper] 404 for ${url}`);
        throw new Error(`Resort not found at ${url}`);
      }

      return this.parseResortPage(response.data, resortName, url, state);

    } catch (error) {
      console.error(`[Scraper] Error fetching ${resortName}:`, error);
      throw error;
    }
  }

  private parseResortPage(html: string, originalName: string, url: string, state?: string): ScrapedResortData {
    const $ = cheerio.load(html);

    // 1. Base Depth
    // Looking for "Base" heading and the value near it
    let baseDepth = 0;
    const baseDepthText = $('h3:contains("Base")').next().text(); // e.g. "30""
    if (baseDepthText) {
      baseDepth = parseInt(baseDepthText.replace(/\D/g, ''), 10) || 0;
    }

    // 2. Recent Snowfall (24h, 48h)
    let last24Hours = 0;
    let last48Hours = 0;
    // Find "Recent Snowfall" table
    const recentSnowTable = $('h3:contains("Recent Snowfall")').parent().find('table');
    if (recentSnowTable.length) {
      // The table has headers like "Tue", "Wed"... "24h"
      // And a row of values
      // We need to find the index of "24h" column
      const headers = recentSnowTable.find('thead th, tr:first-child th').map((i, el) => $(el).text().trim()).get();
      const index24h = headers.indexOf('24h');
      
      // Values are in the next row
      const values = recentSnowTable.find('tbody tr').first().find('td').map((i, el) => $(el).text().trim()).get();
      
      if (index24h !== -1 && values[index24h]) {
        last24Hours = parseInt(values[index24h].replace(/\D/g, ''), 10) || 0;
      }
      
      // 48h is usually the sum of the last 2 columns or explicitly shown?
      // OnTheSnow usually shows daily + 24h. It doesn't always show 48h explicitly in that table.
      // We might have to sum the last 2 days if dates match? 
      // For now, let's assume 48h is not explicitly in the table unless we calculate it. 
      // Let's leave 48h as 0 or equal to 24h if we can't find it.
      // Actually, sometimes they have a "48h" column? In the snapshot it was just "24h".
    }

    // 3. Lifts & Trails
    let liftsOpen = 0;
    let totalLifts = 0;
    let trailsOpen = 0;
    let totalTrails = 0;

    // "18/33 open" inside a container with "Lifts Open" text
    const liftsText = $('div:contains("Lifts Open")').last().text(); // Might need more specific selector
    // Strategy: Look for the text "Lifts Open" and find the "X/Y open" string nearby
    // Based on snapshot: generic -> img, generic "Lifts Open", generic "18/33 open"
    // They seem to be siblings or close.
    
    // Attempt to find via regex on the whole body text or specific sections if selectors fail
    const liftsMatch = $('body').text().match(/(\d+)\/(\d+)\s+lifts open/i) || $('body').text().match(/Lifts Open\s*(\d+)\/(\d+)\s*open/i);
    if (liftsMatch) {
      liftsOpen = parseInt(liftsMatch[1], 10);
      totalLifts = parseInt(liftsMatch[2], 10);
    }

    const trailsMatch = $('body').text().match(/(\d+)\/(\d+)\s+runs open/i) || $('body').text().match(/Runs Open\s*(\d+)\/(\d+)\s*open/i);
    if (trailsMatch) {
      trailsOpen = parseInt(trailsMatch[1], 10);
      totalTrails = parseInt(trailsMatch[2], 10);
    }

    // 4. Forecast
    const forecast: ForecastDay[] = [];
    const forecastTable = $('h3:contains("Forecasted Snow")').parent().find('table');
    
    if (forecastTable.length) {
      // The table structure on OnTheSnow can be variable.
      // Often the headers (Mon, Tue...) are in a row, and values are in the next row.
      const rows = forecastTable.find('tr');
      let headerRowIndex = -1;
      let valueRowIndex = -1;

      // Find the row with day names
      rows.each((i, row) => {
        const text = $(row).text().trim();
        // Check for day names (Mon, Tue, etc.)
        if (/Mon|Tue|Wed|Thu|Fri|Sat|Sun/.test(text)) {
          headerRowIndex = i;
          valueRowIndex = i + 1; // Assume values are immediately below
          return false; // break
        }
      });

      if (headerRowIndex !== -1 && rows.eq(valueRowIndex).length) {
        const headerCells = rows.eq(headerRowIndex).find('th, td');
        const valueCells = rows.eq(valueRowIndex).find('td');

        const today = new Date();

        headerCells.each((i, el) => {
          const dayName = $(el).text().trim();
          // Skip non-day headers
          if (!/Mon|Tue|Wed|Thu|Fri|Sat|Sun/.test(dayName)) return;
          
          const snowText = valueCells.eq(i).text().trim();
          if (snowText) {
             const forecastDate = new Date(today);
             forecastDate.setDate(today.getDate() + i); // Simplification: sequential
             const dateStr = forecastDate.toISOString().split('T')[0];

             forecast.push({
               date: dateStr,
               dayName,
               snowInches: parseInt(snowText.replace(/\D/g, ''), 10) || 0,
               tempHigh: 0,
               tempLow: 0,
               condition: 'Cloudy',
               snowProbability: 0,
               windSpeed: 0
             });
          }
        });
      }
    }

    return {
      name: originalName, // Or extract from h1
      location: state || 'USA',
      baseDepth,
      last24Hours,
      last48Hours,
      last7Days: 0, // Not easily found
      liftsOpen,
      totalLifts,
      trailsOpen,
      totalTrails,
      ticketPrice: '',
      websiteUrl: url,
      conditions: $('div:contains("Machine Groomed")').length ? 'Machine Groomed' : 'Variable', // Simple check
      description: `Latest report from OnTheSnow. Base depth: ${baseDepth}".`,
      forecast,
      sourceUrls: [url]
    };
  }

  private toSlug(name: string): string {
    return name.toLowerCase()
      .replace(/[^\w\s-]/g, '') // remove non-word chars
      .replace(/\s+/g, '-')     // replace spaces with hyphens
      .replace(/-+/g, '-');     // collapse hyphens
  }

  private mapStateToRegion(state: string): string {
    const map: Record<string, string> = {
      'CO': 'colorado',
      'UT': 'utah',
      'CA': 'california',
      'VT': 'vermont',
      'WY': 'wyoming',
      'MT': 'montana',
      'ID': 'idaho',
      'OR': 'oregon',
      'WA': 'washington',
      'NM': 'new-mexico',
      'NY': 'new-york',
      'MI': 'michigan',
      'WI': 'wisconsin',
      'MN': 'minnesota',
      'ME': 'maine',
      'NH': 'new-hampshire',
      'NV': 'nevada',
      'PA': 'pennsylvania'
    };
    return map[state.toUpperCase()] || 'colorado'; // Default fallback or error?
  }

  /**
   * Discover all resorts from the main United States list
   */
  async discoverResorts(): Promise<Array<{ name: string; url: string; region: string }>> {
    const startUrl = `${this.baseUrl}/united-states/ski-resorts`;
    try {
      console.log(`[Scraper] Discovering resorts from ${startUrl}`);
      const response = await axios.get(startUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      
      const $ = cheerio.load(response.data);
      const resorts: Array<{ name: string; url: string; region: string }> = [];
      const seenUrls = new Set<string>();

      // Strategy: Look for links to /ski-resort pages.
      // OnTheSnow usually lists resorts in a table or list.
      // Links often look like: /colorado/vail/ski-resort or /colorado/vail/skireport
      // We want to extract the base structure /state/resort-name
      
      $('a[href*="/ski-resort"]').each((i, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        
        // Filter out non-resort links (like /united-states/ski-resorts itself)
        // Expected format: /region/resort/ski-resort
        // Regex: ^\/([^\/]+)\/([^\/]+)\/ski-resort$
        const match = href.match(/^\/([^\/]+)\/([^\/]+)\/ski-resort$/);
        if (match) {
          const region = match[1]; // e.g. colorado
          const slug = match[2];   // e.g. vail
          
          // Skip if region is "united-states" or other generic pages
          if (region === 'united-states' || region === 'news' || region === 'epic-pass') return;

          let name = $(el).text().trim() || slug;
          // Clean name: remove "VIEW" and other noise
          name = name.replace(/\s*VIEW\s*$/i, '').trim();
          
          if (!name) {
             // Fallback to beautified slug
             name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          }

          // Normalize to skireport url for data fetching
          const reportUrl = `${this.baseUrl}/${region}/${slug}/skireport`;
          
          if (!seenUrls.has(reportUrl)) {
            seenUrls.add(reportUrl);
            resorts.push({
              name,
              url: reportUrl,
              region
            });
          }
        }
      });

      console.log(`[Scraper] Discovered ${resorts.length} resorts`);
      return resorts;
    } catch (error) {
      console.error('[Scraper] Discovery failed:', error);
      return [];
    }
  }
}

export const onTheSnowScraper = new OnTheSnowScraper();
