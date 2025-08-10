import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  User, 
  Archive, 
  Star,
  Ban,
  Forward,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Conversation } from '../../types';
import { useConversationStore } from '../../stores/conversationStore';
import { useAuthStore } from '../../stores/authStore';
import clsx from 'clsx';

interface ChatHeaderProps {
  conversation: Conversation;
  onToggleContactInfo: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onToggleContactInfo
}) => {
  const [showActions, setShowActions] = useState(false);
  const { assignConversation, transferConversation, closeConversation } = useConversationStore();
  const { user } = useAuthStore();

  const getStatusIcon = () => {
    switch (conversation.status) {
      case 'open':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />;
      case 'closed':
        return <XCircle size={16} className="text-gray-400" />;
      case 'transferred':
        return <AlertCircle size={16} className="text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (conversation.status) {
      case 'open':
        return 'Aberta';
      case 'pending':
        return 'Pendente';
      case 'closed':
        return 'Fechada';
      case 'transferred':
        return 'Transferida';
      default:
        return conversation.status;
    }
  };

  const getPriorityColor = () => {
    switch (conversation.priority) {
      case 'urgent':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'normal':
        return 'text-blue-500';
      case 'low':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatLastSeen = (lastSeenAt?: string) => {
    if (!lastSeenAt) return 'Nunca visto';
    
    const now = new Date();
    const lastSeen = new Date(lastSeenAt);
    const diffInMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 5) {
      return 'Online';
    } else if (diffInMinutes < 60) {
      return `Visto ${Math.floor(diffInMinutes)} min atrás`;
    } else if (diffInMinutes < 1440) { // 24 hours
      return `Visto ${Math.floor(diffInMinutes / 60)}h atrás`;
    } else {
      return `Visto ${format(lastSeen, 'dd/MM/yyyy', { locale: ptBR })}`;
    }
  };

  const handleAssignToMe = async () => {
    if (user) {
      await assignConversation(conversation.id, user.id);
      setShowActions(false);
    }
  };

  const handleClose = async () => {
    await closeConversation(conversation.id);
    setShowActions(false);
  };

  const actions = [
    {
      icon: User,
      label: 'Atribuir a mim',
      action: handleAssignToMe,
      show: !conversation.assignedAgentId || conversation.assignedAgentId !== user?.id
    },
    {
      icon: Forward,
      label: 'Transferir',
      action: () => console.log('Transfer'),
      show: true
    },
    {
      icon: Tag,
      label: 'Adicionar tag',
      action: () => console.log('Add tag'),
      show: true
    },
    {
      icon: Star,
      label: 'Favoritar',
      action: () => console.log('Star'),
      show: true
    },
    {
      icon: Archive,
      label: 'Arquivar',
      action: () => console.log('Archive'),
      show: true
    },
    {
      icon: Ban,
      label: 'Bloquear contato',
      action: () => console.log('Block'),
      show: true,
      destructive: true
    },
    {
      icon: XCircle,
      label: 'Fechar conversa',
      action: handleClose,
      show: conversation.status !== 'closed',
      destructive: true
    }
  ].filter(action => action.show);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between">
        {/* Contact Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {(conversation.contact.name || conversation.contact.phoneNumber).charAt(0).toUpperCase()}
            </div>
            
            {/* Online indicator */}
            {conversation.contact.lastSeenAt && (
              <div className={clsx(
                'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800',
                new Date().getTime() - new Date(conversation.contact.lastSeenAt).getTime() < 5 * 60 * 1000
                  ? 'bg-green-500'
                  : 'bg-gray-400'
              )} />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {conversation.contact.name || 'Sem nome'}
              </h2>
              {getStatusIcon()}
              <span className={clsx('text-xs font-medium', getPriorityColor())}>
                {conversation.priority.toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{conversation.contact.phoneNumber}</span>
              <span>•</span>
              <span>{formatLastSeen(conversation.contact.lastSeenAt)}</span>
              <span>•</span>
              <span>{getStatusText()}</span>
            </div>

            {/* Tags */}
            {conversation.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {conversation.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {conversation.tags.length > 3 && (
                  <span className="px-2 py-0.5 text-xs text-gray-500">
                    +{conversation.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Assigned agent */}
            {conversation.assignedAgent && (
              <div className="flex items-center space-x-1 mt-1">
                <User size={12} className="text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Atribuída a {conversation.assignedAgent.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            title="Ligar"
          >
            <Phone size={18} />
          </button>
          
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            title="Videochamada"
          >
            <Video size={18} />
          </button>
          
          <button
            onClick={onToggleContactInfo}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            title="Informações do contato"
          >
            <Info size={18} />
          </button>

          {/* More Actions */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title="Mais ações"
            >
              <MoreVertical size={18} />
            </button>

            <AnimatePresence>
              {showActions && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActions(false)}
                  />
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20"
                  >
                    <div className="py-1">
                      {actions.map((action) => (
                        <button
                          key={action.label}
                          onClick={action.action}
                          className={clsx(
                            'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors',
                            action.destructive
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-700 dark:text-gray-300'
                          )}
                        >
                          <action.icon size={16} />
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};