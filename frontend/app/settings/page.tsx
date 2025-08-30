'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppLayout } from '@/components/layout/app-layout'
import { NotificationsSettings } from '@/components/settings/notifications-settings'
import { 
  Bell, 
  User, 
  Shield, 
  Palette, 
  Webhook,
  Database,
  Settings as SettingsIcon,
  Zap
} from 'lucide-react'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('general')

  // Set active tab from URL parameter
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const settingsTabs = [
    {
      id: 'general',
      label: 'Geral',
      icon: SettingsIcon,
      description: 'Configurações básicas da conta'
    },
    {
      id: 'notifications',
      label: 'Notificações',
      icon: Bell,
      description: 'Gerenciar alertas e sons'
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: User,
      description: 'Informações pessoais e preferências'
    },
    {
      id: 'security',
      label: 'Segurança',
      icon: Shield,
      description: 'Senhas e autenticação'
    },
    {
      id: 'appearance',
      label: 'Aparência',
      icon: Palette,
      description: 'Temas e personalização'
    },
    {
      id: 'integrations',
      label: 'Integrações',
      icon: Webhook,
      description: 'APIs e webhooks'
    },
    {
      id: 'data',
      label: 'Dados',
      icon: Database,
      description: 'Backup e exportação'
    },
    {
      id: 'automations',
      label: 'Automações',
      icon: Zap,
      description: 'Fluxos e triggers'
    }
  ]

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas preferências e configurações do sistema
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto p-1">
            {settingsTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex flex-col gap-1 py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <tab.icon className="h-4 w-4" />
                <span className="text-xs hidden sm:block">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Gerais</CardTitle>
                  <CardDescription>
                    Configurações básicas da sua conta e preferências globais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    As configurações gerais estarão disponíveis em breve.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <NotificationsSettings />
          </TabsContent>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Perfil</CardTitle>
                <CardDescription>
                  Gerencie suas informações pessoais e preferências de conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  As configurações de perfil estarão disponíveis em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Segurança</CardTitle>
                <CardDescription>
                  Gerencie senhas, autenticação de dois fatores e outras configurações de segurança
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  As configurações de segurança estarão disponíveis em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Aparência</CardTitle>
                <CardDescription>
                  Personalize a aparência da interface, temas e cores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  As configurações de aparência estarão disponíveis em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Settings */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Integrações</CardTitle>
                <CardDescription>
                  Configure APIs, webhooks e integrações com sistemas externos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  As configurações de integrações estarão disponíveis em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Settings */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de Dados</CardTitle>
                <CardDescription>
                  Backup, exportação e gerenciamento dos seus dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  As configurações de dados estarão disponíveis em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automations Settings */}
          <TabsContent value="automations">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Automações</CardTitle>
                <CardDescription>
                  Configure comportamentos padrão para fluxos e automações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  As configurações de automações estarão disponíveis em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}