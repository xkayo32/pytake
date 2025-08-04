import { useState, useEffect } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/ScrollArea";
import { Avatar } from "../../components/ui/Avatar";
import { PageHeader } from "../../components/ui/page-header";
import { AgentChatInput } from "../../components/chat/AgentChatInput";
import { useToast } from "../../hooks/useToast";
import { useSocketConnection } from "../../hooks/useSocketConnection";
import { 
  MessageSquare, 
  UserPlus, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  PhoneCall,
  RefreshCw,
  Send,
  Search,
  Filter
} from "lucide-react";
import { Input } from "../../components/ui/input";

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  status: "waiting" | "in_progress" | "resolved";
  assignedTo?: string;
  platform: "whatsapp" | "telegram" | "instagram";
  unreadCount: number;
  priority: "low" | "medium" | "high";
}

interface Message {
  id: string;
  conversationId: string;
  content: string;
  timestamp: string;
  isFromCustomer: boolean;
  status: "sent" | "delivered" | "read";
  mediaUrl?: string;
}

export function AgentWorkspace() {
  const { showToast } = useToast();
  const socket = useSocketConnection();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "waiting" | "mine">("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchConversations();
    
    // WebSocket listeners
    if (socket) {
      socket.on("new_conversation", handleNewConversation);
      socket.on("new_message", handleNewMessage);
      socket.on("conversation_assigned", handleConversationAssigned);
      
      return () => {
        socket.off("new_conversation");
        socket.off("new_message");
        socket.off("conversation_assigned");
      };
    }
  }, [socket]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/conversations/agent", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      showToast("Erro ao carregar conversas", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      showToast("Erro ao carregar mensagens", "error");
    }
  };

  const pullConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/assign`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (response.ok) {
        showToast("Conversa atribuída com sucesso!", "success");
        fetchConversations();
      } else {
        throw new Error("Falha ao atribuir conversa");
      }
    } catch (error) {
      showToast("Erro ao puxar conversa", "error");
    }
  };

  const resolveConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/resolve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (response.ok) {
        showToast("Conversa resolvida!", "success");
        fetchConversations();
        setSelectedConversation(null);
      }
    } catch (error) {
      showToast("Erro ao resolver conversa", "error");
    }
  };

  const handleNewConversation = (conversation: Conversation) => {
    setConversations(prev => [conversation, ...prev]);
    showToast("Nova conversa recebida!", "info");
  };

  const handleNewMessage = (message: any) => {
    if (selectedConversation && message.conversationId === selectedConversation.id) {
      setMessages(prev => [...prev, message]);
    }
    
    // Update conversation list
    setConversations(prev => 
      prev.map(conv => 
        conv.id === message.conversationId
          ? { ...conv, lastMessage: message.content, lastMessageTime: message.timestamp, unreadCount: conv.unreadCount + 1 }
          : conv
      )
    );
  };

  const handleConversationAssigned = (data: any) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === data.conversationId
          ? { ...conv, assignedTo: data.agentId, status: "in_progress" }
          : conv
      )
    );
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesFilter = 
      filter === "all" ||
      (filter === "waiting" && conv.status === "waiting") ||
      (filter === "mine" && conv.assignedTo === "current_user_id"); // Replace with actual user ID
    
    const matchesSearch = 
      conv.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contactPhone.includes(searchTerm) ||
      conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "waiting":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "in_progress":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversation List */}
      <div className="w-96 border-r bg-background">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-4">Conversas</h2>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              Todas
            </Button>
            <Button
              size="sm"
              variant={filter === "waiting" ? "default" : "outline"}
              onClick={() => setFilter("waiting")}
            >
              Aguardando
            </Button>
            <Button
              size="sm"
              variant={filter === "mine" ? "default" : "outline"}
              onClick={() => setFilter("mine")}
            >
              Minhas
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-8rem)]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              Nenhuma conversa encontrada
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    selectedConversation?.id === conversation.id ? "bg-muted" : ""
                  }`}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    fetchMessages(conversation.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <span className="text-sm">
                        {conversation.contactName.charAt(0).toUpperCase()}
                      </span>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium truncate">{conversation.contactName}</h4>
                        <span className="text-xs text-muted-foreground">
                          {conversation.lastMessageTime}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {conversation.lastMessage}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        {getStatusIcon(conversation.status)}
                        <Badge variant="outline" className="text-xs">
                          {conversation.platform}
                        </Badge>
                        {conversation.unreadCount > 0 && (
                          <Badge className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(conversation.priority)}`} />
                      </div>
                    </div>
                  </div>
                  
                  {conversation.status === "waiting" && (
                    <Button
                      size="sm"
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        pullConversation(conversation.id);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Puxar Atendimento
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <span className="text-sm">
                      {selectedConversation.contactName.charAt(0).toUpperCase()}
                    </span>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedConversation.contactName}</h3>
                    <p className="text-sm text-muted-foreground">{selectedConversation.contactPhone}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Ligar
                  </Button>
                  {selectedConversation.status === "in_progress" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveConversation(selectedConversation.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolver
                    </Button>
                  )}
                  <Button variant="ghost" size="icon">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromCustomer ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.isFromCustomer
                          ? "bg-muted"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs opacity-70">{message.timestamp}</span>
                        {!message.isFromCustomer && (
                          <span className="text-xs">
                            {message.status === "sent" && "✓"}
                            {message.status === "delivered" && "✓✓"}
                            {message.status === "read" && (
                              <span className="text-blue-400">✓✓</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            {selectedConversation.status === "in_progress" && (
              <AgentChatInput
                conversationId={selectedConversation.id}
                onSendMessage={(content) => {
                  // Handle send message
                  console.log("Sending message:", content);
                }}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}