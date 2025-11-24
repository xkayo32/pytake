import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Save, X, Plus, Trash2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Badge } from '@components/ui/badge'
import Link from 'next/link'
import { getApiUrl, getAuthHeaders } from '@lib/api'

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
  text?: string
  buttons?: Array<{
    type: string
    text: string
  }>
}

interface FormData {
  name: string
  language: string
  category: string
  header_text?: string
  body_text: string
  footer_text?: string
  buttons?: Array<{
    type: string
    text: string
  }>
}

const CATEGORIES = ['MARKETING', 'TRANSACTIONAL', 'UTILITY', 'OPT_IN', 'TICKET']
const LANGUAGES = ['pt_BR', 'en_US', 'es_ES', 'fr_FR', 'it_IT']

export default function TemplateForm() {
  const router = useRouter()
  const { id } = router.query
  const isEditMode = !!id

  const [formData, setFormData] = useState<FormData>({
    name: '',
    language: 'pt_BR',
    category: 'UTILITY',
    header_text: '',
    body_text: '',
    footer_text: '',
    buttons: []
  })

  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [newButton, setNewButton] = useState({ type: 'URL', text: '' })

  // Fetch template if editing
  useEffect(() => {
    if (isEditMode && id) {
      const fetchTemplate = async () => {
        try {
          const response = await fetch(
            `${getApiUrl()}/api/v1/whatsapp/templates/${id}`,
            { headers: getAuthHeaders() }
          )
          if (!response.ok) throw new Error('Falha ao carregar template')
          const data = await response.json()
          setFormData(data)
          setError(null)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar template')
        } finally {
          setLoading(false)
        }
      }
      fetchTemplate()
    }
  }, [id, isEditMode])

  // Count variables in text ({{1}}, {{2}}, etc)
  const countVariables = (text: string): number => {
    const matches = text.match(/\{\{\d+\}\}/g)
    return matches ? matches.length : 0
  }

  // Handle form changes
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Add button
  const handleAddButton = () => {
    if (!newButton.text.trim()) return

    setFormData(prev => ({
      ...prev,
      buttons: [
        ...(prev.buttons || []),
        newButton
      ]
    }))
    setNewButton({ type: 'URL', text: '' })
  }

  // Remove button
  const handleRemoveButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      buttons: prev.buttons?.filter((_, i) => i !== index)
    }))
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim()) {
      setError('Nome do template é obrigatório')
      return
    }
    if (!formData.body_text.trim()) {
      setError('Conteúdo do template é obrigatório')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const url = isEditMode
        ? `${getApiUrl()}/api/v1/whatsapp/templates/${id}`
        : `${getApiUrl()}/api/v1/whatsapp/templates`

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
        throw new Error(`Falha ao ${isEditMode ? 'atualizar' : 'criar'} template`)
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/templates')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar template')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Carregando template...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900 dark:text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            {isEditMode ? 'Editar Template' : 'Novo Template'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {isEditMode ? 'Atualize os detalhes do seu template' : 'Crie um novo template WhatsApp'}
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-300 font-semibold">
            ✓ Template {isEditMode ? 'atualizado' : 'criado'} com sucesso!
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                Informações Básicas
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nome do Template *
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: order_confirmation"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                    disabled={saving}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Use apenas letras minúsculas, números e underscores
                  </p>
                </div>

                {/* Language & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Idioma *
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                      disabled={saving}
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Categoria *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                      disabled={saving}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                Conteúdo do Template
              </h2>

              <div className="space-y-4">
                {/* Header */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Cabeçalho (Opcional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Texto do cabeçalho"
                    value={formData.header_text || ''}
                    onChange={(e) => handleInputChange('header_text', e.target.value)}
                    className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                    disabled={saving}
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Corpo da Mensagem * ({countVariables(formData.body_text)} variáveis)
                  </label>
                  <Textarea
                    placeholder="Ex: Olá {{1}}, seu pedido {{2}} foi confirmado!"
                    value={formData.body_text}
                    onChange={(e) => handleInputChange('body_text', e.target.value)}
                    rows={5}
                    className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                    disabled={saving}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Use {{'{'}}{'{1}'}{'}'},  {{'{'}}{'{2}'}{'}'}}, etc para variáveis
                  </p>
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Rodapé (Opcional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Texto do rodapé"
                    value={formData.footer_text || ''}
                    onChange={(e) => handleInputChange('footer_text', e.target.value)}
                    className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                Botões (Opcional)
              </h2>

              <div className="space-y-4">
                {/* Existing Buttons */}
                {formData.buttons && formData.buttons.length > 0 && (
                  <div className="space-y-2">
                    {formData.buttons.map((button, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <div className="flex-1">
                          <Badge variant="outline" className="text-xs">{button.type}</Badge>
                          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{button.text}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveButton(index)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Button */}
                <div className="flex gap-2">
                  <select
                    value={newButton.type}
                    onChange={(e) => setNewButton(prev => ({ ...prev, type: e.target.value }))}
                    className="px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm"
                    disabled={saving}
                  >
                    <option value="URL">URL</option>
                    <option value="PHONE_NUMBER">Telefone</option>
                    <option value="QUICK_REPLY">Resposta Rápida</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Texto do botão"
                    value={newButton.text}
                    onChange={(e) => setNewButton(prev => ({ ...prev, text: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm"
                    disabled={saving}
                  />
                  <Button
                    type="button"
                    onClick={handleAddButton}
                    disabled={saving || !newButton.text.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 sticky top-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                Pré-visualização
              </h2>

              {/* Phone Preview */}
              <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl p-3 aspect-[9/16] overflow-hidden shadow-lg">
                <div className="bg-white dark:bg-slate-700 rounded-2xl h-full flex flex-col overflow-hidden">
                  {/* Chat Header */}
                  <div className="bg-slate-200 dark:bg-slate-600 px-3 py-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-400"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        Template Preview
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">online</p>
                    </div>
                  </div>

                  {/* Chat Body */}
                  <div className="flex-1 overflow-auto p-3 space-y-3">
                    {/* Message Bubble */}
                    <div className="flex justify-end">
                      <div className="bg-green-100 dark:bg-green-900/30 rounded-2xl rounded-tr-none p-3 max-w-[80%]">
                        {formData.header_text && (
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {formData.header_text}
                          </p>
                        )}
                        <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap break-words">
                          {formData.body_text || 'Sua mensagem aparecerá aqui...'}
                        </p>
                        {formData.footer_text && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {formData.footer_text}
                          </p>
                        )}

                        {/* Buttons Preview */}
                        {formData.buttons && formData.buttons.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {formData.buttons.map((button, idx) => (
                              <div
                                key={idx}
                                className="bg-white dark:bg-slate-600 rounded text-center px-2 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400"
                              >
                                {button.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chat Input */}
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 text-xs text-slate-500 text-center">
                    Aguardando digitação...
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <p className="text-xs text-slate-600 dark:text-slate-400">Status</p>
                <Badge variant="outline" className="mt-2">
                  {isEditMode ? 'Edição' : 'Novo'}
                </Badge>
              </div>

              {/* Variables Info */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Variáveis Detectadas:
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  {countVariables(formData.body_text) || 'Nenhuma'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-8 flex gap-4 justify-end">
          <Link href="/templates">
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
                {isEditMode ? 'Atualizar' : 'Criar'} Template
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
