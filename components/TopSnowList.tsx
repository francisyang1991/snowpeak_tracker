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
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 text-sm leading-tight mb-0.5 truncate max-w-[120px] sm:max-w-[160px]">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[100px] sm:max-w-[140px]">
                      {item.location}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Snow intensity bar */}
                  <div className="hidden sm:block w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(intensity * 100, 10)}%` }}
                    />
                  </div>
                  
                  {/* Snow amount */}
                  <div className="flex items-center gap-0.5 min-w-[52px] justify-end">
                    <Snowflake size={10} className="text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-indigo-600 tabular-nums">{item.predictedSnow}"</span>
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
          <span>Updated every 30 min</span>
          <div className="flex items-center gap-2">
            <TrendingUp size={10} />
            <span>Predicted total for next 5 days</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopSnowList;
