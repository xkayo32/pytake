import React from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Zap,
  MessageCircle,
  BarChart3,
  Users,
  Settings,
  Plus,
  FileText,
  Calendar,
  Mail,
  Phone,
  Target
} from 'lucide-react';
import { usePermissions } from '../auth/ProtectedRoute';

interface QuickActionsProps {
  onNavigate: (path: string) => void;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bgColor: string;
  hoverColor: string;
  path: string;
  permission?: { resource: string; action: string };
  role?: string[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const { hasPermission, user } = usePermissions();

  const actions: QuickAction[] = [
    {
      id: 'new-campaign',
      label: 'Nova Campanha',
      description: 'Criar campanha de marketing',
      icon: Send,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      hoverColor: 'hover:bg-purple-200 dark:hover:bg-purple-800',
      path: '/campaigns/new',
      permission: { resource: 'campaigns', action: 'create' }
    },
    {
      id: 'create-flow',
      label: 'Criar Fluxo',
      description: 'Novo fluxo de automação',
      icon: Zap,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      hoverColor: 'hover:bg-blue-200 dark:hover:bg-blue-800',
      path: '/flows/new',
      permission: { resource: 'flows', action: 'create' }
    },
    {
      id: 'agent-workspace',
      label: 'Atender Chats',
      description: 'Acessar workspace dos agentes',
      icon: MessageCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900',
      hoverColor: 'hover:bg-green-200 dark:hover:bg-green-800',
      path: '/agent',
      permission: { resource: 'conversations', action: 'read' }
    },
    {
      id: 'analytics',
      label: 'Relatórios',
      description: 'Ver métricas e análises',
      icon: BarChart3,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      hoverColor: 'hover:bg-yellow-200 dark:hover:bg-yellow-800',
      path: '/analytics',
      permission: { resource: 'analytics', action: 'read' }
    },
    {
      id: 'contacts',
      label: 'Contatos',
      description: 'Gerenciar base de contatos',
      icon: Users,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900',
      hoverColor: 'hover:bg-indigo-200 dark:hover:bg-indigo-800',
      path: '/contacts',
      permission: { resource: 'contacts', action: 'read' }
    },
    {
      id: 'settings',
      label: 'Configurações',
      description: 'Configurar sistema',
      icon: Settings,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-700',
      hoverColor: 'hover:bg-gray-200 dark:hover:bg-gray-600',
      path: '/settings',
    },
    {
      id: 'templates',
      label: 'Templates',
      description: 'Gerenciar modelos de mensagem',
      icon: FileText,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
      hoverColor: 'hover:bg-orange-200 dark:hover:bg-orange-800',
      path: '/campaigns/templates',
      permission: { resource: 'templates', action: 'read' }
    },
    {
      id: 'schedule',
      label: 'Agendar',
      description: 'Agendar mensagens e campanhas',
      icon: Calendar,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-100 dark:bg-pink-900',
      hoverColor: 'hover:bg-pink-200 dark:hover:bg-pink-800',
      path: '/campaigns?tab=scheduled',
      permission: { resource: 'campaigns', action: 'read' }
    }
  ];

  // Filter actions based on permissions
  const availableActions = actions.filter(action => {
    if (action.permission) {
      return hasPermission(action.permission.resource, action.permission.action);
    }
    if (action.role) {
      return action.role.includes(user?.role || '');
    }
    return true;
  });

  const handleActionClick = (action: QuickAction) => {
    onNavigate(action.path);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Ações Rápidas
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Acesso rápido às principais funcionalidades
          </p>
        </div>
        
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Zap size={16} className="text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        {availableActions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleActionClick(action)}
            className={`
              p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600
              hover:border-solid transition-all duration-200 text-left
              hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500
              ${action.hoverColor}
            `}
          >
            {/* Icon */}
            <div className={`inline-flex p-2 rounded-lg mb-3 ${action.bgColor}`}>
              <action.icon size={20} className={action.color} />
            </div>

            {/* Content */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {action.label}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {action.description}
              </p>
            </div>
          </motion.button>
        ))}
        
        {/* Add More Actions Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: availableActions.length * 0.1 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-solid transition-all duration-200 text-left hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <div className="inline-flex p-2 rounded-lg mb-3 bg-gray-100 dark:bg-gray-700">
            <Plus size={20} className="text-gray-600 dark:text-gray-400" />
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Mais Ações
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Ver todas as opções disponíveis
            </p>
          </div>
        </motion.button>
      </div>

      {/* Footer Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {availableActions.length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ações disponíveis
            </p>
          </div>
          
          <div>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {user?.role === 'Owner' ? 'Total' : 'Limitado'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nível de acesso
            </p>
          </div>
          
          <div>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              Ativo
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Status do usuário
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};