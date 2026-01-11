import React from 'react';
import { CloudSnow, ChevronRight } from 'lucide-react';
import { TopResort } from '../types';

interface TopSnowListProps {
  data: TopResort[];
  isLoading: boolean;
  activeRegion: string;
  onSelectRegion: (region: string) => void;
  onSelectResort: (name: string) => void;
}

const REGIONS = [
  { id: 'All', label: '全美' },
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
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
          <CloudSnow size={18} />
        </div>
        <h3 className="font-semibold text-slate-800">未来5天降雪预测 TOP 5</h3>
      </div>

      {/* Region Selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
        {REGIONS.map((region) => (
          <button
            key={region.id}
            onClick={() => onSelectRegion(region.id)}
            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              activeRegion === region.id
                ? 'bg-slate-800 text-white'
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
            <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item, idx) => (
            <div 
              key={idx}
              onClick={() => onSelectResort(item.name)}
              className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-100"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs font-bold rounded-full ${
                  idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                  idx === 1 ? 'bg-slate-200 text-slate-600' :
                  idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {idx + 1}
                </span>
                <div>
                  <div className="font-medium text-slate-800 text-sm leading-tight mb-0.5">{item.name}</div>
                  <div className="text-xs text-slate-500 truncate max-w-[140px]">{item.location} • <span className="text-indigo-600 font-semibold">{item.predictedSnow}"</span></div>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>
          ))}
          {data.length === 0 && (
             <div className="text-center py-4 text-sm text-slate-400">
               该地区暂无重大降雪预测
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TopSnowList;
