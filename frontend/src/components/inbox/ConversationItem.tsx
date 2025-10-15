'use client';

import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface Contact {
  id: string;
  name?: string;
  whatsapp_id: string;
  avatar_url?: string;
}

interface Message {
  id: string;
  content: any;
  message_type: string;
  direction: string;
  created_at: string;
}

interface Conversation {
  id: string;
  contact: Contact;
  status: string;
  last_message_at?: string;
  total_messages: number;
  messages_from_contact: number;
  unread_count?: number;
  current_agent_id?: string;
  is_bot_active: boolean;
  last_message?: Message;
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected?: boolean;
  basePath?: string; // '/admin/conversations' or '/agent/conversations'
}

export default function ConversationItem({
  conversation,
  isSelected = false,
  basePath = '/admin/conversations',
}: ConversationItemProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'queued':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Aberta',
      active: 'Ativa',
      queued: 'Fila',
      closed: 'Encerrada',
    };
    return labels[status] || status;
  };

  const getLastMessagePreview = () => {
    if (!conversation.last_message) {
      return 'Sem mensagens';
    }

    const msg = conversation.last_message;

    // Handle different message types
    if (msg.message_type === 'text' && msg.content?.text) {
      return msg.content.text.length > 50
        ? msg.content.text.substring(0, 50) + '...'
        : msg.content.text;
    }

    if (msg.message_type === 'image') return '📷 Imagem';
    if (msg.message_type === 'video') return '🎥 Vídeo';
    if (msg.message_type === 'audio') return '🎵 Áudio';
    if (msg.message_type === 'document') return '📄 Documento';
    if (msg.message_type === 'template') return '📋 Template';

    return 'Mensagem';
  };

  const getTimeAgo = () => {
    if (!conversation.last_message_at) return '';

    try {
      return formatDistanceToNow(new Date(conversation.last_message_at), {
        addSuffix: true,
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

  const handleClick = () => {
    router.push(`${basePath}/${conversation.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative flex items-start gap-3 p-4 border-b border-gray-200 cursor-pointer
        transition-all duration-200 hover:bg-gray-50
        ${isSelected ? 'bg-purple-50 border-l-4 border-l-purple-600' : ''}
      `}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-md">
          {getContactInitial()}
        </div>

        {/* Online indicator (if active) */}
        {conversation.status === 'active' && (
          <div className="absolute top-4 left-10 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        )}
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

          <div className="flex flex-col items-end ml-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {getTimeAgo()}
            </span>
            {conversation.unread_count && conversation.unread_count > 0 && (
              <span className="mt-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-purple-600 rounded-full">
                {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
              </span>
            )}
          </div>
        </div>

        {/* Last message preview */}
        <p className={`text-sm truncate ${
          conversation.last_message?.direction === 'inbound'
            ? 'text-gray-900 font-medium'
            : 'text-gray-600'
        }`}>
          {conversation.last_message?.direction === 'outbound' && (
            <span className="text-gray-400 mr-1">Você: </span>
          )}
          {getLastMessagePreview()}
        </p>

        {/* Status and tags */}
        <div className="flex items-center gap-2 mt-2">
          <span className={`
            inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border
            ${getStatusColor(conversation.status)}
          `}>
            {getStatusLabel(conversation.status)}
          </span>

          {conversation.is_bot_active && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              🤖 Bot
            </span>
          )}

          {conversation.current_agent_id && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              👤 Atribuída
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
