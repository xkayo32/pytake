import { ArrowRight, MessageSquare, BarChart3, Zap, Shield, Users, ChevronRight } from 'lucide-react'
import { Button } from '@components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '@lib/auth/authContext'

export default function Home() {
  const navigate = useNavigate()
  const { isAuthenticated } = useContext(AuthContext)

  const features = [
    {
      icon: MessageSquare,
      title: 'WhatsApp Integrado',
      description: 'Comunique-se com clientes via WhatsApp de forma eficiente e profissional',
      color: 'from-green-500 to-emerald-600',
    },
    {
      icon: BarChart3,
      title: 'Análises Avançadas',
      description: 'Acompanhe métricas em tempo real e tome decisões baseadas em dados',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Zap,
      title: 'Automações Inteligentes',
      description: 'Automatize fluxos de trabalho e responda instantaneamente',
      color: 'from-yellow-500 to-orange-600',
    },
    {
      icon: Shield,
      title: 'Segurança em Primeiro Lugar',
      description: 'Dados criptografados e em conformidade com regulamentações',
      color: 'from-purple-500 to-pink-600',
    },
    {
      icon: Users,
      title: 'Colaboração em Equipe',
      description: 'Trabalhe junto com sua equipe em tempo real',
      color: 'from-cyan-500 to-blue-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in">
          {/* Badge */}
          <div className="inline-block mb-6 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
            ✨ Bem-vindo ao futuro da comunicação
          </div>

          {/* Main Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Gerencie todas as suas conversas
            </span>
            <br />
            <span className="text-foreground">em um só lugar</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            PyTake é a plataforma completa para gerenciar WhatsApp, automatizar processos e crescer seu negócio com inteligência.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            {isAuthenticated ? (
              <>
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="btn-primary px-8 py-3 text-lg"
                >
                  Ir para Dashboard <ArrowRight className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/login')}
                  className="btn-primary px-8 py-3 text-lg"
                >
                  Entrar <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => navigate('/register')}
                  className="btn-secondary px-8 py-3 text-lg"
                >
                  Criar Conta Grátis
                </Button>
              </>
            )}
          </div>

          {/* Hero Image Placeholder */}
          <div className="relative mb-20">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 blur-3xl rounded-3xl"></div>
            <div className="relative bg-gradient-to-br from-card via-card to-secondary/10 rounded-3xl p-8 md:p-12 border border-border overflow-hidden">
              <div className="aspect-video bg-gradient-to-b from-muted to-muted/50 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Visualização do Dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 border-t border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="section-title">Recursos Poderosos</h2>
            <p className="section-subtitle">Tudo que você precisa para gerenciar comunicações profissionalmente</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="card-interactive group"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-3xl p-12 border border-primary/20">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Pronto para começar?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Junte-se a milhares de empresas que já confiam no PyTake
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="btn-primary px-8 py-3 text-lg"
                >
                  Acessar Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => navigate('/register')}
                    className="btn-primary px-8 py-3 text-lg"
                  >
                    Começar Grátis <ChevronRight className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => navigate('/login')}
                    className="btn-secondary px-8 py-3 text-lg"
                  >
                    Já tenho conta
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 PyTake. Todos os direitos reservados.</p>
          <p className="text-sm mt-2">Implementado por: Kayo Carvalho Fernandes</p>
        </div>
      </footer>
    </div>
  )
}
