import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Plataformas</CardTitle>
            <CardDescription>Configure as integrações com plataformas de mensagem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">💬</span>
                  <div>
                    <p className="font-medium">WhatsApp Business</p>
                    <p className="text-sm text-muted-foreground">Conectado</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Configurar</Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">📷</span>
                  <div>
                    <p className="font-medium">Instagram</p>
                    <p className="text-sm text-muted-foreground">Não conectado</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Conectar</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>Configure as preferências de notificação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Notificações por email</span>
                <Button variant="outline" size="sm">Ativo</Button>
              </div>
              <div className="flex items-center justify-between">
                <span>Notificações push</span>
                <Button variant="outline" size="sm">Ativo</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}