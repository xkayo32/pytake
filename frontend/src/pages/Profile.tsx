import { useEffect, useState } from 'react'
import { useAuth } from '@lib/auth/AuthContext'
import { getApiUrl, getAuthHeaders } from '@lib/api'
import { User, Mail, Phone, Building2, Calendar, Save, AlertCircle, CheckCircle, Upload } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'

export default function Profile() {
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    company: '',
    avatar_url: ''
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(
          `${getApiUrl()}/api/v1/users/me`,
          { headers: getAuthHeaders() }
        )
        if (response.ok) {
          const data = await response.json()
          setFormData({
            full_name: data.full_name || '',
            email: data.email || '',
            phone_number: data.phone_number || '',
            company: data.company || '',
            avatar_url: data.avatar_url || ''
          })
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err)
      }
    }

    fetchProfile()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/users/me`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            full_name: formData.full_name,
            phone_number: formData.phone_number,
            company: formData.company
          })
        }
      )

      if (!response.ok) throw new Error('Erro ao salvar perfil')

      setSuccess('Perfil atualizado com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    const current = prompt('Digite sua senha atual:')
    if (!current) return

    const newPass = prompt('Digite sua nova senha:')
    if (!newPass) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/users/me/password`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            current_password: current,
            new_password: newPass
          })
        }
      )

      if (!response.ok) throw new Error('Erro ao alterar senha')
      setSuccess('Senha alterada com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  const initials = formData.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Meu Perfil
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gerencie suas informações pessoais e preferências
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-green-700 dark:text-green-300">{success}</span>
          </div>
        )}

        {/* Avatar Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Foto de Perfil
          </h2>

          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
              {initials}
            </div>

            <div className="flex-1">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                Clique no botão abaixo para alterar sua foto de perfil
              </p>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Fazer Upload
              </Button>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Informações Pessoais
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="text-sm font-medium text-slate-900 dark:text-white">
                Nome Completo
              </Label>
              <Input
                id="fullName"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="mt-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium text-slate-900 dark:text-white">
                Email (Não é possível alterar)
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                autoComplete="email"
                className="mt-2 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 cursor-not-allowed"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefone
              </Label>
              <Input
                id="phone"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                placeholder="+55 11 99999-9999"
                className="mt-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              />
            </div>

            <div>
              <Label htmlFor="company" className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Empresa
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Sua empresa"
                className="mt-2 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              />
            </div>

            <div className="pt-4 flex gap-2">
              <Button
                onClick={handleSaveProfile}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Segurança
          </h2>

          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Altere sua senha regularmente para manter sua conta segura
            </p>

            <Button
              onClick={handleChangePassword}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Processando...' : 'Alterar Senha'}
            </Button>
          </div>
        </div>

        {/* Logout Button */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={() => {
              if (confirm('Deseja fazer logout?')) {
                logout()
              }
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Fazer Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
