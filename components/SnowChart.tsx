import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyForecast } from '../types';

interface SnowChartProps {
  data: DailyForecast[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
        <p className="font-semibold text-slate-700 mb-1">{label} ({payload[0].payload.dayName})</p>
        <p className="text-blue-600 text-sm font-medium">
          ❄️ 降雪: {payload[0].value}"
        </p>
        <p className="text-slate-500 text-xs mt-1">
          {payload[0].payload.condition}
        </p>
        <div className="flex gap-2 mt-2 text-xs text-slate-400">
          <span>H: {payload[0].payload.tempHigh}°F</span>
          <span>L: {payload[0].payload.tempLow}°F</span>
        </div>
      </div>
    );
  }
  return null;
};

const SnowChart: React.FC<SnowChartProps> = ({ data }) => {
  return (
    <div className="w-full h-[250px] bg-white rounded-xl p-2">
      <h3 className="text-sm font-semibold text-slate-500 mb-4 ml-2">未来5天降雪预测 (英寸)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 5,
            right: 10,
            left: -20,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorSnow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#64748b' }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#64748b' }} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area
            type="monotone"
            dataKey="snowInches"
            stroke="#2563eb"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorSnow)"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SnowChart;
