import { useState } from 'react'
import { Settings, Lock, Bell, Palette, Save, X, User, Shield } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account')
  const [formData, setFormData] = useState({
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

  const tabs = [
    { id: 'account', label: 'Conta', icon: User },
    { id: 'security', label: 'Segurança', icon: Lock },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'appearance', label: 'Aparência', icon: Palette },
  ]

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-whatsapp rounded-xl flex items-center justify-center shadow-md">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Configurações</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">Gerencie suas preferências e configurações de conta</p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8 animate-fade-in">
          {tabs.map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-primary-500" />
                Informações da Conta
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Nome Completo</label>
                  <Input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Email</label>
                  <Input type="email" value={formData.email} disabled className="h-11" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Idioma</label>
                  <select className="w-full h-11 px-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Fuso Horário</label>
                  <select className="w-full h-11 px-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    <option value="America/Sao_Paulo">America/São Paulo (GMT-3)</option>
                    <option value="America/New_York">America/New York (GMT-5)</option>
                    <option value="Europe/London">Europe/London (GMT+0)</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-border flex flex-wrap gap-3">
                <Button>
                  <Save className="w-4 h-4" />
                  Salvar Mudanças
                </Button>
                <Button variant="secondary">
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-500" />
                Segurança
              </h2>

              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Autenticação de Dois Fatores</p>
                      <p className="text-sm text-muted-foreground mt-1">Adicione uma camada extra de segurança</p>
                    </div>
                    <label className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.twoFactor}
                          onChange={(e) => setFormData({ ...formData, twoFactor: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${formData.twoFactor ? 'bg-primary-500' : 'bg-muted'}`}>
                          <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${formData.twoFactor ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${formData.twoFactor ? 'text-primary-600' : 'text-muted-foreground'}`}>
                        {formData.twoFactor ? 'Ativado' : 'Desativado'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Alterar Senha</p>
                      <p className="text-sm text-muted-foreground mt-1">Última alteração: 45 dias atrás</p>
                    </div>
                    <Button variant="secondary" size="sm">Alterar</Button>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Sessões Ativas</p>
                      <p className="text-sm text-muted-foreground mt-1">3 dispositivos conectados</p>
                    </div>
                    <Button variant="secondary" size="sm">Ver Detalhes</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-500" />
                Preferências de Notificações
              </h2>

              <div className="space-y-4">
                {[
                  { key: 'email', label: 'Email', description: 'Receba notificações por email' },
                  { key: 'sms', label: 'SMS', description: 'Receba notificações por SMS' },
                  { key: 'push', label: 'Notificações Push', description: 'Receba notificações no navegador' },
                ].map((notif) => (
                  <div key={notif.key} className="p-4 bg-muted/30 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{notif.label}</p>
                      <p className="text-sm text-muted-foreground">{notif.description}</p>
                    </div>
                    <label className="relative">
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
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${formData.notifications[notif.key as keyof typeof formData.notifications] ? 'bg-primary-500' : 'bg-muted'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${formData.notifications[notif.key as keyof typeof formData.notifications] ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-border">
                <Button>
                  <Save className="w-4 h-4" />
                  Salvar Preferências
                </Button>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary-500" />
                Aparência
              </h2>

              <div>
                <label className="block text-sm font-medium mb-4 text-foreground">Tema</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'light', label: 'Claro', icon: '☀️' },
                    { value: 'dark', label: 'Escuro', icon: '🌙' },
                    { value: 'auto', label: 'Automático', icon: '⚙️' },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => setFormData({ ...formData, theme: theme.value })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.theme === theme.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <p className="text-2xl mb-2">{theme.icon}</p>
                      <p className="font-medium text-sm text-foreground">{theme.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <Button>
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
