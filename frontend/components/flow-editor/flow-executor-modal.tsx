'use client'

import { useState, useEffect } from 'react'
import { FlowExecutor, FlowExecutionLog } from '@/lib/services/flow-executor'
import { useFlowEditorStore } from '@/lib/stores/flow-editor-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Play, 
  X, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  MessageSquare,
  Clock,
  Zap,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FlowExecutorModalProps {
  open: boolean
  onClose: () => void
  onLogsUpdate?: (logs: FlowExecutionLog[]) => void
}

export function FlowExecutorModal({ open, onClose, onLogsUpdate }: FlowExecutorModalProps) {
  const { nodes, edges, flow } = useFlowEditorStore()
  const [isExecuting, setIsExecuting] = useState(false)
  const [logs, setLogs] = useState<FlowExecutionLog[]>([])
  const [testMode, setTestMode] = useState(true)
  const [recipient, setRecipient] = useState('')
  const [customVariables, setCustomVariables] = useState<Record<string, string>>({
    'contact.name': 'João Silva',
    'contact.phone': '+5511999999999',
    'contact.email': 'joao@exemplo.com',
    'contact.city': 'São Paulo'
  })
  
  if (!open) return null
  
  const handleExecute = async () => {
    setIsExecuting(true)
    setLogs([])
    
    try {
      const executor = new FlowExecutor(nodes, edges)
      
      const result = await executor.execute({
        flowId: flow?.id || 'test',
        nodeId: 'start',
        recipient: recipient || customVariables['contact.phone'],
        testMode,
        variables: customVariables
      })
      
      setLogs(result.logs)
      
      if (onLogsUpdate) {
        onLogsUpdate(result.logs)
      }
      
      if (!result.success && result.error) {
        console.error('Flow execution error:', result.error)
      }
    } catch (error) {
      console.error('Error executing flow:', error)
      setLogs([{
        timestamp: new Date(),
        nodeId: 'error',
        nodeName: 'Sistema',
        status: 'error',
        message: `Erro ao executar flow: ${error}`
      }])
    } finally {
      setIsExecuting(false)
    }
  }
  
  const getStatusIcon = (status: FlowExecutionLog['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'skipped':
        return <Clock className="h-4 w-4 text-gray-400" />
      default:
        return null
    }
  }
  
  const getNodeIcon = (nodeName: string) => {
    if (nodeName.toLowerCase().includes('mensagem') || nodeName.toLowerCase().includes('msg')) {
      return <MessageSquare className="h-4 w-4" />
    }
    if (nodeName.toLowerCase().includes('trigger') || nodeName.toLowerCase().includes('gatilho')) {
      return <Zap className="h-4 w-4" />
    }
    if (nodeName.toLowerCase().includes('delay') || nodeName.toLowerCase().includes('espera')) {
      return <Clock className="h-4 w-4" />
    }
    return <Settings className="h-4 w-4" />
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Executar Flow</h2>
            <Badge variant={testMode ? "secondary" : "default"}>
              {testMode ? 'Modo Teste' : 'Modo Produção'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Settings Panel */}
          <div className="w-1/3 border-r p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Modo de Execução */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Configurações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="test-mode" className="text-sm">
                      Modo Teste
                    </Label>
                    <Switch
                      id="test-mode"
                      checked={testMode}
                      onCheckedChange={setTestMode}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {testMode 
                      ? 'Simula envio de mensagens sem enviar realmente'
                      : 'Envia mensagens reais pelo WhatsApp'}
                  </p>
                </CardContent>
              </Card>
              
              {/* Destinatário */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Destinatário</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="recipient" className="text-sm">
                      <Phone className="h-3 w-3 inline mr-1" />
                      Número WhatsApp
                    </Label>
                    <Input
                      id="recipient"
                      placeholder="+5511999999999"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Deixe vazio para usar variável contact.phone
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Variáveis Customizadas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Variáveis de Teste</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(customVariables).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs font-mono">{`{{${key}}}`}</Label>
                      <Input
                        className="h-8 text-sm"
                        value={value}
                        onChange={(e) => setCustomVariables({
                          ...customVariables,
                          [key]: e.target.value
                        })}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              {/* Botão Executar */}
              <Button
                className="w-full"
                onClick={handleExecute}
                disabled={isExecuting}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Executar Flow
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Logs Panel */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Logs de Execução</h3>
              {logs.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {logs.length} eventos
                </Badge>
              )}
            </div>
            
            <ScrollArea className="flex-1 border rounded-lg p-3">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum log ainda</p>
                  <p className="text-xs mt-1">Execute o flow para ver os logs</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        log.status === 'error' && "bg-red-50 border-red-200",
                        log.status === 'success' && "bg-green-50 border-green-200",
                        log.status === 'running' && "bg-blue-50 border-blue-200",
                        log.status === 'skipped' && "bg-gray-50 border-gray-200"
                      )}
                    >
                      {getStatusIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getNodeIcon(log.nodeName)}
                          <span className="font-medium text-sm">{log.nodeName}</span>
                          <span className="text-xs text-muted-foreground">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        {log.message && (
                          <p className="text-sm text-muted-foreground">{log.message}</p>
                        )}
                        {log.data && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              Ver dados
                            </summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}