import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface ResponseTimeData {
  period: string;
  avgResponseTime: number;
  firstResponse: number;
  resolution: number;
}

interface ResponseTimeChartProps {
  data?: ResponseTimeData[];
  loading?: boolean;
}


export const ResponseTimeChart: React.FC<ResponseTimeChartProps> = ({
  data,
  loading = false,
}) => {
  const chartData = data || [];

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
          Tempo de Resposta por Período
        </h3>
        <p className="text-sm text-gray-600">
          Tempos médios de resposta durante diferentes períodos do dia (em minutos)
        </p>
      </div>
      
      <div className="h-64">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#e5e7eb' }}
                axisLine={{ stroke: '#e5e7eb' }}
                label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                formatter={(value: number, name: string) => {
                  const names = {
                    avgResponseTime: 'Tempo Médio',
                    firstResponse: 'Primeira Resposta',
                    resolution: 'Resolução'
                  };
                  return [`${value} min`, names[name as keyof typeof names] || name];
                }}
              />
              <Legend 
                formatter={(value: string) => {
                  const names = {
                    avgResponseTime: 'Tempo Médio',
                    firstResponse: 'Primeira Resposta',
                    resolution: 'Resolução'
                  };
                  return names[value as keyof typeof names] || value;
                }}
              />
              <Bar 
                dataKey="firstResponse" 
                fill="#10b981" 
                name="firstResponse"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="avgResponseTime" 
                fill="#3b82f6" 
                name="avgResponseTime"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="resolution" 
                fill="#f59e0b" 
                name="resolution"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Nenhum dado disponível</p>
              <p className="text-xs text-gray-400">Os dados do gráfico aparecerão aqui</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseTimeChart;