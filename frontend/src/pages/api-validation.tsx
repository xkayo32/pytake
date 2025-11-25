import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Loader, RefreshCw, Activity, Clock } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { getApiUrl, getAuthHeaders } from '@lib/api'

interface TestResult {
  id: string
  endpoint: string
  method: string
  status: 'success' | 'failed' | 'pending'
  responseTime: number
  statusCode?: number
  error?: string
  timestamp: string
}

export default function APIValidation() {
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed'>('idle')
  const [startTime, setStartTime] = useState<number | null>(null)

  const endpoints = [
    { endpoint: '/api/v1/conversations', method: 'GET' },
    { endpoint: '/api/v1/whatsapp/templates', method: 'GET' },
    { endpoint: '/api/v1/campaigns', method: 'GET' },
    { endpoint: '/api/v1/users', method: 'GET' },
    { endpoint: '/api/v1/organization', method: 'GET' },
    { endpoint: '/api/v1/reports/overview', method: 'GET' },
    { endpoint: '/api/v1/dashboard/summary', method: 'GET' },
    { endpoint: '/api/v1/integrations', method: 'GET' },
  ]

  const runTests = async () => {
    setLoading(true)
    setOverallStatus('running')
    setStartTime(Date.now())
    const testResults: TestResult[] = []

    for (const test of endpoints) {
      const testId = `${test.method}-${test.endpoint}`
      const start = Date.now()

      try {
        const response = await fetch(`${getApiUrl()}${test.endpoint}`, {
          method: test.method,
          headers: getAuthHeaders(),
        })

        const responseTime = Date.now() - start

        testResults.push({
          id: testId,
          endpoint: test.endpoint,
          method: test.method,
          status: response.ok ? 'success' : 'failed',
          responseTime,
          statusCode: response.status,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        const responseTime = Date.now() - start
        testResults.push({
          id: testId,
          endpoint: test.endpoint,
          method: test.method,
          status: 'failed',
          responseTime,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString(),
        })
      }

      setResults([...testResults])
    }

    setOverallStatus('completed')
    setLoading(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'pending':
        return <Loader className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin" />
      default:
        return null
    }
  }

  const successCount = results.filter(r => r.status === 'success').length
  const failedCount = results.filter(r => r.status === 'failed').length
  const successRate = results.length > 0 ? Math.round((successCount / results.length) * 100) : 0
  const avgResponseTime = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length)
    : 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Activity className="w-8 h-8" />
          Validação de API
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Teste a disponibilidade e performance dos endpoints
        </p>
      </div>

      {/* Overall Status */}
      {results.length > 0 && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Taxa de Sucesso</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{successRate}%</p>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${successRate === 100 ? 'bg-green-500' : successRate >= 75 ? 'bg-blue-500' : 'bg-red-500'}`}
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Sucesso</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{successCount}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">de {results.length} testes</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Falhas</p>
            <p className={`text-3xl font-bold mb-1 ${failedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
              {failedCount}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">endpoints com erro</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <p className="text-slate-600 dark:text-slate-400 text-sm">Tempo Médio</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{avgResponseTime}ms</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">tempo de resposta</p>
          </div>
        </div>
      )}

      {/* Run Tests Button */}
      <div className="mb-6 flex gap-2">
        <Button
          onClick={runTests}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Executando...' : 'Executar Testes'}
        </Button>
        {startTime && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400">
            Última execução: {new Date(startTime).toLocaleTimeString('pt-BR')}
          </div>
        )}
      </div>

      {/* Test Results */}
      {results.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Endpoint
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Tempo (ms)
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Detalhes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {results.map((result) => (
                  <tr
                    key={result.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                      result.status === 'failed' ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <Badge
                          className={
                            result.status === 'success'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : result.status === 'failed'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                          }
                        >
                          {result.status === 'success' ? 'OK' : result.status === 'failed' ? 'ERRO' : 'PENDENTE'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-900 dark:text-white">
                      {result.endpoint}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {result.method}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {result.statusCode || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-semibold">
                      {result.responseTime}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {result.error ? (
                        <span className="text-red-600 dark:text-red-400">{result.error}</span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">✓ Respondendo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Clique em "Executar Testes" para validar os endpoints
          </p>
        </div>
      )}

      {/* Health Check Information */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          ℹ️ Sobre a Validação de API
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Testa {endpoints.length} endpoints principais em tempo real</li>
          <li>• Mede tempo de resposta em milissegundos</li>
          <li>• Valida disponibilidade da API e autenticação</li>
          <li>• Execute regularmente para monitorar performance</li>
          <li>• Taxa de sucesso: {successRate > 0 ? `${successRate}%` : 'Sem testes ainda'}</li>
        </ul>
      </div>
    </div>
  )
}
