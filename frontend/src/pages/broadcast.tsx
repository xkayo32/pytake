import { useState } from 'react'
import { Send, Users, MessageSquare, AlertCircle, Zap, CheckCircle2 } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'

interface BroadcastMessage {
  title: string
  message: string
  recipients_count: number
  scheduled_for?: string
}

export default function Broadcast() {
  const [formData, setFormData] = useState<BroadcastMessage>({
    title: '',
    message: '',
    recipients_count: 0,
    scheduled_for: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Simulated submit
      await new Promise(resolve => setTimeout(resolve, 1500))
      setSuccess(true)
      setFormData({ title: '', message: '', recipients_count: 0, scheduled_for: '' })
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Erro ao enviar broadcast')
    } finally {
      setLoading(false)
    }
  }

  const messageLength = formData.message.length
  const characterLimit = 1000

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="section-title flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            Envio em Massa
          </h1>
          <p className="section-subtitle">Envie mensagens para vários contatos de uma vez</p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card-interactive">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Contatos</p>
                <p className="text-2xl font-bold">1.234</p>
              </div>
            </div>
          </div>

          <div className="card-interactive">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Enviadas</p>
                <p className="text-2xl font-bold">856</p>
              </div>
            </div>
          </div>

          <div className="card-interactive">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Taxa</p>
                <p className="text-2xl font-bold">69.4%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="card-interactive">
          <h2 className="text-xl font-semibold mb-6">Criar Nova Campanha</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-800 dark:text-green-400">Broadcast enviado com sucesso!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Título da Campanha</label>
              <Input
                placeholder="Ex: Promoção de Verão"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium mb-2">Mensagem</label>
              <textarea
                placeholder="Escreva sua mensagem aqui..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                required
              />
              <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                <p>Caracteres: {messageLength}/{characterLimit}</p>
                {messageLength > characterLimit && (
                  <p className="text-red-600 dark:text-red-400">Limite excedido!</p>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Agendar Para</label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_for || ''}
                  onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Selecionar Contatos</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary">
                  <option>Todos os contatos (1.234)</option>
                  <option>Segmento: Premium (456)</option>
                  <option>Segmento: Novos (234)</option>
                  <option>Personalizado...</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium mb-2">Pré-visualização</label>
              <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 max-w-sm">
                  <p className="text-sm font-medium mb-2">Pré-visualização da Mensagem</p>
                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground mb-2">{formData.title || 'Título da campanha'}</p>
                    <p>{formData.message || 'Sua mensagem aparecerá aqui...'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-border">
              <Button
                type="submit"
                disabled={loading || !formData.title || !formData.message}
                className="btn-primary flex-1"
              >
                {loading ? 'Enviando...' : 'Enviar Agora'}
                {!loading && <Send className="w-5 h-5" />}
              </Button>
              <Button type="button" className="btn-secondary flex-1">
                Salvar Como Rascunho
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
