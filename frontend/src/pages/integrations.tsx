import { useState } from 'react'
import { Zap, Key, Webhook, Copy, Check, Trash2, Settings, Plus } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'

interface Integration {
  id: string
  name: string
  type: 'webhook' | 'api' | 'oauth'
  status: 'active' | 'inactive'
  lastUsed: string
  icon: string
}

export default function Integrations() {
  const [activeTab, setActiveTab] = useState('webhooks')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const webhooks: Integration[] = [
    {
      id: 'wh_123456',
      name: 'Webhook de Conversas',
      type: 'webhook',
      status: 'active',
      lastUsed: '2 horas atrás',
      icon: '🔔',
    },
    {
      id: 'wh_789012',
      name: 'Webhook de Mensagens',
      type: 'webhook',
      status: 'active',
      lastUsed: '30 minutos atrás',
      icon: '💬',
    },
  ]

  const apiKeys: Integration[] = [
    {
      id: 'key_api_001',
      name: 'API Key Produção',
      type: 'api',
      status: 'active',
      lastUsed: '5 minutos atrás',
      icon: '🔑',
    },
  ]

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title flex items-center gap-3">
              <Zap className="w-8 h-8 text-primary" />
              Integrações
            </h1>
            <p className="section-subtitle">Conecte ferramentas externas e gerencie chaves de API</p>
          </div>
          <Button className="btn-primary gap-2">
            <Plus className="w-5 h-5" />
            Nova Integração
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'webhooks', label: 'Webhooks', icon: Webhook },
            { id: 'api', label: 'Chaves de API', icon: Key },
            { id: 'oauth', label: 'OAuth & Conexões', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-secondary/20 text-foreground hover:bg-secondary/30'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Webhooks Tab */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="card-interactive">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-3xl">{webhook.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{webhook.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          URL: https://api.exemplo.com/webhooks/{webhook.id}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="badge-success">{webhook.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                          <p className="text-xs text-muted-foreground">Último uso: {webhook.lastUsed}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(`https://api.exemplo.com/webhooks/${webhook.id}`, webhook.id)}
                        className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
                      >
                        {copiedId === webhook.id ? (
                          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      <button className="p-2 hover:bg-secondary/50 rounded-lg transition-colors">
                        <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button className="p-2 hover:bg-secondary/50 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              {apiKeys.map((key) => (
                <div key={key.id} className="card-interactive">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-3xl">{key.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{key.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">
                          {key.value?.substring(0, 8)}...{key.value?.slice(-4) || 'hidden'}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="badge-success">Ativa</span>
                          <p className="text-xs text-muted-foreground">Último uso: {key.lastUsed}</p>
                          <p className="text-xs text-muted-foreground">Criada em: 15/01/2024</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(key.value || '', key.id)}
                        className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
                      >
                        {copiedId === key.id ? (
                          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      <button className="p-2 hover:bg-secondary/50 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <Button className="btn-primary gap-2 w-full">
                <Plus className="w-5 h-5" />
                Gerar Nova Chave de API
              </Button>
            </div>
          )}

          {/* OAuth Tab */}
          {activeTab === 'oauth' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { name: 'Google', icon: '🔵', status: 'connected' },
                  { name: 'GitHub', icon: '⬛', status: 'not_connected' },
                  { name: 'Slack', icon: '🟣', status: 'connected' },
                  { name: 'Microsoft', icon: '🟦', status: 'not_connected' },
                ].map((service) => (
                  <div key={service.name} className="card-interactive">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{service.icon}</span>
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {service.status === 'connected' ? 'Conectado' : 'Não conectado'}
                          </p>
                        </div>
                      </div>
                      <Button className={service.status === 'connected' ? 'btn-secondary' : 'btn-primary'}>
                        {service.status === 'connected' ? 'Desconectar' : 'Conectar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Documentation */}
        <div className="card-interactive mt-8">
          <h3 className="font-semibold mb-4">📚 Documentação da API</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Acesse a documentação completa da API para integrar com suas aplicações
          </p>
          <div className="flex gap-3">
            <Button className="btn-primary">Ver Documentação</Button>
            <Button className="btn-secondary">Baixar Postman Collection</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
