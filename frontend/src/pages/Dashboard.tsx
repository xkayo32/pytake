import { useAuth } from '@lib/auth/AuthContext'
import { BarChart3, MessageSquare, Users, TrendingUp, Calendar, Settings, MoreVertical, ArrowUpRight } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()

  const stats = [
    {
      label: 'Mensagens Hoje',
      value: '2,543',
      icon: MessageSquare,
      change: '+12%',
      color: 'text-blue-600'
    },
    {
      label: 'Contatos Ativos',
      value: '1,234',
      icon: Users,
      change: '+8%',
      color: 'text-green-600'
    },
    {
      label: 'Taxa de Conversão',
      value: '34.2%',
      icon: TrendingUp,
      change: '+4.3%',
      color: 'text-purple-600'
    },
    {
      label: 'Fluxos Ativos',
      value: '12',
      icon: BarChart3,
      change: '+2',
      color: 'text-orange-600'
    }
  ]

  const recentFlows = [
    { id: 1, name: 'Fluxo de Boas-vindas', status: 'ativo', messages: 1243, date: 'Hoje' },
    { id: 2, name: 'Follow-up de Vendas', status: 'ativo', messages: 854, date: 'Ontem' },
    { id: 3, name: 'Suporte Automático', status: 'pausado', messages: 342, date: '2 dias atrás' }
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Bem-vindo de volta, <span className="font-semibold">{user?.name}</span>!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <span className="text-sm text-green-600 font-semibold flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" />
                  {stat.change}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{stat.label}</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                {stat.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Charts and Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mensagens por Dia</h2>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
          
          <div className="h-64 flex items-end justify-around gap-2">
            {[45, 52, 38, 71, 55, 64, 78].map((height, idx) => (
              <div
                key={idx}
                className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                style={{ height: `${(height / 78) * 100}%` }}
              />
            ))}
          </div>
          
          <div className="flex justify-around text-xs text-slate-500 dark:text-slate-400 mt-4">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
        </div>

        {/* Side Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Resumo</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <span className="text-sm text-slate-600 dark:text-slate-400">Taxa de Entrega</span>
              <span className="font-bold text-slate-900 dark:text-white">98.2%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <span className="text-sm text-slate-600 dark:text-slate-400">Taxa de Abertura</span>
              <span className="font-bold text-slate-900 dark:text-white">67.8%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <span className="text-sm text-slate-600 dark:text-slate-400">Resposta Média</span>
              <span className="font-bold text-slate-900 dark:text-white">2.3h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Flows Table */}
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fluxos Recentes</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Nome</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Mensagens</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Data</th>
              </tr>
            </thead>
            <tbody>
              {recentFlows.map((flow) => (
                <tr key={flow.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">{flow.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      flow.status === 'ativo' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {flow.status === 'ativo' ? 'Ativo' : 'Pausado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{flow.messages.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{flow.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <button className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left">
          <MessageSquare className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Criar Fluxo</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Comece um novo fluxo de automação</p>
        </button>
        <button className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left">
          <Users className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Gerenciar Contatos</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Organizar e segmentar contatos</p>
        </button>
        <button className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left">
          <Settings className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Configurações</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Ajustar preferências da conta</p>
        </button>
      </div>
    </div>
  )
}
