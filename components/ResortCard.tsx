import React, { useState } from 'react';
import { Snowflake, MapPin, Heart, ExternalLink, Ticket, TrendingUp, Globe, RefreshCw, Mountain, Thermometer, Clock, Bell, BellRing } from 'lucide-react';
import { ResortData } from '../types';
import SnowChart from './SnowChart';
import AlertSubscriptionModal from './AlertSubscriptionModal';

interface ResortCardProps {
  data: ResortData;
  isFavorite: boolean;
  onRefresh: () => void;
  onToggleFavorite: () => void;
}

const ResortCard: React.FC<ResortCardProps> = ({ data, isFavorite, onRefresh, onToggleFavorite }) => {
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [hasAlert, setHasAlert] = useState(false);

  // Calculate powder score based on conditions
  const getPowderScore = () => {
    const recent = data.last24Hours + data.last48Hours / 2;
    const base = Math.min(data.baseDepth / 100, 1) * 20;
    const freshness = Math.min(recent / 20, 1) * 80;
    return Math.round(base + freshness);
  };

  const powderScore = getPowderScore();
  
  // Get condition badge
  const getConditionBadge = () => {
    if (data.last24Hours >= 12) return { label: 'POWDER DAY!', color: 'bg-gradient-to-r from-blue-600 to-indigo-600', icon: '🎿' };
    if (data.last24Hours >= 6) return { label: 'Fresh Snow', color: 'bg-gradient-to-r from-cyan-500 to-blue-500', icon: '❄️' };
    if (data.baseDepth >= 60) return { label: 'Great Base', color: 'bg-gradient-to-r from-emerald-500 to-teal-500', icon: '✨' };
    return { label: 'Open', color: 'bg-slate-500', icon: '⛷️' };
  };

  const condition = getConditionBadge();

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-lg">
      {/* Header Section */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-blue-600">
                <MapPin size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">{data.location}</span>
              </div>
              {data.ticketPrice && (
                 <div className="flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                   <Ticket size={12} />
                   <span>{data.ticketPrice}</span>
                 </div>
              )}
              <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${condition.color}`}>
                {condition.icon} {condition.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{data.name}</h2>
              <button 
                onClick={onToggleFavorite}
                className={`p-2 rounded-full transition-all ${
                  isFavorite 
                    ? "bg-red-50 text-red-500 hover:bg-red-100 shadow-sm" 
                    : "bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-400"
                }`}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
              </button>
              <button 
                onClick={() => setShowAlertModal(true)}
                className={`p-2 rounded-full transition-all ${
                  hasAlert 
                    ? "bg-blue-50 text-blue-500 hover:bg-blue-100 shadow-sm" 
                    : "bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-blue-400"
                }`}
                title="Set snow alert"
              >
                {hasAlert ? <BellRing size={20} /> : <Bell size={20} />}
              </button>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              <Clock size={12} />
              Updated {data.lastUpdated}
            </div>
          </div>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">{data.description}</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-4 gap-px bg-slate-100">
        <div className="bg-gradient-to-br from-blue-50 to-white p-4 flex flex-col items-center justify-center text-center group hover:from-blue-100 transition-colors">
          <div className="mb-2 p-2 rounded-full bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
            <Snowflake size={20} />
          </div>
          <span className="text-[10px] text-slate-500 mb-0.5 uppercase font-medium">24hr Snow</span>
          <span className="text-2xl font-bold text-blue-700">{data.last24Hours}"</span>
        </div>
        
        <div className="bg-gradient-to-br from-cyan-50 to-white p-4 flex flex-col items-center justify-center text-center group hover:from-cyan-100 transition-colors">
          <div className="mb-2 p-2 rounded-full bg-cyan-100 text-cyan-600 group-hover:scale-110 transition-transform">
            <Mountain size={20} />
          </div>
          <span className="text-[10px] text-slate-500 mb-0.5 uppercase font-medium">Base Depth</span>
          <span className="text-2xl font-bold text-cyan-700">{data.baseDepth}"</span>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-50 to-white p-4 flex flex-col items-center justify-center text-center group hover:from-indigo-100 transition-colors">
          <div className="mb-2 p-2 rounded-full bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
            <TrendingUp size={20} />
          </div>
          <span className="text-[10px] text-slate-500 mb-0.5 uppercase font-medium">Trails Open</span>
          <span className="text-2xl font-bold text-indigo-700">
            {data.totalTrails > 0 ? `${Math.round((data.trailsOpen / data.totalTrails) * 100)}%` : data.trailsOpen}
          </span>
          <span className="text-[9px] text-slate-400">
            {data.trailsOpen}/{data.totalTrails}
          </span>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-white p-4 flex flex-col items-center justify-center text-center group hover:from-purple-100 transition-colors">
          <div className="mb-2 p-2 rounded-full bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform">
            <Thermometer size={20} />
          </div>
          <span className="text-[10px] text-slate-500 mb-0.5 uppercase font-medium">Powder Score</span>
          <span className={`text-2xl font-bold ${
            powderScore >= 70 ? 'text-emerald-600' :
            powderScore >= 40 ? 'text-amber-600' : 'text-slate-600'
          }`}>
            {powderScore}
          </span>
          <span className="text-[9px] text-slate-400">out of 100</span>
        </div>
      </div>

      {/* Forecast Chart Section */}
      <div className="p-6 bg-gradient-to-br from-slate-50/80 to-white">
        <SnowChart data={data.forecast} />
      </div>

      {/* Footer / Actions */}
      <div className="px-6 py-4 border-t border-slate-100 bg-white">
        <div className="flex justify-between items-center flex-wrap gap-3">
          {/* Sources Display */}
          <div className="flex-1 min-w-[200px]">
            {data.sourceUrls && data.sourceUrls.length > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Data Sources</span>
                <div className="flex flex-wrap gap-2">
                  {data.sourceUrls.slice(0, 3).map((url, i) => (
                    <a 
                      key={i} 
                      href={url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-0.5 truncate max-w-[150px] bg-blue-50 px-2 py-0.5 rounded-full"
                    >
                       <ExternalLink size={8} />
                       {new URL(url).hostname.replace('www.', '')}
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400">Data source: Google Search + Gemini AI</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {data.websiteUrl && (
              <a 
                href={data.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all"
              >
                <Globe size={14} />
                <span className="hidden sm:inline">Website</span>
              </a>
            )}
            <button 
              onClick={onRefresh}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Alert Subscription Modal */}
      <AlertSubscriptionModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        resortId={data.id || data.name.toLowerCase().replace(/\s+/g, '-')}
        resortName={data.name}
        onSubscribed={() => setHasAlert(true)}
      />
    </div>
  );
};

export default ResortCard;
