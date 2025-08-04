import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search,
  MessageSquare,
  Phone,
  Filter
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Conversation } from '@/types/conversation'

interface ChatListProps {
  conversations: Conversation[]
  selectedConversationId?: string
  onSelectConversation: (conversationId: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

const statusConfig = {
  active: { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Ativa', icon: CheckCircle2 },
  pending: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Pendente', icon: Clock },
  resolved: { color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Resolvida', icon: CheckCircle2 }
}

const channelColors = {
  whatsapp: 'bg-green-500',
  webchat: 'bg-blue-500',
  instagram: 'bg-pink-500'
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchQuery,
  onSearchChange
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const activeCount = conversations.filter(c => c.status === 'active').length
  const pendingCount = conversations.filter(c => c.status === 'pending').length

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 border-b border-border/50"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Conversas</h2>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <Badge className="bg-green-100 text-green-700">
                {activeCount} ativas
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge className="bg-yellow-100 text-yellow-700">
                {pendingCount} pendentes
              </Badge>
            )}
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </motion.div>
      
      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <AnimatePresence>
            {conversations.map((conversation, index) => {
              const config = statusConfig[conversation.status]
              const StatusIcon = config.icon
              
              return (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                  whileHover={{ x: 2 }}
                  className={`
                    relative p-3 rounded-lg cursor-pointer transition-all duration-200 mb-2
                    ${selectedConversationId === conversation.id 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-accent/50 border border-transparent'
                    }
                  `}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  {/* Active indicator */}
                  {selectedConversationId === conversation.id && (
                    <motion.div
                      layoutId="activeConversation"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  
                  <div className="flex items-start gap-3 pl-2">
                    {/* Avatar */}
                    <div className="relative">
                      <Avatar className="w-11 h-11">
                        <AvatarImage 
                          src={conversation.contactAvatar} 
                          alt={conversation.contactName}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {getInitials(conversation.contactName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Channel indicator */}
                      <div className={`
                        absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background
                        ${channelColors[conversation.channel]}
                      `} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-foreground">
                            {conversation.contactName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{conversation.contactPhone}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(conversation.lastMessageTime, {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                          
                          {conversation.unreadCount > 0 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500 }}
                            >
                              <Badge 
                                variant="destructive" 
                                className="text-xs h-5 min-w-[20px] px-1.5"
                              >
                                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                              </Badge>
                            </motion.div>
                          )}
                        </div>
                      </div>
                      
                      {/* Last message */}
                      <p className="text-sm text-muted-foreground truncate pr-2">
                        {conversation.lastMessage}
                      </p>
                      
                      {/* Tags and status */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`
                          flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                          ${config.bgColor} ${config.color}
                        `}>
                          <StatusIcon className="h-3 w-3" />
                          <span>{config.label}</span>
                        </div>
                        
                        {conversation.tags.map((tag, i) => (
                          <Badge 
                            key={i}
                            variant="secondary" 
                            className="text-xs h-5 px-1.5"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
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
              className="text-center py-12"
            >
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium mb-2">
                Nenhuma conversa encontrada
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery 
                  ? 'Tente buscar com outros termos'
                  : 'As conversas aparecerão aqui'}
              </p>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}