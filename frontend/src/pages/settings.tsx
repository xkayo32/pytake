import { useEffect, useState } from 'react'
import { Settings, Save, AlertCircle, CheckCircle, Bell, Lock, Globe, Zap } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { getApiUrl, getAuthHeaders } from '@lib/api'

export default function OrganizationSettings() {
  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'notification' | 'security' | 'integrations'>('general')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    phone: '',
    notification_email: '',
    notification_settings: {
      email_on_campaign_complete: true,
      email_on_error: true,
      sms_alerts_enabled: false,
    },
    security_settings: {
      two_factor_auth: false,
      ip_whitelist_enabled: false,
      session_timeout: 30,
    },
  })

  // Fetch org data
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${getApiUrl()}/api/v1/organization`, {
          headers: getAuthHeaders(),
        })
        if (!response.ok) throw new Error('Falha ao carregar configurações')
        const data = await response.json()
        setOrg(data)
        setFormData({
          name: data.name || '',
          description: data.description || '',
          website: data.website || '',
          phone: data.phone || '',
          notification_email: data.notification_email || '',
          notification_settings: data.notification_settings || formData.notification_settings,
          security_settings: data.security_settings || formData.security_settings,
        })
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar configurações')
      } finally {
        setLoading(false)
      }
    }

    fetchOrg()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`${getApiUrl()}/api/v1/organization`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Erro ao salvar configurações')

      const data = await response.json()
      setOrg(data)
      setSuccess('Configurações salvas com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Configurações da Organização
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Gerenciar dados, notificações e segurança da sua organização
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <p className="text-green-800 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Tabs */}
      {!loading && (
        <>
          <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
            {[
              { id: 'general', label: 'Geral', icon: Globe },
              { id: 'notification', label: 'Notificações', icon: Bell },
              { id: 'security', label: 'Segurança', icon: Lock },
              { id: 'integrations', label: 'Integrações', icon: Zap },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`px-4 py-3 font-medium border-b-2 transition flex items-center gap-2 ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 max-w-2xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nome da Organização
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="Descrição da sua organização..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      placeholder="https://exemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      placeholder="(11) 9999-9999"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 mt-4"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          )}

          {/* Notification Tab */}
          {activeTab === 'notification' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 max-w-2xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email para Notificações
                  </label>
                  <input
                    type="email"
                    value={formData.notification_email}
                    onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="notificacoes@exemplo.com"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notification_settings.email_on_campaign_complete}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          notification_settings: {
                            ...formData.notification_settings,
                            email_on_campaign_complete: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Notificar quando campanha for concluída
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notification_settings.email_on_error}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          notification_settings: {
                            ...formData.notification_settings,
                            email_on_error: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Notificar quando houver erros
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notification_settings.sms_alerts_enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          notification_settings: {
                            ...formData.notification_settings,
                            sms_alerts_enabled: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Ativar alertas SMS
                    </span>
                  </label>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 mt-4"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 max-w-2xl">
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Essas configurações de segurança ajudam a proteger sua conta e dados.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.security_settings.two_factor_auth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          security_settings: {
                            ...formData.security_settings,
                            two_factor_auth: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        Autenticação de Dois Fatores
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Requerer código de verificação ao login
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.security_settings.ip_whitelist_enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          security_settings: {
                            ...formData.security_settings,
                            ip_whitelist_enabled: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        Whitelist de IP
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Permitir acesso apenas de IPs específicos
                      </p>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Tempo de Sessão (minutos)
                  </label>
                  <input
                    type="number"
                    value={formData.security_settings.session_timeout}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        security_settings: {
                          ...formData.security_settings,
                          session_timeout: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    min="5"
                    max="480"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Sessão será encerrada após inatividade
                  </p>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 mt-4"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 max-w-2xl">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'WhatsApp API', status: 'connected' },
                    { name: 'Webhook', status: 'configured' },
                    { name: 'Analytics', status: 'active' },
                    { name: 'CRM', status: 'pending' },
                  ].map((integration, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{integration.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                          {integration.status === 'connected' && '✓ Conectado'}
                          {integration.status === 'configured' && '✓ Configurado'}
                          {integration.status === 'active' && '✓ Ativo'}
                          {integration.status === 'pending' && '○ Pendente'}
                        </p>
                      </div>
                      <Badge
                        className={
                          integration.status === 'pending'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        }
                      >
                        {integration.status === 'pending' ? 'Pendente' : 'Ativo'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="h-64 bg-white dark:bg-slate-800 rounded-lg animate-pulse" />
      )}
    </div>
  )
}
