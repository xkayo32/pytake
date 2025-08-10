import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Tag,
  User,
  Clock,
  MessageCircle,
  Star,
  Archive,
  Ban,
  Edit,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Conversation } from '../../types';
import { useConversationStore } from '../../stores/conversationStore';
import clsx from 'clsx';

interface ContactInfoProps {
  conversation: Conversation;
  onClose: () => void;
}

export const ContactInfo: React.FC<ContactInfoProps> = ({
  conversation,
  onClose
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(true);
  const [showMedia, setShowMedia] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newNote, setNewNote] = useState('');
  
  const { updateContact, addConversationNote, messages } = useConversationStore();
  const contact = conversation.contact;
  const conversationMessages = messages[conversation.id] || [];

  const handleSaveField = (field: string, value: string) => {
    updateContact({
      ...contact,
      [field]: value
    });
    setEditingField(null);
  };

  const handleAddNote = async () => {
    if (newNote.trim()) {
      await addConversationNote(conversation.id, newNote.trim());
      setNewNote('');
    }
  };

  const mediaMessages = conversationMessages.filter(msg => 
    ['image', 'document', 'audio', 'video'].includes(msg.type)
  );

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-80 h-full bg-white dark:bg-gray-800 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Informações do Contato
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Contact Avatar and Basic Info */}
        <div className="p-4 text-center border-b border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
            {(contact.name || contact.phoneNumber).charAt(0).toUpperCase()}
          </div>
          
          <div className="space-y-2">
            {editingField === 'name' ? (
              <input
                type="text"
                defaultValue={contact.name || ''}
                onBlur={(e) => handleSaveField('name', e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveField('name', e.currentTarget.value);
                  }
                }}
                className="text-center text-lg font-semibold bg-transparent border-b border-blue-500 focus:outline-none"
                autoFocus
              />
            ) : (
              <h3 
                onClick={() => setEditingField('name')}
                className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1"
              >
                {contact.name || 'Sem nome'}
              </h3>
            )}
            
            <div className="flex items-center justify-center space-x-1 text-gray-500">
              <Phone size={14} />
              <span className="text-sm">{contact.phoneNumber}</span>
            </div>
            
            {contact.email && (
              <div className="flex items-center justify-center space-x-1 text-gray-500">
                <Mail size={14} />
                <span className="text-sm">{contact.email}</span>
              </div>
            )}
            
            <div className="text-xs text-gray-400">
              Último acesso: {contact.lastSeenAt ? formatDate(contact.lastSeenAt) : 'Nunca'}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 grid grid-cols-4 gap-3 border-b border-gray-200 dark:border-gray-700">
          <button className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <MessageCircle size={20} className="text-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Chat</span>
          </button>
          
          <button className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Phone size={20} className="text-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Ligar</span>
          </button>
          
          <button className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Star size={20} className="text-yellow-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Favorito</span>
          </button>
          
          <button className="flex flex-col items-center space-y-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Ban size={20} className="text-red-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Bloquear</span>
          </button>
        </div>

        {/* Tags */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Tags</h4>
            <button className="text-blue-500 hover:text-blue-600">
              <Plus size={16} />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {contact.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            
            {contact.tags.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma tag</p>
            )}
          </div>
        </div>

        {/* Custom Fields */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Campos Personalizados</h4>
            <button className="text-blue-500 hover:text-blue-600">
              <Plus size={16} />
            </button>
          </div>
          
          {Object.entries(contact.customFields).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(contact.customFields).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{key}:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{value as string}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum campo personalizado</p>
          )}
        </div>

        {/* Conversation Notes */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Notas da Conversa ({conversation.notes.length})
            </h4>
            {showNotes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          
          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {/* Add note */}
                  <div className="space-y-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Adicionar uma nota..."
                      rows={3}
                      className="w-full p-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {newNote.trim() && (
                      <button
                        onClick={handleAddNote}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
                      >
                        Adicionar Nota
                      </button>
                    )}
                  </div>
                  
                  {/* Existing notes */}
                  {conversation.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <p className="text-sm text-gray-900 dark:text-white mb-2">
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{note.author.name}</span>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                  
                  {conversation.notes.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Nenhuma nota ainda
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Media */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowMedia(!showMedia)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Mídia ({mediaMessages.length})
            </h4>
            {showMedia ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          
          <AnimatePresence>
            {showMedia && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4">
                  {mediaMessages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {mediaMessages.slice(0, 6).map((message) => (
                        <div
                          key={message.id}
                          className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {message.type === 'image' ? (
                            <ImageIcon size={24} className="text-gray-500" />
                          ) : (
                            <FileText size={24} className="text-gray-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Nenhuma mídia compartilhada
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Conversation History */}
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Histórico de Conversas
            </h4>
            {showHistory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {contact.conversationHistory.slice(0, 5).map((conv) => (
                    <div
                      key={conv.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {conv.status === 'closed' ? 'Encerrada' : 'Ativa'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(conv.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {conv.lastMessage?.content?.substring(0, 50)}...
                      </p>
                    </div>
                  ))}
                  
                  {contact.conversationHistory.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Primeira conversa com este contato
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};