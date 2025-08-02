import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface Message {
  id: string
  content: string
  timestamp: Date
  type: 'text' | 'image' | 'audio' | 'document'
}

interface ChatConversation {
  id: string
  contact: {
    name: string
    phone: string
    avatar?: string
  }
  lastMessage: Message
  unreadCount: number
  platform: 'whatsapp' | 'telegram' | 'instagram' | 'messenger'
  status: 'active' | 'waiting' | 'closed'
}

interface ChatListProps {
  conversations: ChatConversation[]
  selectedConversationId?: string
  onSelectConversation: (conversationId: string) => void
}

const platformColors = {
  whatsapp: 'bg-green-500',
  telegram: 'bg-blue-500',
  instagram: 'bg-pink-500',
  messenger: 'bg-blue-600'
}

const statusConfig = {
  active: { color: 'bg-green-500', label: 'Ativa', icon: CheckCircle2 },
  waiting: { color: 'bg-yellow-500', label: 'Aguardando', icon: Clock },
  closed: { color: 'bg-gray-400', label: 'Finalizada', icon: AlertCircle }
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const truncateMessage = (content: string, maxLength: number = 50) => {
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content
  }

  return (
    <div className="h-full border-r border-border bg-card">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border-b border-border"
      >
        <h2 className="text-lg font-semibold text-foreground">Conversas</h2>
        <p className="text-sm text-muted-foreground">
          {conversations.length} conversas carregadas
        </p>
      </motion.div>
      
      <ScrollArea className="h-[calc(100%-80px)]">
        <div className="p-2">
          <AnimatePresence>
            {conversations.map((conversation, index) => {
              const StatusIcon = statusConfig[conversation.status].icon
              return (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  className={`
                    relative p-3 rounded-lg cursor-pointer transition-all duration-200 mb-2
                    hover:bg-accent hover:shadow-sm
                    ${selectedConversationId === conversation.id 
                      ? 'bg-primary/10 border border-primary/20 shadow-sm' 
                      : 'hover:bg-accent'
                    }
                  `}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  {/* Active indicator */}
                  {selectedConversationId === conversation.id && (
                    <motion.div
                      layoutId="activeConversation"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  
                  <div className="flex items-start space-x-3">
                    <div className="relative">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage 
                            src={conversation.contact.avatar} 
                            alt={conversation.contact.name}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {getInitials(conversation.contact.name)}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                      
                      {/* Platform indicator */}
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className={`
                          absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background
                          ${platformColors[conversation.platform]}
                        `} 
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-foreground">
                            {conversation.contact.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {conversation.contact.phone}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(conversation.lastMessage.timestamp, {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                          
                          <div className="flex items-center space-x-1">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.3 }}
                            >
                              <Badge
                                variant="secondary"
                                className="text-xs flex items-center space-x-1 bg-background"
                              >
                                <StatusIcon className="h-3 w-3" />
                                <span>{statusConfig[conversation.status].label}</span>
                              </Badge>
                            </motion.div>
                            
                            <AnimatePresence>
                              {conversation.unreadCount > 0 && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                >
                                  <Badge 
                                    variant="destructive" 
                                    className="text-xs min-w-[20px] h-5 flex items-center justify-center animate-pulse"
                                  >
                                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                  </Badge>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                      
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-sm text-muted-foreground mt-1 truncate"
                      >
                        {conversation.lastMessage.type === 'text' 
                          ? truncateMessage(conversation.lastMessage.content)
                          : `📎 ${conversation.lastMessage.type}`
                        }
                      </motion.p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          
          {conversations.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium mb-2">
                Nenhuma conversa encontrada
              </p>
              <p className="text-sm text-muted-foreground">
                As conversas aparecerão aqui quando chegarem mensagens
              </p>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}