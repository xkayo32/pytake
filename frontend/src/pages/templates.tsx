import { useEffect, useState } from 'react'
import { Plus, Search, Copy, Trash2, Edit, MessageSquare, AlertCircle } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { getApiUrl, getAuthHeaders } from '@lib/api'

interface Template {
  id: string
  name: string
  category: string
  content: string
  status: 'active' | 'draft'
  usage_count: number
  created_at: string
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `${getApiUrl()}/api/v1/templates`,
          { headers: getAuthHeaders() }
        )
        if (!response.ok) throw new Error('Falha ao carregar templates')
        const data = await response.json()
        setTemplates(Array.isArray(data) ? data : data.items || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar templates')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...new Set(templates.map(t => t.category))]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-primary" />
              Modelos de Mensagem
            </h1>
            <p className="section-subtitle">Crie e gerencie templates reutilizáveis</p>
          </div>
          <Button className="btn-primary">
            <Plus className="w-5 h-5" />
            Novo Modelo
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Nome do modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Categoria</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Todas' : cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="w-full p-3 bg-info/10 border border-info/30 rounded-lg text-sm">
              <strong>{filteredTemplates.length}</strong> modelos encontrados
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card-interactive h-64 skeleton"></div>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="card-interactive text-center py-12">
            <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Nenhum modelo encontrado</p>
            <p className="text-muted-foreground mb-6">Crie seu primeiro modelo para começar</p>
            <Button className="btn-primary">
              <Plus className="w-5 h-5" />
              Criar Modelo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="card-interactive flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {template.category}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    template.status === 'active'
                      ? 'badge-success'
                      : 'badge-warning'
                  }`}>
                    {template.status === 'active' ? '● Ativo' : '● Rascunho'}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">
                  {template.content}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    <strong>{template.usage_count}</strong> usos
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-secondary rounded-lg transition-colors" title="Copiar">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-secondary rounded-lg transition-colors" title="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-secondary rounded-lg transition-colors" title="Deletar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
