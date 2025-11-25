import { useState } from 'react'
import { Users, Plus, Search, MoreVertical, Edit2, Trash2, Shield } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'

interface User {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'inactive'
  joinedDate: string
  avatar: string
}

export default function UsersList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')

  const users: User[] = [
    {
      id: '1',
      name: 'João Silva',
      email: 'joao@empresa.com',
      role: 'super_admin',
      status: 'active',
      joinedDate: '01/01/2024',
      avatar: 'JS',
    },
    {
      id: '2',
      name: 'Maria Santos',
      email: 'maria@empresa.com',
      role: 'org_admin',
      status: 'active',
      joinedDate: '15/02/2024',
      avatar: 'MS',
    },
    {
      id: '3',
      name: 'Carlos Oliveira',
      email: 'carlos@empresa.com',
      role: 'agent',
      status: 'active',
      joinedDate: '20/03/2024',
      avatar: 'CO',
    },
    {
      id: '4',
      name: 'Ana Costa',
      email: 'ana@empresa.com',
      role: 'viewer',
      status: 'inactive',
      joinedDate: '10/04/2024',
      avatar: 'AC',
    },
  ]

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      super_admin: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400',
      org_admin: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400',
      agent: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400',
      viewer: 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400',
    }
    return colors[role] || colors.viewer
  }

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      super_admin: 'Super Admin',
      org_admin: 'Admin Org',
      agent: 'Agente',
      viewer: 'Visualizador',
    }
    return labels[role] || role
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    return matchesSearch && matchesRole
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Usuários
            </h1>
            <p className="section-subtitle">Gerencie usuários e suas permissões</p>
          </div>
          <Button className="btn-primary gap-2">
            <Plus className="w-5 h-5" />
            Novo Usuário
          </Button>
        </div>

        {/* Filters */}
        <div className="card-interactive mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos os Papéis</option>
              <option value="super_admin">Super Admin</option>
              <option value="org_admin">Admin Org</option>
              <option value="agent">Agente</option>
              <option value="viewer">Visualizador</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card-interactive overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-6 font-semibold">Usuário</th>
                  <th className="text-left py-4 px-6 font-semibold">Email</th>
                  <th className="text-left py-4 px-6 font-semibold">Papel</th>
                  <th className="text-left py-4 px-6 font-semibold">Data Entrada</th>
                  <th className="text-left py-4 px-6 font-semibold">Status</th>
                  <th className="text-left py-4 px-6 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-sm font-semibold">
                          {user.avatar}
                        </div>
                        <p className="font-medium">{user.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground text-sm">{user.email}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        <Shield className="w-3 h-3" />
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">{user.joinedDate}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400'
                      }`}>
                        {user.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-secondary/50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button className="p-2 hover:bg-secondary/50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
