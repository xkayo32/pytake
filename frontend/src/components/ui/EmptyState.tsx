'use client';

import { motion } from 'framer-motion';
import { 
  Inbox, 
  FileText, 
  Users, 
  MessageSquare, 
  Search, 
  Plus,
  FolderOpen,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui';

type EmptyStateType = 
  | 'no-data'
  | 'no-results'
  | 'no-conversations'
  | 'no-contacts'
  | 'no-chatbots'
  | 'no-campaigns'
  | 'error'
  | 'loading'
  | 'success';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const defaultConfigs: Record<EmptyStateType, { icon: React.ReactNode; title: string; description: string }> = {
  'no-data': {
    icon: <FolderOpen className="w-12 h-12 text-gray-400" />,
    title: 'Nenhum dado encontrado',
    description: 'Não há dados para exibir neste momento.',
  },
  'no-results': {
    icon: <Search className="w-12 h-12 text-gray-400" />,
    title: 'Nenhum resultado encontrado',
    description: 'Tente ajustar os filtros ou termos de busca.',
  },
  'no-conversations': {
    icon: <MessageSquare className="w-12 h-12 text-gray-400" />,
    title: 'Nenhuma conversa',
    description: 'As conversas com seus clientes aparecerão aqui.',
  },
  'no-contacts': {
    icon: <Users className="w-12 h-12 text-gray-400" />,
    title: 'Nenhum contato',
    description: 'Comece adicionando seus primeiros contatos.',
  },
  'no-chatbots': {
    icon: <Inbox className="w-12 h-12 text-gray-400" />,
    title: 'Nenhum chatbot',
    description: 'Crie seu primeiro chatbot para automatizar atendimentos.',
  },
  'no-campaigns': {
    icon: <FileText className="w-12 h-12 text-gray-400" />,
    title: 'Nenhuma campanha',
    description: 'Crie campanhas para enviar mensagens em massa.',
  },
  'error': {
    icon: <AlertCircle className="w-12 h-12 text-red-400" />,
    title: 'Algo deu errado',
    description: 'Ocorreu um erro ao carregar os dados. Tente novamente.',
  },
  'loading': {
    icon: <Clock className="w-12 h-12 text-primary-400 animate-pulse" />,
    title: 'Carregando...',
    description: 'Por favor, aguarde enquanto carregamos os dados.',
  },
  'success': {
    icon: <CheckCircle2 className="w-12 h-12 text-green-400" />,
    title: 'Concluído!',
    description: 'A ação foi realizada com sucesso.',
  },
};

const sizeClasses = {
  sm: 'py-8 px-4',
  md: 'py-12 px-6',
  lg: 'py-16 px-8',
};

const iconSizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export function EmptyState({
  type = 'no-data',
  title,
  description,
  icon,
  action,
  secondaryAction,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const config = defaultConfigs[type];

  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayIcon = icon || config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        flex flex-col items-center justify-center text-center
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {/* Icon Container */}
      <div className="mb-4 p-4 rounded-full bg-gray-100 dark:bg-gray-800">
        {displayIcon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {displayTitle}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        {displayDescription}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'primary'}
              size="md"
            >
              <Plus className="w-4 h-4 mr-2" />
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size="md"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
