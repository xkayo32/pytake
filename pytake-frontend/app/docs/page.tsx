'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, ArrowLeft, Book, Code, Zap, Users, Settings, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function DocsPage() {
  const sections = [
    {
      title: "Primeiros Passos",
      icon: <Zap className="h-6 w-6" />,
      articles: [
        { title: "Configuração Inicial", href: "#setup" },
        { title: "Conectar WhatsApp Business", href: "#whatsapp" },
        { title: "Criar Primeiro Fluxo", href: "#first-flow" },
        { title: "Configurar Equipe", href: "#team" }
      ]
    },
    {
      title: "Automação",
      icon: <Code className="h-6 w-6" />,
      articles: [
        { title: "Criando Fluxos", href: "#flows" },
        { title: "Condições e Triggers", href: "#conditions" },
        { title: "Variáveis Dinâmicas", href: "#variables" },
        { title: "Integração com IA", href: "#ai" }
      ]
    },
    {
      title: "Gestão de Contatos",
      icon: <Users className="h-6 w-6" />,
      articles: [
        { title: "Importar Contatos", href: "#import" },
        { title: "Segmentação", href: "#segments" },
        { title: "Tags e Filtros", href: "#tags" },
        { title: "LGPD e Privacidade", href: "#privacy" }
      ]
    },
    {
      title: "Analytics",
      icon: <BarChart3 className="h-6 w-6" />,
      articles: [
        { title: "Dashboards", href: "#dashboard" },
        { title: "Relatórios Personalizados", href: "#reports" },
        { title: "Métricas de Performance", href: "#metrics" },
        { title: "Exportação de Dados", href: "#export" }
      ]
    },
    {
      title: "Integrações",
      icon: <Settings className="h-6 w-6" />,
      articles: [
        { title: "API REST", href: "#api" },
        { title: "Webhooks", href: "#webhooks" },
        { title: "ERP Systems", href: "#erp" },
        { title: "Zapier/Make", href: "#automation" }
      ]
    },
    {
      title: "Suporte",
      icon: <Book className="h-6 w-6" />,
      articles: [
        { title: "FAQ", href: "#faq" },
        { title: "Troubleshooting", href: "#troubleshooting" },
        { title: "Contato", href: "#contact" },
        { title: "Status da Plataforma", href: "#status" }
      ]
    }
  ]

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
            Documentação
          </h1>
          <p className="text-xl text-foreground-secondary mb-8 max-w-2xl mx-auto">
            Guias completos, tutoriais e referência da API para você aproveitar ao máximo o PyTake.
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar na documentação..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Documentation Sections */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {sections.map((section, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {section.icon}
                  </div>
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.articles.map((article, articleIndex) => (
                    <li key={articleIndex}>
                      <Link 
                        href={article.href}
                        className="text-muted-foreground hover:text-primary transition-colors block py-1"
                      >
                        {article.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="bg-slate-50 dark:bg-surface/50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Guia de Início Rápido
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Configure sua conta</h3>
                    <p className="text-muted-foreground">
                      Crie sua conta gratuita e configure suas informações básicas.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Conecte o WhatsApp</h3>
                    <p className="text-muted-foreground">
                      Integre sua conta WhatsApp Business para começar a automatizar.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Crie seu primeiro fluxo</h3>
                    <p className="text-muted-foreground">
                      Use nosso editor visual para criar automações inteligentes.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-surface rounded-lg p-6">
                <h3 className="font-semibold mb-4">Recursos Populares</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="#api" className="text-primary hover:underline">
                      → Documentação da API
                    </Link>
                  </li>
                  <li>
                    <Link href="#webhooks" className="text-primary hover:underline">
                      → Como configurar Webhooks
                    </Link>
                  </li>
                  <li>
                    <Link href="#flows" className="text-primary hover:underline">
                      → Criando fluxos avançados
                    </Link>
                  </li>
                  <li>
                    <Link href="#integrations" className="text-primary hover:underline">
                      → Integrações disponíveis
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
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