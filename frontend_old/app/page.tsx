'use client'

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LogoInline } from "@/components/ui/logo"
import { MessageSquare, Bot, BarChart3, Shield, Zap, Users, Star, Check, ArrowRight, Play, TrendingUp, Clock, Globe, Lock, Award, Zap as ZapIcon } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header fixo */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container-responsive">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <LogoInline className="h-10" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-foreground-secondary hover:text-primary transition-colors text-sm">
                Recursos
              </Link>
              <Link href="#testimonials" className="text-foreground-secondary hover:text-primary transition-colors text-sm">
                Cases
              </Link>
              <Link href="#pricing" className="text-foreground-secondary hover:text-primary transition-colors text-sm">
                Preços
              </Link>
              <Link href="/contact" className="text-foreground-secondary hover:text-primary transition-colors text-sm">
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
                <Button className="bg-primary hover:bg-primary/90 text-sm px-4 py-2">
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
            
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-8 border">
              <div className="aspect-video bg-slate-900/20 rounded-xl flex items-center justify-center backdrop-blur">
                <div className="text-center">
                  <Play className="h-16 w-16 text-white mx-auto mb-4 opacity-80" />
                  <h3 className="text-xl font-semibold text-white mb-2">Demo Interativo</h3>
                  <p className="text-slate-200">Assista como o PyTake transforma seu atendimento</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials / Case Studies Section */}
      <section id="testimonials" className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="container-responsive">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Casos de Sucesso
            </h2>
            <p className="text-lg text-foreground-secondary">
              Descubra como empresas transformaram seu atendimento com PyTake
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <TestimonialCard
              name="Carlos Souza"
              company="TechSolutions"
              role="CEO"
              image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
              quote="PyTake aumentou nossas vendas em 45% em 3 meses. A automação com IA é incrível."
              metrics="45% ↑ vendas"
            />
            <TestimonialCard
              name="Fernanda Lima"
              company="E-Commerce Pro"
              role="Diretora Comercial"
              image="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop"
              quote="Reduzimos o tempo de resposta para clientes em 80%. Atendimento muito mais rápido."
              metrics="80% ↓ tempo resposta"
            />
            <TestimonialCard
              name="Anderson Tech"
              company="SaaS Integrations"
              role="Product Manager"
              image="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop"
              quote="Integração perfeita com nosso ERP. Suporte excepcional da equipe PyTake."
              metrics="100% integração"
            />
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 rounded-lg bg-white dark:bg-slate-800 border">
              <div className="text-3xl font-bold text-primary mb-2">10k+</div>
              <div className="text-sm text-foreground-secondary">Empresas ativas</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-white dark:bg-slate-800 border">
              <div className="text-3xl font-bold text-primary mb-2">4.9★</div>
              <div className="text-sm text-foreground-secondary">Avaliação média</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-white dark:bg-slate-800 border">
              <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-sm text-foreground-secondary">Uptime SLA</div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-blue-900 text-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
        
        <div className="container-responsive relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 mb-4">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Segurança em Primeiro Lugar</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Seus Dados Estão Seguros
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Conformidade total com LGPD, GDPR e regulamentações internacionais. Criptografia de ponta-a-ponta em todas as comunicações.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <SecurityCard
              icon={<Shield className="h-8 w-8" />}
              title="Criptografia"
              description="End-to-end em todas as mensagens"
            />
            <SecurityCard
              icon={<Award className="h-8 w-8" />}
              title="LGPD"
              description="Totalmente em conformidade"
            />
            <SecurityCard
              icon={<Lock className="h-8 w-8" />}
              title="SOC 2 Type II"
              description="Certificado e auditado"
            />
            <SecurityCard
              icon={<ZapIcon className="h-8 w-8" />}
              title="99.9% Uptime"
              description="SLA garantido"
            />
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <Check className="h-4 w-4 text-green-400" />
              <span>Dados em servidores brasileiros</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <Check className="h-4 w-4 text-green-400" />
              <span>Backup automático redundante</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <Check className="h-4 w-4 text-green-400" />
              <span>Acesso restrito e auditado</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <Check className="h-4 w-4 text-green-400" />
              <span>Suporte legal 24/7</span>
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
          popular ? 'bg-primary hover:bg-primary/90' : 'border-2 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`} variant={popular ? 'default' : 'outline'}>
          Começar Agora
        </Button>
      </Link>
    </div>
  )
}

function TestimonialCard({ name, company, role, image, quote, metrics }: {
  name: string
  company: string
  role: string
  image: string
  quote: string
  metrics: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-4 mb-4">
        <img src={image} alt={name} className="w-12 h-12 rounded-full object-cover" />
        <div>
          <h3 className="font-semibold text-foreground">{name}</h3>
          <p className="text-sm text-foreground-secondary">{company}</p>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="text-foreground italic mb-3">"{quote}"</p>
        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
          {metrics}
        </div>
      </div>
    </div>
  )
}

function SecurityCard({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4 opacity-80">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-slate-300">{description}</p>
    </div>
  )
}