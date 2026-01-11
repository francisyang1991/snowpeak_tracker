import { Router } from 'express';
import prisma from '../db/client.js';
import { geminiService } from '../services/gemini.js';

export const resortRoutes = Router();

/**
 * GET /api/resorts
 * List all resorts with optional filtering
 */
resortRoutes.get('/', async (req, res) => {
  try {
    const { region, state, limit = '50' } = req.query;
    
    const resorts = await prisma.resort.findMany({
      where: {
        ...(region && { region: region as string }),
        ...(state && { state: state as string }),
      },
      take: parseInt(limit as string),
      orderBy: { name: 'asc' },
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

    res.json({
      count: resorts.length,
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
 */
resortRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { refresh } = req.query;

    // Try to get from database first
    let resort = await prisma.resort.findUnique({
      where: { id },
      include: {
        snowReports: {
          orderBy: { reportDate: 'desc' },
          take: 7, // Last 7 days
        },
        forecasts: {
          where: {
            forecastDate: { gte: new Date() },
          },
          orderBy: { forecastDate: 'asc' },
          take: 10,
        },
      },
    });

    // If not found or refresh requested, fetch from Gemini
    if (!resort || refresh === 'true') {
      const resortName = id.replace(/-/g, ' ');
      const freshData = await geminiService.fetchResortSnowData(resortName);
      
      // Upsert resort data
      resort = await prisma.resort.upsert({
        where: { id },
        update: {
          name: freshData.name,
          location: freshData.location,
          websiteUrl: freshData.websiteUrl,
          totalLifts: freshData.totalLifts || 0,
          totalTrails: freshData.totalTrails || 0,
          updatedAt: new Date(),
        },
        create: {
          id,
          name: freshData.name,
          location: freshData.location,
          state: extractState(freshData.location),
          region: determineRegion(freshData.location),
          latitude: 0, // Will be updated later
          longitude: 0,
          websiteUrl: freshData.websiteUrl,
          totalLifts: freshData.totalLifts || 0,
          totalTrails: freshData.totalTrails || 0,
        },
        include: {
          snowReports: {
            orderBy: { reportDate: 'desc' },
            take: 7,
          },
          forecasts: {
            orderBy: { forecastDate: 'asc' },
            take: 10,
          },
        },
      });

      // Store today's snow report
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      await prisma.snowReport.upsert({
        where: {
          resortId_reportDate: {
            resortId: id,
            reportDate: today,
          },
        },
        update: {
          baseDepth: freshData.baseDepth || 0,
          last24Hours: freshData.last24Hours || 0,
          last48Hours: freshData.last48Hours || 0,
          liftsOpen: freshData.liftsOpen || 0,
          trailsOpen: freshData.trailsOpen || 0,
          conditions: freshData.conditions,
          rawResponse: freshData,
        },
        create: {
          resortId: id,
          reportDate: today,
          baseDepth: freshData.baseDepth || 0,
          last24Hours: freshData.last24Hours || 0,
          last48Hours: freshData.last48Hours || 0,
          liftsOpen: freshData.liftsOpen || 0,
          trailsOpen: freshData.trailsOpen || 0,
          conditions: freshData.conditions,
          dataSource: 'gemini',
          rawResponse: freshData,
        },
      });

      // Store forecasts
      if (freshData.forecast && Array.isArray(freshData.forecast)) {
        for (const day of freshData.forecast) {
          const forecastDate = parseDate(day.date);
          if (forecastDate) {
            await prisma.forecast.upsert({
              where: {
                resortId_forecastDate: {
                  resortId: id,
                  forecastDate,
                },
              },
              update: {
                predictedSnow: day.snowInches || 0,
                tempHigh: day.tempHigh,
                tempLow: day.tempLow,
                condition: day.condition,
                snowProbability: day.snowProbability,
                windSpeed: day.windSpeed,
              },
              create: {
                resortId: id,
                forecastDate,
                predictedSnow: day.snowInches || 0,
                tempHigh: day.tempHigh,
                tempLow: day.tempLow,
                condition: day.condition,
                snowProbability: day.snowProbability,
                windSpeed: day.windSpeed,
              },
            });
          }
        }
      }

      // Return formatted response with fresh data
      return res.json({
        ...freshData,
        id,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Format stored data for response
    const latestReport = resort.snowReports[0];
    res.json({
      id: resort.id,
      name: resort.name,
      location: resort.location,
      state: resort.state,
      region: resort.region,
      websiteUrl: resort.websiteUrl,
      totalLifts: resort.totalLifts,
      totalTrails: resort.totalTrails,
      baseDepth: latestReport?.baseDepth || 0,
      last24Hours: latestReport?.last24Hours || 0,
      last48Hours: latestReport?.last48Hours || 0,
      liftsOpen: latestReport?.liftsOpen || 0,
      trailsOpen: latestReport?.trailsOpen || 0,
      conditions: latestReport?.conditions,
      forecast: resort.forecasts.map(f => ({
        date: formatDate(f.forecastDate),
        dayName: getDayName(f.forecastDate),
        snowInches: f.predictedSnow,
        tempHigh: f.tempHigh,
        tempLow: f.tempLow,
        condition: f.condition,
      })),
      lastUpdated: latestReport?.createdAt.toISOString() || resort.updatedAt.toISOString(),
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

    const forecasts = await prisma.forecast.findMany({
      where: {
        resortId: id,
        forecastDate: { gte: new Date() },
      },
      orderBy: { forecastDate: 'asc' },
      take: parseInt(days as string),
    });

    res.json({
      resortId: id,
      count: forecasts.length,
      forecasts: forecasts.map(f => ({
        date: formatDate(f.forecastDate),
        dayName: getDayName(f.forecastDate),
        snowInches: f.predictedSnow,
        tempHigh: f.tempHigh,
        tempLow: f.tempLow,
        condition: f.condition,
        snowProbability: f.snowProbability,
        windSpeed: f.windSpeed,
        powderScore: f.powderScore,
      })),
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

function parseDate(dateStr: string): Date | null {
  try {
    const year = new Date().getFullYear();
    const [month, day] = dateStr.split('/').map(Number);
    if (month && day) {
      return new Date(year, month - 1, day);
    }
    return null;
  } catch {
    return null;
  }
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getDayName(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}
