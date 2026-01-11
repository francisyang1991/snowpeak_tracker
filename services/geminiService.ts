import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ResortData, TopResort } from "../types";

// Helper to get today's date formatted
const getTodayDate = () => {
  return new Date().toLocaleDateString('zh-CN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const forecastSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: "日期 (格式: MM/DD)" },
      dayName: { type: Type.STRING, description: "星期几 (例如: 周一)" },
      snowInches: { type: Type.NUMBER, description: "预测降雪量 (英寸)" },
      tempHigh: { type: Type.NUMBER, description: "最高气温 (华氏度)" },
      tempLow: { type: Type.NUMBER, description: "最低气温 (华氏度)" },
      condition: { type: Type.STRING, description: "天气状况简述 (中文)" },
    },
    required: ["date", "dayName", "snowInches", "tempHigh", "tempLow", "condition"],
  },
};

const resortSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "滑雪场全名" },
    location: { type: Type.STRING, description: "位置 (州, 地区)" },
    baseDepth: { type: Type.NUMBER, description: "目前积雪深度 (英寸)" },
    last24Hours: { type: Type.NUMBER, description: "过去24小时降雪量 (英寸)" },
    last48Hours: { type: Type.NUMBER, description: "过去48小时降雪量 (英寸)" },
    liftsOpen: { type: Type.NUMBER, description: "开放的缆车数量" },
    totalLifts: { type: Type.NUMBER, description: "总缆车数量" },
    trailsOpen: { type: Type.NUMBER, description: "开放的雪道数量 (Trails)" },
    totalTrails: { type: Type.NUMBER, description: "总雪道数量" },
    ticketPrice: { type: Type.STRING, description: "成人单日票价预估 (例如: '$189' 或 '$150-200')" },
    websiteUrl: { type: Type.STRING, description: "滑雪场官方网站URL" },
    description: { type: Type.STRING, description: "简短的雪况描述和滑雪建议 (中文, 50字以内)" },
    forecast: forecastSchema,
  },
  required: ["name", "location", "baseDepth", "last24Hours", "liftsOpen", "trailsOpen", "ticketPrice", "forecast", "description"],
};

const topListSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      location: { type: Type.STRING },
      predictedSnow: { type: Type.NUMBER, description: "未来几天的总降雪预测 (英寸)" },
      summary: { type: Type.STRING, description: "简短原因 (中文)" },
    },
    required: ["name", "location", "predictedSnow", "summary"],
  },
};

export const fetchResortSnowData = async (resortName: string): Promise<ResortData> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("No API_KEY found. Returning mock data.");
    return generateMockData(resortName);
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const today = getTodayDate();
    const prompt = `
      请使用 Google 搜索查找 "${resortName}" 滑雪场的最新雪况报告和未来 10 天的天气预报。
      
      重点关注:
      1. 官方网站或 OnTheSnow 等可靠来源的实时数据。
      2. 过去 24/48 小时的实际降雪量。
      3. 准确的基础积雪深度 (Base Depth)。
      4. 开放的缆车 (Lifts) 和雪道 (Trails) 数量。
      5. 当前成人单日票价 (Ticket Price)。
      6. 未来 10 天的降雪预测。
      
      今天是 ${today}。
      请勿生成模拟数据。必须基于搜索结果提取真实数据。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: resortSchema,
        temperature: 0.1, 
      },
    });

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
        lastUpdated: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        sourceUrls: [...new Set(sourceUrls)], // Deduplicate URLs
      };
    } else {
      throw new Error("Empty response from Gemini");
    }

  } catch (error) {
    console.error("Error fetching snow data:", error);
    return generateMockData(resortName);
  }
};

export const fetchTopSnowfallRegions = async (region: string = "All"): Promise<TopResort[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return generateMockTopList();

  const ai = new GoogleGenAI({ apiKey });
  const today = getTodayDate();
  
  const locationContext = region === "All" ? "USA" : region;
  const promptContext = region === "All" ? "全美" : `${region} 地区`;

  try {
    const prompt = `
      使用 Google 搜索找出${promptContext}未来 5 天内降雪量预测最大的 5 个滑雪场。
      搜索关键词: "Best forecast snowfall ${locationContext} ski resorts next 5 days", "Opensnow top snowfall ${locationContext}".
      今天是 ${today}。
      
      返回一个列表，包含滑雪场名称、位置、预测总降雪量(英寸)和简短原因。
      确保数据是基于最新的天气预报，而不是历史平均值。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: topListSchema,
        temperature: 0.1,
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return generateMockTopList();
  } catch (e) {
    console.error(e);
    return generateMockTopList();
  }
};

export const askSkiAssistant = async (question: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "未检测到 API Key，无法使用助手。";

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest", // Fast, low-latency model
      contents: `你是一位经验丰富的滑雪向导和装备专家。请用中文简短、风趣地回答用户关于滑雪的问题（如装备建议、技巧、天气准备等）。
      
      用户问题: "${question}"
      
      请保持回答在100字以内，并给出实用的建议。`,
    });

    return response.text || "我暂时没有想到好的建议，不如去雪场看看？";
  } catch (e) {
    console.error("Ski Assistant Error:", e);
    return "助手现在有点忙，请稍后再试。";
  }
};

// Mock Data Generator (Fallback only)
const generateMockData = (name: string): ResortData => {
  const randomSnow = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name: name,
    location: "Unknown Location",
    baseDepth: randomSnow(30, 80),
    last24Hours: randomSnow(0, 12),
    last48Hours: randomSnow(2, 18),
    liftsOpen: 15,
    totalLifts: 20,
    trailsOpen: 45,
    totalTrails: 110,
    ticketPrice: "$189",
    websiteUrl: "https://www.google.com",
    description: "数据获取失败，显示模拟数据。目前雪况良好。",
    lastUpdated: "刚刚",
    forecast: Array.from({ length: 10 }).map((_, i) => ({
      date: `${i + 1}/12`,
      dayName: ["周一", "周二", "周三", "周四", "周五", "周六", "周日", "周一", "周二", "周三"][i % 10],
      snowInches: randomSnow(0, 8),
      tempHigh: randomSnow(25, 35),
      tempLow: randomSnow(10, 20),
      condition: randomSnow(0, 10) > 5 ? "降雪" : "多云",
    })),
    sourceUrls: ["https://www.onthesnow.com"],
  };
};

const generateMockTopList = (): TopResort[] => [
  { name: "Alta Ski Area", location: "Utah", predictedSnow: 24, summary: "预计有强风暴过境" },
  { name: "Jackson Hole", location: "Wyoming", predictedSnow: 18, summary: "持续降雪" },
  { name: "Mt. Baker", location: "Washington", predictedSnow: 16, summary: "太平洋风暴影响" },
  { name: "Steamboat", location: "Colorado", predictedSnow: 12, summary: "香槟粉雪" },
  { name: "Jay Peak", location: "Vermont", predictedSnow: 10, summary: "冷锋过境" },
];
