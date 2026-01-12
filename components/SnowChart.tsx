import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, ComposedChart } from 'recharts';
import { DailyForecast } from '../types';
import { Snowflake, Thermometer, Wind } from 'lucide-react';

interface SnowChartProps {
  data: DailyForecast[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-sm p-4 border border-slate-200 shadow-xl rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{data.snowInches >= 6 ? '🌨️' : data.snowInches > 0 ? '❄️' : '☁️'}</span>
          <div>
            <p className="font-bold text-slate-800">{label}</p>
            <p className="text-xs text-slate-500">{data.dayName}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600">
            <Snowflake size={14} />
            <span className="font-bold text-lg">{data.snowInches}"</span>
            <span className="text-xs text-slate-500">snowfall</span>
          </div>
          
          <div className="flex items-center gap-2 text-slate-600">
            <Thermometer size={14} />
            <span className="text-sm">
              <span className="font-medium text-orange-500">{data.tempHigh}°</span>
              <span className="mx-1">/</span>
              <span className="font-medium text-blue-500">{data.tempLow}°</span>
              <span className="text-xs text-slate-400 ml-1">F</span>
            </span>
          </div>
          
          <div className="pt-2 border-t border-slate-100">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              data.condition?.toLowerCase().includes('snow') 
                ? 'bg-blue-100 text-blue-700'
                : data.condition?.toLowerCase().includes('cloud')
                ? 'bg-slate-100 text-slate-600'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {data.condition}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const SnowChart: React.FC<SnowChartProps> = ({ data }) => {
  // Handle empty or invalid data
  const validData = data && data.length > 0 ? data : [];
  
  // Calculate stats with edge case handling
  const totalSnow = validData.slice(0, 10).reduce((sum, d) => sum + (d.snowInches || 0), 0);
  const maxSnow = validData.length > 0 ? Math.max(...validData.map(d => d.snowInches || 0)) : 0;
  const snowDays = validData.filter(d => d.snowInches > 0).length;
  const avgTemp = validData.length > 0 
    ? Math.round(validData.reduce((sum, d) => sum + ((d.tempHigh || 0) + (d.tempLow || 0)) / 2, 0) / validData.length)
    : 0;

  // Show empty state if no forecast data
  if (validData.length === 0) {
    return (
      <div className="w-full">
        <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Snowflake size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No forecast data available</p>
          <p className="text-xs text-slate-400 mt-1">Click Refresh to load 10-day forecast</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 text-center border border-blue-100">
          <div className="text-xs text-blue-600 font-medium">10-Day Total</div>
          <div className="text-2xl font-bold text-blue-700">{totalSnow}"</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3 text-center border border-indigo-100">
          <div className="text-xs text-indigo-600 font-medium">Max Single Day</div>
          <div className="text-2xl font-bold text-indigo-700">{maxSnow}"</div>
        </div>
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-3 text-center border border-cyan-100">
          <div className="text-xs text-cyan-600 font-medium">Snow Days</div>
          <div className="text-2xl font-bold text-cyan-700">{snowDays}<span className="text-sm font-normal">/10</span></div>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 text-center border border-slate-200">
          <div className="text-xs text-slate-600 font-medium">Avg Temp</div>
          <div className="text-2xl font-bold text-slate-700">{avgTemp}°</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px] bg-gradient-to-br from-white to-slate-50 rounded-xl p-3 border border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
            <Snowflake size={14} className="text-blue-500" />
            10-Day Snow Forecast
          </h3>
          <span className="text-xs text-slate-400">inches per day</span>
        </div>
        
        <ResponsiveContainer width="100%" height="90%">
          <ComposedChart
            data={validData}
            margin={{
              top: 10,
              right: 10,
              left: -15,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorSnowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            
            <YAxis 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              axisLine={false}
              tickLine={false}
              domain={[0, 'auto']}
            />
            
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: '#f1f5f9', radius: 4 }} 
            />
            
            {/* Bar chart for daily snow */}
            <Bar
              dataKey="snowInches"
              fill="url(#barGradient)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            
            {/* Area under the line for visual effect */}
            <Area
              type="monotone"
              dataKey="snowInches"
              stroke="transparent"
              fillOpacity={0.3}
              fill="url(#colorSnowGradient)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Daily forecast quick view */}
      <div className="mt-4 flex gap-1 overflow-x-auto pb-2 no-scrollbar">
        {validData.slice(0, 10).map((day, idx) => (
          <div 
            key={idx} 
            className={`flex-shrink-0 w-16 p-2 rounded-lg text-center transition-all ${
              day.snowInches >= 6 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' 
                : day.snowInches > 0 
                ? 'bg-blue-50 text-slate-700 border border-blue-100'
                : 'bg-slate-50 text-slate-500 border border-slate-100'
            }`}
          >
            <div className="text-[10px] font-medium opacity-80">{day.dayName}</div>
            <div className="text-xs mt-0.5">{day.date}</div>
            <div className={`text-lg font-bold mt-1 ${day.snowInches >= 6 ? '' : 'text-blue-600'}`}>
              {day.snowInches}"
            </div>
            <div className="text-[9px] mt-0.5 opacity-70">
              {day.tempHigh}°/{day.tempLow}°
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SnowChart;
