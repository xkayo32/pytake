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

  const stats = [
    { icon: Users, label: 'Contatos', value: '1.234', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/20' },
    { icon: CheckCircle2, label: 'Enviadas', value: '856', color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-100 dark:bg-primary-900/20' },
    { icon: MessageSquare, label: 'Taxa', value: '69.4%', color: 'text-secondary-600 dark:text-secondary-400', bg: 'bg-secondary-100 dark:bg-secondary-900/20' },
  ]

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-whatsapp rounded-xl flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Envio em Massa</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">Envie mensagens para vários contatos de uma vez</p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fade-in">
          {stats.map((stat, idx) => (
            <div 
              key={stat.label} 
              className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 ${stat.bg} rounded-lg`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
          <h2 className="text-xl font-semibold mb-6 text-foreground">Criar Nova Campanha</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3 animate-scale-in">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl flex gap-3 animate-scale-in">
              <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
              <p className="text-primary-700 dark:text-primary-400">Broadcast enviado com sucesso!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Título da Campanha</label>
              <Input
                placeholder="Ex: Promoção de Verão"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="h-11"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Mensagem</label>
              <textarea
                placeholder="Escreva sua mensagem aqui..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                required
              />
              <div className="flex justify-between items-center mt-2 text-sm">
                <p className="text-muted-foreground">Caracteres: {messageLength}/{characterLimit}</p>
                {messageLength > characterLimit && (
                  <p className="text-red-600 dark:text-red-400 font-medium">Limite excedido!</p>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Agendar Para</label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_for || ''}
                  onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                  className="h-11"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Selecionar Contatos</label>
                <select className="w-full h-11 px-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                  <option>Todos os contatos (1.234)</option>
                  <option>Segmento: Premium (456)</option>
                  <option>Segmento: Novos (234)</option>
                  <option>Personalizado...</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Pré-visualização</label>
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <div className="bg-card rounded-xl p-4 max-w-sm shadow-sm border border-border">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Pré-visualização da Mensagem</p>
                  <div className="text-sm">
                    <p className="font-semibold text-foreground mb-2">{formData.title || 'Título da campanha'}</p>
                    <p className="text-muted-foreground">{formData.message || 'Sua mensagem aparecerá aqui...'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <Button
                type="submit"
                disabled={loading || !formData.title || !formData.message}
                className="flex-1 h-11 gap-2"
              >
                {loading ? 'Enviando...' : 'Enviar Agora'}
                {!loading && <Send className="w-4 h-4" />}
              </Button>
              <Button type="button" variant="secondary" className="flex-1 h-11">
                Salvar Como Rascunho
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
