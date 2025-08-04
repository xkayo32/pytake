import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Send, Paperclip, Smile } from 'lucide-react';

interface AgentChatInputProps {
  conversationId: string;
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export function AgentChatInput({ conversationId, onSendMessage, disabled = false }: AgentChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t bg-background">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" disabled={disabled}>
          <Paperclip className="h-5 w-5" />
        </Button>
        
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite uma mensagem..."
          disabled={disabled}
          className="flex-1"
        />
        
        <Button variant="ghost" size="icon" disabled={disabled}>
          <Smile className="h-5 w-5" />
        </Button>
        
        <Button 
          onClick={handleSend} 
          size="icon"
          disabled={disabled || !message.trim()}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}