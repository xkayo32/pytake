import { useEffect, useState } from 'react'
import { Plus, Search, Trash2, Edit2, AlertCircle, ChevronRight, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Badge } from '@components/ui/badge'
import Link from 'next/link'
import { getApiUrl, getAuthHeaders } from '@lib/api'

export interface WhatsAppTemplate {
  id: string
  name: string
  language: string
  category: string
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
  header_text?: string
  body_text: string
  footer_text?: string
  buttons?: Array<any>
  quality_score?: string
  number_id: string
  organization_id: string
  created_at: string
  updated_at: string
}

export default function Templates() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all')
  const [filteredLanguage, setFilteredLanguage] = useState<'all' | string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `${getApiUrl()}/api/v1/whatsapp/templates`,
          { headers: getAuthHeaders() }
        )
        if (!response.ok) throw new Error(`Failed to fetch templates: ${response.statusText}`)
        const data = await response.json()
        setTemplates(Array.isArray(data) ? data : data.items || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar templates')
        setTemplates([])
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.body_text?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || template.status === filterStatus
    const matchesLanguage = filteredLanguage === 'all' || template.language === filteredLanguage

    return matchesSearch && matchesStatus && matchesLanguage
  })

  // Sort by creation date (newest first)
  const sortedTemplates = [...filteredTemplates].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Get unique languages
  const languages = Array.from(new Set(templates.map(t => t.language)))

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/whatsapp/templates/${templateId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      )
      if (!response.ok) throw new Error('Falha ao deletar template')
      setTemplates(prev => prev.filter(t => t.id !== templateId))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Erro ao deletar:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'DRAFT':
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300'
      case 'REJECTED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4" />
      case 'PENDING':
        return <Clock className="w-4 h-4" />
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      APPROVED: 'Aprovado',
      PENDING: 'Aguardando',
      DRAFT: 'Rascunho',
      REJECTED: 'Rejeitado'
    }
    return labels[status] || status
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Templates
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Crie e gerencie seus templates WhatsApp
          </p>
        </div>
        <Link href="/templates/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Novo Template
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por nome ou conteúdo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
        >
          <option value="all">Todos os Status</option>
          <option value="DRAFT">Rascunho</option>
          <option value="PENDING">Aguardando</option>
          <option value="APPROVED">Aprovado</option>
          <option value="REJECTED">Rejeitado</option>
        </select>
        <select
          value={filteredLanguage}
          onChange={(e) => setFilteredLanguage(e.target.value)}
          className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
        >
          <option value="all">Todos os Idiomas</option>
          {languages.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-300">Erro ao carregar templates</p>
            <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white dark:bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Templates Grid */}
      {!loading && sortedTemplates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow flex flex-col"
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-3">
                <Badge className={`${getStatusColor(template.status)} flex items-center gap-1`}>
                  {getStatusIcon(template.status)}
                  {getStatusLabel(template.status)}
                </Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {template.language}
                </span>
              </div>

              {/* Template Name */}
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 truncate">
                {template.name}
              </h3>

              {/* Template Preview */}
              <div className="flex-1 mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-2">
                  {template.body_text}
                </p>
                {template.header_text && (
                  <p className="text-xs text-slate-500 dark:text-slate-500 italic">
                    Header: {template.header_text}
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="mb-4">
                <Badge variant="outline" className="text-xs">
                  {template.category}
                </Badge>
              </div>

              {/* Quality Score */}
              {template.quality_score && (
                <div className="mb-4 p-2 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                  <p className="text-slate-700 dark:text-slate-300">
                    Qualidade: <span className="font-semibold">{template.quality_score}</span>
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <Link href={`/templates/${template.id}`} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                </Link>
                {deleteConfirm === template.id ? (
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    Confirmar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm(template.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Cancel Delete */}
              {deleteConfirm === template.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs"
                  onClick={() => setDeleteConfirm(null)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedTemplates.length === 0 && (
        <div className="text-center py-16">
          <Plus className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Nenhum template encontrado
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {searchTerm ? 'Tente ajustar seus critérios de busca' : 'Comece criando seu primeiro template'}
          </p>
          <Link href="/templates/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Criar Template
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
