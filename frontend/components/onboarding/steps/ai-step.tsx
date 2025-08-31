'use client'

import { useState } from 'react'
import { Bot, Key, TestTube, Sparkles, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import type { AIConfig } from '@/lib/hooks/useOnboarding'

interface AIStepProps {
  data?: AIConfig
  onComplete: (data: AIConfig) => void
  onNext: () => void
  onPrevious: () => void
}

export function AIStep({ data, onComplete, onNext, onPrevious }: AIStepProps) {
  const [formData, setFormData] = useState<AIConfig>({
    provider: data?.provider || 'openai',
    apiKey: data?.apiKey || '',
    model: data?.model || 'gpt-4',
    enableAutoReply: data?.enableAutoReply ?? false,
    responsePersonality: data?.responsePersonality || 'professional'
  })

  const [showApiKey, setShowApiKey] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [testResponse, setTestResponse] = useState('')

  const personalities = [
    {
      value: 'professional',
      label: 'Profissional',
      description: 'Formal, objetivo e respeitoso'
    },
    {
      value: 'friendly',
      label: 'Amigável',
      description: 'Caloroso, acolhedor e prestativo'
    },
    {
      value: 'casual',
      label: 'Casual',
      description: 'Descontraído, direto e informal'
    }
  ]

  const models = {
    openai: [
      { value: 'gpt-4', label: 'GPT-4 (Recomendado)', description: 'Mais inteligente e preciso' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Mais rápido e eficiente' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Mais econômico' }
    ],
    anthropic: [
      { value: 'claude-3', label: 'Claude 3', description: 'Modelo avançado da Anthropic' }
    ],
    local: [
      { value: 'local-model', label: 'Modelo Local', description: 'Modelo executado localmente' }
    ]
  }

  const handleTestConnection = async () => {
    if (!formData.apiKey.trim()) return

    setTestingConnection(true)
    setConnectionStatus('idle')

    try {
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock response based on personality
      const responses = {
        professional: 'Olá! Sou seu assistente de IA da PyTake. Estou aqui para ajudá-lo com suas dúvidas de forma eficiente e profissional.',
        friendly: 'Oi! 😊 Que bom te conhecer! Sou seu novo assistente de IA e estou super animado para ajudar você e seus clientes!',
        casual: 'E aí! Sou a IA da PyTake. Tô aqui pra dar aquela força no atendimento. Qualquer coisa é só chamar!'
      }
      
      setTestResponse(responses[formData.responsePersonality])
      setConnectionStatus('success')
      
    } catch (error) {
      setConnectionStatus('error')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleComplete = () => {
    onComplete(formData)
    onNext()
  }

  const handleSkip = () => {
    onComplete({
      provider: 'openai',
      apiKey: '',
      model: 'gpt-4',
      enableAutoReply: false,
      responsePersonality: 'professional'
    })
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Bot className="h-6 w-6 text-primary" />
          </div>
        </div>
        <p className="text-muted-foreground">
          Configure o assistente de IA para respostas automáticas inteligentes
        </p>
        <Badge variant="secondary" className="mt-2">
          Etapa Opcional
        </Badge>
      </div>

      <div className="grid gap-6">
        {/* Provider Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Provedor de IA</CardTitle>
            <CardDescription>
              Escolha o provedor de inteligência artificial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provedor</Label>
              <Select 
                value={formData.provider} 
                onValueChange={(value: AIConfig['provider']) => 
                  setFormData(prev => ({ ...prev, provider: value, model: models[value][0].value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="local">Modelo Local</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select 
                value={formData.model} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models[formData.provider].map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div>
                        <div className="font-medium">{model.label}</div>
                        <div className="text-xs text-muted-foreground">{model.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5" />
              Configuração da API
            </CardTitle>
            <CardDescription>
              Configure suas credenciais de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">
                Chave da API {formData.provider === 'openai' ? 'OpenAI' : formData.provider}
              </Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  placeholder={formData.provider === 'openai' ? 'sk-...' : 'Sua chave da API'}
                  value={formData.apiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.provider === 'openai' ? 
                  'Obtenha sua chave em: https://platform.openai.com/api-keys' :
                  'Configure sua chave de API do provedor selecionado'
                }
              </p>
            </div>

            {formData.apiKey && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <>
                      <TestTube className="mr-2 h-4 w-4 animate-pulse" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Testar Conexão
                    </>
                  )}
                </Button>

                {connectionStatus === 'success' && (
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Conectado
                  </div>
                )}

                {connectionStatus === 'error' && (
                  <div className="flex items-center text-sm text-red-600">
                    <AlertCircle className="mr-1 h-4 w-4" />
                    Erro na conexão
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personality Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Personalidade do Assistente
            </CardTitle>
            <CardDescription>
              Defina como a IA deve responder aos clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {personalities.map((personality) => (
                <div
                  key={personality.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    formData.responsePersonality === personality.value
                      ? 'bg-primary/5 border-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, responsePersonality: personality.value as AIConfig['responsePersonality'] }))}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{personality.label}</p>
                      <p className="text-sm text-muted-foreground">{personality.description}</p>
                    </div>
                    {formData.responsePersonality === personality.value && (
                      <Badge variant="default">Selecionado</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label htmlFor="autoReply">Respostas Automáticas</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir que a IA responda automaticamente algumas mensagens
                </p>
              </div>
              <Switch
                id="autoReply"
                checked={formData.enableAutoReply}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, enableAutoReply: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Response */}
        {testResponse && connectionStatus === 'success' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Teste de Resposta</CardTitle>
              <CardDescription>
                Veja como a IA responderia com a configuração atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm">{testResponse}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Esta é uma resposta de exemplo baseada na personalidade selecionada
              </p>
            </CardContent>
          </Card>
        )}

        {/* Information */}
        <Alert>
          <Bot className="h-4 w-4" />
          <AlertDescription>
            <strong>Sobre o Assistente de IA:</strong><br />
            • A IA pode responder dúvidas frequentes automaticamente<br />
            • Analisa o sentimento das mensagens para melhor atendimento<br />
            • Aprende com as interações para melhorar as respostas<br />
            • Você sempre pode revisar e editar as configurações
          </AlertDescription>
        </Alert>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious}>
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Pular IA
          </Button>
          <Button onClick={handleComplete}>
            {formData.apiKey && connectionStatus === 'success' ? 'IA Configurada' : 'Continuar'}
          </Button>
        </div>
      </div>
    </div>
  )
}