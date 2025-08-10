import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface MetricsChartProps {
  title: string;
  subtitle?: string;
  timeRange: string;
  type: 'line' | 'area' | 'bar' | 'pie';
  height?: number;
  loading?: boolean;
  data?: any[];
  color?: string;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({
  title,
  subtitle,
  timeRange,
  type,
  height = 300,
  loading = false,
  data,
  color = '#3b82f6'
}) => {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === 'dark';

  // Generate sample data based on time range
  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;

    const generateData = () => {
      const now = new Date();
      const dataPoints = [];
      
      switch (timeRange) {
        case 'today':
          // Generate hourly data for today
          for (let i = 23; i >= 0; i--) {
            const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
            dataPoints.push({
              time: hour.getHours().toString().padStart(2, '0') + ':00',
              value: Math.floor(Math.random() * 50) + 10 + (Math.sin(i * 0.5) * 10)
            });
          }
          break;
          
        case 'week':
          // Generate daily data for the week
          const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dataPoints.push({
              time: days[date.getDay()],
              value: Math.floor(Math.random() * 200) + 50 + (i === 0 ? 50 : 0) // Higher for today
            });
          }
          break;
          
        case 'month':
          // Generate daily data for the month
          for (let i = 29; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dataPoints.push({
              time: date.getDate().toString(),
              value: Math.floor(Math.random() * 300) + 100
            });
          }
          break;
          
        default:
          // Default to weekly data
          for (let i = 6; i >= 0; i--) {
            dataPoints.push({
              time: `Dia ${7 - i}`,
              value: Math.floor(Math.random() * 100) + 20
            });
          }
      }
      
      return dataPoints;
    };

    return generateData();
  }, [timeRange, data]);

  const pieColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">{`${label}`}</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {`${payload[0].name}: ${payload[0].value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: color }}
            />
          </LineChart>
        );
        
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#colorGradient)`}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
          </AreaChart>
        );
        
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
        
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        );
        
      default:
        return <div>Tipo de gráfico não suportado</div>;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Chart */}
      <div style={{ height: height - 100 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};