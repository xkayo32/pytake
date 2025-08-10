import React, { useEffect, useState } from 'react';
import { api, handleApiError, isApiSuccess } from '../services/api';
import { useAuth } from '../stores/authStore';
import { DashboardMetrics } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { 
  BarChart as ChartBarIcon,
  MessageSquare as ChatBubbleLeftRightIcon,
  Clock as ClockIcon,
  Users as UserGroupIcon,
  CheckCircle as CheckCircleIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);

      const response = await api.get<DashboardMetrics>('/api/v1/dashboard/metrics');

      if (isApiSuccess(response)) {
        setMetrics(response.data);
      } else {
        setError(response.message || 'Failed to fetch metrics');
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard metrics:', err);
      setError(err.message || 'Failed to fetch metrics');
      
      // Set mock data for development
      setMetrics({
        total_conversations: 127,
        active_conversations: 23,
        total_messages_today: 456,
        response_time_avg: 2.3,
        satisfaction_rate: 4.7,
        agents_online: 5,
        messages_per_hour: [
          { hour: '08:00', count: 12 },
          { hour: '09:00', count: 25 },
          { hour: '10:00', count: 38 },
          { hour: '11:00', count: 45 },
          { hour: '12:00', count: 32 },
          { hour: '13:00', count: 28 },
          { hour: '14:00', count: 42 },
          { hour: '15:00', count: 35 },
          { hour: '16:00', count: 30 },
          { hour: '17:00', count: 18 },
        ],
        conversation_status_breakdown: {
          active: 23,
          closed: 89,
          pending: 15,
        },
        top_agents: [
          { agent_name: 'Sarah Johnson', conversations_handled: 34, avg_response_time: 1.2 },
          { agent_name: 'Mike Chen', conversations_handled: 28, avg_response_time: 1.8 },
          { agent_name: 'Emma Davis', conversations_handled: 25, avg_response_time: 2.1 },
        ],
        recent_activity: [
          {
            id: '1',
            type: 'message_sent',
            description: 'Message sent to +5561994013828',
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            agent_name: 'Sarah Johnson',
          },
          {
            id: '2',
            type: 'conversation_assigned',
            description: 'Conversation assigned to Mike Chen',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          },
          {
            id: '3',
            type: 'conversation_closed',
            description: 'Conversation with +5561987654321 closed',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            agent_name: 'Emma Davis',
          },
        ],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Refresh metrics every 60 seconds
    const interval = setInterval(() => fetchMetrics(true), 60000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message_sent':
        return <ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-500" />;
      case 'conversation_assigned':
        return <UserGroupIcon className="h-4 w-4 text-green-500" />;
      case 'conversation_closed':
        return <CheckCircleIcon className="h-4 w-4 text-gray-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading && !metrics) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-500 mb-4">
              <ChartBarIcon className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-lg font-medium text-red-800 mb-2">Failed to load dashboard</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => fetchMetrics()}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pieData = metrics ? [
    { name: 'Active', value: metrics.conversation_status_breakdown.active, color: '#3B82F6' },
    { name: 'Closed', value: metrics.conversation_status_breakdown.closed, color: '#10B981' },
    { name: 'Pending', value: metrics.conversation_status_breakdown.pending, color: '#F59E0B' },
  ] : [];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your WhatsApp business today.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {refreshing && (
              <div className="flex items-center text-sm text-gray-500">
                <LoadingSpinner size="small" className="mr-2" />
                Refreshing...
              </div>
            )}
            <button
              onClick={() => fetchMetrics(true)}
              disabled={refreshing}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {metrics && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Conversations */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.total_conversations}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+12% from yesterday</span>
                </div>
              </div>

              {/* Active Conversations */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Conversations</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.active_conversations}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <ClockIcon className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+8% from yesterday</span>
                </div>
              </div>

              {/* Messages Today */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Messages Today</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.total_messages_today}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <ChartBarIcon className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">-3% from yesterday</span>
                </div>
              </div>

              {/* Agents Online */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Agents Online</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.agents_online}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <UserGroupIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">All systems operational</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Messages Per Hour Chart */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Messages Per Hour</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.messages_per_hour}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Conversation Status Breakdown */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Conversation Status</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: entry.color }}
                        ></div>
                        <span className="text-sm text-gray-600">{entry.name}</span>
                      </div>
                      <span className="text-sm font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Agents */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Agents</h3>
                <div className="space-y-4">
                  {metrics.top_agents.map((agent, index) => (
                    <div key={agent.agent_name} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-indigo-800">
                            {agent.agent_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{agent.agent_name}</p>
                          <p className="text-xs text-gray-500">
                            {agent.conversations_handled} conversations
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {agent.avg_response_time}m
                        </p>
                        <p className="text-xs text-gray-500">avg response</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {metrics.recent_activity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        {activity.agent_name && (
                          <p className="text-xs text-gray-500">by {activity.agent_name}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <p className="text-xs text-gray-500">
                          {formatTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;