import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ConversationsPage() {
  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-1/3 border-r bg-card">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Conversas</h2>
        </div>
        <div className="overflow-y-auto">
          {/* Conversation items */}
          <div className="p-4 border-b hover:bg-accent cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
                J
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">João Silva</p>
                  <p className="text-xs text-muted-foreground">14:30</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">Olá, preciso de ajuda com...</p>
                  <span className="flex items-center space-x-1">
                    <span className="text-xs">💬</span>
                    <span className="w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">2</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-b hover:bg-accent cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                M
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">Maria Santos</p>
                  <p className="text-xs text-muted-foreground">13:45</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate">Obrigada pelo atendimento!</p>
                  <span className="flex items-center space-x-1">
                    <span className="text-xs">📷</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto bg-background">
          <div className="text-center text-muted-foreground">
            <p>Selecione uma conversa para começar</p>
          </div>
        </div>
      </div>
    </div>
  )
}