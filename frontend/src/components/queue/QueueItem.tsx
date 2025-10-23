'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SLABadge } from '@/components/admin/SLABadge';
import { queuesAPI } from '@/lib/api';
import type { Queue } from '@/types/queue';

interface Contact {
  id: string;
  name?: string;
  whatsapp_id: string;
}

interface Conversation {
  id: string;
  contact: Contact;
  status: string;
  queued_at?: string;
  queue_id?: string | null;
  queue_priority: number;
  total_messages: number;
  messages_from_contact: number;
  is_bot_active: boolean;
}

interface QueueItemProps {
  conversation: Conversation;
  onPull?: (id: string) => void;
}

export default function QueueItem({ conversation, onPull }: QueueItemProps) {
  const [queue, setQueue] = useState<Queue | null>(null);

  useEffect(() => {
    if (conversation.queue_id) {
      queuesAPI.get(conversation.queue_id)
        .then(response => setQueue(response.data))
        .catch(err => console.error('Error loading queue:', err));
    }
  }, [conversation.queue_id]);

  const getPriorityColor = (priority: number) => {
    if (priority >= 5) return 'bg-red-100 text-red-800 border-red-300';
    if (priority >= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 5) return 'Urgente';
    if (priority >= 3) return 'Alta';
    if (priority >= 1) return 'Média';
    return 'Baixa';
  };

  const getTimeInQueue = () => {
    if (!conversation.queued_at) return '';

    try {
      return formatDistanceToNow(new Date(conversation.queued_at), {
        addSuffix: false,
        locale: ptBR,
      });
    } catch {
      return '';
    }
  };

  const getContactInitial = () => {
    const name = conversation.contact?.name || conversation.contact?.whatsapp_id || '?';
    return name[0]?.toUpperCase() || '?';
  };

  return (
    <div
      className="relative flex items-start gap-3 p-4 border-b border-gray-200 hover:bg-green-50 transition-all duration-200"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-lg shadow-md">
          {getContactInitial()}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {conversation.contact?.name || conversation.contact?.whatsapp_id || 'Contato'}
            </h3>
            {conversation.contact?.name && (
              <p className="text-xs text-gray-500 truncate">
                {conversation.contact.whatsapp_id}
              </p>
            )}
          </div>

          {/* Priority Badge */}
          <span
            className={`
            ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border
            ${getPriorityColor(conversation.queue_priority)}
          `}
          >
            {getPriorityLabel(conversation.queue_priority)}
          </span>
        </div>

        {/* Time in queue */}
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Aguardando há {getTimeInQueue()}</span>
          
          {/* SLA Badge */}
          {conversation.queued_at && (
            <SLABadge 
              queuedAt={conversation.queued_at}
              slaMinutes={queue?.sla_minutes}
              size="sm"
              className="ml-2"
            />
          )}
        </div>

        {/* Messages count */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{conversation.messages_from_contact} mensagens do contato</span>
          {conversation.is_bot_active && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              🤖 Bot
            </span>
          )}
        </div>
      </div>

      {/* Pull Button */}
      {onPull && (
        <div className="flex-shrink-0">
          <button
            onClick={() => onPull(conversation.id)}
            className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            Pegar
          </button>
        </div>
      )}
    </div>
  );
}
