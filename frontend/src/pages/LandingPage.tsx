import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { FloatingChat } from '@/components/chat/FloatingChat'
import { Link } from 'react-router-dom'
import { 
  MessageSquare, 
  Users, 
  Zap, 
  Shield, 
  BarChart3, 
  Clock,
  Globe,
  Smartphone,
  ArrowRight,
  Check,
  Menu,
  X,
  Star,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Building2,
  Headphones,
  Code2,
  BookOpen,
  PlayCircle
} from 'lucide-react'
import { useState } from 'react'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const features = [
    {
      icon: MessageSquare,
      title: 'Multi-conversas',
      description: 'Gerencie múltiplas conversas do WhatsApp em uma única plataforma'
    },
    {
      icon: Users,
      title: 'Multi-agentes',
      description: 'Distribua atendimentos entre sua equipe de forma inteligente'
    },
    {
      icon: Zap,
      title: 'Automação Inteligente',
      description: 'Respostas automáticas e fluxos personalizados para cada cliente'
    },
    {
      icon: Shield,
      title: 'Segurança Total',
      description: 'Dados protegidos com criptografia de ponta a ponta'
    },
    {
      icon: BarChart3,
      title: 'Analytics Avançado',
      description: 'Métricas detalhadas sobre seu atendimento e performance'
    },
    {
      icon: Clock,
      title: 'Disponível 24/7',
      description: 'Sistema sempre online para não perder nenhuma oportunidade'
    }
  ]

  const plans = [
    {
      name: 'Starter',
      price: 'R$ 97',
      description: 'Perfeito para pequenos negócios',
      features: [
        'Até 3 agentes',
        '1.000 mensagens/mês',
        'Respostas automáticas básicas',
        'Suporte por email',
        'Dashboard básico'
      ]
    },
    {
      name: 'Professional',
      price: 'R$ 297',
      description: 'Ideal para empresas em crescimento',
      popular: true,
      features: [
        'Até 10 agentes',
        '10.000 mensagens/mês',
        'Automação avançada com IA',
        'Suporte prioritário',
        'Analytics completo',
        'API access',
        'Integrações customizadas'
      ]
    },
    {
      name: 'Enterprise',
      price: 'Sob consulta',
      description: 'Soluções personalizadas para grandes empresas',
      features: [
        'Agentes ilimitados',
        'Mensagens ilimitadas',
        'IA personalizada',
        'Suporte dedicado 24/7',
        'SLA garantido',
        'Infraestrutura dedicada',
        'Treinamento da equipe'
      ]
    }
  ]

  const testimonials = [
    {
      name: "Ricardo Silva",
      role: "CEO - TechStore",
      avatar: "RS",
      rating: 5,
      text: "O PyTake triplicou nossas vendas em 3 meses! A automação é incrível e o suporte é excepcional. Melhor investimento que fizemos."
    },
    {
      name: "Ana Costa",
      role: "Diretora - ModaBella",
      avatar: "AC",
      rating: 5,
      text: "Conseguimos atender 10x mais clientes com a mesma equipe. As respostas automáticas são tão naturais que os clientes nem percebem!"
    },
    {
      name: "Carlos Mendes",
      role: "Gerente - AutoPeças Plus",
      avatar: "CM",
      rating: 5,
      text: "Reduzimos o tempo de resposta de horas para segundos. Nossos clientes adoram e nossas vendas aumentaram 280%!"
    }
  ]

  const faqs = [
    {
      question: "Como funciona o período de teste grátis?",
      answer: "Você tem 7 dias para testar todas as funcionalidades do PyTake sem compromisso. Não pedimos cartão de crédito e você pode cancelar a qualquer momento. Após o período de teste, você escolhe o plano que melhor atende sua empresa."
    },
    {
      question: "Preciso de conhecimento técnico para usar?",
      answer: "Não! O PyTake foi desenvolvido para ser intuitivo e fácil de usar. A configuração leva menos de 5 minutos e oferecemos tutoriais em vídeo, documentação completa e suporte 24/7 para ajudar em qualquer dúvida."
    },
    {
      question: "Quantos atendentes posso ter?",
      answer: "Depende do plano escolhido. O plano Starter permite até 3 atendentes, o Professional até 10, e o Enterprise oferece atendentes ilimitados. Você pode mudar de plano a qualquer momento conforme sua equipe cresce."
    },
    {
      question: "O PyTake funciona com WhatsApp Business oficial?",
      answer: "Sim! Somos parceiros oficiais do WhatsApp Business API. Isso garante total conformidade com as políticas do WhatsApp, maior segurança e acesso a todos os recursos oficiais da plataforma."
    },
    {
      question: "Como funciona a automação de respostas?",
      answer: "Nossa IA analisa as mensagens dos clientes e responde automaticamente com base em regras que você define. Você pode criar fluxos de conversa, respostas para perguntas frequentes e até integrar com seu sistema de vendas."
    },
    {
      question: "Posso integrar com outros sistemas?",
      answer: "Sim! O PyTake oferece API completa e integrações nativas com os principais CRMs, ERPs e plataformas de e-commerce do mercado. Nossa equipe também pode desenvolver integrações customizadas."
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-md border-b border-border/50 z-50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Logo size="md" />
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
                Recursos
              </a>
              <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
                Preços
              </a>
              <Link to="/docs" className="text-sm font-medium hover:text-primary transition-colors">
                Documentação
              </Link>
              <Link to="/api" className="text-sm font-medium hover:text-primary transition-colors">
                API
              </Link>
              <a href="#faq" className="text-sm font-medium hover:text-primary transition-colors">
                FAQ
              </a>
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/login">
                <Button size="sm" className="gap-2">
                  Começar Grátis <ArrowRight size={16} />
                </Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-t border-border/50">
            <nav className="container mx-auto px-6 py-4 flex flex-col gap-4">
              <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
                Recursos
              </a>
              <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
                Preços
              </a>
              <Link to="/docs" className="text-sm font-medium hover:text-primary transition-colors">
                Documentação
              </Link>
              <Link to="/api" className="text-sm font-medium hover:text-primary transition-colors">
                API
              </Link>
              <a href="#faq" className="text-sm font-medium hover:text-primary transition-colors">
                FAQ
              </a>
              <Link to="/login" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  Login
                </Button>
              </Link>
              <Link to="/login" className="w-full">
                <Button size="sm" className="w-full">
                  Começar Grátis
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              +2.500 empresas já automatizaram seu WhatsApp
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Aumente suas vendas em<br />
              <span className="text-primary bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent">300% com WhatsApp</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Sistema profissional de atendimento que transforma cada conversa em oportunidade.
              <span className="font-semibold text-foreground"> Responda 10x mais rápido</span> e 
              <span className="font-semibold text-foreground"> nunca perca um cliente</span>.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/login">
                <Button size="lg" className="gap-2 text-lg px-8 py-6">
                  Teste 7 Dias Grátis <ArrowRight size={20} />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6">
                <PlayCircle size={20} /> Ver Demo (2 min)
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="text-green-500" size={16} />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-green-500" size={16} />
                <span>Configuração em 5 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-green-500" size={16} />
                <span>Suporte 24/7</span>
              </div>
            </div>

            {/* Hero Image/Illustration */}
            <div className="relative max-w-4xl mx-auto mt-16">
              <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-8 backdrop-blur-sm">
                <div className="bg-card rounded-xl shadow-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <MessageSquare className="text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">Central de Atendimento</h3>
                      <p className="text-sm text-muted-foreground">5 conversas ativas</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm">Cliente: Olá, gostaria de saber sobre o produto X</p>
                    </div>
                    <div className="bg-primary/10 rounded-lg p-3 ml-12">
                      <p className="text-sm">Agente: Claro! O produto X possui...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Integrado com</p>
              <div className="flex items-center gap-2">
                <MessageSquare className="text-green-600" size={24} />
                <span className="font-semibold">WhatsApp Business API</span>
              </div>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Certificado</p>
              <div className="flex items-center gap-2">
                <Shield className="text-blue-600" size={24} />
                <span className="font-semibold">ISO 27001</span>
              </div>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Uptime garantido</p>
              <div className="flex items-center gap-2">
                <Clock className="text-purple-600" size={24} />
                <span className="font-semibold">99.9% SLA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Números que impressionam
            </h2>
            <p className="text-muted-foreground text-lg">
              Resultados reais de empresas que usam o PyTake
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">+2.5K</div>
              <p className="text-muted-foreground">Empresas ativas</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">15M+</div>
              <p className="text-muted-foreground">Mensagens/mês</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">300%</div>
              <p className="text-muted-foreground">Aumento em vendas</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">4.9</div>
              <p className="text-muted-foreground">Nota no Trustpilot</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Recursos que impulsionam suas vendas
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Tudo que você precisa para profissionalizar seu atendimento no WhatsApp
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-card border border-border/50 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="text-primary" size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Como funciona
            </h2>
            <p className="text-muted-foreground text-lg">
              Configure em minutos e comece a atender melhor
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Conecte seu WhatsApp</h3>
              <p className="text-muted-foreground text-sm">
                Integre seu WhatsApp Business em segundos com nossa API
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Configure automações</h3>
              <p className="text-muted-foreground text-sm">
                Crie fluxos de conversa e respostas automáticas inteligentes
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Escale seu atendimento</h3>
              <p className="text-muted-foreground text-sm">
                Atenda mais clientes com menos esforço e mais qualidade
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              O que nossos clientes dizem
            </h2>
            <p className="text-muted-foreground text-lg">
              Histórias reais de sucesso com o PyTake
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-card border border-border/50 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center font-semibold text-primary">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Planos que cabem no seu bolso
            </h2>
            <p className="text-muted-foreground text-lg">
              Escolha o plano ideal para o tamanho do seu negócio
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <div 
                key={index}
                className={`bg-card border rounded-xl p-6 relative ${
                  plan.popular ? 'border-primary shadow-lg scale-105' : 'border-border/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                    Mais Popular
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold mb-2">
                    {plan.price}
                    {plan.price !== 'Sob consulta' && <span className="text-base font-normal">/mês</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <Check className="text-primary mt-0.5" size={16} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                  {plan.price === 'Sob consulta' ? 'Falar com Vendas' : 'Começar Agora'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-muted-foreground text-lg">
              Tire suas dúvidas sobre o PyTake
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-card border border-border/50 rounded-xl overflow-hidden">
                <button
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="font-medium">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="text-muted-foreground" size={20} />
                  ) : (
                    <ChevronDown className="text-muted-foreground" size={20} />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <TrendingUp size={16} />
            Oferta limitada: 50% OFF no primeiro mês
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Comece a vender mais hoje mesmo
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Junte-se a mais de 2.500 empresas que já aumentaram suas vendas em até 300% com o PyTake
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/login">
              <Button size="lg" className="gap-2 text-lg px-8 py-6">
                Começar Agora - É Grátis <ArrowRight size={20} />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6">
              <Headphones size={20} /> Falar com Consultor
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            ⏱️ Leva menos de 5 minutos para configurar
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div>
              <Logo className="mb-4" />
              <p className="text-sm text-muted-foreground">
                Plataforma completa para integração e automação de atendimento via WhatsApp Business.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-primary">Recursos</a></li>
                <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-primary">Preços</a></li>
                <li><Link to="/api" className="text-sm text-muted-foreground hover:text-primary">API</Link></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Integrações</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Desenvolvedores</h4>
              <ul className="space-y-2">
                <li><Link to="/docs" className="text-sm text-muted-foreground hover:text-primary">Documentação</Link></li>
                <li><Link to="/api" className="text-sm text-muted-foreground hover:text-primary">API Reference</Link></li>
                <li><a href="https://github.com/pydev" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">GitHub</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Sobre</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Blog</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Carreiras</a></li>
                <li><a href="#contact" className="text-sm text-muted-foreground hover:text-primary">Contato</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Privacidade</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Termos</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 PyTake. Todos os direitos reservados.
            </p>
            <p className="text-sm text-muted-foreground">
              Desenvolvido com ❤️ por{' '}
              <a 
                href="https://pydev.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                PyDev
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Chat */}
      <FloatingChat />
    </div>
  )
}