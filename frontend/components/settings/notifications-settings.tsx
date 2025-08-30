'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Monitor, 
  Moon, 
  Sun,
  TestTube,
  Settings,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useNotifications, type NotificationConfig } from '@/lib/hooks/useNotifications'
import { soundGenerator } from '@/lib/utils/soundGenerator'

export function NotificationsSettings() {
  const {
    permission,
    config,
    isSupported,
    requestPermission,
    saveConfig,
    playSound,
    notifyNewMessage
  } = useNotifications()

  const [localConfig, setLocalConfig] = useState<NotificationConfig>(config)
  const [hasChanges, setHasChanges] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  // Sync with hook config
  useEffect(() => {
    setLocalConfig(config)
    setHasChanges(false)
  }, [config])

  // Handle config changes
  const handleConfigChange = (key: keyof NotificationConfig, value: any) => {
    const newConfig = { ...localConfig, [key]: value }
    setLocalConfig(newConfig)
    setHasChanges(true)
  }

  const handleNestedConfigChange = (parent: keyof NotificationConfig, key: string, value: any) => {
    const newConfig = {
      ...localConfig,
      [parent]: {
        ...(localConfig[parent] as any),
        [key]: value
      }
    }
    setLocalConfig(newConfig)
    setHasChanges(true)
  }

  // Save changes
  const handleSave = () => {
    saveConfig(localConfig)
    setHasChanges(false)
    setTestResult('✅ Configurações salvas com sucesso!')
    setTimeout(() => setTestResult(null), 3000)
  }

  // Reset to defaults
  const handleReset = () => {
    const defaultConfig: NotificationConfig = {
      enabled: true,
      sound: true,
      desktop: true,
      badge: true,
      vibrate: false,
      volume: 0.7,
      doNotDisturb: {
        enabled: false,
        startTime: "22:00",
        endTime: "08:00"
      }
    }
    setLocalConfig(defaultConfig)
    setHasChanges(true)
  }

  // Test notification
  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) {
        setTestResult('❌ Permissão negada para notificações')
        setTimeout(() => setTestResult(null), 3000)
        return
      }
    }

    // Test with sample data
    notifyNewMessage('João Silva', 'Esta é uma mensagem de teste para verificar as notificações!', 'test-id')
    setTestResult('🔔 Notificação de teste enviada!')
    setTimeout(() => setTestResult(null), 3000)
  }

  // Test sound
  const handleTestSound = async () => {
    await soundGenerator.generateSounds()
    await soundGenerator.playSound('message', localConfig.volume)
    setTestResult('🔊 Som de teste reproduzido!')
    setTimeout(() => setTestResult(null), 3000)
  }

  // Request permission
  const handleRequestPermission = async () => {
    const granted = await requestPermission()
    setTestResult(granted ? '✅ Permissão concedida!' : '❌ Permissão negada')
    setTimeout(() => setTestResult(null), 3000)
  }

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { icon: <CheckCircle className="h-4 w-4 text-green-600" />, text: 'Concedida', color: 'text-green-600' }
      case 'denied':
        return { icon: <AlertCircle className="h-4 w-4 text-red-600" />, text: 'Negada', color: 'text-red-600' }
      default:
        return { icon: <AlertCircle className="h-4 w-4 text-yellow-600" />, text: 'Não solicitada', color: 'text-yellow-600' }
    }
  }

  const permissionStatus = getPermissionStatus()

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações não suportadas
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push. Considere atualizar para uma versão mais recente.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Status das Notificações
          </CardTitle>
          <CardDescription>
            Gerencie as permissões e configurações de notificações do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {permissionStatus.icon}
              <span className={`font-medium ${permissionStatus.color}`}>
                {permissionStatus.text}
              </span>
            </div>
            {permission !== 'granted' && (
              <Button onClick={handleRequestPermission} variant="outline">
                Solicitar Permissão
              </Button>
            )}
          </div>
          
          {testResult && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">{testResult}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Ativar Notificações</Label>
              <p className="text-sm text-muted-foreground">
                Habilita ou desabilita todas as notificações
              </p>
            </div>
            <Switch
              id="enabled"
              checked={localConfig.enabled}
              onCheckedChange={(checked) => handleConfigChange('enabled', checked)}
            />
          </div>

          <Separator />

          {/* Desktop Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="desktop" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Notificações na Área de Trabalho
              </Label>
              <p className="text-sm text-muted-foreground">
                Mostra notificações do sistema operacional
              </p>
            </div>
            <Switch
              id="desktop"
              checked={localConfig.desktop}
              onCheckedChange={(checked) => handleConfigChange('desktop', checked)}
              disabled={!localConfig.enabled}
            />
          </div>

          {/* Sound Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound" className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Sons de Notificação
                </Label>
                <p className="text-sm text-muted-foreground">
                  Reproduz sons quando receber notificações
                </p>
              </div>
              <Switch
                id="sound"
                checked={localConfig.sound}
                onCheckedChange={(checked) => handleConfigChange('sound', checked)}
                disabled={!localConfig.enabled}
              />
            </div>

            {/* Volume Control */}
            {localConfig.sound && (
              <div className="space-y-2 ml-6">
                <Label htmlFor="volume" className="text-sm">
                  Volume: {Math.round(localConfig.volume * 100)}%
                </Label>
                <div className="flex items-center gap-3">
                  <VolumeX className="h-4 w-4" />
                  <Slider
                    id="volume"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[localConfig.volume]}
                    onValueChange={([value]) => handleConfigChange('volume', value)}
                    className="flex-1"
                  />
                  <Volume2 className="h-4 w-4" />
                </div>
                <Button
                  onClick={handleTestSound}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <TestTube className="h-3 w-3 mr-1" />
                  Testar Som
                </Button>
              </div>
            )}
          </div>

          {/* Badge Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="badge">Badge na Tab</Label>
              <p className="text-sm text-muted-foreground">
                Mostra contador de mensagens não lidas no título da tab
              </p>
            </div>
            <Switch
              id="badge"
              checked={localConfig.badge}
              onCheckedChange={(checked) => handleConfigChange('badge', checked)}
              disabled={!localConfig.enabled}
            />
          </div>

          {/* Vibrate (Mobile) */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="vibrate" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Vibração (Mobile)
              </Label>
              <p className="text-sm text-muted-foreground">
                Vibra o dispositivo ao receber notificações
              </p>
            </div>
            <Switch
              id="vibrate"
              checked={localConfig.vibrate}
              onCheckedChange={(checked) => handleConfigChange('vibrate', checked)}
              disabled={!localConfig.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Do Not Disturb */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Modo Silencioso
          </CardTitle>
          <CardDescription>
            Configure horários para não receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dnd">Ativar Modo Silencioso</Label>
              <p className="text-sm text-muted-foreground">
                Desativa notificações em horários específicos
              </p>
            </div>
            <Switch
              id="dnd"
              checked={localConfig.doNotDisturb.enabled}
              onCheckedChange={(checked) => 
                handleNestedConfigChange('doNotDisturb', 'enabled', checked)
              }
              disabled={!localConfig.enabled}
            />
          </div>

          {localConfig.doNotDisturb.enabled && (
            <div className="grid grid-cols-2 gap-4 ml-6">
              <div className="space-y-2">
                <Label htmlFor="start-time">Início</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={localConfig.doNotDisturb.startTime}
                  onChange={(e) => 
                    handleNestedConfigChange('doNotDisturb', 'startTime', e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">Fim</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={localConfig.doNotDisturb.endTime}
                  onChange={(e) => 
                    handleNestedConfigChange('doNotDisturb', 'endTime', e.target.value)
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Testes e Ações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleTestNotification}
              variant="outline"
              disabled={permission !== 'granted'}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Testar Notificação
            </Button>
            
            <Button
              onClick={handleReset}
              variant="outline"
            >
              Restaurar Padrões
            </Button>
          </div>

          {hasChanges && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Você tem alterações não salvas
              </span>
              <Button onClick={handleSave} size="sm" className="ml-auto">
                Salvar Alterações
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}