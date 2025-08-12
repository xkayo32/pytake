'use client'

import { Button } from "@/components/ui/button"
import { MessageSquare, Bot, BarChart3, Shield, Zap, Users } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              PyTake
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/docs">
              <Button variant="ghost">Documentação</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost">Preços</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
            Automatize seu WhatsApp Business
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Plataforma completa para gerenciar conversas, criar fluxos automatizados e integrar com sistemas ERP. 
            Aumente suas vendas e melhore o atendimento.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Teste Grátis por 14 Dias
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline">
                Ver Demonstração
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Recursos Poderosos para seu Negócio
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Bot className="h-10 w-10 text-primary" />}
            title="Automação Inteligente"
            description="Crie fluxos visuais com drag & drop. Respostas automáticas baseadas em IA."
          />
          <FeatureCard
            icon={<Users className="h-10 w-10 text-primary" />}
            title="Multi-atendentes"
            description="Distribua conversas entre sua equipe. Gerencie permissões e horários."
          />
          <FeatureCard
            icon={<BarChart3 className="h-10 w-10 text-primary" />}
            title="Analytics Completo"
            description="Dashboards em tempo real. Métricas de atendimento e vendas."
          />
          <FeatureCard
            icon={<Zap className="h-10 w-10 text-primary" />}
            title="Integrações ERP"
            description="Conecte com HubSoft, IXCSoft, MkSolutions e outros sistemas."
          />
          <FeatureCard
            icon={<MessageSquare className="h-10 w-10 text-primary" />}
            title="Campanhas em Massa"
            description="Envie mensagens segmentadas. Templates aprovados pelo WhatsApp."
          />
          <FeatureCard
            icon={<Shield className="h-10 w-10 text-primary" />}
            title="Segurança LGPD"
            description="Dados criptografados. Conformidade total com LGPD/GDPR."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/10 dark:bg-primary/20 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para transformar seu atendimento?
          </h2>
          <p className="text-xl mb-8 text-muted-foreground">
            Junte-se a mais de 1.000 empresas que já automatizaram seu WhatsApp
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Começar Agora - É Grátis!
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-slate-900 py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <span className="font-semibold">PyTake © 2024</span>
            </div>
            <div className="flex gap-6">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">
                Termos
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">
                Privacidade
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">
                Contato
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}