import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video,
  Check,
  CheckCheck,
  Clock,
  MessageSquare
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Conversation, Message } from '@/types/conversation'

interface ChatWindowProps {
  conversation: Conversation
  messages: Message[]
  onSendMessage: (content: string) => void
}

const statusIcons = {
  sent: Clock,
  delivered: Check,
  read: CheckCheck
}

const statusColors = {
  sent: 'text-muted-foreground',
  delivered: 'text-muted-foreground',
  read: 'text-blue-500'
}

const channelColors = {
  whatsapp: 'text-green-600 bg-green-100',
  webchat: 'text-blue-600 bg-blue-100',
  instagram: 'text-pink-600 bg-pink-100'
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  onSendMessage
}) => {
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Simulate typing indicator
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.sender === 'agent') {
        setIsTyping(true)
        const timer = setTimeout(() => setIsTyping(false), 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [messages])

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim())
      setNewMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

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
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/50 p-4 bg-card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-primary/10">
              <AvatarImage src={conversation.contactAvatar} alt={conversation.contactName} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(conversation.contactName)}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="font-semibold text-foreground">{conversation.contactName}</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{conversation.contactPhone}</p>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${channelColors[conversation.channel]}`}
                >
                  {conversation.channel}
                </Badge>
              </div>
              
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-1 mt-1"
                  >
                    <div className="flex gap-1">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.div
                          key={i}
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1, delay }}
                          className="w-1.5 h-1.5 bg-green-500 rounded-full"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-green-600">digitando...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const StatusIcon = statusIcons[message.status]
              const isAgent = message.sender === 'agent'
              
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`
                      max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm
                      ${isAgent
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-card border border-border/50 rounded-bl-md'
                      }
                    `}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className="text-xs opacity-70">
                        {format(message.timestamp, 'HH:mm', { locale: ptBR })}
                      </span>
                      
                      {isAgent && StatusIcon && (
                        <StatusIcon className={`h-3.5 w-3.5 ${statusColors[message.status]}`} />
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                Inicie uma conversa
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Envie uma mensagem para começar
              </p>
            </motion.div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-t border-border/50 p-4 bg-card"
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite uma mensagem..."
              className="pr-10"
            />
            <Button 
              variant="ghost" 
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}