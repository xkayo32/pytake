'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, ArrowLeft, Play, Calendar, Users, Bot } from "lucide-react"
import Link from "next/link"

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              <MessageSquare className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-to-r gradient-text-primary bg-clip-text text-transparent">
                PyTake
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
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

      {/* Header */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r gradient-text-primary bg-clip-text text-transparent">
            Demonstração
          </h1>
          <p className="text-xl text-foreground-secondary mb-8 max-w-2xl mx-auto">
            Veja o PyTake em ação! Assista aos vídeos demonstrativos ou agende uma apresentação personalizada.
          </p>
        </div>
      </section>

      {/* Video Demo */}
      <section className="container mx-auto px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-video bg-slate-100 dark:bg-surface flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Visão Geral do PyTake</h3>
                  <p className="text-muted-foreground mb-4">
                    Vídeo de 5 minutos mostrando os principais recursos
                  </p>
                  <Button className="bg-primary hover:bg-primary/90">
                    Assistir Demonstração
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Demo Options */}
      <section className="container mx-auto px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Escolha sua Demonstração
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Video Tutorials */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle>Vídeos Tutoriais</CardTitle>
                <CardDescription>
                  Assista tutoriais passo a passo dos principais recursos
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li>• Configuração inicial (5 min)</li>
                  <li>• Criando fluxos (10 min)</li>
                  <li>• Integrações ERP (8 min)</li>
                  <li>• Analytics e relatórios (6 min)</li>
                </ul>
                <Button variant="outline" className="w-full">
                  Ver Tutoriais
                </Button>
              </CardContent>
            </Card>

            {/* Live Demo */}
            <Card className="hover:shadow-lg transition-shadow border-primary">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Demo Ao Vivo</CardTitle>
                <CardDescription>
                  Agende uma apresentação personalizada com nosso time
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li>• Apresentação de 30 minutos</li>
                  <li>• Customizada para seu negócio</li>
                  <li>• Tire todas suas dúvidas</li>
                  <li>• Consultoria gratuita</li>
                </ul>
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Agendar Demo
                </Button>
              </CardContent>
            </Card>

            {/* Sandbox */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle>Ambiente de Teste</CardTitle>
                <CardDescription>
                  Experimente o PyTake em um ambiente sandbox
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li>• Acesso completo por 1 hora</li>
                  <li>• Dados de exemplo pré-carregados</li>
                  <li>• Teste todos os recursos</li>
                  <li>• Sem necessidade de cadastro</li>
                </ul>
                <Button variant="outline" className="w-full">
                  Acessar Sandbox
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="bg-slate-50 dark:bg-surface/50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Interface do PyTake
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">Dashboard Intuitivo</h3>
                  <p className="text-muted-foreground mb-4">
                    Visualize todas as métricas importantes em um só lugar. Monitore conversas, 
                    campanhas e performance em tempo real.
                  </p>
                  <div className="aspect-video bg-white dark:bg-surface rounded-lg border flex items-center justify-center">
                    <span className="text-muted-foreground">Screenshot do Dashboard</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">Editor de Fluxos Visual</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie automações complexas com nosso editor drag & drop. 
                    Sem necessidade de programação.
                  </p>
                  <div className="aspect-video bg-white dark:bg-surface rounded-lg border flex items-center justify-center">
                    <span className="text-muted-foreground">Screenshot do Editor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl text-foreground-secondary mb-8">
            Experimente o PyTake gratuitamente por 14 dias. Sem cartão de crédito.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Começar Teste Grátis
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Agendar Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-background py-8">
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