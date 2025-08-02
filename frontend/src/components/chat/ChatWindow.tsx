import React, { useState, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, X, Image, Film, Music, FileText } from 'lucide-react'
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
  sent: '✓',
  delivered: '✓✓',
  read: '✓✓'
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={contact.avatar} alt={contact.name} />
              <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="font-semibold">{contact.name}</h3>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">{contact.phone}</p>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${platformColors[platform]}`}
                >
                  {platform}
                </Badge>
              </div>
              
              {contact.status === 'typing' && (
                <p className="text-xs text-green-600">digitando...</p>
              )}
              {contact.status === 'online' && (
                <p className="text-xs text-green-600">online</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`
                  max-w-[70%] rounded-lg p-3 
                  ${message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
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
                    <span 
                      className={`text-xs ${
                        message.status === 'read' ? 'text-blue-400' : 'opacity-70'
                      }`}
                    >
                      {statusIcons[message.status]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma mensagem ainda. Inicie a conversa!
              </p>
            </div>
          )}
        </div>
        
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Selected Media Preview */}
      {selectedMedia.length > 0 && (
        <div className="border-t border-border p-3 bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">
              {selectedMedia.length} arquivo{selectedMedia.length > 1 ? 's' : ''} selecionado{selectedMedia.length > 1 ? 's' : ''}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMedia([])}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedMedia.map((media) => (
              <div key={media.id} className="flex items-center space-x-2 bg-background rounded p-2">
                {media.media_type === 'image' && <Image className="w-4 h-4" />}
                {media.media_type === 'video' && <Film className="w-4 h-4" />}
                {media.media_type === 'audio' && <Music className="w-4 h-4" />}
                {media.media_type === 'document' && <FileText className="w-4 h-4" />}
                <span className="text-sm truncate max-w-[150px]">{media.filename}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMediaSelector(true)}
            className="shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="pr-10"
            />
            
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() && selectedMedia.length === 0}
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
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