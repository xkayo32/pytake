import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Métricas e relatórios detalhados</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Conversas</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Total de Conversas</span>
                <span className="font-medium">1,234</span>
              </div>
              <div className="flex justify-between">
                <span>Conversas Resolvidas</span>
                <span className="font-medium">987</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de Resolução</span>
                <span className="font-medium">80%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance dos Agentes</CardTitle>
            <CardDescription>Tempo médio de resposta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Tempo Médio de Resposta</span>
                <span className="font-medium">2.3 min</span>
              </div>
              <div className="flex justify-between">
                <span>Primeira Resposta</span>
                <span className="font-medium">45 seg</span>
              </div>
              <div className="flex justify-between">
                <span>Tempo de Resolução</span>
                <span className="font-medium">15.4 min</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}