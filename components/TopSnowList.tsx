import React from 'react';
import { CloudSnow, ChevronRight, TrendingUp, Snowflake } from 'lucide-react';
import { TopResort } from '../types';

interface TopSnowListProps {
  data: TopResort[];
  isLoading: boolean;
  activeRegion: string;
  onSelectRegion: (region: string) => void;
  onSelectResort: (name: string) => void;
}

const REGIONS = [
  { id: 'All', label: 'All US' },
  { id: 'CO', label: 'CO' },
  { id: 'UT', label: 'UT' },
  { id: 'CA', label: 'CA' },
  { id: 'WA', label: 'WA' },
  { id: 'VT', label: 'VT' },
];

// Get color class based on 5-DAY TOTAL snow amount
// (Different scale than daily because it's cumulative over 5 days)
function getSnowColorClass5Day(inches: number): string {
  if (inches >= 60) return 'text-red-600 bg-red-100';       // 60+"  - Epic/Heavy (12"+ per day avg)
  if (inches >= 30) return 'text-purple-600 bg-purple-100'; // 30-60" - Great snow (6-12" per day avg)
  if (inches >= 15) return 'text-blue-600 bg-blue-100';     // 15-30" - Good snow (3-6" per day avg)
  if (inches >= 5) return 'text-cyan-600 bg-cyan-50';       // 5-15"  - Light snow (1-3" per day avg)
  return 'text-slate-500 bg-slate-100';                      // <5"   - Minimal
}

const TopSnowList: React.FC<TopSnowListProps> = ({ 
  data, 
  isLoading, 
  activeRegion, 
  onSelectRegion, 
  onSelectResort 
}) => {
  // Calculate total predicted snow
  const totalPredictedSnow = data.reduce((sum, r) => sum + r.predictedSnow, 0);
  const avgSnow = data.length > 0 ? Math.round(totalPredictedSnow / data.length) : 0;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-blue-500 text-white rounded-lg shadow-sm">
            <CloudSnow size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">5-Day Snow Forecast</h3>
            <p className="text-[10px] text-slate-400">Top resorts by predicted snowfall</p>
          </div>
        </div>
        {avgSnow > 0 && (
          <div className="text-right">
            <div className="text-xs text-slate-400">Avg</div>
            <div className="text-lg font-bold text-blue-600">{avgSnow}"</div>
          </div>
        )}
      </div>

      {/* Region Selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
        {REGIONS.map((region) => (
          <button
            key={region.id}
            onClick={() => onSelectRegion(region.id)}
            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
              activeRegion === region.id
                ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {region.label}
          </button>
        ))}
      </div>
      
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((item, idx) => {
            // Calculate snow intensity relative to max in the list
            const maxSnow = Math.max(...data.map(r => r.predictedSnow), 1);
            const intensity = Math.min(item.predictedSnow / maxSnow, 1);
            
            return (
              <div 
                key={idx}
                onClick={() => onSelectResort(item.name)}
                className="group flex items-center justify-between p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all border border-transparent hover:border-blue-100"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs font-bold rounded-full ${
                    idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-sm' : 
                    idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                    idx === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-600 text-white' : 
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-800 text-sm leading-tight mb-0.5 truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate" title={item.location}>
                      {item.location}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Snow intensity bar with dynamic color (5-day total scale) */}
                  <div className="hidden sm:block w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.predictedSnow >= 60 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                        item.predictedSnow >= 30 ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                        item.predictedSnow >= 15 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                        item.predictedSnow >= 5 ? 'bg-gradient-to-r from-cyan-400 to-cyan-500' :
                        'bg-gradient-to-r from-slate-300 to-slate-400'
                      }`}
                      style={{ width: `${Math.max(intensity * 100, 10)}%` }}
                    />
                  </div>
                  
                  {/* Snow amount with color coding (5-day total scale) */}
                  <div className={`flex items-center gap-0.5 min-w-[56px] justify-end px-1.5 py-0.5 rounded-md ${getSnowColorClass5Day(item.predictedSnow)}`}>
                    <Snowflake size={10} className="flex-shrink-0" />
                    <span className="text-sm font-bold tabular-nums">{item.predictedSnow}"</span>
                  </div>
                  
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </div>
            );
          })}
          
          {data.length === 0 && (
             <div className="text-center py-6 text-sm text-slate-400">
               <CloudSnow size={24} className="mx-auto mb-2 opacity-50" />
               No significant snowfall predicted in this region
             </div>
          )}
        </div>
      )}

      {/* Legend */}
      {data.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span>Cached for 1 hour</span>
          <div className="flex items-center gap-2">
            <TrendingUp size={10} />
            <span>5-day total snowfall</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopSnowList;
