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
  flowName?: string
}

export function FlowTestPanel({ 
  open, 
  onClose, 
  flowId, 
  flowStatus, 
  whatsappNumbers = [],
  flowName = 'Flow'
}: FlowTestPanelProps) {
  const router = useRouter()
  const [testMode, setTestMode] = useState<'quick' | 'full'>('quick')
  const [recipientNumber, setRecipientNumber] = useState('')
  const [selectedWhatsApp, setSelectedWhatsApp] = useState(whatsappNumbers[0] || '')
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  useEffect(() => {
    if (whatsappNumbers.length > 0 && !selectedWhatsApp) {
      setSelectedWhatsApp(whatsappNumbers[0])
    }
  }, [whatsappNumbers, selectedWhatsApp])

  const validateNumber = (number: string) => {
    // Remove espaços e caracteres especiais
    const cleaned = number.replace(/\D/g, '')
    
    // Verifica se tem o formato brasileiro com DDD
    if (cleaned.length < 10) {
      return { valid: false, error: 'Número muito curto' }
    }
    
    if (cleaned.length > 13) {
      return { valid: false, error: 'Número muito longo' }
    }
    
    // Se não tem código do país, adiciona +55
    if (!cleaned.startsWith('55') && cleaned.length <= 11) {
      return { valid: true, formatted: `+55${cleaned}` }
    }
    
    return { valid: true, formatted: `+${cleaned}` }
  }

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
      // Aqui faria a chamada para executar o flow real
      const response = await fetch(`/api/v1/flows/${flowId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: validation.formatted,
          whatsappNumber: selectedWhatsApp,
          testMode: false
        })
      })

      if (response.ok) {
        // Sucesso - abre página de acompanhamento
        router.push(`/flows/${flowId}/test?number=${validation.formatted}`)
        onClose()
      } else {
        const error = await response.text()
        setValidationError(`Erro ao iniciar teste: ${error}`)
      }
    } catch (error) {
      setValidationError('Erro ao conectar com o servidor')
    } finally {
      setIsExecuting(false)
    }
  }

  const canUseRealTest = flowStatus === 'active' && whatsappNumbers.length > 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
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
                    <Smartphone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Teste Rápido (Simulado)</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Simula o flow localmente sem enviar mensagens reais
                    </p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Disponível sempre
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
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">Teste Real (WhatsApp)</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Envia mensagens reais via WhatsApp para um número
                    </p>
                    {canUseRealTest ? (
                      <Badge className="mt-2 text-xs bg-green-500 text-white">
                        Disponível
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {flowStatus !== 'active' ? 'Flow precisa estar ativo' : 'Configure WhatsApp'}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configurações do Teste Real */}
          {testMode === 'full' && canUseRealTest && (
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-2">
                <Label>WhatsApp de Origem</Label>
                <select 
                  className="w-full p-2 border rounded-md text-sm"
                  value={selectedWhatsApp}
                  onChange={(e) => setSelectedWhatsApp(e.target.value)}
                >
                  {whatsappNumbers.map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Número do Destinatário</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: 11999999999"
                    value={recipientNumber}
                    onChange={(e) => {
                      setRecipientNumber(e.target.value)
                      setValidationError(null)
                    }}
                    className={validationError ? 'border-red-500' : ''}
                  />
                </div>
                {validationError && (
                  <p className="text-xs text-red-500">{validationError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Digite o número que receberá as mensagens de teste
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
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
                  Iniciando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar Teste Real
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}