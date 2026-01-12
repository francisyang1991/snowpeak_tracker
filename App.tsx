import React, { useState, useEffect, useCallback } from 'react';
import { Search, Mountain, Loader2, Star, Bot, Sparkles, Send, Map, AlertTriangle, TrendingUp } from 'lucide-react';
import { ResortData, TopResort } from './types';
import { fetchResortSnowData, fetchTopSnowfallRegions, askSkiAssistant } from './services/geminiService';
import * as api from './services/api';
import ResortCard from './components/ResortCard';
import TopSnowList from './components/TopSnowList';
import MapView from './components/MapView';
import NotificationBell from './components/NotificationBell';

const DEFAULT_POPULAR = [
  "Crystal Mountain",
  "Big Sky",
  "Copper Mountain",
  "Mt Bachelor"
];

const FAVORITES_STORAGE_KEY = 'snowPeakFavorites';
const FAVORITES_VERSION_KEY = 'snowPeakFavoritesVersion';
const FAVORITES_VERSION = 3;
const PREVIOUS_DEFAULTS_V2 = ["Crystal Mountain", "Big Sky", "Whistler", "Copper Mountain"];

// Check if backend is available
const USE_BACKEND = import.meta.env.VITE_API_URL || false;

const App: React.FC = () => {
  const [selectedResort, setSelectedResort] = useState<string>("Crystal Mountain");
  const [resortData, setResortData] = useState<ResortData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showMap, setShowMap] = useState<boolean>(false);
  
  // Favorites State with LocalStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const version = parseInt(localStorage.getItem(FAVORITES_VERSION_KEY) || '0', 10);
      const parsed = saved ? JSON.parse(saved) : null;

      if (Array.isArray(parsed)) {
        // If user still has an old default set, migrate to the new defaults.
        if (version < FAVORITES_VERSION) {
          const sameAsPrevDefaults =
            JSON.stringify(parsed) === JSON.stringify(PREVIOUS_DEFAULTS_V2);
          const sameAsOriginalDefaults =
            JSON.stringify(parsed) === JSON.stringify(["Vail","Aspen Snowmass","Jackson Hole","Park City","Mammoth Mountain"]);

          if (sameAsPrevDefaults || sameAsOriginalDefaults) {
            return DEFAULT_POPULAR;
          }
        }
        return parsed;
      }

      return DEFAULT_POPULAR;
    } catch {
      return DEFAULT_POPULAR;
    }
  });

  // Top 5 State
  const [topResorts, setTopResorts] = useState<TopResort[]>([]);
  const [isTopLoading, setIsTopLoading] = useState<boolean>(false);
  const [activeRegion, setActiveRegion] = useState<string>("All");
  
  // AI Assistant State
  const [chatQuery, setChatQuery] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Cache States
  const [dataCache, setDataCache] = useState<Record<string, ResortData>>({});
  const [topListCache, setTopListCache] = useState<Record<string, TopResort[]>>({});

  // Alert banner
  const [snowAlert, setSnowAlert] = useState<{ resort: string; snow: number } | null>(null);

  // Save favorites when changed
  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    localStorage.setItem(FAVORITES_VERSION_KEY, String(FAVORITES_VERSION));
  }, [favorites]);

  // Load Top 5 Lists
  const loadTopList = useCallback(async (region: string, forceRefresh = false) => {
    // Check frontend cache first
    if (!forceRefresh && topListCache[region]) {
      setTopResorts(topListCache[region]);
      // Check for alerts
      const top = topListCache[region][0];
      if (top && top.predictedSnow >= 18) {
        setSnowAlert({ resort: top.name, snow: top.predictedSnow });
      }
      return;
    }

    setIsTopLoading(true);
    setTopResorts([]); 
    
    try {
      // Call backend API - backend will check its own database cache first
      const data = USE_BACKEND 
        ? await api.fetchTopResortsWithRefresh(region, 5, forceRefresh)
        : await fetchTopSnowfallRegions(region);
      
      setTopResorts(data);
      setTopListCache(prev => ({ ...prev, [region]: data }));
      
      // Check for alerts
      if (data[0] && data[0].predictedSnow >= 18) {
        setSnowAlert({ resort: data[0].name, snow: data[0].predictedSnow });
      }
    } catch (e) {
      console.error("Failed to load top list", e);
    } finally {
      setIsTopLoading(false);
    }
  }, [topListCache]);

  // Initial load for Top List
  useEffect(() => {
    loadTopList(activeRegion);
  }, [activeRegion, loadTopList]);

  // Handle Region Switch
  const handleRegionChange = (region: string) => {
    setActiveRegion(region);
  };

  const loadData = useCallback(async (name: string, forceRefresh = false) => {
    const cacheKey = name.toLowerCase().replace(/\s+/g, '-');
    
    // Check frontend (browser) cache first - but only use if data has valid forecast
    const cachedData = dataCache[cacheKey];
    const hasValidCache = cachedData && cachedData.forecast && cachedData.forecast.length > 0;
    
    // If we have valid frontend cache and not forcing refresh, use it
    if (!forceRefresh && hasValidCache) {
      setResortData(cachedData);
      return;
    }

    setIsLoading(true);
    if (!forceRefresh) setResortData(null); 
    
    try {
      // Call backend API - let the BACKEND decide if it needs to fetch fresh data
      // Only pass refresh=true when user explicitly requests it (clicks refresh button)
      // The backend has its own 1-hour database cache that it will check first
      const data = USE_BACKEND 
        ? await api.fetchResortData(cacheKey, forceRefresh)  // Only force when user clicks refresh
        : await fetchResortSnowData(name);
      
      setResortData(data);
      setDataCache(prev => ({ ...prev, [cacheKey]: data }));
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setIsLoading(false);
    }
  }, [dataCache]);

  // Initial load for Resort Data
  useEffect(() => {
    loadData(selectedResort);
  }, [selectedResort, loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSelectedResort(searchQuery);
    }
  };

  const toggleFavorite = (name: string) => {
    setFavorites(prev => {
      const isFav = prev.includes(name);
      if (isFav) {
        return prev.filter(f => f !== name);
      } else {
        return [name, ...prev];
      }
    });
  };
  
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    
    setIsChatLoading(true);
    setChatResponse("");
    
    try {
      const response = USE_BACKEND
        ? await api.askSkiAssistant(chatQuery)
        : await askSkiAssistant(chatQuery);
      setChatResponse(response);
    } catch (e) {
      setChatResponse("Sorry, I couldn't process your question. Please try again.");
    }
    setIsChatLoading(false);
  };

  const handleMapResortSelect = (resortId: string) => {
    const resortName = resortId.replace(/-/g, ' ');
    setSelectedResort(resortName);
    setShowMap(false);
  };

  const isCurrentFavorite = favorites.includes(resortData?.name || selectedResort);

  // Calculate total predicted snow for next 5 days
  const totalForecastSnow = resortData?.forecast
    ?.slice(0, 5)
    .reduce((sum, day) => sum + day.snowInches, 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 text-slate-900 pb-12">
      {/* Snow Alert Banner */}
      {snowAlert && snowAlert.snow >= 24 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 text-center text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={16} />
            🌨️ POWDER ALERT: {snowAlert.resort} expecting {snowAlert.snow}" in the next 5 days!
            <button 
              onClick={() => setSnowAlert(null)} 
              className="ml-2 opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </span>
        </div>
      )}

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedResort("Crystal Mountain")}>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/25">
              <Mountain size={20} strokeWidth={2.5} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                SnowPeak <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Tracker</span>
              </h1>
              <p className="text-[10px] text-slate-400 -mt-0.5">FREE Snow Forecasts</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xs sm:max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ski resort..."
                className="block w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </form>
            
            {/* Notification Bell */}
            <NotificationBell 
              onSelectResort={(name) => {
                setSelectedResort(name);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            
            {/* Map Button - Temporarily disabled */}
            <button
              onClick={() => {}}
              disabled
              className="flex items-center gap-2 px-3 py-2 bg-slate-300 text-slate-500 text-sm font-medium rounded-xl cursor-not-allowed opacity-60"
              title="Coming soon - Snow Map feature is under development"
            >
              <Map size={16} />
              <span className="hidden sm:inline">Snow Map</span>
            </button>
          </div>
        </div>
      </header>

      {/* Map Modal */}
      {showMap && (
        <MapView 
          onSelectResort={handleMapResortSelect}
          onClose={() => setShowMap(false)}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 pt-6">
        {/* Quick Stats Banner */}
        {resortData && totalForecastSnow > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-2xl border border-blue-200/50 backdrop-blur-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium">5-Day Snow Forecast</p>
                  <p className="text-2xl font-bold text-slate-900">{totalForecastSnow}" <span className="text-sm font-normal text-slate-500">total</span></p>
                </div>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-xs text-slate-500">24hr</p>
                  <p className="text-lg font-bold text-cyan-600">{resortData.last24Hours}"</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Base</p>
                  <p className="text-lg font-bold text-blue-600">{resortData.baseDepth}"</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Lifts</p>
                  <p className="text-lg font-bold text-indigo-600">{resortData.liftsOpen}/{resortData.totalLifts}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Sidebar (Favorites & Top List) */}
          <div className="lg:col-span-1 space-y-6">
             {/* Favorites List */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Favorites</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar lg:flex-col lg:overflow-visible">
                {favorites.length === 0 && (
                   <div className="text-sm text-slate-400 italic px-2">No favorites yet</div>
                )}
                {favorites.map((resort) => (
                  <button
                    key={resort}
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedResort(resort);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-auto lg:w-full ${
                      selectedResort.toLowerCase() === resort.toLowerCase()
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-md'
                    }`}
                  >
                    {resort}
                  </button>
                ))}
              </div>
            </div>

            {/* Top 5 List Widget - Hidden on mobile, visible on desktop sidebar */}
            <div className="hidden lg:block">
              <TopSnowList 
                data={topResorts} 
                isLoading={isTopLoading} 
                activeRegion={activeRegion}
                onSelectRegion={handleRegionChange}
                onRefresh={(region) => loadTopList(region, true)}
                onSelectResort={(name) => {
                  setSelectedResort(name);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} 
              />
            </div>
          </div>

          {/* Right Column: Main Content */}
          <div className="lg:col-span-2">
            
            {/* Mobile Top 5 (Visible only on mobile above card) */}
            <div className="lg:hidden">
               <TopSnowList 
                data={topResorts} 
                isLoading={isTopLoading} 
                activeRegion={activeRegion}
                onSelectRegion={handleRegionChange}
                onRefresh={(region) => loadTopList(region, true)}
                onSelectResort={(name) => {
                  setSelectedResort(name);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} 
              />
            </div>

            <div className="min-h-[400px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-in fade-in duration-500 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-slate-500 font-medium">Analyzing {selectedResort}...</p>
                  <div className="text-xs text-slate-400 max-w-xs text-center">
                    Fetching 10-day forecast & live conditions
                  </div>
                </div>
              ) : resortData ? (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <ResortCard 
                    data={resortData} 
                    isFavorite={isCurrentFavorite}
                    onRefresh={() => loadData(selectedResort, true)}
                    onToggleFavorite={() => toggleFavorite(resortData.name)}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-white rounded-3xl border border-dashed border-slate-300">
                  <Mountain size={48} className="text-slate-200 mb-4" />
                  <p className="text-slate-500">Unable to load data. Try searching for another resort.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* AI Assistant Section */}
        <div className="mt-12 max-w-2xl mx-auto px-4">
          <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-500">
              <Bot size={100} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-lg shadow-sm">
                  <Bot size={18} />
                </div>
                <h3 className="font-bold text-slate-800">AI Ski Assistant</h3>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                  Powered by Gemini
                </span>
              </div>
              
              <div className="min-h-[60px] mb-4 text-sm text-slate-600 bg-white/60 p-4 rounded-xl backdrop-blur-sm border border-white/50">
                {chatResponse ? (
                  <div className="animate-in fade-in duration-300">
                    <div className="flex items-start gap-2">
                       <Sparkles size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                       <p>{chatResponse}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">
                    "Ask me anything about skiing - gear, technique, conditions, or resort tips!"
                  </p>
                )}
              </div>

              <form onSubmit={handleChatSubmit} className="relative flex gap-2">
                <input
                  type="text"
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  placeholder="Ask something..."
                  className="flex-1 bg-white border-transparent focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all shadow-sm"
                  disabled={isChatLoading}
                />
                <button
                  type="submit"
                  disabled={!chatQuery.trim() || isChatLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
                >
                  {isChatLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* OpenSnow Comparison Banner */}
        <div className="mt-8 max-w-2xl mx-auto px-4">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🏆</div>
              <div>
                <h4 className="font-semibold text-emerald-800">Why Choose SnowPeak?</h4>
                <p className="text-sm text-emerald-700">
                  <span className="font-medium">100% FREE</span> 10-day forecasts • No ads • AI-powered insights • 
                  Real-time data from Google Search
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center border-t border-slate-200 pt-8">
            <h4 className="text-sm font-semibold text-slate-900 mb-2">About SnowPeak Tracker</h4>
            <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
              Free snow forecasting app powered by Google Gemini AI with real-time search.
              <br />
              10-day forecasts, live conditions, and intelligent caching. Data for reference only - always check official safety warnings.
            </p>
            <p className="text-xs text-slate-400 mt-4">
              Built to beat OpenSnow 💪 • Made with ❄️ in 2026
            </p>
        </div>
      </main>
    </div>
  );
};

export default App;
