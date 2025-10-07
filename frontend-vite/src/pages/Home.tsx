import { Link } from 'react-router-dom';
import { Bot, MessageSquare, BarChart3, Zap, Shield, Globe, Check, ChevronDown, Mail, Phone, MapPin, Send } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [showChat, setShowChat] = useState(false);

  const features = [
    {
      icon: Bot,
      title: 'Chatbots Inteligentes',
      description: 'Crie fluxos conversacionais com arrastar e soltar. Automatize atendimento 24/7.',
    },
    {
      icon: MessageSquare,
      title: 'Chat ao Vivo',
      description: 'Atenda seus clientes em tempo real com nossa interface moderna e intuitiva.',
    },
    {
      icon: BarChart3,
      title: 'Analytics Avançado',
      description: 'Dashboards completos com métricas de atendimento, conversões e performance.',
    },
    {
      icon: Zap,
      title: 'Campanhas em Massa',
      description: 'Envie mensagens segmentadas para milhares de contatos simultaneamente.',
    },
    {
      icon: Shield,
      title: 'Seguro e Confiável',
      description: 'Integração oficial com Meta WhatsApp Business API. Seus dados protegidos.',
    },
    {
      icon: Globe,
      title: 'Multi-tenant',
      description: 'Gerencie múltiplas organizações e números WhatsApp em uma única plataforma.',
    },
  ];

  const pricingPlans = [
    {
      name: 'Gratuito',
      price: { monthly: 0, yearly: 0 },
      description: 'Ideal para começar',
      features: [
        '1 número WhatsApp',
        'Até 100 contatos',
        '1 chatbot básico',
        'Chat ao vivo',
        'Suporte por email',
      ],
      cta: 'Começar Grátis',
      highlighted: false,
    },
    {
      name: 'Profissional',
      price: { monthly: 97, yearly: 970 },
      description: 'Para pequenas empresas',
      features: [
        '3 números WhatsApp',
        'Até 5.000 contatos',
        'Chatbots ilimitados',
        'Campanhas em massa',
        'Analytics avançado',
        'API de integração',
        'Suporte prioritário',
      ],
      cta: 'Começar Teste Grátis',
      highlighted: true,
    },
    {
      name: 'Empresarial',
      price: { monthly: 297, yearly: 2970 },
      description: 'Para empresas em crescimento',
      features: [
        'Números WhatsApp ilimitados',
        'Contatos ilimitados',
        'Multi-tenant',
        'Webhooks customizados',
        'Whitelabel',
        'Gerente de sucesso',
        'SLA garantido',
        'Suporte 24/7',
      ],
      cta: 'Falar com Vendas',
      highlighted: false,
    },
  ];

  const faqs = [
    {
      question: 'Como funciona a integração com WhatsApp?',
      answer: 'Oferecemos duas formas de integração: via API Oficial do Meta (WhatsApp Business) para empresas verificadas, ou via QR Code para pequenas empresas. Ambas são seguras e totalmente funcionais.',
    },
    {
      question: 'Posso usar meu número atual do WhatsApp?',
      answer: 'Sim! Você pode conectar seu número existente através do QR Code. Para usar a API Oficial, é necessário um número de telefone dedicado ao WhatsApp Business.',
    },
    {
      question: 'Existe limite de mensagens?',
      answer: 'Não cobramos por mensagem. Os planos têm limite de contatos, não de mensagens. Porém, o WhatsApp tem suas próprias políticas de limite que devem ser respeitadas.',
    },
    {
      question: 'Posso cancelar a qualquer momento?',
      answer: 'Sim, não há fidelidade. Você pode cancelar sua assinatura a qualquer momento e continuará tendo acesso até o fim do período pago.',
    },
    {
      question: 'Os chatbots precisam de programação?',
      answer: 'Não! Nossa plataforma tem um editor visual de arrastar e soltar. Você cria fluxos conversacionais sem escrever uma linha de código.',
    },
    {
      question: 'Meus dados estão seguros?',
      answer: 'Sim. Usamos criptografia de ponta a ponta, armazenamento seguro e seguimos todas as diretrizes da LGPD. Seus dados nunca são compartilhados com terceiros.',
    },
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Mensagem enviada! Entraremos em contato em breve.');
    setContactForm({ name: '', email: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b sticky top-0 bg-white z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-purple-600">PyTake</h1>
              <div className="hidden md:flex items-center gap-6">
                <a href="#features" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">
                  Recursos
                </a>
                <a href="#pricing" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">
                  Preços
                </a>
                <a href="#faq" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">
                  FAQ
                </a>
                <a href="#contact" className="text-gray-600 hover:text-purple-600 font-medium transition-colors">
                  Contato
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Entrar
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Começar Grátis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Automação WhatsApp
            <span className="block text-purple-600">para seu Negócio</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Plataforma completa de automação para WhatsApp Business. 
            Chatbots, atendimento ao vivo, campanhas e analytics em um só lugar.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/login"
              className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-lg font-semibold"
            >
              Começar Agora
            </Link>
            <a
              href="#features"
              className="px-8 py-4 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-lg font-semibold"
            >
              Conhecer Recursos
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-xl text-gray-600">
              Ferramentas profissionais para transformar seu atendimento
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Planos e Preços
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Escolha o plano ideal para o seu negócio
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={billingCycle === 'monthly' ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                Mensal
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="relative w-14 h-7 bg-purple-600 rounded-full transition-colors"
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    billingCycle === 'yearly' ? 'translate-x-7' : ''
                  }`}
                />
              </button>
              <span className={billingCycle === 'yearly' ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                Anual <span className="text-green-600 text-sm">(economize 17%)</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-purple-600 text-white shadow-xl scale-105'
                    : 'bg-white border-2 border-gray-200'
                }`}
              >
                <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <p className={`mb-6 ${plan.highlighted ? 'text-purple-100' : 'text-gray-600'}`}>
                  {plan.description}
                </p>
                <div className="mb-6">
                  <span className="text-5xl font-bold">
                    R$ {billingCycle === 'monthly' ? plan.price.monthly : Math.floor(plan.price.yearly / 12)}
                  </span>
                  <span className={`text-lg ${plan.highlighted ? 'text-purple-100' : 'text-gray-600'}`}>
                    /mês
                  </span>
                  {billingCycle === 'yearly' && plan.price.yearly > 0 && (
                    <p className={`text-sm mt-2 ${plan.highlighted ? 'text-purple-100' : 'text-gray-600'}`}>
                      R$ {plan.price.yearly}/ano
                    </p>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-white' : 'text-green-600'}`} />
                      <span className={plan.highlighted ? 'text-purple-50' : 'text-gray-600'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={`block w-full text-center py-3 rounded-lg font-semibold transition-colors ${
                    plan.highlighted
                      ? 'bg-white text-purple-600 hover:bg-gray-100'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-xl text-gray-600">
              Tire suas dúvidas sobre a plataforma
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-600 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-gray-600">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Entre em Contato
            </h2>
            <p className="text-xl text-gray-600">
              Tem dúvidas? Estamos aqui para ajudar
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Fale Conosco
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Email</p>
                      <p className="text-gray-600">contato@pytake.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Telefone</p>
                      <p className="text-gray-600">(11) 99999-9999</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Endereço</p>
                      <p className="text-gray-600">
                        São Paulo, SP<br />
                        Brasil
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-4">
                  <strong>Horário de Atendimento:</strong>
                </p>
                <p className="text-gray-600">
                  Segunda a Sexta: 9h às 18h<br />
                  Sábado: 9h às 13h
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder="Seu nome completo"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
                    Mensagem
                  </label>
                  <textarea
                    id="message"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    required
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                    placeholder="Como podemos ajudar?"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  <Send className="h-5 w-5" />
                  Enviar Mensagem
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto para começar?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Junte-se a centenas de empresas que já automatizaram seu WhatsApp
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-4 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors text-lg font-semibold"
          >
            Criar Conta Grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-purple-600">PyTake</h3>
              <p className="text-gray-600 mt-1">
                Automação WhatsApp Business
              </p>
            </div>
            <div className="text-gray-600">
              © 2025 PyTake. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Chat Bubble */}
      <div className="fixed bottom-6 right-6 z-50">
        {showChat && (
          <div className="mb-4 bg-white rounded-2xl shadow-2xl w-80 overflow-hidden animate-in slide-in-from-bottom">
            <div className="bg-green-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Atendimento PyTake</p>
                  <p className="text-xs text-green-100">Online agora</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="text-white hover:bg-green-700 rounded-full p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-gray-50">
              <div className="bg-white rounded-lg p-3 shadow-sm mb-4">
                <p className="text-sm text-gray-700">
                  Olá! 👋 Como podemos ajudar você hoje?
                </p>
                <p className="text-xs text-gray-500 mt-1">Atendimento PyTake</p>
              </div>
              <a
                href="https://wa.me/5511999999999?text=Olá!%20Gostaria%20de%20conhecer%20o%20PyTake"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <MessageSquare className="h-5 w-5" />
                Iniciar Conversa
              </a>
              <p className="text-xs text-gray-500 text-center mt-2">
                Responderemos em alguns minutos
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowChat(!showChat)}
          className="w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
          aria-label="Abrir chat"
        >
          {showChat ? (
            <span className="text-2xl">✕</span>
          ) : (
            <MessageSquare className="h-8 w-8" />
          )}
        </button>
      </div>
    </div>
  );
}
