import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Save, X, ArrowLeft, Loader2, AlertCircle, Calendar } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import Link from 'next/link'
import { getApiUrl, getAuthHeaders } from '@lib/api'

interface FormData {
  name: string
  description?: string
  target_type: string
  total_recipients: number
  template_id: string
  scheduled_at?: string
}

const TARGET_TYPES = ['all', 'tags', 'segment', 'contacts']

export default function CampaignForm() {
  const router = useRouter()
  const { id } = router.query
  const isEditMode = !!id

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    target_type: 'all',
    total_recipients: 0,
    template_id: '',
    scheduled_at: ''
  })

  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(
          `${getApiUrl()}/api/v1/whatsapp/templates`,
          { headers: getAuthHeaders() }
        )
        if (!response.ok) throw new Error('Falha ao carregar templates')
        const data = await response.json()
        setTemplates(Array.isArray(data) ? data : data.items || [])
      } catch (err) {
        console.error('Erro ao carregar templates:', err)
      } finally {
        setLoadingTemplates(false)
      }
    }
    fetchTemplates()
  }, [])

  // Fetch campaign if editing
  useEffect(() => {
    if (isEditMode && id) {
      const fetchCampaign = async () => {
        try {
          const response = await fetch(
            `${getApiUrl()}/api/v1/campaigns/${id}`,
            { headers: getAuthHeaders() }
          )
          if (!response.ok) throw new Error('Falha ao carregar campanha')
          const data = await response.json()
          setFormData(data)
          setError(null)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar campanha')
        } finally {
          setLoading(false)
        }
      }
      fetchCampaign()
    }
  }, [id, isEditMode])

  // Handle form changes
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim()) {
      setError('Nome da campanha é obrigatório')
      return
    }
    if (!formData.template_id) {
      setError('Selecione um template')
      return
    }
    if (formData.total_recipients <= 0) {
      setError('O número de destinatários deve ser maior que 0')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const url = isEditMode
        ? `${getApiUrl()}/api/v1/campaigns/${id}`
        : `${getApiUrl()}/api/v1/campaigns`

      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error(`Falha ao ${isEditMode ? 'atualizar' : 'criar'} campanha`)
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/campaigns')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar campanha')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Carregando campanha...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900 dark:text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            {isEditMode ? 'Editar Campanha' : 'Nova Campanha'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {isEditMode ? 'Atualize os detalhes da sua campanha' : 'Crie uma nova campanha de mensagens'}
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-300 font-semibold">
            ✓ Campanha {isEditMode ? 'atualizada' : 'criada'} com sucesso!
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nome da Campanha *
            </label>
            <Input
              type="text"
              placeholder="Ex: Black Friday 2025"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              disabled={saving}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Descrição (Opcional)
            </label>
            <Textarea
              placeholder="Descrição da campanha"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              disabled={saving}
            />
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Template *
            </label>
            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando templates...
              </div>
            ) : (
              <select
                value={formData.template_id}
                onChange={(e) => handleInputChange('template_id', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                disabled={saving}
              >
                <option value="">Selecione um template</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.language})
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {templates.length === 0 ? 'Nenhum template disponível. Crie um primeiro.' : `${templates.length} template(s) disponível(is)`}
            </p>
          </div>

          {/* Target Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tipo de Alvo *
            </label>
            <select
              value={formData.target_type}
              onChange={(e) => handleInputChange('target_type', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
              disabled={saving}
            >
              {TARGET_TYPES.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'Todos os contatos' : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Total Recipients */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Número de Destinatários *
            </label>
            <Input
              type="number"
              placeholder="1000"
              value={formData.total_recipients || ''}
              onChange={(e) => handleInputChange('total_recipients', parseInt(e.target.value) || 0)}
              min="1"
              className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              disabled={saving}
            />
          </div>

          {/* Scheduled At */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Agendar Para (Opcional)
            </label>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              <Input
                type="datetime-local"
                value={formData.scheduled_at || ''}
                onChange={(e) => handleInputChange('scheduled_at', e.target.value)}
                className="flex-1 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                disabled={saving}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Deixe em branco para enviar imediatamente
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 justify-end pt-6 border-t border-slate-200 dark:border-slate-700">
            <Link href="/campaigns">
              <Button variant="outline" type="button">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Atualizar' : 'Criar'} Campanha
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
