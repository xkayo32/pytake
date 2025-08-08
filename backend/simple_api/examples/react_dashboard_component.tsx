import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Types
interface DashboardMetrics {
  timestamp: string;
  messages_sent: number;
  messages_received: number;
  messages_failed: number;
  active_conversations: number;
  tickets_created: number;
  campaigns_active: number;
  ai_interactions: number;
  erp_calls_success: number;
  erp_calls_failed: number;
  system_cpu_usage: number;
  system_memory_usage: number;
  database_connections: number;
  websocket_connections: number;
}

interface DashboardEvent {
  event_type: string;
  timestamp: string;
  tenant_id?: string;
  data: any;
}

interface WebSocketMessage {
  message_type: string;
  payload: any;
  timestamp: string;
  room?: string;
}

interface AlertData {
  rule_id: string;
  rule_name: string;
  condition: string;
  threshold: number;
  current_value: string;
}

interface ConnectionOptions {
  token?: string;
  rooms?: string[];
  eventTypes?: string[];
  tenantId?: string;
  autoReconnect?: boolean;
}

// Custom Hook for WebSocket Connection
export const useDashboardWebSocket = (url: string, options: ConnectionOptions = {}) => {
  const [connectionStatus, setConnectionStatus] = useState<'Disconnected' | 'Connecting' | 'Connected' | 'Error'>('Disconnected');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('Connecting');
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setConnectionStatus('Connected');
      
      // Authenticate
      if (options.token) {
        sendMessage({
          message_type: 'Auth',
          payload: { token: options.token },
          timestamp: new Date().toISOString()
        });
      }

      // Subscribe to rooms
      sendMessage({
        message_type: 'Subscription',
        payload: {
          rooms: options.rooms || ['dashboard'],
          event_types: options.eventTypes || [],
          tenant_id: options.tenantId
        },
        timestamp: new Date().toISOString()
      });

      // Start heartbeat
      heartbeatIntervalRef.current = setInterval(() => {
        sendMessage({
          message_type: 'Heartbeat',
          payload: {},
          timestamp: new Date().toISOString()
        });
      }, 30000);
    };

    ws.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.message_type) {
          case 'Metrics':
            setMetrics(message.payload);
            break;
          case 'Event':
            setEvents(prev => [message.payload, ...prev.slice(0, 49)]);
            break;
          case 'Alert':
            setAlerts(prev => [message.payload.data, ...prev.slice(0, 9)]);
            break;
          case 'Auth':
            console.log('✅ Authentication successful');
            break;
          case 'Heartbeat':
            console.log('💓 Heartbeat received');
            break;
          case 'Error':
            console.error('❌ WebSocket Error:', message.payload);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      setConnectionStatus('Disconnected');
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      if (options.autoReconnect !== false) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    ws.current.onerror = () => {
      setConnectionStatus('Error');
    };
  }, [url, options]);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionStatus,
    metrics,
    events,
    alerts,
    sendMessage,
    connect,
    disconnect
  };
};

