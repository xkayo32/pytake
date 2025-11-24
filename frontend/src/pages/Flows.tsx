import { useEffect, useState } from 'react'
import { Plus, Search, MoreVertical, Trash2, Edit2, Play, Pause, Copy, MessageSquare, AlertCircle } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { getApiUrl, getAuthHeaders } from '@lib/api'

export default function Flows() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [flows, setFlows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        const response = await fetch(
          `${getApiUrl()}/api/v1/flows`,
          { headers: getAuthHeaders() }
        )
        if (!response.ok) throw new Error('Failed to fetch flows')
        const data = await response.json()
        setFlows(Array.isArray(data) ? data : data.items || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar fluxos')
      } finally {
        setLoading(false)
      }
    }

    fetchFlows()
  }, [])

  const filteredFlows = flows.filter(flow => {
    const matchesSearch = flow.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flow.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || flow.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Fluxos de Automação
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gerencie e crie fluxos automáticos para seus contatos WhatsApp
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          Novo Fluxo
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar fluxos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
        >
          <option value="all">Todos os Status</option>
          <option value="ativo">Ativos</option>
          <option value="pausado">Pausados</option>
        </select>
      </div>

      {/* Flows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {filteredFlows.map((flow) => (
          <div
            key={flow.id}
            className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                    {flow.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {flow.description}
                  </p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-2 ${
                flow.status === 'ativo'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${flow.status === 'ativo' ? 'bg-green-600' : 'bg-slate-500'}`}></span>
                {flow.status === 'ativo' ? 'Ativo' : 'Pausado'}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 py-4 border-t border-b border-slate-200 dark:border-slate-700 mb-4">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Mensagens</p>
                <p className="font-bold text-slate-900 dark:text-white">{flow.messages.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Triggers</p>
                <p className="font-bold text-slate-900 dark:text-white">{flow.triggers}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Atualizado</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{flow.updated}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {flow.status === 'ativo' ? (
                <button className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                  <Pause className="w-4 h-4" />
                  Pausar
                </button>
              ) : (
                <button className="flex-1 px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                  <Play className="w-4 h-4" />
                  Ativar
                </button>
              )}
              <button className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredFlows.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Nenhum fluxo encontrado
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {searchTerm ? 'Tente ajustar seus critérios de busca' : 'Crie seu primeiro fluxo para começar'}
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Criar Novo Fluxo
          </Button>
        </div>
      )}
    </div>
  )
}
