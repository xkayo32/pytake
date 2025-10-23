'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types/conversation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isTyping?: boolean;
}

export default function MessageList({ messages, isLoading, isTyping }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or typing indicator appears
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Carregando mensagens...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Nenhuma mensagem ainda</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex justify-start">
          <div className="max-w-[70%] rounded-lg px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">digitando...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isInbound = message.direction === 'inbound';
  const isOutbound = message.direction === 'outbound';

  // Get message text based on type
  const getMessageContent = () => {
    if (message.message_type === 'text') {
      return message.content.text || '';
    }
    if (message.message_type === 'image') {
      return (
        <div>
          <img
            src={message.content.url}
            alt="Imagem"
            className="max-w-xs rounded-lg"
          />
          {message.content.caption && (
            <p className="mt-2">{message.content.caption}</p>
          )}
        </div>
      );
    }
    if (message.message_type === 'document') {
      return (
        <div className="flex items-center space-x-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p className="font-medium">{message.content.filename || 'Documento'}</p>
            {message.content.caption && (
              <p className="text-sm opacity-80">{message.content.caption}</p>
            )}
          </div>
        </div>
      );
    }
    return <span className="italic opacity-60">Mensagem do tipo {message.message_type}</span>;
  };

  // Get timestamp
  const getTimestamp = () => {
    const timestamp = message.sent_at || message.created_at;
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return '';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    if (message.direction === 'inbound') return null;

    const statusIcons = {
      pending: (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      sent: (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      delivered: (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7M5 13l4 4L19 7" />
        </svg>
      ),
      read: (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
      ),
      failed: (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };

    return statusIcons[message.status as keyof typeof statusIcons] || null;
  };

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isInbound
            ? 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white'
            : message.status === 'failed'
            ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-gray-900 dark:text-white'
            : 'bg-purple-600 dark:bg-purple-700 text-white'
        }`}
      >
        <div className="break-words">{getMessageContent()}</div>

        <div className={`flex items-center justify-end space-x-1 mt-1 text-xs ${
          isInbound ? 'text-gray-500 dark:text-gray-400' : 'text-white/70'
        }`}>
          <span>{getTimestamp()}</span>
          {getStatusIcon()}
        </div>

        {message.status === 'failed' && message.error_message && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400 border-t border-red-300 dark:border-red-800 pt-2">
            Erro: {message.error_message}
          </div>
        )}
      </div>
    </div>
  );
}
