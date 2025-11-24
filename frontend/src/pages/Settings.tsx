import { useEffect, useState } from 'react'
import { User, Lock, Bell, CreditCard, Shield, LogOut, ChevronRight, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { getApiUrl, getAuthHeaders } from '@lib/api'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '+55 11 99999-9999',
    company: 'Minha Empresa'
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(
          `${getApiUrl()}/api/v1/users/me/profile`,
          { headers: getAuthHeaders() }
        )
        if (response.ok) {
          const data = await response.json()
          setFormData({
            name: data.full_name || formData.name,
            email: data.email || formData.email,
            phone: data.phone_number || formData.phone,
            company: data.company || formData.company
          })
        }
      } catch (err) {
        console.error('Erro ao carregar preferências:', err)
      }
    }

    fetchSettings()
  }, [])

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'billing', label: 'Faturamento', icon: CreditCard }
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/users/me/profile`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            full_name: formData.name,
            phone_number: formData.phone,
            company: formData.company
          })
        }
      )

      if (!response.ok) throw new Error('Erro ao salvar perfil')
      
      setSuccess('Perfil salvo com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          Configurações
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Gerencie sua conta e preferências
        </p>
      </div>

      <div className="max-w-4xl">
        {/* Tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-4 border-b border-slate-200 dark:border-slate-700">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Foto de Perfil
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                  JS
                </div>
                <Button variant="outline">Mudar Foto</Button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-slate-900 dark:text-white">
                  Nome Completo
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="mt-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-900 dark:text-white">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="mt-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-slate-900 dark:text-white">
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="mt-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="company" className="text-sm font-medium text-slate-900 dark:text-white">
                  Empresa
                </Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="mt-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              {error && (
                <div className="w-full flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              {success && (
                <div className="w-full flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded text-green-700 dark:text-green-300">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{success}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSaveProfile}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button variant="outline">Cancelar</Button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Alterar Senha
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword" className="text-sm font-medium text-slate-900 dark:text-white">
                    Senha Atual
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="••••••••"
                    className="mt-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label htmlFor="newPassword" className="text-sm font-medium text-slate-900 dark:text-white">
                    Nova Senha
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    className="mt-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-900 dark:text-white">
                    Confirmar Nova Senha
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="mt-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  />
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Atualizar Senha
                </Button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Autenticação de Dois Fatores
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Adicione uma camada extra de segurança à sua conta
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Ativar 2FA
              </Button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 space-y-6">
            <div className="space-y-4">
              {[
                { id: 'email', label: 'Notificações por Email', description: 'Receba atualizações por email' },
                { id: 'sms', label: 'Notificações por SMS', description: 'Receba alertas críticos por SMS' },
                { id: 'push', label: 'Notificações Push', description: 'Notificações em tempo real no navegador' },
                { id: 'weekly', label: 'Relatório Semanal', description: 'Resumo semanal de atividades' }
              ].map((notif) => (
                <div key={notif.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{notif.label}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{notif.description}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Plano Atual
              </h3>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Professional</p>
                  <p className="text-slate-600 dark:text-slate-400">R$ 99/mês</p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <li>✓ Até 10,000 mensagens/mês</li>
                    <li>✓ Suporte prioritário</li>
                    <li>✓ Analytics completo</li>
                  </ul>
                </div>
                <Button variant="outline">Alterar Plano</Button>
              </div>
            </div>

            {/* Billing History */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Histórico de Faturas
              </h3>
              <div className="space-y-3">
                {[
                  { date: '15 Jan 2025', amount: 'R$ 99.00', status: 'Pago' },
                  { date: '15 Dez 2024', amount: 'R$ 99.00', status: 'Pago' },
                  { date: '15 Nov 2024', amount: 'R$ 99.00', status: 'Pago' }
                ].map((invoice, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{invoice.date}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{invoice.amount}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-green-600">✓ {invoice.status}</span>
                      <button className="text-slate-400 hover:text-slate-600">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="mt-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-4">Zona de Perigo</h3>
          <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
            <LogOut className="w-4 h-4" />
            Sair de Todas as Contas
          </Button>
        </div>
      </div>
    </div>
  )
}
