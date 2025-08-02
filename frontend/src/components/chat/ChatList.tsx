import React from 'react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

const statusColors = {
  active: 'bg-green-500',
  waiting: 'bg-yellow-500',
  closed: 'bg-gray-400'
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
    <div className="h-full border-r border-border">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Conversas</h2>
        <p className="text-sm text-muted-foreground">
          {conversations.length} conversas ativas
        </p>
      </div>
      
      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`
                p-3 rounded-lg cursor-pointer transition-colors
                hover:bg-accent hover:text-accent-foreground
                ${selectedConversationId === conversation.id 
                  ? 'bg-accent text-accent-foreground' 
                  : ''
                }
              `}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage 
                      src={conversation.contact.avatar} 
                      alt={conversation.contact.name}
                    />
                    <AvatarFallback>
                      {getInitials(conversation.contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`
                    absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background
                    ${platformColors[conversation.platform]}
                  `} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
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
                        <Badge
                          variant="secondary"
                          className={`text-xs ${statusColors[conversation.status]}`}
                        >
                          {conversation.status}
                        </Badge>
                        
                        {conversation.unreadCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="text-xs min-w-[20px] h-5 flex items-center justify-center"
                          >
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {conversation.lastMessage.type === 'text' 
                      ? truncateMessage(conversation.lastMessage.content)
                      : `📎 ${conversation.lastMessage.type}`
                    }
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {conversations.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma conversa encontrada
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}