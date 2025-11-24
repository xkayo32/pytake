'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { notify } from '@/lib/utils'
import { 
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Shield,
  Key,
  Bell,
  Monitor,
  Globe,
  Clock,
  Eye,
  EyeOff,
  Smartphone,
  Lock,
  LogOut,
  Trash2,
  Upload,
  Edit3,
  Settings,
  Palette,
  Languages,
  Calendar,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

// Mock current user data
const CURRENT_USER = {
  id: '1',
  name: 'João Silva',
  email: 'joao.silva@empresa.com',
  phone: '+55 11 99999-1234',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  title: 'Gerente de Atendimento',
  department: 'Atendimento',
  bio: 'Especialista em atendimento ao cliente com 8 anos de experiência',
  location: 'São Paulo, SP',
  whatsappNumber: '+55 11 99999-1234',
  emailVerified: true,
  phoneVerified: true,
  twoFactorEnabled: true,
  lastPasswordChange: '2024-01-01T00:00:00Z',
  preferences: {
    theme: 'light' as const,
    language: 'pt' as const,
    timezone: 'America/Sao_Paulo',
    dateFormat: 'DD/MM/YYYY' as const,
    timeFormat: '24h' as const,
    defaultView: 'list' as const,
    conversationsPerPage: 25,
    autoRefresh: true,
    autoRefreshInterval: 30,
    soundNotifications: true,
    compactMode: false
  },
  notifications: {
    email: {
      enabled: true,
      newMessage: 'instant' as const,
      newConversation: 'instant' as const,
      campaignComplete: 'instant' as const,
      systemAlerts: 'instant' as const,
      weeklyReport: true,
      monthlyReport: true
    },
    push: {
      enabled: true,
      newMessage: 'instant' as const,
      newConversation: 'instant' as const,
      mentions: 'instant' as const,
      systemAlerts: 'instant' as const
    },
    sms: {
      enabled: false,
      emergencyOnly: true,
      systemDown: true
    },
    whatsapp: {
      enabled: true,
      dailySummary: true,
      weeklyReport: false
    }
  }
}

// Mock active sessions
const ACTIVE_SESSIONS = [
  {
    id: '1',
    device: 'Chrome no Windows',
    location: 'São Paulo, SP',
    ipAddress: '192.168.1.100',
    isCurrent: true,
    lastActivity: '2024-01-15T17:45:00Z'
  },
  {
    id: '2',
    device: 'Safari no iPhone',
    location: 'São Paulo, SP',
    ipAddress: '192.168.1.101',
    isCurrent: false,
    lastActivity: '2024-01-15T14:30:00Z'
  },
  {
    id: '3',
    device: 'Chrome no Android',
    location: 'Rio de Janeiro, RJ',
    ipAddress: '10.0.0.50',
    isCurrent: false,
    lastActivity: '2024-01-14T20:15:00Z'
  }
]

export default function ProfileSettingsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  // Profile form state
  const [name, setName] = useState(CURRENT_USER.name)
  const [title, setTitle] = useState(CURRENT_USER.title)
  const [bio, setBio] = useState(CURRENT_USER.bio)
  const [location, setLocation] = useState(CURRENT_USER.location)
  const [phone, setPhone] = useState(CURRENT_USER.phone)
  const [whatsappNumber, setWhatsappNumber] = useState(CURRENT_USER.whatsappNumber)
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(CURRENT_USER.twoFactorEnabled)
  
  // Preferences state
  const [theme, setTheme] = useState(CURRENT_USER.preferences.theme)
  const [language, setLanguage] = useState(CURRENT_USER.preferences.language)
  const [timezone, setTimezone] = useState(CURRENT_USER.preferences.timezone)
  const [dateFormat, setDateFormat] = useState(CURRENT_USER.preferences.dateFormat)
  const [timeFormat, setTimeFormat] = useState(CURRENT_USER.preferences.timeFormat)
  const [defaultView, setDefaultView] = useState(CURRENT_USER.preferences.defaultView)
  const [conversationsPerPage, setConversationsPerPage] = useState(CURRENT_USER.preferences.conversationsPerPage)
  const [autoRefresh, setAutoRefresh] = useState(CURRENT_USER.preferences.autoRefresh)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(CURRENT_USER.preferences.autoRefreshInterval)
  const [soundNotifications, setSoundNotifications] = useState(CURRENT_USER.preferences.soundNotifications)
  const [compactMode, setCompactMode] = useState(CURRENT_USER.preferences.compactMode)
  
  // Notifications state
  const [emailNotifications, setEmailNotifications] = useState(CURRENT_USER.notifications.email)
  const [pushNotifications, setPushNotifications] = useState(CURRENT_USER.notifications.push)
  const [smsNotifications, setSmsNotifications] = useState(CURRENT_USER.notifications.sms)
  const [whatsappNotifications, setWhatsappNotifications] = useState(CURRENT_USER.notifications.whatsapp)

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

  const handleSaveProfile = () => {
    console.log('Saving profile:', {
      name, title, bio, location, phone, whatsappNumber
    })
  }

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      notify.error('Erro', 'As senhas não coincidem')
      return
    }
    console.log('Changing password')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleSavePreferences = () => {
    console.log('Saving preferences:', {
      theme, language, timezone, dateFormat, timeFormat, defaultView,
      conversationsPerPage, autoRefresh, autoRefreshInterval, 
      soundNotifications, compactMode
    })
  }

  const handleSaveNotifications = () => {
    console.log('Saving notifications:', {
      email: emailNotifications,
      push: pushNotifications,
      sms: smsNotifications,
      whatsapp: whatsappNotifications
    })
  }

  const handleUploadAvatar = () => {
    console.log('Upload avatar')
  }

  const handleVerifyEmail = () => {
    console.log('Verify email')
  }

  const handleVerifyPhone = () => {
    console.log('Verify phone')
  }

  const handleEnable2FA = () => {
    console.log('Enable 2FA')
    setTwoFactorEnabled(!twoFactorEnabled)
  }

  const handleLogoutSession = (sessionId: string) => {
    if (sessionId === '1') {
      notify.warning('Atenção', 'Não é possível encerrar a sessão atual')
      return
    }
    console.log('Logout session:', sessionId)
  }

  const handleLogoutAllSessions = () => {
    if (confirm('Tem certeza que deseja encerrar todas as outras sessões?')) {
      console.log('Logout all sessions')
    }
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

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-2xl font-bold">Meu Perfil</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie suas informações pessoais e preferências
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Perfil</TabsTrigger>
                <TabsTrigger value="security">Segurança</TabsTrigger>
                <TabsTrigger value="preferences">Preferências</TabsTrigger>
                <TabsTrigger value="notifications">Notificações</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                    <CardDescription>
                      Atualize suas informações básicas e foto de perfil
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        {CURRENT_USER.avatar ? (
                          <img 
                            src={CURRENT_USER.avatar} 
                            alt={CURRENT_USER.name}
                            className="w-20 h-20 rounded-full"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-8 w-8 text-primary" />
                          </div>
                        )}
                        <Button
                          size="sm"
                          className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                          onClick={handleUploadAvatar}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                      <div>
                        <h3 className="font-medium">{CURRENT_USER.name}</h3>
                        <p className="text-sm text-muted-foreground">{CURRENT_USER.email}</p>
                        <p className="text-sm text-muted-foreground">{CURRENT_USER.title}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="title">Cargo</Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="bio">Biografia</Label>
                        <Textarea
                          id="bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="location">Localização</Label>
                        <Input
                          id="location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <div className="flex gap-2">
                          <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                          {CURRENT_USER.phoneVerified ? (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verificado
                            </Badge>
                          ) : (
                            <Button variant="outline" size="sm" onClick={handleVerifyPhone}>
                              Verificar
                            </Button>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <Input
                          id="whatsapp"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label>Email</Label>
                        <div className="flex gap-2 items-center">
                          <Input value={CURRENT_USER.email} disabled />
                          {CURRENT_USER.emailVerified ? (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verificado
                            </Badge>
                          ) : (
                            <Button variant="outline" size="sm" onClick={handleVerifyEmail}>
                              Verificar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSaveProfile}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Alterações
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                {/* Password */}
                <Card>
                  <CardHeader>
                    <CardTitle>Alterar Senha</CardTitle>
                    <CardDescription>
                      Mantenha sua conta segura com uma senha forte
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="current-password">Senha Atual</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="new-password">Nova Senha</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleChangePassword}>
                        <Key className="h-4 w-4 mr-2" />
                        Alterar Senha
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Two Factor */}
                <Card>
                  <CardHeader>
                    <CardTitle>Autenticação de Dois Fatores</CardTitle>
                    <CardDescription>
                      Adicione uma camada extra de segurança à sua conta
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Autenticação de Dois Fatores</p>
                          <p className="text-sm text-muted-foreground">
                            {twoFactorEnabled 
                              ? 'Sua conta está protegida com 2FA' 
                              : 'Proteja sua conta com verificação adicional'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {twoFactorEnabled && (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        )}
                        <Switch
                          checked={twoFactorEnabled}
                          onCheckedChange={handleEnable2FA}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Active Sessions */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Sessões Ativas</CardTitle>
                        <CardDescription>
                          Gerencie onde você está conectado
                        </CardDescription>
                      </div>
                      <Button variant="outline" onClick={handleLogoutAllSessions}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Encerrar Outras Sessões
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {ACTIVE_SESSIONS.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{session.device}</p>
                              {session.isCurrent && (
                                <Badge variant="outline" className="text-green-600 border-green-200">
                                  Atual
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {session.location} • {session.ipAddress}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Última atividade: {formatDate(session.lastActivity)}
                            </p>
                          </div>
                        </div>
                        {!session.isCurrent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLogoutSession(session.id)}
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Aparência</CardTitle>
                    <CardDescription>
                      Personalize a interface do sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Tema</Label>
                        <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Claro</SelectItem>
                            <SelectItem value="dark">Escuro</SelectItem>
                            <SelectItem value="system">Sistema</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Idioma</Label>
                        <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pt">Português</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Fuso Horário</Label>
                        <Select value={timezone} onValueChange={setTimezone}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                            <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                            <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Formato de Data</Label>
                        <Select value={dateFormat} onValueChange={(v: any) => setDateFormat(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Formato de Hora</Label>
                        <Select value={timeFormat} onValueChange={(v: any) => setTimeFormat(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="24h">24 horas</SelectItem>
                            <SelectItem value="12h">12 horas (AM/PM)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Visualização Padrão</Label>
                        <Select value={defaultView} onValueChange={(v: any) => setDefaultView(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="list">Lista</SelectItem>
                            <SelectItem value="grid">Grade</SelectItem>
                            <SelectItem value="cards">Cards</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Modo Compacto</Label>
                          <p className="text-sm text-muted-foreground">
                            Interface mais densa com menos espaçamento
                          </p>
                        </div>
                        <Switch
                          checked={compactMode}
                          onCheckedChange={setCompactMode}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Notificações Sonoras</Label>
                          <p className="text-sm text-muted-foreground">
                            Reproduzir sons para notificações
                          </p>
                        </div>
                        <Switch
                          checked={soundNotifications}
                          onCheckedChange={setSoundNotifications}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Atualização Automática</Label>
                          <p className="text-sm text-muted-foreground">
                            Atualizar dados automaticamente
                          </p>
                        </div>
                        <Switch
                          checked={autoRefresh}
                          onCheckedChange={setAutoRefresh}
                        />
                      </div>

                      {autoRefresh && (
                        <div>
                          <Label htmlFor="refresh-interval">Intervalo de Atualização (segundos)</Label>
                          <Input
                            id="refresh-interval"
                            type="number"
                            min="10"
                            max="300"
                            value={autoRefreshInterval}
                            onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="conversations-per-page">Conversas por Página</Label>
                        <Select 
                          value={conversationsPerPage.toString()} 
                          onValueChange={(v) => setConversationsPerPage(Number(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSavePreferences}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Preferências
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6">
                {/* Email Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notificações por Email</CardTitle>
                    <CardDescription>
                      Configure quando receber emails do sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Ativar notificações por email</Label>
                        <p className="text-sm text-muted-foreground">
                          Receber emails de notificação
                        </p>
                      </div>
                      <Switch
                        checked={emailNotifications.enabled}
                        onCheckedChange={(checked) => 
                          setEmailNotifications(prev => ({ ...prev, enabled: checked }))
                        }
                      />
                    </div>

                    {emailNotifications.enabled && (
                      <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Novas mensagens</Label>
                            <Select 
                              value={emailNotifications.newMessage} 
                              onValueChange={(v: any) => 
                                setEmailNotifications(prev => ({ ...prev, newMessage: v }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="instant">Instantâneo</SelectItem>
                                <SelectItem value="hourly">A cada hora</SelectItem>
                                <SelectItem value="daily">Diário</SelectItem>
                                <SelectItem value="weekly">Semanal</SelectItem>
                                <SelectItem value="never">Nunca</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Novas conversas</Label>
                            <Select 
                              value={emailNotifications.newConversation} 
                              onValueChange={(v: any) => 
                                setEmailNotifications(prev => ({ ...prev, newConversation: v }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="instant">Instantâneo</SelectItem>
                                <SelectItem value="hourly">A cada hora</SelectItem>
                                <SelectItem value="daily">Diário</SelectItem>
                                <SelectItem value="weekly">Semanal</SelectItem>
                                <SelectItem value="never">Nunca</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Campanhas concluídas</Label>
                            <Select 
                              value={emailNotifications.campaignComplete} 
                              onValueChange={(v: any) => 
                                setEmailNotifications(prev => ({ ...prev, campaignComplete: v }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="instant">Instantâneo</SelectItem>
                                <SelectItem value="hourly">A cada hora</SelectItem>
                                <SelectItem value="daily">Diário</SelectItem>
                                <SelectItem value="weekly">Semanal</SelectItem>
                                <SelectItem value="never">Nunca</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Alertas do sistema</Label>
                            <Select 
                              value={emailNotifications.systemAlerts} 
                              onValueChange={(v: any) => 
                                setEmailNotifications(prev => ({ ...prev, systemAlerts: v }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="instant">Instantâneo</SelectItem>
                                <SelectItem value="hourly">A cada hora</SelectItem>
                                <SelectItem value="daily">Diário</SelectItem>
                                <SelectItem value="weekly">Semanal</SelectItem>
                                <SelectItem value="never">Nunca</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Relatório semanal</Label>
                            <Switch
                              checked={emailNotifications.weeklyReport}
                              onCheckedChange={(checked) => 
                                setEmailNotifications(prev => ({ ...prev, weeklyReport: checked }))
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label>Relatório mensal</Label>
                            <Switch
                              checked={emailNotifications.monthlyReport}
                              onCheckedChange={(checked) => 
                                setEmailNotifications(prev => ({ ...prev, monthlyReport: checked }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Push Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notificações Push</CardTitle>
                    <CardDescription>
                      Configure notificações do navegador
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Ativar notificações push</Label>
                        <p className="text-sm text-muted-foreground">
                          Receber notificações no navegador
                        </p>
                      </div>
                      <Switch
                        checked={pushNotifications.enabled}
                        onCheckedChange={(checked) => 
                          setPushNotifications(prev => ({ ...prev, enabled: checked }))
                        }
                      />
                    </div>

                    {pushNotifications.enabled && (
                      <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Novas mensagens</Label>
                            <Select 
                              value={pushNotifications.newMessage} 
                              onValueChange={(v: any) => 
                                setPushNotifications(prev => ({ ...prev, newMessage: v }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="instant">Instantâneo</SelectItem>
                                <SelectItem value="hourly">A cada hora</SelectItem>
                                <SelectItem value="daily">Diário</SelectItem>
                                <SelectItem value="never">Nunca</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Menções</Label>
                            <Select 
                              value={pushNotifications.mentions} 
                              onValueChange={(v: any) => 
                                setPushNotifications(prev => ({ ...prev, mentions: v }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="instant">Instantâneo</SelectItem>
                                <SelectItem value="hourly">A cada hora</SelectItem>
                                <SelectItem value="daily">Diário</SelectItem>
                                <SelectItem value="never">Nunca</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={handleSaveNotifications}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Notificações
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </AppLayout>
  )
}