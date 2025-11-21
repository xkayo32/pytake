'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Users,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Shield,
  Clock,
  Activity,
  Star,
  MoreVertical,
  Edit3,
  Trash2,
  Send,
  UserCheck,
  UserX,
  Crown,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Calendar,
  TrendingUp,
  MessageSquare,
  Target,
  Award
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/useAuth'
import { 
  MOCK_USERS, 
  MOCK_TEAMS, 
  MOCK_INVITATIONS,
  UserProfile, 
  Team, 
  Invitation,
  UserRole, 
  UserStatus 
} from '@/lib/types/user'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const roleConfig: Record<UserRole, { label: string; color: string; icon: any }> = {
  admin: { label: 'Administrador', color: 'bg-red-100 text-red-800 border-red-200', icon: Crown },
  manager: { label: 'Gerente', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Shield },
  agent: { label: 'Agente', color: 'bg-green-100 text-green-800 border-green-200', icon: Users },
  viewer: { label: 'Visualizador', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Eye }
}

const statusConfig: Record<UserStatus, { label: string; color: string; icon: any }> = {
  active: { label: 'Ativo', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  inactive: { label: 'Inativo', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle },
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  suspended: { label: 'Suspenso', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle }
}

const invitationStatusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  accepted: { label: 'Aceito', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  declined: { label: 'Recusado', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  expired: { label: 'Expirado', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: AlertCircle }
}

export default function TeamSettingsPage() {
  const [users, setUsers] = useState<UserProfile[]>(MOCK_USERS)
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS)
  const [invitations, setInvitations] = useState<Invitation[]>(MOCK_INVITATIONS)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTeam, setFilterTeam] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('users')
  
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.title?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || user.permissions.role === filterRole
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    const matchesTeam = filterTeam === 'all' || user.teamId === filterTeam

    return matchesSearch && matchesRole && matchesStatus && matchesTeam
  })

  const handleInviteUser = () => {
    router.push('/settings/team/invite')
  }

  const handleEditUser = (userId: string) => {
    router.push(`/settings/team/${userId}/edit`)
  }

  const handleToggleUserStatus = (userId: string) => {
    setUsers(prev => prev.map(user => {
      if (user.id === userId) {
        const newStatus = user.status === 'active' ? 'inactive' : 'active'
        return { ...user, status: newStatus }
      }
      return user
    }))
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm('Tem certeza que deseja remover este usuário da equipe?')) {
      setUsers(prev => prev.filter(u => u.id !== userId))
    }
  }

  const handleResendInvitation = (invitationId: string) => {
    setInvitations(prev => prev.map(inv => {
      if (inv.id === invitationId) {
        return {
          ...inv,
          invitedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending' as const
        }
      }
      return inv
    }))
  }

  const handleCancelInvitation = (invitationId: string) => {
    if (confirm('Tem certeza que deseja cancelar este convite?')) {
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    }
  }

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    pendingInvitations: invitations.filter(i => i.status === 'pending').length,
    totalTeams: teams.length,
    avgSatisfaction: users.length > 0 
      ? Math.round(users.reduce((sum, u) => sum + u.stats.satisfaction, 0) / users.length)
      : 0,
    totalConversations: users.reduce((sum, u) => sum + u.stats.totalConversations, 0)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
  }

  const getTeamName = (teamId?: string) => {
    const team = teams.find(t => t.id === teamId)
    return team?.name || 'Sem equipe'
  }

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user?.name || 'Usuário'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-2xl font-bold">Gerenciar Equipe</h1>
              <p className="text-sm text-muted-foreground">
                Usuários, permissões e configurações da equipe
              </p>
            </div>
            <Button onClick={handleInviteUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Usuário
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Usuários</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Online</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingInvitations}</div>
                <p className="text-xs text-muted-foreground">Convites</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Equipes</CardTitle>
                <Shield className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.totalTeams}</div>
                <p className="text-xs text-muted-foreground">Grupos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
                <Star className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.avgSatisfaction}%</div>
                <p className="text-xs text-muted-foreground">Média geral</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversas</CardTitle>
                <MessageSquare className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  {stats.totalConversations.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="teams">Equipes</TabsTrigger>
              <TabsTrigger value="invitations">Convites</TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuários..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Funções</SelectItem>
                    {Object.entries(roleConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    {Object.entries(statusConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterTeam} onValueChange={setFilterTeam}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Equipes</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Users List */}
              {filteredUsers.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Nenhum usuário encontrado</h3>
                    <p className="mb-4">
                      {searchTerm 
                        ? 'Tente ajustar os filtros de busca' 
                        : 'Convide o primeiro usuário para sua equipe'}
                    </p>
                    {!searchTerm && (
                      <Button onClick={handleInviteUser}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Convidar Primeiro Usuário
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => {
                    const RoleIcon = roleConfig[user.permissions.role].icon
                    const StatusIcon = statusConfig[user.status].icon
                    
                    return (
                      <Card key={user.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              {/* Avatar */}
                              <div className="relative">
                                {user.avatar ? (
                                  <img 
                                    src={user.avatar} 
                                    alt={user.name}
                                    className="w-12 h-12 rounded-full"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Users className="h-6 w-6 text-primary" />
                                  </div>
                                )}
                                {user.stats.activeToday && (
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                                )}
                              </div>
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-lg">{user.name}</h3>
                                  <Badge 
                                    variant="outline" 
                                    className={roleConfig[user.permissions.role].color}
                                  >
                                    <RoleIcon className="h-3 w-3 mr-1" />
                                    {roleConfig[user.permissions.role].label}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={statusConfig[user.status].color}
                                  >
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusConfig[user.status].label}
                                  </Badge>
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-2">
                                  {user.title} • {user.department}
                                </p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm mb-3">
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <span className="truncate">{user.email}</span>
                                  </div>
                                  {user.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-3 w-3 text-muted-foreground" />
                                      <span>{user.phone}</span>
                                    </div>
                                  )}
                                  {user.location && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-3 w-3 text-muted-foreground" />
                                      <span>{user.location}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-3 w-3 text-muted-foreground" />
                                    <span>{getTeamName(user.teamId)}</span>
                                  </div>
                                </div>
                                
                                {/* Stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                                  <div className="text-center p-2 bg-muted/50 rounded">
                                    <p className="text-xs text-muted-foreground">Conversas</p>
                                    <p className="text-sm font-semibold">{user.stats.totalConversations}</p>
                                  </div>
                                  <div className="text-center p-2 bg-muted/50 rounded">
                                    <p className="text-xs text-muted-foreground">Mensagens</p>
                                    <p className="text-sm font-semibold">{user.stats.totalMessages}</p>
                                  </div>
                                  <div className="text-center p-2 bg-muted/50 rounded">
                                    <p className="text-xs text-muted-foreground">Tempo Resp.</p>
                                    <p className="text-sm font-semibold">{formatDuration(user.stats.avgResponseTime)}</p>
                                  </div>
                                  <div className="text-center p-2 bg-muted/50 rounded">
                                    <p className="text-xs text-muted-foreground">Satisfação</p>
                                    <p className="text-sm font-semibold text-green-600">{user.stats.satisfaction}%</p>
                                  </div>
                                  <div className="text-center p-2 bg-muted/50 rounded">
                                    <p className="text-xs text-muted-foreground">Último Login</p>
                                    <p className="text-sm font-semibold">
                                      {user.lastLogin ? formatDate(user.lastLogin) : '-'}
                                    </p>
                                  </div>
                                  <div className="text-center p-2 bg-muted/50 rounded">
                                    <p className="text-xs text-muted-foreground">Horas Hoje</p>
                                    <p className="text-sm font-semibold">{user.stats.hoursWorked}h</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleUserStatus(user.id)}
                              >
                                {user.status === 'active' ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-2" />
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Ativar
                                  </>
                                )}
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUser(user.id)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Teams Tab */}
            <TabsContent value="teams" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Equipes</h3>
                <Button onClick={() => router.push('/settings/team/create-team')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Equipe
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((team) => (
                  <Card key={team.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          <CardTitle>{team.name}</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                      {team.description && (
                        <CardDescription>{team.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Membros</p>
                          <p className="text-sm font-semibold">{team.stats.totalMembers}</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Conversas</p>
                          <p className="text-sm font-semibold">{team.stats.totalConversations}</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Tempo Resp.</p>
                          <p className="text-sm font-semibold">{formatDuration(team.stats.avgResponseTime)}</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Satisfação</p>
                          <p className="text-sm font-semibold text-green-600">{team.stats.satisfaction}%</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Gerente:</p>
                        <p className="text-sm font-medium">{getUserName(team.managerId)}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Membros
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Invitations Tab */}
            <TabsContent value="invitations" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Convites Pendentes</h3>
                <Button onClick={handleInviteUser}>
                  <Send className="h-4 w-4 mr-2" />
                  Novo Convite
                </Button>
              </div>
              
              {invitations.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center text-muted-foreground">
                    <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Nenhum convite pendente</h3>
                    <p className="mb-4">Convide novos usuários para sua equipe</p>
                    <Button onClick={handleInviteUser}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Enviar Primeiro Convite
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => {
                    const StatusIcon = invitationStatusConfig[invitation.status].icon
                    
                    return (
                      <Card key={invitation.id}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium">{invitation.email}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={invitationStatusConfig[invitation.status].color}
                                >
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {invitationStatusConfig[invitation.status].label}
                                </Badge>
                                <Badge variant="secondary">
                                  {roleConfig[invitation.role].label}
                                </Badge>
                                {invitation.teamId && (
                                  <Badge variant="outline">
                                    {getTeamName(invitation.teamId)}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Convidado por: {getUserName(invitation.invitedBy)}</p>
                                <p>Enviado em: {formatDate(invitation.invitedAt)}</p>
                                <p>Expira em: {formatDate(invitation.expiresAt)}</p>
                                {invitation.message && (
                                  <p>Mensagem: {invitation.message}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              {invitation.status === 'pending' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleResendInvitation(invitation.id)}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Reenviar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelInvitation(invitation.id)}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancelar
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelInvitation(invitation.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
  )
}