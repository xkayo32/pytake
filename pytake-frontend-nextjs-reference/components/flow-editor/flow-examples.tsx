import { FC } from 'react'
import { 
  MessageCircle, 
  List, 
  MousePointer,
  GitBranch,
  User,
  Bot,
  Send,
  CreditCard,
  FileText,
  ChevronRight
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const FlowExamples: FC = () => {
  return (
    <div className="space-y-8 p-6">
      {/* Example 1: Template to Flow */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Template → Flow
        </h3>
        
        <div className="space-y-4">
          {/* Template Message */}
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <div className="bg-green-500 text-white p-2 rounded-full">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Template Enviado:</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Olá! 🎉 Temos uma oferta especial para você. Gostaria de saber mais?
                </p>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-white dark:bg-slate-800 border rounded-full text-xs hover:bg-gray-50 dark:hover:bg-slate-700">
                    Ver Ofertas →
                  </button>
                  <button className="px-3 py-1 bg-white dark:bg-slate-800 border rounded-full text-xs hover:bg-gray-50 dark:hover:bg-slate-700">
                    Falar com Vendedor
                  </button>
                  <button className="px-3 py-1 bg-white dark:bg-slate-800 border rounded-full text-xs hover:bg-gray-50 dark:hover:bg-slate-700">
                    Não tenho interesse
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Flow Triggered */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
            <span>Usuário clica "Ver Ofertas"</span>
            <ChevronRight className="h-4 w-4" />
            <Badge variant="secondary">Inicia Flow: offer_flow</Badge>
          </div>

          {/* Flow Execution */}
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium mb-2">Flow Executando:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs">Node: show_categories</span>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded p-3">
                <p className="text-xs font-semibold mb-2">📱 Lista Interativa:</p>
                <div className="space-y-1">
                  <div className="text-xs p-2 bg-gray-50 dark:bg-slate-800 rounded hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer">
                    📱 Eletrônicos - Até 40% OFF
                  </div>
                  <div className="text-xs p-2 bg-gray-50 dark:bg-slate-800 rounded hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer">
                    👕 Moda - Até 60% OFF
                  </div>
                  <div className="text-xs p-2 bg-gray-50 dark:bg-slate-800 rounded hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer">
                    🏠 Casa e Decoração - Até 50% OFF
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Example 2: Message to Menu */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-purple-500" />
          Mensagem → Menu Interativo
        </h3>
        
        <div className="space-y-4">
          {/* User Message */}
          <div className="bg-gray-50 dark:bg-gray-950/20 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-500 mt-1" />
              <div>
                <p className="text-sm font-medium mb-1">Usuário:</p>
                <p className="text-sm">Oi, preciso de ajuda</p>
              </div>
            </div>
          </div>

          {/* Bot Response with Menu */}
          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <Bot className="h-5 w-5 text-purple-500 mt-1" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">PyTake Assistant:</p>
                <p className="text-sm mb-3">
                  Olá! Sou o assistente virtual da PyTake. Como posso ajudar você hoje?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button className="p-2 bg-white dark:bg-slate-800 border rounded text-xs hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center gap-1">
                    🛠️ Suporte
                  </button>
                  <button className="p-2 bg-white dark:bg-slate-800 border rounded text-xs hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center gap-1">
                    💰 Vendas
                  </button>
                  <button className="p-2 bg-white dark:bg-slate-800 border rounded text-xs hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center gap-1">
                    📄 Financeiro
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Example 3: Contextual Flow */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-orange-500" />
          Flow Contextual com Decisões
        </h3>
        
        <div className="space-y-4">
          {/* Context Check */}
          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <p className="text-sm font-medium mb-3">Sistema verifica contexto do usuário:</p>
            
            <div className="space-y-3">
              {/* Condition 1 */}
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
                  <span className="text-white text-[10px]">✓</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">Tem chamado aberto</p>
                  <div className="mt-1 p-2 bg-white dark:bg-slate-900 rounded text-xs">
                    <p className="mb-2">Você tem um chamado em aberto. O que deseja fazer?</p>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px]">Ver Status</Badge>
                      <Badge variant="outline" className="text-[10px]">Adicionar Info</Badge>
                      <Badge variant="outline" className="text-[10px]">Falar com Agente</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Condition 2 */}
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center mt-0.5">
                  <span className="text-white text-[10px]">✓</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">Tem pagamento pendente</p>
                  <div className="mt-1 p-2 bg-white dark:bg-slate-900 rounded text-xs">
                    <p className="mb-2">Você tem uma fatura pendente de R$ 150,00</p>
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        <CreditCard className="h-3 w-3 mr-1" />
                        Pagar Agora
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">Ver Detalhes</Badge>
                      <Badge variant="outline" className="text-[10px]">Negociar</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Example 4: Multi-step Form */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyan-500" />
          Formulário Multi-etapas
        </h3>
        
        <div className="space-y-3">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs">
              1
            </div>
            <div className="flex-1">
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                <p className="text-xs text-muted-foreground mb-1">Bot:</p>
                <p className="text-sm">Por favor, digite seu nome completo:</p>
              </div>
              <div className="mt-2 bg-blue-50 dark:bg-blue-950/20 rounded p-3">
                <p className="text-xs text-muted-foreground mb-1">Usuário:</p>
                <p className="text-sm">João Silva</p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center text-xs">
              2
            </div>
            <div className="flex-1">
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                <p className="text-xs text-muted-foreground mb-1">Bot:</p>
                <p className="text-sm">Agora, digite seu CPF (apenas números):</p>
              </div>
              <div className="mt-2 bg-blue-50 dark:bg-blue-950/20 rounded p-3">
                <p className="text-xs text-muted-foreground mb-1">Usuário:</p>
                <p className="text-sm">12345678900</p>
              </div>
            </div>
          </div>

          {/* Confirmation */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">
              ✓
            </div>
            <div className="flex-1">
              <div className="bg-green-50 dark:bg-green-950/20 rounded p-3 border border-green-200 dark:border-green-800">
                <p className="text-xs font-medium mb-2">Confirme seus dados:</p>
                <div className="text-xs space-y-1 mb-3">
                  <p>📝 Nome: João Silva</p>
                  <p>📄 CPF: 123.456.789-00</p>
                  <p>✉️ Email: joao@email.com</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 bg-green-500 text-white rounded text-xs">
                    ✅ Confirmar
                  </button>
                  <button className="px-2 py-1 bg-gray-500 text-white rounded text-xs">
                    ✏️ Corrigir
                  </button>
                  <button className="px-2 py-1 bg-red-500 text-white rounded text-xs">
                    ❌ Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}