import React, { forwardRef, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  Image as ImageIcon,
  FileText,
  MapPin,
  Phone,
  Video,
  Plus,
  X
} from 'lucide-react';
import { useConversationStore } from '../../stores/conversationStore';
import clsx from 'clsx';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
}

export const MessageInput = forwardRef<HTMLTextAreaElement, MessageInputProps>(({
  value,
  onChange,
  onSend,
  onKeyPress,
  disabled = false
}, ref) => {
  const [showAttachments, setShowAttachments] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, currentConversation } = useConversationStore();

  // Quick reply templates
  const quickReplies = [
    'Obrigado!',
    'Como posso ajudá-lo?',
    'Vou verificar isso para você',
    'Aguarde um momento...',
    'Posso esclarecer mais alguma coisa?',
    'Tenha um ótimo dia!',
    'Entre em contato sempre que precisar',
    'Problema resolvido!'
  ];

  const attachmentOptions = [
    {
      icon: ImageIcon,
      label: 'Imagem/Vídeo',
      action: () => {
        fileInputRef.current?.click();
        setShowAttachments(false);
      },
      accept: 'image/*,video/*'
    },
    {
      icon: FileText,
      label: 'Documento',
      action: () => {
        fileInputRef.current?.click();
        setShowAttachments(false);
      },
      accept: '.pdf,.doc,.docx,.txt,.xls,.xlsx'
    },
    {
      icon: MapPin,
      label: 'Localização',
      action: () => {
        console.log('Send location');
        setShowAttachments(false);
      }
    },
    {
      icon: Phone,
      label: 'Contato',
      action: () => {
        console.log('Send contact');
        setShowAttachments(false);
      }
    }
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentConversation) {
      await uploadFile(currentConversation.id, file);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleQuickReply = (reply: string) => {
    onChange(reply);
    setShowQuickReplies(false);
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // TODO: Implement voice recording stop
    } else {
      // Start recording
      setIsRecording(true);
      // TODO: Implement voice recording start
    }
  };

  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = Math.min(element.scrollHeight, 120) + 'px';
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    adjustTextareaHeight(e.target);
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Quick Replies */}
      <AnimatePresence>
        {showQuickReplies && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-gray-200 dark:border-gray-700 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Respostas Rápidas
              </span>
              <button
                onClick={() => setShowQuickReplies(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => handleQuickReply(reply)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Area */}
      <div className="p-4">
        <div className="flex items-end space-x-3">
          {/* Attachment Button */}
          <div className="relative">
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Anexar arquivo"
            >
              {showAttachments ? <X size={20} /> : <Paperclip size={20} />}
            </button>

            {/* Attachment Options */}
            <AnimatePresence>
              {showAttachments && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowAttachments(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute bottom-full mb-2 left-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20"
                  >
                    <div className="p-2">
                      {attachmentOptions.map((option) => (
                        <button
                          key={option.label}
                          onClick={option.action}
                          className="w-full flex items-center space-x-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <option.icon size={16} />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              multiple={false}
            />
          </div>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={ref}
              value={value}
              onChange={handleTextareaChange}
              onKeyPress={onKeyPress}
              placeholder={disabled ? 'Conversa encerrada...' : 'Digite sua mensagem...'}
              disabled={disabled}
              rows={1}
              className={clsx(
                'w-full resize-none border border-gray-200 dark:border-gray-600 rounded-2xl px-4 py-3 pr-12',
                'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white',
                'placeholder-gray-500 dark:placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'transition-colors max-h-[120px] overflow-y-auto custom-scrollbar',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            />

            {/* Emoji Button */}
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              title="Emojis"
            >
              <Smile size={18} />
            </button>
          </div>

          {/* Voice/Send Button */}
          <div className="flex items-center space-x-2">
            {/* Quick Replies Toggle */}
            <button
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Respostas rápidas"
            >
              <Plus size={20} />
            </button>

            {canSend ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSend}
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-md"
                title="Enviar mensagem"
              >
                <Send size={20} />
              </motion.button>
            ) : (
              <button
                onClick={handleVoiceRecord}
                className={clsx(
                  'p-2 rounded-full transition-colors shadow-md',
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                )}
                title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
              >
                <Mic size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Recording indicator */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center space-x-2 mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
            >
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-600 dark:text-red-400">
                Gravando áudio... Clique novamente para parar
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';