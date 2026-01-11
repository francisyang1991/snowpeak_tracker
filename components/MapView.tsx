import React, { useState, useEffect, useCallback } from 'react';
import { Map, Layers, Filter, Snowflake, ChevronRight, X, RefreshCw, Mountain } from 'lucide-react';
import { MapResort, fetchMapData } from '../services/api';

interface MapViewProps {
  onSelectResort: (resortId: string) => void;
  onClose: () => void;
}

const REGIONS = [
  { id: 'All', label: 'All US', color: '#6366f1' },
  { id: 'Rockies', label: 'Rockies', color: '#f59e0b' },
  { id: 'Pacific', label: 'Pacific', color: '#10b981' },
  { id: 'Northeast', label: 'Northeast', color: '#3b82f6' },
  { id: 'Midwest', label: 'Midwest', color: '#8b5cf6' },
];

const SNOW_FILTERS = [
  { id: 0, label: 'All', icon: '❄️' },
  { id: 6, label: '6"+', icon: '🌨️' },
  { id: 12, label: '12"+', icon: '❄️❄️' },
  { id: 24, label: '24"+', icon: '🏔️' },
];

const TIME_FILTERS = [
  { id: '24h', label: '24hr', key: 'snow24h' as const },
  { id: '48h', label: '48hr', key: 'snow48h' as const },
  { id: '5day', label: '5 Day', key: 'snow5day' as const },
];

// Get color based on snow amount
function getSnowColor(inches: number): string {
  if (inches >= 24) return '#1e40af'; // Deep blue
  if (inches >= 18) return '#2563eb';
  if (inches >= 12) return '#3b82f6';
  if (inches >= 6) return '#60a5fa';
  if (inches >= 3) return '#93c5fd';
  if (inches > 0) return '#bfdbfe';
  return '#e2e8f0'; // No snow
}

// Get size based on snow amount
function getMarkerSize(inches: number): number {
  if (inches >= 24) return 28;
  if (inches >= 18) return 24;
  if (inches >= 12) return 20;
  if (inches >= 6) return 16;
  return 12;
}

