import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, X, Image, Film, Music, FileText, Check, CheckCheck, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MediaSelector } from '@/components/media/MediaSelector'
import type { MediaFile } from '@/types/media'
import { formatFileSize } from '@/types/media'

interface Message {
  id: string
  content: string
  timestamp: Date
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  sender: 'user' | 'contact'
  status: 'sent' | 'delivered' | 'read'
  media?: {
    url: string
    thumbnailUrl?: string
    filename: string
    fileSize: number
    mimeType: string
  }
}

interface Contact {
  name: string
  phone: string
  avatar?: string
  status: 'online' | 'offline' | 'typing'
}

interface ChatWindowProps {
  conversationId: string
  contact: Contact
  messages: Message[]
  platform: 'whatsapp' | 'telegram' | 'instagram' | 'messenger'
  onSendMessage: (content: string, type: Message['type'], media?: MediaFile[]) => void
  onAttachFile?: () => void
}

const platformColors = {
  whatsapp: 'text-green-600',
  telegram: 'text-blue-600', 
  instagram: 'text-pink-600',
  messenger: 'text-blue-700'
}

const statusIcons = {
  sent: Clock,
  delivered: Check,
  read: CheckCheck
}

const statusColors = {
  sent: 'text-muted-foreground',
  delivered: 'text-muted-foreground', 
  read: 'text-blue-400'
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  contact,
  messages,
  platform,
  onSendMessage,
  onAttachFile
}) => {
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showMediaSelector, setShowMediaSelector] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MediaFile[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (newMessage.trim() || selectedMedia.length > 0) {
      if (selectedMedia.length > 0) {
        // Determine media type from first media file
        const mediaType = selectedMedia[0].media_type === 'image' ? 'image' :
                         selectedMedia[0].media_type === 'video' ? 'video' :
                         selectedMedia[0].media_type === 'audio' ? 'audio' : 'document';
        onSendMessage(newMessage.trim() || '', mediaType, selectedMedia)
      } else {
        onSendMessage(newMessage.trim(), 'text')
      }
      setNewMessage('')
      setSelectedMedia([])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewMessage(value)
    
    // Handle typing indicators
    if (value.length > 0 && !isTyping) {
      setIsTyping(true)
      // TODO: Send typing start signal via WebSocket
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      // TODO: Send typing stop signal via WebSocket
    }, 1000)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Enhanced Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border p-4 bg-card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Avatar className="w-12 h-12 ring-2 ring-primary/10">
                <AvatarImage src={contact.avatar} alt={contact.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            
            <div>
              <h3 className="font-semibold text-foreground text-lg">{contact.name}</h3>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">{contact.phone}</p>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${platformColors[platform]} border-0`}
                >
                  {platform.toUpperCase()}
                </Badge>
              </div>
              
              <AnimatePresence>
                {contact.status === 'typing' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center space-x-1 mt-1"
                  >
                    <div className="flex space-x-1">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                        className="w-1 h-1 bg-green-500 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                        className="w-1 h-1 bg-green-500 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                        className="w-1 h-1 bg-green-500 rounded-full"
                      />
                    </div>
                    <p className="text-xs text-green-600">digitando...</p>
                  </motion.div>
                )}
                {contact.status === 'online' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center space-x-1 mt-1"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-xs text-green-600">online</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="sm" className="hover:bg-accent">
                <Phone className="w-4 h-4" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="sm" className="hover:bg-accent">
                <Video className="w-4 h-4" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="sm" className="hover:bg-accent">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Messages with Animations */}
      <ScrollArea className="flex-1 p-4 bg-background" ref={scrollAreaRef}>
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => {
              const StatusIcon = statusIcons[message.status]
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 30,
                    delay: index * 0.05
                  }}
                  className={`flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`
                      max-w-[70%] rounded-lg p-3 shadow-sm
                      ${message.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-card border border-border rounded-bl-sm'
                      }
                    `}
                  >
                {/* Media content */}
                {message.media && (
                  <div className="mb-2">
                    {message.type === 'image' && (
                      <img 
                        src={message.media.thumbnailUrl || message.media.url} 
                        alt={message.media.filename}
                        className="rounded-lg max-w-full cursor-pointer hover:opacity-90"
                        onClick={() => window.open(message.media!.url, '_blank')}
                      />
                    )}
                    {message.type === 'video' && (
                      <video 
                        src={message.media.url} 
                        controls
                        className="rounded-lg max-w-full"
                      />
                    )}
                    {message.type === 'audio' && (
                      <audio 
                        src={message.media.url} 
                        controls
                        className="w-full"
                      />
                    )}
                    {message.type === 'document' && (
                      <a 
                        href={message.media.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 p-2 bg-background/10 rounded hover:bg-background/20"
                      >
                        <FileText className="w-5 h-5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.media.filename}</p>
                          <p className="text-xs opacity-70">{formatFileSize(message.media.fileSize)}</p>
                        </div>
                      </a>
                    )}
                  </div>
                )}
                
                {/* Text content */}
                {message.content && (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                
                    <div className="flex items-center justify-end space-x-2 mt-2">
                      <span className="text-xs opacity-70">
                        {formatDistanceToNow(message.timestamp, {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                      
                      {message.sender === 'user' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5 }}
                          className={`text-xs ${statusColors[message.status]}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium mb-2">
                Nenhuma mensagem ainda
              </p>
              <p className="text-sm text-muted-foreground">
                Inicie a conversa enviando uma mensagem!
              </p>
            </motion.div>
          )}
        </div>
        
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Enhanced Selected Media Preview */}
      <AnimatePresence>
        {selectedMedia.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="border-t border-border p-3 bg-card"
          >
            <div className="flex items-center justify-between mb-3">
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-medium text-foreground"
              >
                {selectedMedia.length} arquivo{selectedMedia.length > 1 ? 's' : ''} selecionado{selectedMedia.length > 1 ? 's' : ''}
              </motion.p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMedia([])}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {selectedMedia.map((media, index) => (
                  <motion.div 
                    key={media.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center space-x-2 bg-background border border-border rounded-lg p-2 hover:bg-accent transition-colors"
                  >
                    {media.media_type === 'image' && <Image className="w-4 h-4 text-blue-500" />}
                    {media.media_type === 'video' && <Film className="w-4 h-4 text-purple-500" />}
                    {media.media_type === 'audio' && <Music className="w-4 h-4 text-green-500" />}
                    {media.media_type === 'document' && <FileText className="w-4 h-4 text-orange-500" />}
                    <span className="text-sm truncate max-w-[150px] text-foreground">{media.filename}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Input */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-t border-border p-4 bg-card"
      >
        <div className="flex items-end space-x-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMediaSelector(true)}
              className="shrink-0 hover:bg-accent"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </motion.div>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="pr-12 bg-background border-border focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
            
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-accent"
              >
                <Smile className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            animate={{
              scale: (!newMessage.trim() && selectedMedia.length === 0) ? 0.95 : 1,
              opacity: (!newMessage.trim() && selectedMedia.length === 0) ? 0.5 : 1
            }}
          >
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && selectedMedia.length === 0}
              className="shrink-0 bg-primary hover:bg-primary/90 transition-all"
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Media Selector Modal */}
      {showMediaSelector && (
        <MediaSelector
          onSelectMedia={(media) => {
            setSelectedMedia(media)
            setShowMediaSelector(false)
          }}
          onClose={() => setShowMediaSelector(false)}
          multiple={true}
          maxFiles={10}
          selectedMedia={selectedMedia}
        />
      )}
    </div>
  )
}