import { useEffect, useState } from 'react'
import { Send, AlertCircle, Loader2, ArrowLeft, Users, MessageSquare } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import Link from 'next/link'
import { getApiUrl, getAuthHeaders } from '@lib/api'

interface BroadcastForm {
  target_type: string
  target_filters?: any
  message_content: string
  tags?: string[]
  selected_contacts?: string[]
}

export default function Broadcast() {
  const [formData, setFormData] = useState<BroadcastForm>({
    target_type: 'all',
    message_content: '',
    tags: []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [preview, setPreview] = useState(false)
  const [estimatedRecipients, setEstimatedRecipients] = useState(0)

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.message_content.trim()) {
      setError('Mensagem é obrigatória')
      return
    }

    if (!preview) {
      setPreview(true)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `${getApiUrl()}/api/v1/broadcast`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      )

      if (!response.ok) {
        throw new Error('Falha ao enviar broadcast')
      }

      setSuccess(true)
      setTimeout(() => {
        setFormData({
          target_type: 'all',
          message_content: '',
          tags: []
        })
        setPreview(false)
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar broadcast')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/conversations">
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900 dark:text-slate-400">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Envio em Massa
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Envie mensagens para múltiplos contatos
          </p>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-300 font-semibold">
            ✓ Mensagem enviada com sucesso!
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 space-y-6">
            {/* Target Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Selecionar Destinatários *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['all', 'tags', 'segment'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleInputChange('target_type', type)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.target_type === type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {type === 'all' ? 'Todos' : type === 'tags' ? 'Por Tags' : 'Por Segmento'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Input */}
            {formData.target_type === 'tags' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tags (separadas por vírgula)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: vip, premium, ativo"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(t => t.trim()))}
                  className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                  disabled={loading}
                />
              </div>
            )}

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Mensagem *
              </label>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={formData.message_content}
                onChange={(e) => handleInputChange('message_content', e.target.value)}
                rows={6}
                maxLength={1000}
                className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formData.message_content.length}/1000 caracteres
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Link href="/conversations" className="flex-1">
                <Button variant="outline" type="button" className="w-full">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading || !formData.message_content.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {preview ? 'Confirmar Envio' : 'Visualizar'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Preview/Stats Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 sticky top-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
              Resumo do Envio
            </h2>

            {/* Recipient Count */}
            <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">Destinatários</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ~{estimatedRecipients || 0}
              </p>
            </div>

            {/* Message Preview */}
            {formData.message_content && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Prévia da Mensagem
                </h3>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                  <div className="flex justify-end mb-3">
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-2xl rounded-tr-none p-3 max-w-xs">
                      <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap break-words">
                        {formData.message_content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {preview && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold mb-2">
                  ⚠️ Confirme antes de enviar
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Esta ação não pode ser revertida. A mensagem será enviada para {estimatedRecipients} contatos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
