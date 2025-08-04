import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  TestTube,
  Globe,
  Bell,
  Shield,
  Save,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  User,
  Palette,
  Database,
  Zap,
  Check,
  X
} from 'lucide-react'
import { PageHeader, PageSection } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/store/slices/authSlice'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/hooks/useToast'

interface WhatsAppInstance {
  id: string
  name: string
  phone: string
  status: 'connected' | 'disconnected' | 'connecting'
  type: 'official' | 'evolution'
  webhook: string
  token: string
  lastActivity: Date
}

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { theme: currentTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'profile' | 'instances' | 'notifications' | 'appearance' | 'integrations' | 'security'>('profile')
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  
  // Profile state
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '+55 11 99999-9999',
    organization: 'PyChat Solutions',
    role: user?.role || 'Agent'
  })

  // Appearance state
  const [primaryColor, setPrimaryColor] = useState('#10b981')
  
  const [instances, setInstances] = useState<WhatsAppInstance[]>([
    {
      id: '1',
      name: 'Vendas Principal',
      phone: '+55 11 99999-9999',
      status: 'connected',
      type: 'official',
      webhook: 'https://api.pychat.com/webhook/whatsapp/1',
      token: 'whatsapp_token_abc123...',
      lastActivity: new Date()
    },
    {
      id: '2',
      name: 'Suporte Técnico',
      phone: '+55 11 88888-8888',
      status: 'connected',
      type: 'evolution',
      webhook: 'https://api.pychat.com/webhook/evolution/2',
      token: 'evolution_token_def456...',
      lastActivity: new Date(Date.now() - 600000)
    }
  ])

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'instances', label: 'WhatsApp', icon: Smartphone },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'integrations', label: 'Integrações', icon: Database },
    { id: 'security', label: 'Segurança', icon: Shield }
  ] as const

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate save
    setTimeout(() => {
      setIsSaving(false)
      // Show success toast
    }, 1500)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Show copied toast
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie suas preferências e configurações do sistema"
        icon={Settings}
        actions={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        }
      />

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <PageSection
              title="Informações Pessoais"
              description="Atualize suas informações de perfil"
              className="bg-card rounded-xl border border-border/50 p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome completo</label>
                  <Input 
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone</label>
                  <Input 
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organização</label>
                  <Input 
                    value={profile.organization}
                    disabled
                    className="bg-muted"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Função</label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={profile.role}
                      disabled
                      className="bg-muted"
                    />
                    <Badge variant="secondary">{profile.role}</Badge>
                  </div>
                </div>
              </div>
            </PageSection>
          </motion.div>
        )}

        {/* WhatsApp Instances Tab */}
        {activeTab === 'instances' && (
          <motion.div
            key="instances"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <PageSection
              title="Instâncias WhatsApp"
              description="Gerencie suas conexões WhatsApp Business"
              actions={
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Instância
                </Button>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {instances.map((instance, index) => (
                  <motion.div
                    key={instance.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-card rounded-xl border border-border/50 p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Smartphone className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{instance.name}</h3>
                          <p className="text-sm text-muted-foreground">{instance.phone}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={instance.status === 'connected' ? 'default' : 'secondary'}
                        className={
                          instance.status === 'connected' 
                            ? 'bg-green-500' 
                            : instance.status === 'connecting'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }
                      >
                        {instance.status === 'connected' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {instance.status === 'connecting' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                        {instance.status === 'disconnected' && <XCircle className="h-3 w-3 mr-1" />}
                        {instance.status}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Webhook URL</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input 
                            value={instance.webhook} 
                            readOnly 
                            className="text-xs h-8"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => copyToClipboard(instance.webhook)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">Token de Acesso</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input 
                            value={showTokens[instance.id] ? instance.token : '••••••••••••••••'}
                            readOnly 
                            className="text-xs h-8 font-mono"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setShowTokens(prev => ({ ...prev, [instance.id]: !prev[instance.id] }))}
                          >
                            {showTokens[instance.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => copyToClipboard(instance.token)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">
                          Última atividade há {Math.floor((Date.now() - instance.lastActivity.getTime()) / 60000)} min
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-7">
                            <TestTube className="h-3 w-3 mr-1" />
                            Testar
                          </Button>
                          <Button variant="outline" size="sm" className="h-7">
                            <Edit3 className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </PageSection>
          </motion.div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PageSection
                title="Notificações do Sistema"
                description="Alertas sobre o funcionamento do sistema"
                className="bg-card rounded-xl border border-border/50 p-6"
              >
                <div className="space-y-4">
                  {[
                    { label: 'Conexões perdidas', desc: 'Quando uma instância desconectar', enabled: true },
                    { label: 'Erros de webhook', desc: 'Falhas no recebimento de mensagens', enabled: true },
                    { label: 'Atualizações', desc: 'Novas versões e funcionalidades', enabled: false },
                    { label: 'Manutenção', desc: 'Avisos de manutenção programada', enabled: true }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch defaultChecked={item.enabled} />
                    </motion.div>
                  ))}
                </div>
              </PageSection>

              <PageSection
                title="Notificações de Conversas"
                description="Alertas sobre mensagens e atendimentos"
                className="bg-card rounded-xl border border-border/50 p-6"
              >
                <div className="space-y-4">
                  {[
                    { label: 'Novas mensagens', desc: 'Notificar mensagens não lidas', enabled: true },
                    { label: 'Menções', desc: 'Quando você for mencionado', enabled: true },
                    { label: 'SLA', desc: 'Tempo de resposta excedido', enabled: true },
                    { label: 'Transferências', desc: 'Conversas transferidas para você', enabled: true }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch defaultChecked={item.enabled} />
                    </motion.div>
                  ))}
                </div>
              </PageSection>
            </div>
          </motion.div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <motion.div
            key="appearance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <PageSection
              title="Tema e Cores"
              description="Personalize a aparência do sistema"
              className="bg-card rounded-xl border border-border/50 p-6"
            >
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-3 block">Tema</label>
                  <ThemeToggle />
                  <p className="text-xs text-muted-foreground mt-2">
                    Tema atual: {currentTheme === 'system' ? 'Sistema' : currentTheme === 'light' ? 'Claro' : 'Escuro'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">Cor Principal</label>
                  <div className="grid grid-cols-6 gap-3">
                    {[
                      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => setPrimaryColor(color)}
                        className={`h-12 rounded-lg border-2 transition-all ${
                          primaryColor === color
                            ? 'border-foreground scale-110'
                            : 'border-border hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {primaryColor === color && (
                          <Check className="h-4 w-4 text-white mx-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PageSection>
          </motion.div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <motion.div
            key="integrations"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <PageSection
              title="Integrações Disponíveis"
              description="Conecte ferramentas externas ao PyChat"
              className="bg-card rounded-xl border border-border/50 p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    name: 'Zapier',
                    desc: 'Automatize fluxos de trabalho',
                    icon: Zap,
                    connected: true,
                    color: 'text-orange-500'
                  },
                  {
                    name: 'Google Sheets',
                    desc: 'Exporte dados para planilhas',
                    icon: Database,
                    connected: false,
                    color: 'text-green-500'
                  },
                  {
                    name: 'Slack',
                    desc: 'Receba notificações no Slack',
                    icon: Bell,
                    connected: true,
                    color: 'text-purple-500'
                  },
                  {
                    name: 'HubSpot',
                    desc: 'Sincronize contatos e conversas',
                    icon: Globe,
                    connected: false,
                    color: 'text-blue-500'
                  }
                ].map((integration, index) => {
                  const Icon = integration.icon
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-muted rounded-lg flex items-center justify-center ${integration.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{integration.name}</p>
                          <p className="text-xs text-muted-foreground">{integration.desc}</p>
                        </div>
                      </div>
                      <Button
                        variant={integration.connected ? 'outline' : 'default'}
                        size="sm"
                      >
                        {integration.connected ? 'Configurar' : 'Conectar'}
                      </Button>
                    </motion.div>
                  )
                })}
              </div>
            </PageSection>
          </motion.div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PageSection
                title="Autenticação"
                description="Configurações de segurança da conta"
                className="bg-card rounded-xl border border-border/50 p-6"
              >
                <div className="space-y-4">
                  {[
                    { label: 'Autenticação em dois fatores', desc: 'Adicione uma camada extra de segurança', enabled: false },
                    { label: 'Sessões múltiplas', desc: 'Permitir login em vários dispositivos', enabled: true },
                    { label: 'Logout automático', desc: 'Desconectar após 30 min de inatividade', enabled: true },
                    { label: 'Notificar novos logins', desc: 'Receba alertas de novos acessos', enabled: false }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch defaultChecked={item.enabled} />
                    </motion.div>
                  ))}
                </div>
              </PageSection>

              <PageSection
                title="Senha e Acesso"
                description="Gerencie sua senha e métodos de acesso"
                className="bg-card rounded-xl border border-border/50 p-6"
              >
                <div className="space-y-4">
                  <div>
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="h-4 w-4 mr-2" />
                      Alterar Senha
                    </Button>
                  </div>
                  <div>
                    <Button variant="outline" className="w-full justify-start">
                      <Smartphone className="h-4 w-4 mr-2" />
                      Dispositivos Conectados
                    </Button>
                  </div>
                  <div>
                    <Button variant="outline" className="w-full justify-start">
                      <Globe className="h-4 w-4 mr-2" />
                      Histórico de Acesso
                    </Button>
                  </div>
                </div>
              </PageSection>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}