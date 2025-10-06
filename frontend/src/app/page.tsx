'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Zap,
  Users,
  BarChart3,
  Bot,
  Send,
  CheckCircle2,
  ArrowRight,
  Star,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Clock,
  Smartphone,
  Repeat,
  Target,
} from 'lucide-react';
import { useState } from 'react';
import { LogoWithText } from '@/components/Logo';
import { ChatWidget } from '@/components/ChatWidget';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: MessageCircle,
      title: 'Conversas Inteligentes',
      description: 'Gerencie todas as conversas do WhatsApp em um único painel centralizado.',
    },
    {
      icon: Bot,
      title: 'Chatbots Automatizados',
      description: 'Crie fluxos de atendimento automatizado com IA para responder 24/7.',
    },
    {
      icon: Send,
      title: 'Campanhas em Massa',
      description: 'Envie mensagens personalizadas para milhares de contatos simultaneamente.',
    },
    {
      icon: Users,
      title: 'Gestão de Contatos',
      description: 'Organize e segmente seus contatos com tags e campos personalizados.',
    },
    {
      icon: BarChart3,
      title: 'Analytics Avançado',
      description: 'Relatórios detalhados sobre métricas de engajamento e conversão.',
    },
    {
      icon: Zap,
      title: 'Integração API',
      description: 'Conecte com seus sistemas através de uma API RESTful completa.',
    },
  ];

  const plans = [
    {
      name: 'Starter',
      price: 'R$ 97',
      period: '/mês',
      features: [
        '1.000 mensagens/mês',
        '1 agente incluído',
        '5 chatbots',
        'Suporte por email',
        'Analytics básico',
      ],
      highlighted: false,
    },
    {
      name: 'Professional',
      price: 'R$ 297',
      period: '/mês',
      features: [
        '10.000 mensagens/mês',
        '5 agentes incluídos',
        'Chatbots ilimitados',
        'Suporte prioritário',
        'Analytics avançado',
        'API completa',
        'Integrações premium',
      ],
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      features: [
        'Mensagens ilimitadas',
        'Agentes ilimitados',
        'Chatbots ilimitados',
        'Suporte 24/7',
        'Analytics personalizado',
        'API dedicada',
        'Servidor dedicado',
        'SLA garantido',
      ],
      highlighted: false,
    },
  ];

  const testimonials = [
    {
      name: 'Maria Silva',
      role: 'CEO, E-commerce Plus',
      content:
        'Aumentamos nossas vendas em 300% com o PyTake. A automação de WhatsApp revolucionou nosso atendimento.',
      rating: 5,
    },
    {
      name: 'João Santos',
      role: 'Gerente de Marketing',
      content:
        'Os chatbots inteligentes nos economizam 20 horas semanais. Atendimento 24/7 sem aumentar a equipe.',
      rating: 5,
    },
    {
      name: 'Ana Costa',
      role: 'Diretora de Vendas',
      content:
        'A plataforma mais completa do mercado. Gestão de contatos e campanhas em um único lugar.',
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: 'Como funciona a integração com WhatsApp?',
      answer:
        'Utilizamos a API oficial do WhatsApp Business para garantir segurança e conformidade. A integração é simples e guiada.',
    },
    {
      question: 'Posso migrar meus contatos existentes?',
      answer:
        'Sim! Você pode importar seus contatos via CSV, Excel ou conectar com seu CRM através da nossa API.',
    },
    {
      question: 'Os chatbots usam inteligência artificial?',
      answer:
        'Sim, nossos chatbots utilizam IA para entender contexto e responder de forma natural às mensagens dos clientes.',
    },
    {
      question: 'Qual o limite de mensagens?',
      answer:
        'Depende do plano escolhido. Oferecemos de 1.000 a mensagens ilimitadas no plano Enterprise.',
    },
    {
      question: 'Posso cancelar a qualquer momento?',
      answer:
        'Sim, não há fidelidade. Você pode cancelar sua assinatura a qualquer momento pelo painel.',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <LogoWithText size="sm" />

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition">
                Recursos
              </a>
              <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition">
                Preços
              </a>
              <a href="#faq" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition">
                FAQ
              </a>
              <button
                onClick={() => router.push('/login')}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
              >
                Entrar
              </button>
              <ThemeToggle />
              <button
                onClick={() => router.push('/register')}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition"
              >
                Começar Grátis
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="text-gray-900 dark:text-white" /> : <Menu className="text-gray-900 dark:text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                Recursos
              </a>
              <a href="#pricing" className="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                Preços
              </a>
              <a href="#faq" className="block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                FAQ
              </a>
              <button
                onClick={() => router.push('/login')}
                className="block w-full text-left text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Entrar
              </button>
              <button
                onClick={() => router.push('/register')}
                className="block w-full px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-center"
              >
                Começar Grátis
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-medium text-sm mb-6">
                🚀 Automação de WhatsApp Business
              </span>
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6">
                Transforme seu
                <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  WhatsApp em vendas
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Plataforma completa de automação e gestão para WhatsApp Business. Chatbots
                inteligentes, campanhas em massa e analytics avançado em um só lugar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/register')}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-lg font-semibold hover:shadow-xl transition flex items-center justify-center gap-2"
                >
                  Começar Grátis <ArrowRight className="w-5 h-5" />
                </button>
                <button className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-lg font-semibold border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-600 dark:hover:border-indigo-500 transition">
                  Ver Demo
                </button>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto"
            >
              <div>
                <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">10k+</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Empresas</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">1M+</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Mensagens/dia</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">99.9%</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Uptime</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Tudo que você precisa para crescer
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Ferramentas poderosas para automatizar e escalar seu atendimento
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 hover:shadow-xl transition group bg-white dark:bg-gray-800"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Planos para todo tamanho</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Escolha o plano ideal para seu negócio</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl scale-105'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {plan.highlighted && (
                  <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium mb-4">
                    Mais Popular
                  </span>
                )}
                <h3
                  className={`text-2xl font-bold mb-2 ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}
                >
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span
                    className={`text-5xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}
                  >
                    {plan.price}
                  </span>
                  <span className={plan.highlighted ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2
                        className={`w-5 h-5 mt-0.5 ${plan.highlighted ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`}
                      />
                      <span className={plan.highlighted ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push('/register')}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    plan.highlighted
                      ? 'bg-white text-indigo-600 hover:bg-gray-100'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Começar Agora
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">O que dizem nossos clientes</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Histórias de sucesso com PyTake</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl transition bg-white dark:bg-gray-800"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{testimonial.content}</p>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{testimonial.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Perguntas Frequentes</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Tudo o que você precisa saber</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{faq.question}</h3>
                <p className="text-gray-600 dark:text-gray-300">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Como Funciona</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Comece em 3 passos simples</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: Smartphone,
                title: 'Conecte seu WhatsApp',
                description: 'Integre sua conta WhatsApp Business em minutos através da API oficial',
                color: 'from-blue-500 to-indigo-600',
              },
              {
                step: '2',
                icon: Bot,
                title: 'Configure Automações',
                description: 'Crie chatbots e fluxos de atendimento personalizados sem código',
                color: 'from-purple-500 to-pink-600',
              },
              {
                step: '3',
                icon: Target,
                title: 'Escale suas Vendas',
                description: 'Envie campanhas, acompanhe métricas e cresça exponencialmente',
                color: 'from-green-500 to-emerald-600',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="text-center">
                  <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center transform hover:scale-110 transition-transform shadow-lg`}>
                    <item.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-white dark:bg-gray-800 border-4 border-indigo-600 dark:border-indigo-500 rounded-full flex items-center justify-center font-bold text-xl text-indigo-600 dark:text-indigo-400">
                    {item.step}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-10 left-full w-full">
                    <ArrowRight className="w-8 h-8 text-indigo-200 dark:text-indigo-800 mx-auto" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Integrações Poderosas</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Conecte com suas ferramentas favoritas</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'WhatsApp', color: 'bg-green-500' },
              { name: 'Zapier', color: 'bg-orange-500' },
              { name: 'Stripe', color: 'bg-purple-500' },
              { name: 'Google Sheets', color: 'bg-green-600' },
              { name: 'Shopify', color: 'bg-lime-600' },
              { name: 'WordPress', color: 'bg-blue-600' },
              { name: 'Mailchimp', color: 'bg-yellow-500' },
              { name: 'Slack', color: 'bg-pink-500' },
            ].map((integration, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center hover:shadow-xl transition-all cursor-pointer"
              >
                <div className={`w-16 h-16 ${integration.color} rounded-lg mb-3 flex items-center justify-center`}>
                  <Repeat className="w-8 h-8 text-white" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{integration.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Entre em Contato</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">Estamos aqui para ajudar você</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl"
              >
                <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">Email</h3>
                  <p className="text-gray-600 dark:text-gray-300">contato@pytake.com</p>
                  <p className="text-gray-600 dark:text-gray-300">suporte@pytake.com</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl"
              >
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">Telefone</h3>
                  <p className="text-gray-600 dark:text-gray-300">+55 (11) 1234-5678</p>
                  <p className="text-gray-600 dark:text-gray-300">Seg-Sex: 9h às 18h</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl"
              >
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">Endereço</h3>
                  <p className="text-gray-600 dark:text-gray-300">Av. Paulista, 1000</p>
                  <p className="text-gray-600 dark:text-gray-300">São Paulo, SP - Brasil</p>
                </div>
              </motion.div>
            </div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Envie uma Mensagem</h3>
              <form className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Seu nome"
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Seu email"
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Seu telefone"
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
                <div>
                  <textarea
                    rows={4}
                    placeholder="Sua mensagem"
                    className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:shadow-xl transition transform hover:scale-105"
                >
                  Enviar Mensagem
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Pronto para transformar seu atendimento?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Junte-se a milhares de empresas que já automatizaram seu WhatsApp
          </p>
          <button
            onClick={() => router.push('/register')}
            className="px-8 py-4 bg-white text-indigo-600 rounded-lg text-lg font-semibold hover:shadow-xl transition"
          >
            Começar Grátis Agora
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">PyTake</span>
              </div>
              <p className="text-gray-400 dark:text-gray-500">
                Automação inteligente para WhatsApp Business
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400 dark:text-gray-500">
                <li>
                  <a href="#features" className="hover:text-white transition">
                    Recursos
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition">
                    Preços
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Documentação
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400 dark:text-gray-500">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Sobre
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Contato
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 dark:text-gray-500">
                <li>
                  <a href="/privacy" className="hover:text-white transition">
                    Privacidade
                  </a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-white transition">
                    Termos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Segurança
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 dark:border-gray-950 pt-8 text-center text-gray-400 dark:text-gray-500">
            <p>&copy; 2025 PyTake. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}
