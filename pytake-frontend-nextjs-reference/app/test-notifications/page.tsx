'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { notify } from '@/lib/utils'
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export default function TestNotificationsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sistema de Notificações</CardTitle>
          <CardDescription>
            Teste o novo sistema de notificações do PyTake
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => notify.success('Operação realizada!', 'Tudo funcionou perfeitamente')}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Notificação de Sucesso
            </Button>

            <Button
              onClick={() => notify.error('Erro ao processar', 'Verifique os dados e tente novamente')}
              variant="destructive"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Notificação de Erro
            </Button>

            <Button
              onClick={() => notify.warning('Atenção necessária', 'Alguns itens precisam de revisão')}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Notificação de Aviso
            </Button>

            <Button
              onClick={() => notify.info('Informação importante', 'Nova atualização disponível')}
              variant="secondary"
            >
              <Info className="h-4 w-4 mr-2" />
              Notificação de Info
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Exemplos de Uso:</h3>
            <pre className="bg-slate-950 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`import { notify } from '@/lib/utils'

// Sucesso
notify.success('Configuração salva!')

// Erro
notify.error('Falha na conexão', 'Verifique suas credenciais')

// Aviso
notify.warning('Token expirando em breve')

// Informação
notify.info('Nova mensagem recebida')`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}