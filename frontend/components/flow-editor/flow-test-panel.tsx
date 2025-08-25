'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Phone, 
  Play,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
  Send,
  User,
  Smartphone,
  TestTube,
  ExternalLink
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface FlowTestPanelProps {
  open: boolean
  onClose: () => void
  flowId: string
  flowStatus: 'draft' | 'active' | 'inactive'
  whatsappNumbers?: string[]
  whatsappConfigs?: any[]
  flowName?: string
}

export function FlowTestPanel({ 
  open, 
  onClose, 
  flowId, 
  flowStatus, 
  whatsappNumbers = [],
  whatsappConfigs = [],
  flowName = 'Flow'
}: FlowTestPanelProps) {
  const router = useRouter()
  const [testMode, setTestMode] = useState<'quick' | 'full'>('quick')
  const [recipientNumber, setRecipientNumber] = useState('')
  const [selectedWhatsApp, setSelectedWhatsApp] = useState(whatsappNumbers[0] || '')
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [windowStatus, setWindowStatus] = useState<any>(null)
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [checkingWindow, setCheckingWindow] = useState(false)

  useEffect(() => {
    console.log('🎯 FlowTestPanel - Status:', flowStatus)
    console.log('🎯 FlowTestPanel - WhatsApp Configs:', whatsappConfigs)
    console.log('🎯 FlowTestPanel - Can use real test:', flowStatus === 'active' && whatsappConfigs.length > 0)
  }, [flowStatus, whatsappConfigs])

  useEffect(() => {
    if (whatsappConfigs.length > 0 && !selectedWhatsApp) {
      setSelectedWhatsApp(whatsappConfigs[0].id)
    }
  }, [whatsappConfigs, selectedWhatsApp])

  const validateNumber = (number: string) => {
    // Remove espaços e caracteres especiais
    const cleaned = number.replace(/\D/g, '')
    
    // Verifica se tem o formato brasileiro com DDD
    if (cleaned.length < 10) {
      return { valid: false, error: 'Número muito curto (mínimo 10 dígitos)' }
    }
    
    if (cleaned.length > 15) {
      return { valid: false, error: 'Número muito longo (máximo 15 dígitos)' }
    }
    
    // Se não tem código do país, adiciona +55 (Brasil)
    if (!cleaned.startsWith('55') && cleaned.length <= 11) {
      return { valid: true, formatted: `55${cleaned}` }
    }
    
    // Se já tem código do país, mantém como está
    return { valid: true, formatted: cleaned }
  }

  const checkConversationWindow = async (phoneNumber: string) => {
    const validation = validateNumber(phoneNumber)
    if (!validation.valid) {
      return
    }
    
    setCheckingWindow(true)
    try {
      const response = await fetch(`/api/v1/flows/window-status?phone=${validation.formatted}`)
      if (response.ok) {
        const data = await response.json()
        setWindowStatus(data)
        console.log('📱 Window status:', data)
        
        // Se não tem janela, carrega templates
        if (!data.has_window) {
          loadAvailableTemplates()
        }
      }
    } catch (error) {
      console.error('Error checking window:', error)
    } finally {
      setCheckingWindow(false)
    }
  }

  const loadAvailableTemplates = async () => {
    try {
      const response = await fetch('/api/v1/flows/templates')
      if (response.ok) {
        const data = await response.json()
        setAvailableTemplates(data.templates || [])
        if (data.templates && data.templates.length > 0) {
          setSelectedTemplate(data.templates[0].name)
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  // Check window when number changes
  useEffect(() => {
    if (recipientNumber && recipientNumber.length >= 10) {
      const timer = setTimeout(() => {
        checkConversationWindow(recipientNumber)
      }, 500) // Debounce
      return () => clearTimeout(timer)
    }
  }, [recipientNumber])

  const handleQuickTest = () => {
    // Abre a página de teste completa
    router.push(`/flows/${flowId}/test`)
    onClose()
  }

  const handleFullTest = async () => {
    if (!recipientNumber) {
      setValidationError('Digite o número do destinatário')
      return
    }

    const validation = validateNumber(recipientNumber)
    if (!validation.valid) {
      setValidationError(validation.error || 'Número inválido')
      return
    }

    setIsExecuting(true)
    setValidationError(null)

    try {
      const response = await fetch(`/api/v1/flows/${flowId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: validation.formatted,
          config_id: selectedWhatsApp,
          test_message: `🤖 Teste do flow "${flowName}" enviado via PyTake!\n\nEste é um teste para verificar se seu número WhatsApp está recebendo as mensagens corretamente.\n\nSe você recebeu esta mensagem, o sistema está funcionando! 🎉`
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('🎯 Test result:', result)
        
        // Mostrar resultado detalhado
        setTestResult(result)
        setValidationError(null)
        setShowLogs(true)
      } else {
        const errorData = await response.json()
        setValidationError(`Erro ao enviar teste: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      setValidationError('Erro ao conectar com o servidor')
    } finally {
      setIsExecuting(false)
    }
  }

  const canUseRealTest = flowStatus === 'active' && whatsappConfigs.length > 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Testar Flow
          </DialogTitle>
          <DialogDescription>
            {flowName} - {flowStatus === 'active' ? 'Ativo' : 'Rascunho'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Modo de Teste */}
          <div className="space-y-3">
            <Label>Modo de Teste</Label>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Teste Rápido (Mock) */}
              <Card 
                className={cn(
                  "cursor-pointer transition-all",
                  testMode === 'quick' && "ring-2 ring-primary"
                )}
                onClick={() => setTestMode('quick')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Smartphone className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Teste Simulado</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Simula localmente
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Sempre disponível
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Teste Real */}
              <Card 
                className={cn(
                  "cursor-pointer transition-all",
                  !canUseRealTest && "opacity-50 cursor-not-allowed",
                  testMode === 'full' && canUseRealTest && "ring-2 ring-primary"
                )}
                onClick={() => canUseRealTest && setTestMode('full')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Teste Real</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Envia via WhatsApp
                      </p>
                      {canUseRealTest ? (
                        <Badge variant="success" className="mt-2 text-xs bg-green-500 text-white">
                          Disponível
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {flowStatus !== 'active' ? 'Ative o flow' : 'Configure WhatsApp'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Configurações do Teste Real */}
          {testMode === 'full' && canUseRealTest && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              <div className="space-y-2">
                <Label className="text-xs">WhatsApp de Origem</Label>
                <select 
                  className="w-full p-2 border rounded-md text-sm"
                  value={selectedWhatsApp}
                  onChange={(e) => setSelectedWhatsApp(e.target.value)}
                >
                  {whatsappConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} {config.is_default ? '(Padrão)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Número que enviará as mensagens
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Número do Destinatário</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                    +55
                  </div>
                  <Input
                    placeholder="11999999999"
                    value={recipientNumber}
                    onChange={(e) => {
                      setRecipientNumber(e.target.value)
                      setValidationError(null)
                    }}
                    className={`pl-12 ${validationError ? 'border-red-500' : ''}`}
                  />
                  {checkingWindow && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {validationError && (
                  <p className="text-xs text-red-500">{validationError}</p>
                )}
                
                {/* Status da Janela */}
                {windowStatus && !checkingWindow && (
                  <div className={cn(
                    "p-2 rounded text-xs",
                    windowStatus.has_window 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                  )}>
                    {windowStatus.has_window ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>Janela aberta ({Math.floor(windowStatus.remaining_hours)}h restantes)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>Sem janela - Template obrigatório</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Seletor de Template quando não há janela */}
          {testMode === 'full' && canUseRealTest && windowStatus && !windowStatus.has_window && (
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Template Obrigatório</span>
              </div>
              
              {availableTemplates.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs">Selecione o Template</Label>
                  <select 
                    className="w-full p-2 border rounded-md text-sm"
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                  >
                    {availableTemplates.map((template) => (
                      <option key={template.id} value={template.name}>
                        {template.name} - {template.body_text.substring(0, 50)}...
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Como não há janela de 24h aberta, um template aprovado será usado
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Nenhum template aprovado encontrado</span>
                  </div>
                  <p className="mt-1">
                    Configure templates aprovados em Configurações → Templates
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resultados do Teste */}
        {testResult && showLogs && (
          <div className="space-y-3 py-3 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Resultado da Execução</h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowLogs(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Resumo */}
              <Card>
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-medium text-muted-foreground">Status:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">Concluído</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Tempo:</span>
                      <div className="mt-1 font-mono">{testResult.execution_time}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Steps:</span>
                      <div className="mt-1">{testResult.steps_executed} executados</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Mensagens:</span>
                      <div className="mt-1">{testResult.messages_sent} enviadas</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md mt-3">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-700">
                      Teste executado com sucesso!
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Logs em tempo real */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3 w-3" />
                  <span className="text-xs font-medium">Logs de Execução</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="ml-auto h-6 text-xs"
                    onClick={async () => {
                      try {
                        const response = await fetch(testResult.tracking_url)
                        if (response.ok) {
                          const logs = await response.json()
                          console.log('📋 Execution logs:', logs)
                        }
                      } catch (error) {
                        console.error('Error fetching logs:', error)
                      }
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Detalhes
                  </Button>
                </div>
                <ScrollArea className="h-28 w-full border rounded-md p-2">
                  <div className="space-y-1 text-xs font-mono">
                    <div className="text-green-600">✓ Flow iniciado para +{testResult.to}</div>
                    <div className="text-blue-600">• Executando {testResult.steps_executed} steps...</div>
                    <div className="text-green-600">✓ {testResult.messages_sent} mensagem(s) enviada(s)</div>
                    <div className="text-green-600">✓ Execução concluída em {testResult.execution_time}</div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {showLogs && testResult ? (
            <>
              <Button variant="outline" onClick={() => {
                setTestResult(null)
                setShowLogs(false)
                setRecipientNumber('')
                setValidationError(null)
              }}>
                Novo Teste
              </Button>
              <Button onClick={onClose}>
                Fechar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              
              {testMode === 'quick' ? (
                <Button onClick={handleQuickTest} className="gap-2">
                  <Play className="h-4 w-4" />
                  Iniciar Teste Simulado
                </Button>
              ) : (
                <Button 
                  onClick={handleFullTest} 
                  disabled={!canUseRealTest || isExecuting}
                  className="gap-2"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Executando Flow...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Executar Flow Completo
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}