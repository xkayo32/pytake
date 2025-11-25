import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Button } from '@components/ui/button'
import { MessageSquare, Zap, Users, BarChart3, ArrowRight, Lock, Check, Star, Globe, Menu, X } from 'lucide-react'

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <RouterLink to="/" className="flex items-center space-x-2">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">PyTake</span>
            </RouterLink>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">
                Recursos
              </a>
              <a href="#testimonials" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">
                Cases
              </a>
              <a href="#pricing" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">
                Preços
              </a>
            </nav>

            {/* CTAs */}
            <div className="flex items-center gap-3">
              <RouterLink to="/login" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </RouterLink>
              <RouterLink to="/register">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Começar Grátis
                </Button>
              </RouterLink>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2"
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Adjust for fixed header */}
      <main className="pt-16">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 text-slate-900 dark:text-white">
                Automação de Fluxos WhatsApp
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
                Gerenciador completo para automatizar e escalar seus fluxos de WhatsApp. Aumente a produtividade com inteligência artificial.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <RouterLink to="/register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                    Começar Grátis <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </RouterLink>
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Agendar Demo
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-8 text-sm text-slate-600 dark:text-slate-400">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span>Trusted by 5,000+ businesses</span>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-lg h-96 flex items-center justify-center">
                <MessageSquare className="w-32 h-32 text-blue-600 dark:text-blue-300 opacity-50" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-slate-100 dark:bg-slate-800 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">Recursos Poderosos</h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Tudo que você precisa para automatizar seus fluxos de WhatsApp
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: MessageSquare,
                  title: 'Gerenciamento de Mensagens',
                  desc: 'Envie, receba e organize mensagens WhatsApp em um único lugar'
                },
                {
                  icon: Zap,
                  title: 'Automação Inteligente',
                  desc: 'Crie fluxos automáticos com IA para aumentar sua eficiência'
                },
                {
                  icon: BarChart3,
                  title: 'Analytics Avançado',
                  desc: 'Acompanhe métricas em tempo real e tome decisões com dados'
                },
                {
                  icon: Users,
                  title: 'Gerenciamento de Contatos',
                  desc: 'Organize e segmente seus contatos de forma eficiente'
                },
                {
                  icon: Lock,
                  title: 'Segurança Enterprise',
                  desc: 'Seus dados protegidos com criptografia de nível bancário'
                },
                {
                  icon: Globe,
                  title: 'Integração Completa',
                  desc: 'Conecte com suas ferramentas favoritas facilmente'
                },
              ].map((feature, idx) => {
                const Icon = feature.icon
                return (
                  <div key={idx} className="bg-white dark:bg-slate-700 p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <Icon className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{feature.title}</h3>
                    <p className="text-slate-600 dark:text-slate-300">{feature.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">Preços Transparentes</h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Escolha o plano que melhor se adequa ao seu negócio
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: 'Starter',
                  price: '29',
                  features: ['Até 1,000 mensagens/mês', 'Suporte por email', 'Dashboard básico']
                },
                {
                  name: 'Professional',
                  price: '99',
                  features: ['Até 10,000 mensagens/mês', 'Suporte prioritário', 'Analytics completo', 'API Access'],
                  highlighted: true
                },
                {
                  name: 'Enterprise',
                  price: 'Contato',
                  features: ['Mensagens ilimitadas', 'Suporte 24/7', 'Integrações customizadas', 'SLA garantido']
                },
              ].map((plan, idx) => (
                <div
                  key={idx}
                  className={`p-8 rounded-lg border transition-all ${
                    plan.highlighted
                      ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-lg scale-105'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700'
                  }`}
                >
                  <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{plan.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    R$ <span className="text-3xl font-bold text-slate-900 dark:text-white">{plan.price}</span>
                    {plan.price !== 'Contato' && <span className="text-slate-600 dark:text-slate-400">/mês</span>}
                  </p>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, fidx) => (
                      <li key={fidx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Check className="w-4 h-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? 'default' : 'outline'}
                  >
                    Escolher Plano
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Pronto para transformar seu WhatsApp?
            </h2>
            <p className="text-lg text-blue-100 mb-8">
              Comece grátis hoje e veja os resultados em dias
            </p>
            <RouterLink to="/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                Comece Agora <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </RouterLink>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">PyTake</h4>
              <p className="text-slate-400">Automação de WhatsApp para negócios modernos</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Produto</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#features" className="hover:text-white">Recursos</a></li>
                <li><a href="#pricing" className="hover:text-white">Preços</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Empresa</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white">Sobre</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white">Privacidade</a></li>
                <li><a href="#" className="hover:text-white">Termos</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400">
            <p>&copy; 2025 PyTake. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
