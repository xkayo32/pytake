import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MessageCircle, 
  Clock, 
  User, 
  Phone,
  Archive,
  Star,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { Conversation } from '../../types';
import clsx from 'clsx';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  sidebarOpen: boolean;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  currentConversation,
  onSelectConversation,
  sidebarOpen
}) => {
  const getStatusIcon = (status: Conversation['status']) => {
    switch (status) {
      case 'open':
        return <CheckCircle size={12} className="text-green-500" />;
      case 'pending':
        return <Clock size={12} className="text-yellow-500" />;
      case 'closed':
        return <XCircle size={12} className="text-gray-400" />;
      case 'transferred':
        return <AlertCircle size={12} className="text-blue-500" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: Conversation['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500';
      case 'high':
        return 'border-orange-500';
      case 'normal':
        return 'border-blue-500';
      case 'low':
        return 'border-gray-400';
      default:
        return 'border-transparent';
    }
  };

  const formatLastMessage = (message?: string) => {
    if (!message) return 'Nenhuma mensagem';
    return message.length > 50 ? `${message.substring(0, 50)}...` : message;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm', { locale: ptBR });
    } else if (diffInHours < 168) { // 7 days
      return format(date, 'EEE', { locale: ptBR });
    } else {
      return format(date, 'dd/MM', { locale: ptBR });
    }
  };

  if (!sidebarOpen) {
    return (
      <div className="flex flex-col items-center py-4 space-y-3">
        {conversations.slice(0, 8).map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation)}
            className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center relative transition-all',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              currentConversation?.id === conversation.id
                ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500'
                : 'bg-gray-100 dark:bg-gray-700'
            )}
            title={conversation.contact.name || conversation.contact.phoneNumber}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {(conversation.contact.name || conversation.contact.phoneNumber).charAt(0).toUpperCase()}
            </div>
            
            {/* Unread badge */}
            {conversation.unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
              </span>
            )}
            
            {/* Priority indicator */}
            <div className={clsx(
              'absolute -bottom-1 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800',
              getPriorityColor(conversation.priority).replace('border-', 'bg-')
            )} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AnimatePresence>
        {conversations.map((conversation) => (
          <motion.div
            key={conversation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            layout
            className={clsx(
              'border-l-4 transition-all duration-200 cursor-pointer',
              'hover:bg-gray-50 dark:hover:bg-gray-700/50',
              currentConversation?.id === conversation.id
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                : clsx('border-transparent', getPriorityColor(conversation.priority))
            )}
            onClick={() => onSelectConversation(conversation)}
          >
            <div className="p-4">
              <div className="flex items-start space-x-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {(conversation.contact.name || conversation.contact.phoneNumber).charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Online status */}
                  {conversation.contact.lastSeenAt && (
                    <div className={clsx(
                      'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800',
                      new Date().getTime() - new Date(conversation.contact.lastSeenAt).getTime() < 5 * 60 * 1000
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    )} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {conversation.contact.name || 'Sem nome'}
                      </h3>
                      {getStatusIcon(conversation.status)}
                    </div>
                    
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <span>{formatTime(conversation.lastMessageAt)}</span>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phone number */}
                  <div className="flex items-center space-x-1 mb-2">
                    <Phone size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {conversation.contact.phoneNumber}
                    </span>
                  </div>

                  {/* Last message preview */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">
                      {conversation.lastMessage?.isFromAgent && (
                        <span className="text-blue-600 dark:text-blue-400 mr-1">Você:</span>
                      )}
                      {formatLastMessage(conversation.lastMessage?.content)}
                    </p>
                  </div>

                  {/* Tags */}
                  {conversation.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {conversation.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {conversation.tags.length > 2 && (
                        <span className="px-2 py-0.5 text-xs text-gray-500">
                          +{conversation.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Assigned agent */}
                  {conversation.assignedAgent && (
                    <div className="flex items-center space-x-1 mt-2">
                      <User size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {conversation.assignedAgent.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <MessageCircle size={48} className="mb-4 opacity-50" />
          <p className="text-sm">Nenhuma conversa encontrada</p>
        </div>
      )}
    </div>
  );
};