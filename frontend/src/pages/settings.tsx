import { useState } from 'react'
import { Settings as SettingsIcon, Lock, Bell, Palette, Shield, Save, X } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('account')
  const formDataState = useState({
    fullName: 'João Silva',
    email: 'joao@empresa.com',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    theme: 'auto',
    twoFactor: true,
  })
  const formData = formDataState[0]
  const setFormData = formDataState[1]

  const tabs = [
    { id: 'account', label: 'Conta', icon: 'User' },
    { id: 'security', label: 'Segurança', icon: 'Lock' },
    { id: 'notifications', label: 'Notificações', icon: 'Bell' },
    { id: 'appearance', label: 'Aparência', icon: 'Palette' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="section-title flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Configurações
          </h1>
          <p className="section-subtitle">Manage your account preferences and settings</p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-secondary/20 text-foreground hover:bg-secondary/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card-interactive">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Informações da Conta</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome Completo</label>
                  <Input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input type="email" value={formData.email} disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Idioma</label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary">
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fuso Horário</label>
                  <select className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary">
                    <option value="America/Sao_Paulo">America/São Paulo (GMT-3)</option>
                    <option value="America/New_York">America/New York (GMT-5)</option>
                    <option value="Europe/London">Europe/London (GMT+0)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex gap-3">
                <Button className="btn-primary">
                  <Save className="w-4 h-4" />
                  Salvar Mudanças
                </Button>
                <Button className="btn-secondary">
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Segurança</h2>

              <div className="space-y-4">
                <div className="p-4 bg-secondary/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Autenticação de Dois Fatores</p>
                      <p className="text-sm text-muted-foreground mt-1">Adicione uma camada extra de segurança</p>
                    </div>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.twoFactor}
                        onChange={(e) => setFormData({ ...formData, twoFactor: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                      <span className={formData.twoFactor ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {formData.twoFactor ? 'Ativado' : 'Desativado'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-secondary/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Alterar Senha</p>
                      <p className="text-sm text-muted-foreground mt-1">Última alteração: 45 dias atrás</p>
                    </div>
                    <Button className="btn-secondary text-sm">Alterar</Button>
                  </div>
                </div>

                <div className="p-4 bg-secondary/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Sessões Ativas</p>
                      <p className="text-sm text-muted-foreground mt-1">3 dispositivos conectados</p>
                    </div>
                    <Button className="btn-secondary text-sm">Ver Detalhes</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Preferências de Notificações</h2>

              <div className="space-y-4">
                {[
                  { key: 'email', label: 'Email', description: 'Receba notificações por email' },
                  { key: 'sms', label: 'SMS', description: 'Receba notificações por SMS' },
                  { key: 'push', label: 'Notificações Push', description: 'Receba notificações no navegador' },
                ].map((notif) => (
                  <div key={notif.key} className="p-4 bg-secondary/20 rounded-lg border border-border flex items-center justify-between">
                    <div>
                      <p className="font-medium">{notif.label}</p>
                      <p className="text-sm text-muted-foreground">{notif.description}</p>
                    </div>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.notifications[notif.key as keyof typeof formData.notifications]}
                        onChange={(e) => setFormData({
                          ...formData,
                          notifications: {
                            ...formData.notifications,
                            [notif.key]: e.target.checked,
                          },
                        })}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border">
                <Button className="btn-primary">
                  <Save className="w-4 h-4" />
                  Salvar Preferências
                </Button>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Aparência</h2>

              <div>
                <label className="block text-sm font-medium mb-4">Tema</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'light', label: 'Claro', icon: '☀️' },
                    { value: 'dark', label: 'Escuro', icon: '🌙' },
                    { value: 'auto', label: 'Automático', icon: '⚙️' },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => setFormData({ ...formData, theme: theme.value })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.theme === theme.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="text-2xl mb-2">{theme.icon}</p>
                      <p className="font-medium text-sm">{theme.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Button className="btn-primary">
                  <Save className="w-4 h-4" />
                  Salvar Aparência
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
