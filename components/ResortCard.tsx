import React from 'react';
import { Snowflake, Wind, MapPin, ArrowUpRight, Heart, ExternalLink, Ticket, TrendingUp, Globe } from 'lucide-react';
import { ResortData } from '../types';
import SnowChart from './SnowChart';

interface ResortCardProps {
  data: ResortData;
  isFavorite: boolean;
  onRefresh: () => void;
  onToggleFavorite: () => void;
}

const ResortCard: React.FC<ResortCardProps> = ({ data, isFavorite, onRefresh, onToggleFavorite }) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Header Section */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1.5 text-blue-600">
                <MapPin size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">{data.location}</span>
              </div>
              {data.ticketPrice && (
                 <div className="flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                   <Ticket size={12} />
                   <span>{data.ticketPrice}</span>
                 </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{data.name}</h2>
              <button 
                onClick={onToggleFavorite}
                className={`p-2 rounded-full transition-colors ${
                  isFavorite 
                    ? "bg-red-50 text-red-500 hover:bg-red-100" 
                    : "bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-400"
                }`}
                title={isFavorite ? "取消收藏" : "加入收藏"}
              >
                <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
               更新于 {data.lastUpdated}
             </span>
          </div>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">{data.description}</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-px bg-slate-100 border-y border-slate-100">
        <div className="bg-slate-50 p-4 flex flex-col items-center justify-center text-center group hover:bg-white transition-colors">
          <div className="mb-2 p-2 rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
            <Snowflake size={20} />
          </div>
          <span className="text-xs text-slate-500 mb-1">24小时降雪</span>
          <span className="text-xl font-bold text-slate-800">{data.last24Hours}"</span>
        </div>
        <div className="bg-slate-50 p-4 flex flex-col items-center justify-center text-center group hover:bg-white transition-colors">
          <div className="mb-2 p-2 rounded-full bg-cyan-100 text-cyan-600 group-hover:scale-110 transition-transform">
            <ArrowUpRight size={20} />
          </div>
          <span className="text-xs text-slate-500 mb-1">积雪深度</span>
          <span className="text-xl font-bold text-slate-800">{data.baseDepth}"</span>
        </div>
        <div className="bg-slate-50 p-4 flex flex-col items-center justify-center text-center group hover:bg-white transition-colors">
          <div className="mb-2 p-2 rounded-full bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
            <TrendingUp size={20} />
          </div>
          <span className="text-xs text-slate-500 mb-1">开放雪道</span>
          <span className="text-xl font-bold text-slate-800">
             {data.trailsOpen > 0 ? `${Math.round((data.trailsOpen / data.totalTrails) * 100)}%` : `${data.liftsOpen}/${data.totalLifts} 缆车`}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {data.trailsOpen}/{data.totalTrails} Trails
          </span>
        </div>
      </div>

      {/* Forecast Chart Section */}
      <div className="p-6 bg-slate-50/50">
        <SnowChart data={data.forecast} />
      </div>

      {/* Footer / Actions */}
      <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-white flex-wrap gap-y-3">
        <div className="flex gap-4 overflow-x-auto no-scrollbar w-full mr-4 mb-2">
           {data.forecast.slice(0, 5).map((day, idx) => (
             <div key={idx} className="flex flex-col items-center min-w-[60px] flex-shrink-0">
               <span className="text-[10px] text-slate-400 font-medium uppercase">{day.dayName}</span>
               <div className="mt-1 flex items-center gap-1">
                 <Snowflake size={10} className="text-blue-400" />
                 <span className="text-sm font-bold text-slate-700">{day.snowInches}"</span>
               </div>
             </div>
           ))}
        </div>
        
        <div className="w-full flex justify-between items-end border-t border-slate-100 pt-3">
            {/* Sources Display */}
            <div className="flex-1 mr-4">
              {data.sourceUrls && data.sourceUrls.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">数据来源</span>
                  <div className="flex flex-wrap gap-2">
                    {data.sourceUrls.slice(0, 3).map((url, i) => (
                      <a 
                        key={i} 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 truncate max-w-[150px]"
                      >
                         <ExternalLink size={8} />
                         {new URL(url).hostname.replace('www.', '')}
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400">数据来源: Google Search</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {data.websiteUrl && (
                <a 
                  href={data.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-slate-500 hover:text-blue-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Globe size={14} />
                  <span className="hidden sm:inline">官网</span>
                </a>
              )}
              <button 
                onClick={onRefresh}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                刷新数据
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ResortCard;
