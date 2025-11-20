'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Forbidden403Page() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-full"></div>
            <div className="relative bg-red-500/10 border border-red-500/20 rounded-full p-6">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">403</h1>
          <h2 className="text-2xl font-semibold text-muted-foreground">
            Acesso Negado
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Você não tem permissão para acessar este recurso. Verifique suas permissões ou entre em contato com o administrador.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Voltar ao Dashboard
          </Button>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="w-full"
          >
            Página Anterior
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-muted-foreground/70 pt-4 border-t">
          Se acredita que isso é um erro, entre em contato com o suporte.
        </p>
      </div>
    </div>
  )
}
