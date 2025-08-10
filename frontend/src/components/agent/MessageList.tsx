import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  AlertCircle,
  Download,
  Play,
  Pause,
  FileText,
  Image as ImageIcon,
  MapPin,
  Phone,
  User
} from 'lucide-react';
import { Conversation, Message } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useConversationStore } from '../../stores/conversationStore';
import clsx from 'clsx';

interface MessageListProps {
  conversation: Conversation;
  messages: Message[];
  typingUsers: string[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const MessageList: React.FC<MessageListProps> = ({
  conversation,
  messages,
  typingUsers,
  messagesEndRef
}) => {
  const { user } = useAuthStore();
  const { markMessageAsRead } = useConversationStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messagesEndRef]);

  // Mark messages as read when they come into view
  useEffect(() => {
    const unreadMessages = messages.filter(msg => 
      !msg.isFromAgent && msg.status !== 'read'
    );
    
    unreadMessages.forEach(message => {
      markMessageAsRead(message.id);
    });
  }, [messages, markMessageAsRead]);

  const getMessageStatusIcon = (message: Message) => {
    if (!message.isFromAgent) return null;
    
    switch (message.status) {
      case 'pending':
        return <Clock size={14} className="text-gray-400" />;
      case 'sent':
        return <Check size={14} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={14} className="text-blue-500" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-500" />;
      default:
        return null;
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, 'HH:mm', { locale: ptBR });
  };

  const formatDateDivider = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return 'Hoje';
    } else if (isYesterday(date)) {
      return 'Ontem';
    } else {
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    }
  };

  const shouldShowDateDivider = (message: Message, index: number) => {
    if (index === 0) return true;
    
    const currentDate = new Date(message.timestamp);
    const previousDate = new Date(messages[index - 1].timestamp);
    
    return !isSameDay(currentDate, previousDate);
  };

  const shouldGroupMessage = (message: Message, index: number) => {
    if (index === 0) return false;
    
    const previousMessage = messages[index - 1];
    const timeDiff = new Date(message.timestamp).getTime() - new Date(previousMessage.timestamp).getTime();
    
    return (
      previousMessage.isFromAgent === message.isFromAgent &&
      timeDiff < 5 * 60 * 1000 && // 5 minutes
      !shouldShowDateDivider(message, index)
    );
  };

  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case 'text':
        return (
          <div className="break-words">
            {message.content}
          </div>
        );
        
      case 'image':
        return (
          <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden max-w-sm">
              <img 
                src={message.mediaUrl} 
                alt="Imagem enviada"
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
            {message.content && (
              <div className="text-sm">{message.content}</div>
            )}
          </div>
        );
        
      case 'document':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <FileText size={24} className="text-gray-500" />
            <div className="flex-1">
              <div className="font-medium text-sm">
                {message.metadata?.fileName || 'Documento'}
              </div>
              <div className="text-xs text-gray-500">
                {message.metadata?.fileSize || 'Tamanho desconhecido'}
              </div>
            </div>
            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
              <Download size={16} />
            </button>
          </div>
        );
        
      case 'audio':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg min-w-[200px]">
            <button className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600">
              <Play size={16} />
            </button>
            <div className="flex-1">
              <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '30%' }} />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {message.metadata?.duration || '0:00'}
              </div>
            </div>
          </div>
        );
        
      case 'location':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <MapPin size={20} className="text-red-500" />
              <div>
                <div className="font-medium text-sm">Localização</div>
                <div className="text-xs text-gray-500">
                  {message.metadata?.address || 'Localização compartilhada'}
                </div>
              </div>
            </div>
            {message.content && (
              <div className="text-sm">{message.content}</div>
            )}
          </div>
        );
        
      case 'contact':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
              <User size={20} />
            </div>
            <div>
              <div className="font-medium text-sm">
                {message.metadata?.contactName || 'Contato'}
              </div>
              <div className="text-xs text-gray-500">
                {message.metadata?.contactPhone || 'Telefone não disponível'}
              </div>
            </div>
          </div>
        );
        
      default:
        return <div>{message.content}</div>;
    }
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex justify-start mb-4"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <User size={16} className="text-gray-600 dark:text-gray-300" />
          </div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl px-4 py-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
              <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
              <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Group consecutive messages
  const groupedMessages = messages.reduce((groups: Message[][], message, index) => {
    if (shouldGroupMessage(message, index)) {
      groups[groups.length - 1].push(message);
    } else {
      groups.push([message]);
    }
    return groups;
  }, []);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 custom-scrollbar"
    >
      <div className="p-4 space-y-4">
        {/* Welcome message */}
        <div className="flex justify-center">
          <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-lg text-sm">
            Conversa iniciada com {conversation.contact.name || conversation.contact.phoneNumber}
          </div>
        </div>

        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date divider */}
            {shouldShowDateDivider(group[0], groupIndex === 0 ? 0 : groupedMessages.slice(0, groupIndex).flat().length) && (
              <div className="flex justify-center my-6">
                <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full text-xs">
                  {formatDateDivider(group[0].timestamp)}
                </div>
              </div>
            )}

            {/* Message group */}
            <div className={clsx(
              'flex',
              group[0].isFromAgent ? 'justify-end' : 'justify-start'
            )}>
              <div className={clsx(
                'flex flex-col space-y-1 max-w-xs lg:max-w-md',
                group[0].isFromAgent ? 'items-end' : 'items-start'
              )}>
                {group.map((message, messageIndex) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={clsx(
                      'px-4 py-2 rounded-2xl shadow-sm message-slide-in',
                      message.isFromAgent
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700',
                      messageIndex === 0 && group[0].isFromAgent && 'rounded-br-sm',
                      messageIndex === 0 && !group[0].isFromAgent && 'rounded-bl-sm',
                      messageIndex === group.length - 1 && group[0].isFromAgent && 'rounded-tr-sm',
                      messageIndex === group.length - 1 && !group[0].isFromAgent && 'rounded-tl-sm'
                    )}
                  >
                    {renderMessageContent(message)}
                    
                    {/* Message footer - only show on last message of group */}
                    {messageIndex === group.length - 1 && (
                      <div className={clsx(
                        'flex items-center justify-between mt-1 text-xs space-x-2',
                        message.isFromAgent 
                          ? 'text-blue-100' 
                          : 'text-gray-500 dark:text-gray-400'
                      )}>
                        <span>{formatMessageTime(message.timestamp)}</span>
                        {getMessageStatusIcon(message)}
                      </div>
                    )}
                    
                    {/* Failure reason */}
                    {message.status === 'failed' && message.failureReason && (
                      <div className="text-xs text-red-400 mt-1">
                        Erro: {message.failureReason}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {renderTypingIndicator()}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};