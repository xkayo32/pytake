import React, { useState, useEffect } from 'react';
import { 
  MessageSquare as ChatBubbleLeftRightIcon,
  Send as PaperAirplaneIcon,
  Phone as PhoneIcon,
  UserCircle as UserCircleIcon,
  MoreVertical as EllipsisVerticalIcon,
  Search as MagnifyingGlassIcon,
} from 'lucide-react';
import { api, isApiSuccess } from '../services/api';
import { useAuth } from '../stores/authStore';
import { 
  Conversation, 
  WhatsAppMessage, 
  SendMessageRequest,
} from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const AgentWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock conversations data for development
  const mockConversations: Conversation[] = [
    {
      id: '1',
      phone_number: '+5561994013828',
      contact_name: 'João Silva',
      status: 'active',
      assigned_agent_id: user?.id,
      assigned_agent_name: user?.name,
      last_message: 'Olá, preciso de ajuda com meu pedido',
      last_message_time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      unread_count: 2,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      tags: ['support', 'order'],
      priority: 'high',
    },
    {
      id: '2',
      phone_number: '+5561987654321',
      contact_name: 'Maria Santos',
      status: 'pending',
      last_message: 'Qual o prazo de entrega?',
      last_message_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      unread_count: 1,
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      tags: ['sales'],
      priority: 'medium',
    },
    {
      id: '3',
      phone_number: '+5561123456789',
      contact_name: 'Carlos Oliveira',
      status: 'active',
      assigned_agent_id: user?.id,
      assigned_agent_name: user?.name,
      last_message: 'Obrigado pela ajuda!',
      last_message_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      unread_count: 0,
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      tags: ['support'],
      priority: 'low',
    },
  ];

  const mockMessages: WhatsAppMessage[] = [
    {
      id: '1',
      conversation_id: '1',
      phone_number: '+5561994013828',
      direction: 'inbound',
      message_type: 'text',
      content: 'Olá, preciso de ajuda com meu pedido #12345',
      status: 'delivered',
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      whatsapp_message_id: 'wamid.1',
    },
    {
      id: '2',
      conversation_id: '1',
      phone_number: '+5561994013828',
      direction: 'outbound',
      message_type: 'text',
      content: 'Olá! Estou verificando seu pedido agora. Um momento, por favor.',
      status: 'read',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      whatsapp_message_id: 'wamid.2',
      user_id: user?.id,
    },
    {
      id: '3',
      conversation_id: '1',
      phone_number: '+5561994013828',
      direction: 'inbound',
      message_type: 'text',
      content: 'Obrigado! Aguardo.',
      status: 'delivered',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      whatsapp_message_id: 'wamid.3',
    },
  ];

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    }
  }, [activeConversation]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from API first
      const response = await api.get('/api/v1/whatsapp/conversations');
      
      if (isApiSuccess(response)) {
        setConversations(response.data);
      } else {
        throw new Error('Failed to fetch conversations');
      }
    } catch (error) {
      console.warn('Failed to fetch conversations from API, using mock data');
      setConversations(mockConversations);
      
      // Set first conversation as active by default
      if (mockConversations.length > 0) {
        setActiveConversation(mockConversations[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await api.get(`/api/v1/whatsapp/conversations/${conversationId}/messages`);
      
      if (isApiSuccess(response)) {
        setMessages(response.data);
      } else {
        throw new Error('Failed to fetch messages');
      }
    } catch (error) {
      console.warn('Failed to fetch messages from API, using mock data');
      setMessages(mockMessages.filter(msg => msg.conversation_id === conversationId));
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || sending) {
      return;
    }

    try {
      setSending(true);
      
      const messageData: SendMessageRequest = {
        phone_number: activeConversation.phone_number,
        message_type: 'text',
        content: newMessage.trim(),
      };

      const response = await api.post('/api/v1/whatsapp/send', messageData);

      if (isApiSuccess(response)) {
        // Add message to local state immediately for better UX
        const newMsg: WhatsAppMessage = {
          id: Date.now().toString(),
          conversation_id: activeConversation.id,
          phone_number: activeConversation.phone_number,
          direction: 'outbound',
          message_type: 'text',
          content: newMessage.trim(),
          status: 'sent',
          timestamp: new Date().toISOString(),
          whatsapp_message_id: response.data.whatsapp_message_id || 'pending',
          user_id: user?.id,
        };

        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        
        toast.success('Message sent successfully!');
      } else {
        toast.error('Failed to send message');
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.phone_number.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-50">
      {/* Conversations Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Conversations</h2>
          
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <ChatBubbleLeftRightIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setActiveConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  activeConversation?.id === conversation.id ? 'bg-indigo-50 border-indigo-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserCircleIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.contact_name || conversation.phone_number}
                        </p>
                        {conversation.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-indigo-600 rounded-full">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-500 mb-1">
                        {conversation.phone_number}
                      </p>
                      
                      <p className="text-sm text-gray-600 truncate mb-2">
                        {conversation.last_message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(conversation.priority)}`}>
                            {conversation.priority}
                          </span>
                          
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            conversation.status === 'active' ? 'text-green-600 bg-green-100' :
                            conversation.status === 'pending' ? 'text-yellow-600 bg-yellow-100' :
                            'text-gray-600 bg-gray-100'
                          }`}>
                            {conversation.status}
                          </span>
                        </div>
                        
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {activeConversation.contact_name || activeConversation.phone_number}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <PhoneIcon className="h-4 w-4" />
                      <span>{activeConversation.phone_number}</span>
                      <span>•</span>
                      <span className="capitalize">{activeConversation.status}</span>
                    </div>
                  </div>
                </div>
                
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <EllipsisVerticalIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.direction === 'outbound'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className={`flex items-center justify-between mt-1 text-xs ${
                      message.direction === 'outbound' ? 'text-indigo-100' : 'text-gray-500'
                    }`}>
                      <span>
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                      </span>
                      {message.direction === 'outbound' && (
                        <span className="ml-2 capitalize">{message.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message..."
                    rows={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <LoadingSpinner size="small" color="white" />
                  ) : (
                    <PaperAirplaneIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversation Selected</h3>
              <p className="text-gray-600">Choose a conversation from the sidebar to start messaging.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentWorkspace;