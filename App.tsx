import React, { useState, useEffect, useCallback } from 'react';
import { Search, Mountain, Loader2, Star, Bot, Sparkles, Send } from 'lucide-react';
import { ResortData, TopResort } from './types';
import { fetchResortSnowData, fetchTopSnowfallRegions, askSkiAssistant } from './services/geminiService';
import ResortCard from './components/ResortCard';
import TopSnowList from './components/TopSnowList';

const DEFAULT_POPULAR = [
  "Vail",
  "Aspen Snowmass",
  "Jackson Hole"
];

const App: React.FC = () => {
  const [selectedResort, setSelectedResort] = useState<string>("Vail");
  const [resortData, setResortData] = useState<ResortData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Favorites State with LocalStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('snowPeakFavorites');
      return saved ? JSON.parse(saved) : DEFAULT_POPULAR;
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

  // Save favorites when changed
  useEffect(() => {
    localStorage.setItem('snowPeakFavorites', JSON.stringify(favorites));
  }, [favorites]);

  // Load Top 5 Lists
  const loadTopList = useCallback(async (region: string) => {
    // Check Cache first
    if (topListCache[region]) {
      setTopResorts(topListCache[region]);
      return;
    }

    setIsTopLoading(true);
    // Optimistic UI: Don't clear old data immediately if we are just switching tabs, 
    // but here we want to show loading state for the specific new region
    setTopResorts([]); 
    
    try {
      const data = await fetchTopSnowfallRegions(region);
      setTopResorts(data);
      setTopListCache(prev => ({ ...prev, [region]: data }));
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
    // Cache check
    if (!forceRefresh && dataCache[name.toLowerCase()]) {
      setResortData(dataCache[name.toLowerCase()]);
      return;
    }

    setIsLoading(true);
    // Only clear data if not a refresh, to prevent flash
    if (!forceRefresh) setResortData(null); 
    
    try {
      const data = await fetchResortSnowData(name);
      setResortData(data);
      // Update Cache
      setDataCache(prev => ({ ...prev, [name.toLowerCase()]: data }));
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
    setChatResponse(""); // Clear previous response
    
    const response = await askSkiAssistant(chatQuery);
    setChatResponse(response);
    setIsChatLoading(false);
  };

  const isCurrentFavorite = favorites.includes(resortData?.name || selectedResort);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-12">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedResort("Vail")}>
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <Mountain size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 hidden sm:block">
              SnowPeak <span className="text-blue-600">Tracker</span>
            </h1>
          </div>
          
          <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xs sm:max-w-sm ml-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索滑雪场..."
              className="block w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Sidebar (Favorites & Top List) */}
          <div className="md:col-span-1 space-y-6">
             {/* Favorites List */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">我的收藏</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar md:flex-col md:overflow-visible">
                {favorites.length === 0 && (
                   <div className="text-sm text-slate-400 italic px-2">暂无收藏</div>
                )}
                {favorites.map((resort) => (
                  <button
                    key={resort}
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedResort(resort);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-auto md:w-full ${
                      selectedResort.toLowerCase() === resort.toLowerCase()
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {resort}
                  </button>
                ))}
              </div>
            </div>

            {/* Top 5 List Widget - Hidden on mobile, visible on desktop sidebar */}
            <div className="hidden md:block">
              <TopSnowList 
                data={topResorts} 
                isLoading={isTopLoading} 
                activeRegion={activeRegion}
                onSelectRegion={handleRegionChange}
                onSelectResort={(name) => {
                  setSelectedResort(name);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }} 
              />
            </div>
          </div>

          {/* Right Column: Main Content */}
          <div className="md:col-span-2">
            
            {/* Mobile Top 5 (Visible only on mobile above card) */}
            <div className="md:hidden">
               <TopSnowList 
                data={topResorts} 
                isLoading={isTopLoading} 
                activeRegion={activeRegion}
                onSelectRegion={handleRegionChange}
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
                  <p className="text-slate-500 font-medium">正在分析 {selectedResort}...</p>
                  <div className="text-xs text-slate-400 max-w-xs text-center">
                    获取10天降雪预测与实时雪况
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
                  <p className="text-slate-500">无法加载数据。请尝试搜索其他滑雪场。</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* AI Assistant Section (Replaces Feedback) */}
        <div className="mt-12 max-w-2xl mx-auto px-4">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-500">
              <Bot size={100} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-indigo-500 text-white rounded-lg shadow-sm">
                  <Bot size={18} />
                </div>
                <h3 className="font-bold text-slate-800">AI 滑雪小助手</h3>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                  Flash Lite
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
                    "想知道哪个雪场适合新手？或者如何挑选滑雪镜？随时问我！"
                  </p>
                )}
              </div>

              <form onSubmit={handleChatSubmit} className="relative flex gap-2">
                <input
                  type="text"
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  placeholder="问点什么..."
                  className="flex-1 bg-white border-transparent focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all shadow-sm"
                  disabled={isChatLoading}
                />
                <button
                  type="submit"
                  disabled={!chatQuery.trim() || isChatLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
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

        {/* Info Section */}
        <div className="mt-12 text-center border-t border-slate-200 pt-8">
            <h4 className="text-sm font-semibold text-slate-900 mb-2">关于 SnowPeak Tracker</h4>
            <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
              本应用使用 Google Gemini AI 实时分析全美各大滑雪场的天气模型。
              <br />
              支持10天预测与智能缓存。数据仅供参考，滑雪前请务必查看官方安全警示。
            </p>
        </div>
      </main>
    </div>
  );
};

export default App;
