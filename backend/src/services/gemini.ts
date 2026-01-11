import { GoogleGenAI, Type, Schema } from '@google/genai';

// Helper to get today's date formatted
const getTodayDate = () => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// ============================================
// SCHEMAS
// ============================================

const forecastSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: "Date (format: MM/DD)" },
      dayName: { type: Type.STRING, description: "Day of week (e.g., Mon, Tue)" },
      snowInches: { type: Type.NUMBER, description: "Predicted snowfall (inches)" },
      tempHigh: { type: Type.NUMBER, description: "High temperature (Fahrenheit)" },
      tempLow: { type: Type.NUMBER, description: "Low temperature (Fahrenheit)" },
      condition: { type: Type.STRING, description: "Weather condition (e.g., Heavy Snow, Cloudy)" },
      snowProbability: { type: Type.NUMBER, description: "Probability of snow (0-100)" },
      windSpeed: { type: Type.NUMBER, description: "Wind speed in mph" },
    },
    required: ["date", "dayName", "snowInches", "tempHigh", "tempLow", "condition"],
  },
};

const resortDataSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Full resort name" },
    location: { type: Type.STRING, description: "Location (State, Region)" },
    baseDepth: { type: Type.NUMBER, description: "Current base snow depth (inches)" },
    last24Hours: { type: Type.NUMBER, description: "Snowfall in last 24 hours (inches)" },
    last48Hours: { type: Type.NUMBER, description: "Snowfall in last 48 hours (inches)" },
    last7Days: { type: Type.NUMBER, description: "Snowfall in last 7 days (inches)" },
    liftsOpen: { type: Type.NUMBER, description: "Number of lifts open" },
    totalLifts: { type: Type.NUMBER, description: "Total number of lifts" },
    trailsOpen: { type: Type.NUMBER, description: "Number of trails open" },
    totalTrails: { type: Type.NUMBER, description: "Total number of trails" },
    ticketPrice: { type: Type.STRING, description: "Adult day pass price (e.g., '$189')" },
    websiteUrl: { type: Type.STRING, description: "Official website URL" },
    conditions: { type: Type.STRING, description: "Current snow conditions (e.g., Powder, Packed Powder)" },
    description: { type: Type.STRING, description: "Brief snow condition summary (under 100 chars)" },
    forecast: forecastSchema,
  },
  required: ["name", "location", "baseDepth", "last24Hours", "liftsOpen", "trailsOpen", "forecast", "description"],
};

const topResortsSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      location: { type: Type.STRING },
      state: { type: Type.STRING, description: "State abbreviation (e.g., CO, UT)" },
      predictedSnow: { type: Type.NUMBER, description: "Total predicted snow next 5 days (inches)" },
      summary: { type: Type.STRING, description: "Brief reason for ranking" },
      latitude: { type: Type.NUMBER },
      longitude: { type: Type.NUMBER },
    },
    required: ["name", "location", "state", "predictedSnow", "summary"],
  },
};

const mapDataSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      state: { type: Type.STRING },
      latitude: { type: Type.NUMBER },
      longitude: { type: Type.NUMBER },
      snow24h: { type: Type.NUMBER, description: "Predicted snow next 24 hours" },
      snow48h: { type: Type.NUMBER, description: "Predicted snow next 48 hours" },
      snow5day: { type: Type.NUMBER, description: "Predicted snow next 5 days" },
      currentBase: { type: Type.NUMBER, description: "Current base depth" },
    },
    required: ["name", "state", "latitude", "longitude", "snow24h", "snow48h", "snow5day"],
  },
};

// ============================================
// SERVICE CLASS
// ============================================

export class GeminiService {
  private ai: GoogleGenAI;
  
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Fetch comprehensive snow data for a single resort
   */
  async fetchResortSnowData(resortName: string) {
    const today = getTodayDate();
    
    const prompt = `
      Search for the latest snow report and 10-day weather forecast for "${resortName}" ski resort.
      
      Focus on:
      1. Official website or OnTheSnow/OpenSnow for real-time data
      2. Actual snowfall in the past 24/48 hours and 7 days
      3. Accurate base depth (Base Depth)
      4. Number of open lifts and trails
      5. Current adult day pass price
      6. 10-day snowfall forecast with temperatures
      
      Today is ${today}.
      Return real data from search results, not simulated data.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: resortDataSchema,
          temperature: 0.1,
        },
      });

      // Extract source URLs from grounding metadata
      let sourceUrls: string[] = [];
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        sourceUrls = response.candidates[0].groundingMetadata.groundingChunks
          .map((chunk: any) => chunk.web?.uri)
          .filter((uri: string) => !!uri);
      }

      if (response.text) {
        const data = JSON.parse(response.text);
        return {
          ...data,
          id: resortName.toLowerCase().replace(/\s+/g, '-'),
          lastUpdated: new Date().toISOString(),
          sourceUrls: [...new Set(sourceUrls)],
        };
      }
      
      throw new Error('Empty response from Gemini');
    } catch (error) {
      console.error('Error fetching resort data:', error);
      throw error;
    }
  }

  /**
   * Fetch top resorts by predicted snowfall
   */
  async fetchTopSnowfallResorts(region: string = 'All', limit: number = 10) {
    const today = getTodayDate();
    const locationContext = region === 'All' ? 'USA' : region;
    
    const prompt = `
      Search for the ${limit} ski resorts in ${locationContext} with the highest predicted snowfall in the next 5 days.
      
      Search keywords: "Best snowfall forecast ${locationContext} ski resorts next 5 days", "OpenSnow top snowfall ${locationContext}"
      
      Today is ${today}.
      
      Return a list with:
      - Resort name
      - Location (state)
      - Total predicted snowfall (inches)
      - Brief reason for the forecast
      - Latitude and longitude coordinates if available
      
      Ensure data is based on latest weather forecasts, not historical averages.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: topResortsSchema,
          temperature: 0.1,
        },
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching top resorts:', error);
      throw error;
    }
  }

  /**
   * Fetch snow data for map visualization (all major resorts)
   */
  async fetchMapData(region: string = 'All') {
    const today = getTodayDate();
    const locationContext = region === 'All' ? 'major US ski resorts' : `ski resorts in ${region}`;
    
    const prompt = `
      Search for current snow conditions and forecasts for all ${locationContext}.
      
      For each resort, find:
      - Resort name
      - State
      - Coordinates (latitude, longitude)
      - Predicted snow next 24 hours
      - Predicted snow next 48 hours
      - Predicted snow next 5 days
      - Current base depth
      
      Today is ${today}.
      Include at least 30 major ski resorts across different regions.
      Prioritize resorts with significant predicted snowfall.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: mapDataSchema,
          temperature: 0.1,
        },
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching map data:', error);
      throw error;
    }
  }

  /**
   * AI Ski Assistant - answer ski-related questions
   */
  async askSkiAssistant(question: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `You are an experienced ski guide and gear expert. Answer questions about skiing concisely and helpfully.
        
        Question: "${question}"
        
        Keep your answer under 150 words. Be practical and give actionable advice.`,
      });

      return response.text || "I couldn't generate an answer. Please try again.";
    } catch (error) {
      console.error('Ski Assistant Error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
