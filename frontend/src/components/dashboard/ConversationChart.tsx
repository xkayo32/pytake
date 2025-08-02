import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationData {
  date: string;
  total: number;
  active: number;
  resolved: number;
  pending: number;
}

interface ConversationChartProps {
  data?: ConversationData[];
  loading?: boolean;
  period?: '7d' | '30d' | '90d';
}

// Mock data generator
const generateMockData = (days: number): ConversationData[] => {
  const data: ConversationData[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const baseTotal = Math.floor(Math.random() * 50) + 20;
    const active = Math.floor(baseTotal * 0.3);
    const resolved = Math.floor(baseTotal * 0.6);
    const pending = baseTotal - active - resolved;
    
    data.push({
      date: format(date, 'dd/MM', { locale: ptBR }),
      total: baseTotal,
      active,
      resolved,
      pending,
    });
  }
  
  return data;
};

export const ConversationChart: React.FC<ConversationChartProps> = ({
  data,
  loading = false,
  period = '7d',
}) => {
  const chartData = data || generateMockData(period === '7d' ? 7 : period === '30d' ? 30 : 90);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-48"></div>
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Conversas por Período
        </h3>
        <p className="text-sm text-gray-600">
          Volume de conversas nos últimos {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias'}
        </p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelStyle={{ color: '#374151', fontWeight: 'bold' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#2563eb" 
              strokeWidth={2}
              name="Total"
              dot={{ fill: '#2563eb', r: 4 }}
              activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2, fill: 'white' }}
            />
            <Line 
              type="monotone" 
              dataKey="active" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Ativas"
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: 'white' }}
            />
            <Line 
              type="monotone" 
              dataKey="resolved" 
              stroke="#6b7280" 
              strokeWidth={2}
              name="Resolvidas"
              dot={{ fill: '#6b7280', r: 4 }}
              activeDot={{ r: 6, stroke: '#6b7280', strokeWidth: 2, fill: 'white' }}
            />
            <Line 
              type="monotone" 
              dataKey="pending" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Pendentes"
              dot={{ fill: '#f59e0b', r: 4 }}
              activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: 'white' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ConversationChart;