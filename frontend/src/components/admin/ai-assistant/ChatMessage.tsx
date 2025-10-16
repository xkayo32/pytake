/**
 * ChatMessage Component
 *
 * Displays individual messages in the AI Flow Assistant chat
 * Supports user and assistant messages with avatars and timestamps
 */

import { User, Sparkles } from 'lucide-react';

export interface ChatMessageProps {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatMessage({ type, content, timestamp }: ChatMessageProps) {
  const isUser = type === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
            : 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div
          className={`px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">
          {timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
