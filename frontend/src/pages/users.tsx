import { useState } from 'react'
import { Users, Plus, Search, Edit2, Trash2, Shield, MoreVertical } from 'lucide-react'
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

  const getRoleBadge = (role: string) => {
    const config: { [key: string]: { class: string; label: string } } = {
      super_admin: { class: 'badge-error', label: 'Super Admin' },
      org_admin: { class: 'badge-warning', label: 'Admin Org' },
      agent: { class: 'badge-info', label: 'Agente' },
      viewer: { class: 'badge-neutral', label: 'Visualizador' },
    }
    return config[role] || config.viewer
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    return matchesSearch && matchesRole
  })

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-whatsapp rounded-xl flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Usuários</h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">Gerencie usuários e suas permissões</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-10 px-4 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
        <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-4 px-6 font-semibold text-sm text-muted-foreground">Usuário</th>
                  <th className="text-left py-4 px-6 font-semibold text-sm text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left py-4 px-6 font-semibold text-sm text-muted-foreground">Papel</th>
                  <th className="text-left py-4 px-6 font-semibold text-sm text-muted-foreground hidden lg:table-cell">Data Entrada</th>
                  <th className="text-left py-4 px-6 font-semibold text-sm text-muted-foreground">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-sm text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => {
                  const roleBadge = getRoleBadge(user.role)
                  return (
                    <tr 
                      key={user.id} 
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-whatsapp flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                            {user.avatar}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-sm text-muted-foreground md:hidden">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-muted-foreground text-sm hidden md:table-cell">{user.email}</td>
                      <td className="py-4 px-6">
                        <span className={`${roleBadge.class} inline-flex items-center gap-1`}>
                          <Shield className="w-3 h-3" />
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-muted-foreground hidden lg:table-cell">{user.joinedDate}</td>
                      <td className="py-4 px-6">
                        <span className={`badge-base ${
                          user.status === 'active'
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}>
                          {user.status === 'active' ? '● Ativo' : '○ Inativo'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1">
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Editar">
                            <Edit2 className="w-4 h-4 text-primary-600" />
                          </button>
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Excluir">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
