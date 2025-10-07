import { Link } from 'react-router-dom';
import { Bot, MessageSquare, BarChart3, Zap, Shield, Globe } from 'lucide-react';

export default function Home() {
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

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-purple-600">PyTake</h1>
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

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Pronto para começar?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Junte-se a centenas de empresas que já automatizaram seu WhatsApp
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-lg font-semibold"
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
    </div>
  );
}