const MapView: React.FC<MapViewProps> = ({ onSelectResort, onClose }) => {
  const [resorts, setResorts] = useState<MapResort[]>([]);
  const [filteredResorts, setFilteredResorts] = useState<MapResort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [minSnow, setMinSnow] = useState(0);
  const [timeFilter, setTimeFilter] = useState<'snow24h' | 'snow48h' | 'snow5day'>('snow48h');
  const [hoveredResort, setHoveredResort] = useState<MapResort | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load map data
  const loadData = useCallback(async (refresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMapData({ refresh });
      setResorts(data);
    } catch (e) {
      console.error('Failed to load map data:', e);
      setError('Failed to load map data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter resorts
  useEffect(() => {
    let filtered = resorts;
    
    if (selectedRegion !== 'All') {
      filtered = filtered.filter(r => r.region === selectedRegion || r.state === selectedRegion);
    }
    
    if (minSnow > 0) {
      filtered = filtered.filter(r => r[timeFilter] >= minSnow);
    }
    
    // Sort by snow amount descending
    filtered = [...filtered].sort((a, b) => b[timeFilter] - a[timeFilter]);
    
    setFilteredResorts(filtered);
  }, [resorts, selectedRegion, minSnow, timeFilter]);

  // Simple SVG-based US map coordinates (normalized 0-100)
  const getPosition = (lat: number, lng: number) => {
    // Map bounds: lat 24-50, lng -125 to -66
    const x = ((lng + 125) / 59) * 100;
    const y = ((50 - lat) / 26) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <Map size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Snow Map</h2>
              <p className="text-xs text-slate-400">
                {filteredResorts.length} resorts • {timeFilter === 'snow24h' ? '24hr' : timeFilter === 'snow48h' ? '48hr' : '5-day'} forecast
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="absolute top-20 left-4 z-10 space-y-3">
        {/* Region Filter */}
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-3 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-400 uppercase">Region</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map(region => (
              <button
                key={region.id}
                onClick={() => setSelectedRegion(region.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  selectedRegion === region.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {region.label}
              </button>
            ))}
          </div>
        </div>

        {/* Snow Amount Filter */}
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-3 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-400 uppercase">Min Snow</span>
          </div>
          <div className="flex gap-1.5">
            {SNOW_FILTERS.map(filter => (
              <button
                key={filter.id}
                onClick={() => setMinSnow(filter.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  minSnow === filter.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Filter */}
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-3 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Snowflake size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-400 uppercase">Timeframe</span>
          </div>
          <div className="flex gap-1.5">
            {TIME_FILTERS.map(filter => (
              <button
                key={filter.id}
                onClick={() => setTimeFilter(filter.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  timeFilter === filter.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-800/90 backdrop-blur-sm rounded-xl p-3 border border-slate-700">
        <div className="text-xs font-medium text-slate-400 mb-2">Predicted Snowfall</div>
        <div className="flex items-center gap-3">
          {[0, 3, 6, 12, 18, 24].map((amount) => (
            <div key={amount} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getSnowColor(amount) }}
              />
              <span className="text-[10px] text-slate-400">{amount}"</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map Area */}
      <div className="absolute inset-0 pt-16 pb-4 px-4 flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Mountain size={48} className="text-slate-600 animate-pulse" />
            <p className="text-slate-400">Loading resort data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => loadData(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="relative w-full max-w-5xl aspect-[16/10] bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
            {/* Simple US outline background */}
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                d="M 5 30 L 15 25 L 35 28 L 45 20 L 55 22 L 70 18 L 85 22 L 95 30 L 95 45 L 90 55 L 95 70 L 85 75 L 70 72 L 55 78 L 40 80 L 25 75 L 10 70 L 5 55 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-slate-500"
              />
            </svg>

            {/* Resort markers */}
            {filteredResorts.map((resort) => {
              const pos = getPosition(resort.latitude, resort.longitude);
              const snowAmount = resort[timeFilter];
              const size = getMarkerSize(snowAmount);
              const color = getSnowColor(snowAmount);
              
              return (
                <div
                  key={resort.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-125 hover:z-20"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                  }}
                  onMouseEnter={() => setHoveredResort(resort)}
                  onMouseLeave={() => setHoveredResort(null)}
                  onClick={() => {
                    onSelectResort(resort.id);
                    onClose();
                  }}
                >
                  <div
                    className="rounded-full shadow-lg shadow-black/30 flex items-center justify-center ring-2 ring-white/20"
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: color,
                    }}
                  >
                    {snowAmount >= 12 && (
                      <Snowflake size={size * 0.5} className="text-white" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Hover tooltip */}
            {hoveredResort && (
              <div 
                className="absolute z-30 pointer-events-none"
                style={{
                  left: `${getPosition(hoveredResort.latitude, hoveredResort.longitude).x}%`,
                  top: `${getPosition(hoveredResort.latitude, hoveredResort.longitude).y - 8}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 shadow-xl">
                  <div className="font-semibold text-white text-sm">{hoveredResort.name}</div>
                  <div className="text-slate-400 text-xs">{hoveredResort.state}</div>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <div className="text-slate-500">24hr</div>
                      <div className="text-cyan-400 font-bold">{hoveredResort.snow24h}"</div>
                    </div>
                    <div>
                      <div className="text-slate-500">48hr</div>
                      <div className="text-blue-400 font-bold">{hoveredResort.snow48h}"</div>
                    </div>
                    <div>
                      <div className="text-slate-500">5day</div>
                      <div className="text-indigo-400 font-bold">{hoveredResort.snow5day}"</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resort List Sidebar */}
      <div className="absolute top-20 right-4 bottom-4 w-80 bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-700">
          <h3 className="font-semibold text-white text-sm">
            Top Snow Resorts
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sorted by {timeFilter === 'snow24h' ? '24hr' : timeFilter === 'snow48h' ? '48hr' : '5-day'} forecast
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredResorts.slice(0, 20).map((resort, idx) => (
            <div
              key={resort.id}
              onClick={() => {
                onSelectResort(resort.id);
                onClose();
              }}
              className="group flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-700/50"
            >
              <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs font-bold rounded-full ${
                idx === 0 ? 'bg-yellow-500/20 text-yellow-400' : 
                idx === 1 ? 'bg-slate-500/20 text-slate-300' :
                idx === 2 ? 'bg-orange-500/20 text-orange-400' : 
                'bg-slate-700 text-slate-500'
              }`}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm truncate">{resort.name}</div>
                <div className="text-xs text-slate-500">{resort.state}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-400">{resort[timeFilter]}"</div>
                <div className="text-[10px] text-slate-500">
                  Base: {resort.currentBase}"
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
          ))}
          
          {filteredResorts.length === 0 && (
            <div className="p-4 text-center text-slate-500 text-sm">
              No resorts match your filters
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
