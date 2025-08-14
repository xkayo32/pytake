'use client'

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { MessageSquare, Bot, BarChart3, Shield, Zap, Users, Star, Check, ArrowRight, Play, TrendingUp, Clock, Globe } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header fixo */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container-responsive">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold gradient-text-primary">
                PyTake
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/docs" className="text-foreground-secondary hover:text-primary transition-colors">
                Docs
              </Link>
              <Link href="#pricing" className="text-foreground-secondary hover:text-primary transition-colors">
                Preços
              </Link>
              <Link href="/contact" className="text-foreground-secondary hover:text-primary transition-colors">
                Contato
              </Link>
            </nav>

            {/* CTAs + Theme Toggle */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button className="btn-primary text-sm px-4 py-2">
                  Começar Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 fade-in-up">
        <div className="container-responsive">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 gradient-text-primary leading-tight">
              Automatize seu WhatsApp Business
            </h1>
            <p className="text-lg md:text-xl text-foreground-secondary mb-8 max-w-3xl mx-auto leading-relaxed">
              Plataforma completa para gerenciar conversas, criar fluxos automatizados e integrar com sistemas ERP. 
              Aumente suas vendas e melhore o atendimento com IA avançada.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/register">
                <Button className="btn-primary text-lg px-8 py-4 w-full sm:w-auto">
                  Teste Grátis por 14 Dias
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" className="text-lg px-8 py-4 w-full sm:w-auto border-2 hover:bg-surface">
                  <Play className="mr-2 h-5 w-5" />
                  Ver Demonstração
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">10k+</div>
                <div className="text-sm text-foreground-tertiary">Empresas ativas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">50M+</div>
                <div className="text-sm text-foreground-tertiary">Mensagens enviadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">99.9%</div>
                <div className="text-sm text-foreground-tertiary">Uptime garantido</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">24/7</div>
                <div className="text-sm text-foreground-tertiary">Suporte premium</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-surface">
        <div className="container-responsive">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Recursos Poderosos para seu Negócio
            </h2>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
              Tudo que você precisa para automatizar e escalar seu atendimento via WhatsApp
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Bot className="h-12 w-12 text-primary" />}
              title="Automação com IA"
              description="Crie fluxos inteligentes com drag & drop. Respostas automáticas baseadas em ChatGPT e Claude."
            />
            <FeatureCard
              icon={<Users className="h-12 w-12 text-primary" />}
              title="Multi-atendentes"
              description="Distribua conversas entre sua equipe. Gerencie permissões, horários e departamentos."
            />
            <FeatureCard
              icon={<BarChart3 className="h-12 w-12 text-primary" />}
              title="Analytics Avançado"
              description="Dashboards em tempo real. Métricas detalhadas de atendimento, vendas e performance."
            />
            <FeatureCard
              icon={<Zap className="h-12 w-12 text-primary" />}
              title="Integrações ERP"
              description="Conecte com HubSoft, IXCSoft, MkSolutions, SisGP e outros sistemas empresariais."
            />
            <FeatureCard
              icon={<MessageSquare className="h-12 w-12 text-primary" />}
              title="Campanhas em Massa"
              description="Envie mensagens segmentadas. Templates oficiais aprovados pelo WhatsApp Business."
            />
            <FeatureCard
              icon={<Shield className="h-12 w-12 text-primary" />}
              title="Segurança LGPD"
              description="Dados criptografados end-to-end. Conformidade total com LGPD, GDPR e SOC2."
            />
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20">
        <div className="container-responsive">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Veja o PyTake em Ação
              </h2>
              <p className="text-lg text-foreground-secondary">
                Interface intuitiva e recursos profissionais para sua empresa
              </p>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-surface to-surface-secondary p-8 border">
              <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <Play className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Demo Interativo</h3>
                  <p className="text-foreground-secondary">Assista como o PyTake transforma seu atendimento</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-surface">
        <div className="container-responsive">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Planos para Todos os Tamanhos
            </h2>
            <p className="text-lg text-foreground-secondary">
              Escolha o plano ideal para seu negócio. Sem taxas ocultas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              title="Starter"
              price="29"
              period="mês"
              description="Perfeito para pequenos negócios"
              features={[
                "Até 1.000 contatos",
                "5.000 mensagens/mês",
                "Fluxos básicos",
                "2 atendentes",
                "Suporte por email"
              ]}
              popular={false}
            />
            
            <PricingCard
              title="Professional"
              price="99"
              period="mês"
              description="Ideal para empresas em crescimento"
              features={[
                "Até 10.000 contatos",
                "50.000 mensagens/mês",
                "Fluxos avançados com IA",
                "10 atendentes",
                "Integrações ERP",
                "Analytics completo",
                "Suporte prioritário"
              ]}
              popular={true}
            />
            
            <PricingCard
              title="Enterprise"
              price="299"
              period="mês"
              description="Para grandes operações"
              features={[
                "Contatos ilimitados",
                "Mensagens ilimitadas",
                "IA personalizada",
                "Atendentes ilimitados",
                "Todas as integrações",
                "Relatórios customizados",
                "Suporte 24/7",
                "Gerente de conta"
              ]}
              popular={false}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container-responsive">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para Transformar seu Atendimento?
            </h2>
            <p className="text-lg text-foreground-secondary mb-8">
              Junte-se a mais de 10.000 empresas que já automatizaram seu WhatsApp Business com o PyTake
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button className="btn-primary text-lg px-8 py-4 w-full sm:w-auto">
                  Começar Agora - É Grátis!
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="text-lg px-8 py-4 w-full sm:w-auto border-2">
                  Falar com Especialista
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6 text-sm text-foreground-tertiary">
              <Shield className="h-4 w-4" />
              <span>Teste gratuito de 14 dias • Sem cartão de crédito</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-surface py-12">
        <div className="container-responsive">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold gradient-text-primary">PyTake</span>
              </div>
              <p className="text-sm text-foreground-secondary mb-4">
                Automatização inteligente para WhatsApp Business. Transforme seu atendimento com IA.
              </p>
              <div className="flex items-center gap-1 text-sm text-foreground-tertiary">
                <Globe className="h-4 w-4" />
                <span>Brasil • LGPD Compliant</span>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <div className="space-y-2 text-sm text-foreground-secondary">
                <Link href="/docs" className="block hover:text-primary transition-colors">
                  Documentação
                </Link>
                <Link href="/demo" className="block hover:text-primary transition-colors">
                  Demo
                </Link>
                <Link href="/pricing" className="block hover:text-primary transition-colors">
                  Preços
                </Link>
                <Link href="/integrations" className="block hover:text-primary transition-colors">
                  Integrações
                </Link>
              </div>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <div className="space-y-2 text-sm text-foreground-secondary">
                <Link href="/contact" className="block hover:text-primary transition-colors">
                  Contato
                </Link>
                <Link href="/about" className="block hover:text-primary transition-colors">
                  Sobre
                </Link>
                <Link href="/careers" className="block hover:text-primary transition-colors">
                  Carreiras
                </Link>
                <Link href="/blog" className="block hover:text-primary transition-colors">
                  Blog
                </Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <div className="space-y-2 text-sm text-foreground-secondary">
                <Link href="/privacy" className="block hover:text-primary transition-colors">
                  Privacidade
                </Link>
                <Link href="/terms" className="block hover:text-primary transition-colors">
                  Termos de Uso
                </Link>
                <Link href="/security" className="block hover:text-primary transition-colors">
                  Segurança
                </Link>
                <Link href="/compliance" className="block hover:text-primary transition-colors">
                  Compliance
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-foreground-tertiary">
              © 2024 PyTake. Todos os direitos reservados.
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-sm text-foreground-secondary">4.9/5 (2.1k reviews)</span>
              </div>
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
    <div className="bg-background rounded-xl p-8 shadow-sm border card-hover">
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-foreground-secondary leading-relaxed">{description}</p>
    </div>
  )
}

function PricingCard({ title, price, period, description, features, popular }: {
  title: string
  price: string
  period: string
  description: string
  features: string[]
  popular: boolean
}) {
  return (
    <div className={`bg-background rounded-xl p-8 border-2 card-hover relative ${
      popular ? 'border-primary shadow-lg scale-105' : 'border'
    }`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
            Mais Popular
          </div>
        </div>
      )}
      
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-foreground-secondary mb-4">{description}</p>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold">R$ {price}</span>
          <span className="text-foreground-secondary">/{period}</span>
        </div>
      </div>
      
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-foreground-secondary">{feature}</span>
          </li>
        ))}
      </ul>
      
      <Link href="/register" className="block">
        <Button className={`w-full py-3 ${
          popular ? 'btn-primary' : 'border-2 hover:bg-surface'
        }`} variant={popular ? 'default' : 'outline'}>
          Começar Agora
        </Button>
      </Link>
    </div>
  )
}