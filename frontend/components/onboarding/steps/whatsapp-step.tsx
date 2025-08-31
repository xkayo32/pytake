'use client'

import { useState } from 'react'
import { MessageSquare, QrCode, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { WhatsAppConfig } from '@/lib/hooks/useOnboarding'

interface WhatsAppStepProps {
  data?: WhatsAppConfig
  onComplete: (data: WhatsAppConfig) => void
  onNext: () => void
  onPrevious: () => void
}

export function WhatsAppStep({ data, onComplete, onNext, onPrevious }: WhatsAppStepProps) {
  const [formData, setFormData] = useState<WhatsAppConfig>({
    instanceName: data?.instanceName || '',
    webhookUrl: data?.webhookUrl || '',
    enableMediaDownload: data?.enableMediaDownload ?? true,
    autoReconnect: data?.autoReconnect ?? true
  })

  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [qrCode, setQrCode] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.instanceName.trim()) {
      newErrors.instanceName = 'Nome da instância é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleConnect = async () => {
    if (!validate()) return

    setConnectionStatus('connecting')
    setQrCode('')
    
    try {
      // Simulate QR code generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock QR code (in real implementation, this would come from WhatsApp API)
      const mockQrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      setQrCode(mockQrCode)
      
      // Simulate connection after QR scan
      await new Promise(resolve => setTimeout(resolve, 8000))
      setConnectionStatus('connected')
      
    } catch (error) {
      setConnectionStatus('error')
    }
  }

  const handleComplete = () => {
    if (connectionStatus === 'connected') {
      onComplete(formData)
      onNext()
    }
  }

  const handleSkip = () => {
    onComplete({
      ...formData,
      instanceName: formData.instanceName || 'Default Instance'
    })
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
        </div>
        <p className="text-muted-foreground">
          Conecte seu WhatsApp Business para começar a automatizar o atendimento
        </p>
      </div>

      <div className="grid gap-6">
        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações da Instância</CardTitle>
            <CardDescription>
              Configure sua instância do WhatsApp Business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instanceName">Nome da Instância *</Label>
              <Input
                id="instanceName"
                placeholder="Ex: Atendimento Principal"
                value={formData.instanceName}
                onChange={(e) => setFormData(prev => ({ ...prev, instanceName: e.target.value }))}
                className={errors.instanceName ? 'border-red-500' : ''}
                disabled={connectionStatus === 'connecting'}
              />
              {errors.instanceName && <p className="text-sm text-red-600">{errors.instanceName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL (Opcional)</Label>
              <Input
                id="webhookUrl"
                placeholder="https://sua-url.com/webhook"
                value={formData.webhookUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                disabled={connectionStatus === 'connecting'}
              />
              <p className="text-xs text-muted-foreground">
                URL para receber notificações de mensagens (pode configurar depois)
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mediaDownload">Download de Mídias</Label>
                  <p className="text-sm text-muted-foreground">
                    Fazer download automático de imagens e documentos
                  </p>
                </div>
                <Switch
                  id="mediaDownload"
                  checked={formData.enableMediaDownload}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, enableMediaDownload: checked }))
                  }
                  disabled={connectionStatus === 'connecting'}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoReconnect">Reconexão Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Reconectar automaticamente em caso de desconexão
                  </p>
                </div>
                <Switch
                  id="autoReconnect"
                  checked={formData.autoReconnect}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, autoReconnect: checked }))
                  }
                  disabled={connectionStatus === 'connecting'}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Conectar WhatsApp
            </CardTitle>
            <CardDescription>
              Escaneie o código QR com seu WhatsApp Business
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectionStatus === 'idle' && (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  Clique no botão abaixo para gerar o código QR
                </p>
                <Button onClick={handleConnect} disabled={!formData.instanceName.trim()}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Gerar Código QR
                </Button>
              </div>
            )}

            {connectionStatus === 'connecting' && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="font-medium mb-2">Gerando código QR...</p>
                <p className="text-sm text-muted-foreground">
                  Aguarde enquanto conectamos com o WhatsApp
                </p>
              </div>
            )}

            {qrCode && connectionStatus !== 'connected' && (
              <div className="text-center py-4">
                <div className="w-48 h-48 mx-auto mb-4 border rounded-lg flex items-center justify-center bg-white">
                  <QrCode className="h-24 w-24 text-muted-foreground" />
                  {/* In real implementation, display actual QR code */}
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Como escanear:</strong><br />
                    1. Abra o WhatsApp Business no seu celular<br />
                    2. Vá em Configurações → WhatsApp Web<br />
                    3. Escaneie este código QR
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {connectionStatus === 'connected' && (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="font-medium text-green-600 mb-2">
                  ✅ WhatsApp conectado com sucesso!
                </p>
                <p className="text-sm text-muted-foreground">
                  Sua instância "{formData.instanceName}" está pronta para usar
                </p>
              </div>
            )}

            {connectionStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Erro ao conectar com o WhatsApp. Tente novamente ou entre em contato com o suporte.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">
            📱 Requisitos do WhatsApp Business
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Tenha o WhatsApp Business instalado no seu celular</li>
            <li>• Certifique-se de que está conectado à internet</li>
            <li>• Use o mesmo número que quer automatizar</li>
            <li>• Mantenha o WhatsApp aberto durante a conexão</li>
          </ul>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious}>
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Pular por Agora
          </Button>
          <Button 
            onClick={handleComplete} 
            disabled={connectionStatus !== 'connected'}
          >
            {connectionStatus === 'connected' ? 'Continuar' : 'Conecte o WhatsApp'}
          </Button>
        </div>
      </div>
    </div>
  )
}