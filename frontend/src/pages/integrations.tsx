import { useState } from 'react'
import { Zap, Key, Webhook, Copy, Check, Trash2, Settings, Plus } from 'lucide-react'
import { Button } from '@components/ui/button'

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

  const tabs = [
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'api', label: 'Chaves de API', icon: Key },
    { id: 'oauth', label: 'OAuth & Conexões', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-whatsapp rounded-xl flex items-center justify-center shadow-md">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Integrações</h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">Conecte ferramentas externas e gerencie chaves de API</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Integração
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 animate-fade-in">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Webhooks Tab */}
          {activeTab === 'webhooks' && (
            <div className="space-y-4">
              {webhooks.map((webhook, index) => (
                <div 
                  key={webhook.id} 
                  className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-3xl">{webhook.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-foreground">{webhook.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 font-mono truncate">
                          https://api.exemplo.com/webhooks/{webhook.id}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <span className="badge-success">● Ativo</span>
                          <p className="text-xs text-muted-foreground">Último uso: {webhook.lastUsed}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => copyToClipboard(`https://api.exemplo.com/webhooks/${webhook.id}`, webhook.id)}
                        className="p-2.5 hover:bg-muted rounded-xl transition-colors"
                        title="Copiar URL"
                      >
                        {copiedId === webhook.id ? (
                          <Check className="w-5 h-5 text-primary-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      <button className="p-2.5 hover:bg-muted rounded-xl transition-colors" title="Configurar">
                        <Settings className="w-5 h-5 text-blue-600" />
                      </button>
                      <button className="p-2.5 hover:bg-muted rounded-xl transition-colors" title="Excluir">
                        <Trash2 className="w-5 h-5 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              {apiKeys.map((key, index) => (
                <div 
                  key={key.id} 
                  className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-3xl">{key.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-foreground">{key.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">
                          sk_live_****...****abcd
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <span className="badge-success">● Ativa</span>
                          <p className="text-xs text-muted-foreground">Último uso: {key.lastUsed}</p>
                          <p className="text-xs text-muted-foreground">Criada em: 15/01/2024</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => copyToClipboard('sk_live_example_key', key.id)}
                        className="p-2.5 hover:bg-muted rounded-xl transition-colors"
                        title="Copiar chave"
                      >
                        {copiedId === key.id ? (
                          <Check className="w-5 h-5 text-primary-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      <button className="p-2.5 hover:bg-muted rounded-xl transition-colors" title="Excluir">
                        <Trash2 className="w-5 h-5 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <Button className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Gerar Nova Chave de API
              </Button>
            </div>
          )}

          {/* OAuth Tab */}
          {activeTab === 'oauth' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
              {[
                { name: 'Google', icon: '🔵', status: 'connected' },
                { name: 'GitHub', icon: '⬛', status: 'not_connected' },
                { name: 'Slack', icon: '🟣', status: 'connected' },
                { name: 'Microsoft', icon: '🟦', status: 'not_connected' },
              ].map((service, index) => (
                <div 
                  key={service.name} 
                  className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{service.icon}</span>
                      <div>
                        <h3 className="font-semibold text-foreground">{service.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {service.status === 'connected' ? '✓ Conectado' : '○ Não conectado'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant={service.status === 'connected' ? 'secondary' : 'primary'}
                      size="sm"
                    >
                      {service.status === 'connected' ? 'Desconectar' : 'Conectar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documentation */}
        <div className="bg-card border border-border rounded-xl p-6 mt-8 animate-fade-in">
          <h3 className="font-semibold mb-3 text-foreground flex items-center gap-2">
            📚 Documentação da API
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Acesse a documentação completa da API para integrar com suas aplicações
          </p>
          <div className="flex flex-wrap gap-3">
            <Button>Ver Documentação</Button>
            <Button variant="secondary">Baixar Postman Collection</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
