import React from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MessageCircle,
  Send,
  Users,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Zap,
  FileText,
  UserPlus,
  UserMinus
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'message' | 'campaign' | 'user' | 'system' | 'flow' | 'error' | 'success';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, any>;
}

export const ActivityFeed: React.FC = () => {
  // Sample activity data - in production, this would come from an API
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'message',
      title: 'Nova conversa iniciada',
      description: 'João Santos (+55 61 99401-3828) iniciou uma conversa',
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      userName: 'João Santos'
    },
    {
      id: '2',
      type: 'campaign',
      title: 'Campanha finalizada',
      description: '"Promoção Black Friday" foi enviada para 1,245 contatos',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    },
    {
      id: '3',
      type: 'user',
      title: 'Agente atribuído',
      description: 'Maria Silva foi atribuída a 3 novas conversas',
      timestamp: new Date(Date.now() - 23 * 60 * 1000).toISOString(), // 23 minutes ago
      userName: 'Maria Silva'
    },
    {
      id: '4',
      type: 'success',
      title: 'Backup realizado',
      description: 'Backup automático do sistema executado com sucesso',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
    },
    {
      id: '5',
      type: 'flow',
      title: 'Fluxo ativado',
      description: 'Fluxo "Boas-vindas" foi ativado e está funcionando',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    },
    {
      id: '6',
      type: 'user',
      title: 'Novo usuário',
      description: 'Pedro Oliveira foi adicionado como agente',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      userName: 'Pedro Oliveira'
    },
    {
      id: '7',
      type: 'message',
      title: 'Alta atividade detectada',
      description: '50+ mensagens recebidas nos últimos 30 minutos',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    },
    {
      id: '8',
      type: 'system',
      title: 'Atualização aplicada',
      description: 'Sistema atualizado para versão 2.1.0',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    }
  ];

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'message':
        return MessageCircle;
      case 'campaign':
        return Send;
      case 'user':
        return Users;
      case 'system':
        return Settings;
      case 'flow':
        return Zap;
      case 'error':
        return AlertCircle;
      case 'success':
        return CheckCircle;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'message':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900';
      case 'campaign':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900';
      case 'user':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      case 'system':
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
      case 'flow':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
      case 'success':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch (error) {
      return 'Agora mesmo';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Atividade Recente
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Últimas atividades do sistema
          </p>
        </div>
        
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Activity size={16} className="text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
        {activities.map((activity, index) => {
          const Icon = getActivityIcon(activity.type);
          const colorClasses = getActivityColor(activity.type);
          
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
            >
              {/* Icon */}
              <div className={`p-2 rounded-full flex-shrink-0 ${colorClasses}`}>
                <Icon size={16} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {activity.title}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {activity.description}
                </p>
                
                {activity.userName && (
                  <div className="flex items-center mt-2">
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2">
                      {activity.userName.charAt(0)}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.userName}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors flex items-center justify-center space-x-2">
          <span>Ver todas as atividades</span>
          <Activity size={14} />
        </button>
      </div>
    </div>
  );
};