// Main Dashboard Component
export const RealtimeDashboard: React.FC = () => {
  const { connectionStatus, metrics, events, alerts } = useDashboardWebSocket(
    'ws://localhost:8080/ws/dashboard',
    {
      token: localStorage.getItem('jwt_token') || undefined,
      rooms: ['dashboard', 'conversations', 'alerts'],
      autoReconnect: true
    }
  );

  const [selectedRoom, setSelectedRoom] = useState('dashboard');
  const [metricsHistory, setMetricsHistory] = useState<DashboardMetrics[]>([]);

  // Store metrics history for charts
  useEffect(() => {
    if (metrics) {
      setMetricsHistory(prev => {
        const newHistory = [...prev, metrics];
        return newHistory.slice(-20); // Keep last 20 data points
      });
    }
  }, [metrics]);

  // Chart data preparation
  const messagesChartData = {
    labels: metricsHistory.map(m => new Date(m.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Enviadas',
        data: metricsHistory.map(m => m.messages_sent),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4
      },
      {
        label: 'Recebidas',
        data: metricsHistory.map(m => m.messages_received),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4
      },
      {
        label: 'Falhadas',
        data: metricsHistory.map(m => m.messages_failed),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4
      }
    ]
  };

  const systemHealthData = {
    labels: ['CPU', 'Memória', 'Disponível'],
    datasets: [
      {
        data: [
          metrics?.system_cpu_usage || 0,
          metrics?.system_memory_usage || 0,
          100 - ((metrics?.system_cpu_usage || 0) + (metrics?.system_memory_usage || 0)) / 2
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'Connected': return 'text-green-600 bg-green-100';
      case 'Connecting': return 'text-yellow-600 bg-yellow-100';
      case 'Error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'MessageSent': return '📤';
      case 'MessageReceived': return '📥';
      case 'ConversationStarted': return '💬';
      case 'TicketCreated': return '🎫';
      case 'SystemAlert': return '⚠️';
      case 'AIInteraction': return '🤖';
      case 'ERPCall': return '🔗';
      default: return '📋';
    }
  };

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return '-';
    return num.toLocaleString();
  };

  const formatPercentage = (num: number | undefined): string => {
    if (num === undefined || num === null) return '-';
    return `${Math.round(num)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">PyTake Dashboard</h1>
          <div className={`px-4 py-2 rounded-full font-semibold ${getConnectionStatusColor()}`}>
            {connectionStatus}
          </div>
        </div>
        
        {/* Room Selector */}
        <div className="mt-4">
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="dashboard">Dashboard Geral</option>
            <option value="messages">Mensagens</option>
            <option value="conversations">Conversações</option>
            <option value="campaigns">Campanhas</option>
            <option value="erp">ERP</option>
            <option value="ai">IA</option>
            <option value="alerts">Alertas</option>
          </select>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Mensagens Enviadas</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(metrics?.messages_sent)}</p>
          <p className="mt-1 text-sm text-green-600">+12% vs ontem</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Conversações Ativas</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(metrics?.active_conversations)}</p>
          <p className="mt-1 text-sm text-blue-600">Em tempo real</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Taxa de Falha</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {metrics ? `${((metrics.messages_failed / (metrics.messages_sent + metrics.messages_received)) * 100).toFixed(1)}%` : '-'}
          </p>
          <p className="mt-1 text-sm text-red-600">-0.5% vs ontem</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">CPU Usage</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{formatPercentage(metrics?.system_cpu_usage)}</p>
          <p className="mt-1 text-sm text-yellow-600">Normal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Messages Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mensagens por Minuto</h3>
          <div className="h-64">
            <Line data={messagesChartData} options={chartOptions} />
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Saúde do Sistema</h3>
          <div className="h-64">
            <Doughnut data={systemHealthData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Events */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Eventos Recentes</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Aguardando eventos...
              </div>
            ) : (
              events.map((event, index) => (
                <div key={index} className="p-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{getEventIcon(event.event_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {event.event_type.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      {event.data && (
                        <p className="text-xs text-gray-400 mt-1">
                          {JSON.stringify(event.data).substring(0, 100)}...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Alertas Ativos</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6">
                <div className="flex items-center space-x-3">
                  <span className="text-green-500">✅</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Sistema Normal</p>
                    <p className="text-sm text-gray-500">Nenhum alerta ativo</p>
                  </div>
                </div>
              </div>
            ) : (
              alerts.map((alert, index) => (
                <div key={index} className="p-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <span className="text-red-500 text-xl">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-red-900">{alert.rule_name}</p>
                      <p className="text-sm text-red-600">
                        Limite: {alert.threshold} | Atual: {alert.current_value}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Condição: {alert.condition}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Additional System Stats */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas do Sistema</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{formatNumber(metrics?.websocket_connections)}</p>
            <p className="text-sm text-gray-500">Conexões WebSocket</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatNumber(metrics?.database_connections)}</p>
            <p className="text-sm text-gray-500">Conexões DB</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{formatNumber(metrics?.ai_interactions)}</p>
            <p className="text-sm text-gray-500">Interações IA</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{formatNumber(metrics?.campaigns_active)}</p>
            <p className="text-sm text-gray-500">Campanhas Ativas</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeDashboard;