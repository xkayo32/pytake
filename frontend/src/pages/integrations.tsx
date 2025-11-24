import { useEffect, useState } from 'react'
import { Zap, AlertCircle, CheckCircle, Plus, Trash2, Eye, EyeOff, Copy } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { getApiUrl, getAuthHeaders } from '@lib/api'

interface Integration {
  id: string
  name: string
  type: string
  status: 'connected' | 'disconnected' | 'pending' | 'error'
  created_at: string
  config?: Record<string, any>
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ type: 'webhook', name: '', url: '', token: '' })
  const [submitting, setSubmitting] = useState(false)
  const [showToken, setShowToken] = useState(false)

  // Fetch integrations
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${getApiUrl()}/api/v1/integrations`, {
          headers: getAuthHeaders(),
        })
        if (!response.ok) throw new Error('Falha ao carregar integrações')
        const data = await response.json()
        setIntegrations(data.data || data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar integrações')
      } finally {
        setLoading(false)
      }
    }

    fetchIntegrations()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.url) {
      setError('Nome e URL são obrigatórios')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`${getApiUrl()}/api/v1/integrations`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Erro ao adicionar integração')

      const newIntegration = await response.json()
      setIntegrations([...integrations, newIntegration])
      setShowForm(false)
      setFormData({ type: 'webhook', name: '', url: '', token: '' })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar integração')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (integrationId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar esta integração?')) return

    try {
      const response = await fetch(`${getApiUrl()}/api/v1/integrations/${integrationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) throw new Error('Erro ao deletar integração')

      setIntegrations(integrations.filter(i => i.id !== integrationId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar integração')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      connected: { label: 'Conectado', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
      disconnected: { label: 'Desconectado', color: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300' },
      pending: { label: 'Pendente', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' },
      error: { label: 'Erro', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
    }
    const config = statusConfig[status as keyof typeof statusConfig]
    return <Badge className={config?.color}>{config?.label}</Badge>
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Zap className="w-8 h-8" />
            Integrações
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Conecte ferramentas externas e configure webhooks
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Integração
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-8 bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Nova Integração
          </h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="webhook">Webhook</option>
                  <option value="api">API Externa</option>
                  <option value="crm">CRM</option>
                  <option value="analytics">Analytics</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="Ex: Webhook Salesforce"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="https://exemplo.com/webhook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Token (opcional)
              </label>
              <input
                type="password"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Token de autenticação"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting ? 'Adicionando...' : 'Adicionar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Integrations Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-56 bg-white dark:bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : integrations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                    {integration.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {integration.type}
                  </p>
                </div>
                {getStatusBadge(integration.status)}
              </div>

              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">URL</p>
                <p className="text-sm font-mono text-slate-900 dark:text-white break-all truncate">
                  {integration.url}
                </p>
              </div>

              {integration.config?.token && (
                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Token</p>
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-slate-900 dark:text-white flex-1 truncate">
                      {showToken ? integration.config.token : '••••••••••••••••'}
                    </p>
                    <button
                      onClick={() => copyToClipboard(integration.config.token)}
                      className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4">
                <span>Criado em {new Date(integration.created_at).toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="flex gap-2">
                {integration.status === 'error' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    Reconectar
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(integration.id)}
                  className="flex-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Deletar
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <Zap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Nenhuma integração configurada
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
            Comece adicionando uma nova integração
          </p>
        </div>
      )}

      {/* Integration Guide */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Como usar integrações
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• <strong>Webhook:</strong> Envie dados para URLs externas em tempo real</li>
          <li>• <strong>API:</strong> Integre com serviços externos e receba dados</li>
          <li>• <strong>CRM:</strong> Sincronize contatos com seu CRM preferido</li>
          <li>• <strong>Analytics:</strong> Envie métricas para ferramentas de análise</li>
        </ul>
      </div>
    </div>
  )
}
