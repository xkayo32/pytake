'use client'

import { useState } from 'react'
import { 
  Save, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  Shield, 
  Clock, 
  HardDrive,
  Cloud,
  AlertTriangle,
  CheckCircle,
  XCircle,
  PlayCircle,
  Settings,
  Archive,
  Database,
  Users,
  MessageSquare,
  BarChart3,
  Workflow,
  Calendar,
  AlertCircle,
  Info,
  Zap
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

import { useBackup } from '@/lib/hooks/useBackup'

export function BackupSettings() {
  const {
    config,
    saveConfig,
    backups,
    currentBackup,
    currentRestore,
    lastBackupTime,
    nextBackupTime,
    stats,
    restoreOperations,
    createBackup,
    restoreFromBackup,
    deleteBackup,
    verifyBackup,
    cleanupOldBackups,
    isLoading,
    error,
    storageUsage,
    canCreateBackup,
    systemHealth
  } = useBackup()

  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [restoreType, setRestoreType] = useState<'full' | 'partial'>('full')
  const [selectedRestoreItems, setSelectedRestoreItems] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [backupToDelete, setBackupToDelete] = useState<string | null>(null)

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600'
      case 'in_progress': return 'text-blue-600'
      case 'failed': return 'text-red-600'
      case 'corrupted': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'in_progress': return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'failed': return <XCircle className="h-4 w-4" />
      case 'corrupted': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const handleCreateManualBackup = async () => {
    try {
      await createBackup(true)
    } catch (error) {
      console.error('Error creating backup:', error)
    }
  }

  const handleRestore = async () => {
    if (!selectedBackupForRestore) return

    try {
      await restoreFromBackup(
        selectedBackupForRestore,
        restoreType,
        restoreType === 'partial' ? selectedRestoreItems : undefined
      )
      setRestoreDialogOpen(false)
      setSelectedBackupForRestore(null)
      setSelectedRestoreItems([])
    } catch (error) {
      console.error('Error restoring backup:', error)
    }
  }

  const handleDeleteBackup = async () => {
    if (!backupToDelete) return

    try {
      await deleteBackup(backupToDelete)
      setDeleteDialogOpen(false)
      setBackupToDelete(null)
    } catch (error) {
      console.error('Error deleting backup:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Backup e Recuperação</h2>
          <p className="text-muted-foreground">
            Configure e monitore backups automáticos dos seus dados
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCreateManualBackup}
            disabled={!canCreateBackup}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Backup Manual
          </Button>
          <Button variant="outline" onClick={cleanupOldBackups} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Limpar Antigos
          </Button>
        </div>
      </div>

      {/* System Health Alert */}
      {systemHealth.needsAttention && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção Necessária</AlertTitle>
          <AlertDescription>
            {stats?.successRate && stats.successRate < 80 && 'Taxa de sucesso baixa nos backups recentes. '}
            {stats && (stats.storageUsed / stats.storageLimit) > 0.9 && 'Armazenamento quase lotado. '}
            Verifique as configurações e logs de backup.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Último Backup</p>
                <p className="text-2xl font-bold">
                  {lastBackupTime 
                    ? format(lastBackupTime, 'dd/MM HH:mm', { locale: ptBR })
                    : 'Nunca'
                  }
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Próximo Backup</p>
                <p className="text-2xl font-bold">
                  {nextBackupTime && config.enabled
                    ? format(nextBackupTime, 'dd/MM HH:mm', { locale: ptBR })
                    : 'Desabilitado'
                  }
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">
                  {stats ? `${Math.round(stats.successRate)}%` : '0%'}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Armazenamento</p>
                <p className="text-2xl font-bold">
                  {stats ? formatBytes(stats.storageUsed) : '0 B'}
                </p>
                <Progress value={storageUsage} className="mt-2" />
              </div>
              <HardDrive className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Operations */}
      {(currentBackup || currentRestore) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Operação em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentBackup && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Criando backup: {currentBackup.name}</span>
                  <Badge variant="outline">
                    {formatDuration(currentBackup.duration)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Tipo: {currentBackup.type === 'manual' ? 'Manual' : 'Automático'} • 
                  Destino: {currentBackup.location === 'cloud' ? 'Nuvem' : 'Local'}
                </div>
              </div>
            )}

            {currentRestore && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Restaurando backup</span>
                  <Badge variant="outline">
                    {Math.round(currentRestore.progress)}%
                  </Badge>
                </div>
                <Progress value={currentRestore.progress} />
                <div className="text-sm text-muted-foreground">
                  Tempo estimado: {currentRestore.estimatedTime ? `${currentRestore.estimatedTime}s restantes` : 'Calculando...'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="backups" className="space-y-6">
        <TabsList>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="restore">Restauração</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        {/* Backups List */}
        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Backups</CardTitle>
              <CardDescription>
                Lista de todos os backups criados no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <div
                      key={backup.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={getStatusColor(backup.status)}>
                          {getStatusIcon(backup.status)}
                        </div>
                        <div>
                          <p className="font-medium">{backup.name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              {format(backup.timestamp, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                            <span>{formatBytes(backup.size)}</span>
                            <span>{formatDuration(backup.duration)}</span>
                            <Badge variant="outline" className="text-xs">
                              {backup.location === 'cloud' ? 'Nuvem' : 'Local'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {backup.status === 'completed' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBackupForRestore(backup.id)
                                setRestoreDialogOpen(true)
                              }}
                              className="gap-2"
                            >
                              <Upload className="h-4 w-4" />
                              Restaurar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => verifyBackup(backup.id)}
                              className="gap-2"
                            >
                              <Shield className="h-4 w-4" />
                              Verificar
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBackupToDelete(backup.id)
                            setDeleteDialogOpen(true)
                          }}
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restore Operations */}
        <TabsContent value="restore">
          <Card>
            <CardHeader>
              <CardTitle>Operações de Restauração</CardTitle>
              <CardDescription>
                Histórico de restaurações realizadas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {restoreOperations.map((restore) => (
                    <div
                      key={restore.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={getStatusColor(restore.status)}>
                          {getStatusIcon(restore.status)}
                        </div>
                        <div>
                          <p className="font-medium">
                            Restauração {restore.restoreType === 'full' ? 'Completa' : 'Parcial'}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              {format(restore.timestamp, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                            <span>{restore.progress}% concluído</span>
                            {restore.restoreType === 'partial' && (
                              <span>{restore.selectedItems.length} itens</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {restore.status === 'completed' ? 'Concluída' :
                         restore.status === 'failed' ? 'Falhou' :
                         restore.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration */}
        <TabsContent value="config">
          <div className="space-y-6">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>
                  Configure quando e como os backups serão realizados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="backup-enabled">Backup Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar backup automático baseado na frequência configurada
                    </p>
                  </div>
                  <Switch
                    id="backup-enabled"
                    checked={config.enabled}
                    onCheckedChange={(enabled) => saveConfig({ enabled })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Frequência de Backup</Label>
                  <Select
                    value={config.frequency}
                    onValueChange={(frequency: any) => saveConfig({ frequency })}
                    disabled={!config.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">A cada hora</SelectItem>
                      <SelectItem value="daily">Diariamente</SelectItem>
                      <SelectItem value="weekly">Semanalmente</SelectItem>
                      <SelectItem value="monthly">Mensalmente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Retenção (quantidade de backups)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={config.retention}
                      onChange={(e) => saveConfig({ retention: parseInt(e.target.value) })}
                      min="1"
                      max="100"
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">backups</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-cleanup">Limpeza Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Remover backups antigos automaticamente
                    </p>
                  </div>
                  <Switch
                    id="auto-cleanup"
                    checked={config.autoCleanup}
                    onCheckedChange={(autoCleanup) => saveConfig({ autoCleanup })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Storage Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Armazenamento</CardTitle>
                <CardDescription>
                  Configure onde e como os backups serão armazenados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    <div>
                      <Label htmlFor="local-storage">Armazenamento Local</Label>
                      <p className="text-sm text-muted-foreground">
                        Salvar backups no servidor local
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="local-storage"
                    checked={config.storage.local}
                    onCheckedChange={(local) => saveConfig({
                      storage: { ...config.storage, local }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    <div>
                      <Label htmlFor="cloud-storage">Armazenamento em Nuvem</Label>
                      <p className="text-sm text-muted-foreground">
                        Salvar backups na nuvem (requer configuração)
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="cloud-storage"
                    checked={config.storage.cloud}
                    onCheckedChange={(cloud) => saveConfig({
                      storage: { ...config.storage, cloud }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="compression">Compressão</Label>
                    <p className="text-sm text-muted-foreground">
                      Comprimir backups para economizar espaço
                    </p>
                  </div>
                  <Switch
                    id="compression"
                    checked={config.compression}
                    onCheckedChange={(compression) => saveConfig({ compression })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <div>
                      <Label htmlFor="encryption">Criptografia</Label>
                      <p className="text-sm text-muted-foreground">
                        Criptografar backups para segurança adicional
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="encryption"
                    checked={config.encryption}
                    onCheckedChange={(encryption) => saveConfig({ encryption })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Data Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Dados para Backup</CardTitle>
                <CardDescription>
                  Selecione quais dados incluir nos backups automáticos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(config.include).map(([key, value]) => {
                  const getIcon = () => {
                    switch (key) {
                      case 'conversations': return <MessageSquare className="h-4 w-4" />
                      case 'contacts': return <Users className="h-4 w-4" />
                      case 'flows': return <Workflow className="h-4 w-4" />
                      case 'campaigns': return <Zap className="h-4 w-4" />
                      case 'analytics': return <BarChart3 className="h-4 w-4" />
                      case 'settings': return <Settings className="h-4 w-4" />
                      case 'users': return <Users className="h-4 w-4" />
                      default: return <Database className="h-4 w-4" />
                    }
                  }

                  const getLabel = () => {
                    switch (key) {
                      case 'conversations': return 'Conversas'
                      case 'contacts': return 'Contatos'
                      case 'flows': return 'Fluxos'
                      case 'campaigns': return 'Campanhas'
                      case 'analytics': return 'Relatórios'
                      case 'settings': return 'Configurações'
                      case 'users': return 'Usuários'
                      default: return key
                    }
                  }

                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getIcon()}
                        <Label htmlFor={`include-${key}`}>{getLabel()}</Label>
                      </div>
                      <Switch
                        id={`include-${key}`}
                        checked={value}
                        onCheckedChange={(checked) => saveConfig({
                          include: { ...config.include, [key]: checked }
                        })}
                      />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restaurar Backup</DialogTitle>
            <DialogDescription>
              Escolha o tipo de restauração que deseja realizar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Restauração</Label>
              <Select value={restoreType} onValueChange={(value: any) => setRestoreType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Restauração Completa</SelectItem>
                  <SelectItem value="partial">Restauração Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {restoreType === 'partial' && (
              <div className="space-y-2">
                <Label>Selecionar Itens</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(config.include).filter(([, enabled]) => enabled).map(([key]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`restore-${key}`}
                        checked={selectedRestoreItems.includes(key)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRestoreItems([...selectedRestoreItems, key])
                          } else {
                            setSelectedRestoreItems(selectedRestoreItems.filter(item => item !== key))
                          }
                        }}
                      />
                      <Label htmlFor={`restore-${key}`} className="capitalize">
                        {key}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                A restauração irá sobrescrever os dados atuais. Esta operação não pode ser desfeita.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRestore}
              disabled={restoreType === 'partial' && selectedRestoreItems.length === 0}
            >
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Backup</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este backup? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteBackup}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}