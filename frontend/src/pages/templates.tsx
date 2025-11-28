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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-whatsapp rounded-xl flex items-center justify-center shadow-md">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Modelos de Mensagem</h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">Crie e gerencie templates reutilizáveis</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Modelo
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Nome do modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">Categoria</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full h-10 px-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Todas' : cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="w-full p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary/20 rounded-xl text-sm">
              <strong className="text-primary-700 dark:text-primary-400">{filteredTemplates.length}</strong>
              <span className="text-primary-600 dark:text-primary-500"> modelos encontrados</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3 animate-scale-in">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 h-64 skeleton"></div>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-card border border-border rounded-xl text-center py-12 animate-fade-in">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-2 text-foreground">Nenhum modelo encontrado</p>
            <p className="text-muted-foreground mb-6 text-sm">Crie seu primeiro modelo para começar</p>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Criar Modelo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template, index) => (
              <div 
                key={template.id} 
                className="bg-card border border-border rounded-xl p-5 flex flex-col hover:shadow-md hover:border-primary/20 transition-all duration-200 animate-fade-in group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground truncate group-hover:text-primary-600 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1">
                      {template.category}
                    </p>
                  </div>
                  <span className={`ml-2 flex-shrink-0 ${
                    template.status === 'active' ? 'badge-success' : 'badge-warning'
                  }`}>
                    {template.status === 'active' ? '● Ativo' : '● Rascunho'}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">
                  {template.content}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{template.usage_count}</strong> usos
                  </div>
                  <div className="flex gap-1">
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Copiar">
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Editar">
                      <Edit className="w-4 h-4 text-primary-600" />
                    </button>
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Deletar">
                      <Trash2 className="w-4 h-4 text-destructive" />
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
