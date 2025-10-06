'use client';

import { useRouter } from 'next/navigation';
import { LogoWithText } from '@/components/Logo';
import { ArrowLeft, Shield, CheckCircle2, AlertCircle, FileText, Scale } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TermsPage() {
  const router = useRouter();

  const sections = [
    {
      icon: Shield,
      title: 'Aceitação dos Termos',
      content: (
        <>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            Ao acessar e usar a plataforma <span className="font-semibold text-indigo-600 dark:text-indigo-400">PyTake</span>, você concorda em cumprir e estar vinculado a estes
            Termos de Serviço. Se você não concordar com qualquer parte destes termos, não use nosso
            serviço.
          </p>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-l-4 border-indigo-600 dark:border-indigo-400 p-4 rounded-r-lg">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              A PyTake é uma <strong>plataforma de automação para WhatsApp Business</strong> que permite gerenciar
              conversas, criar chatbots inteligentes, enviar campanhas em massa e analisar métricas de engajamento em tempo real.
            </p>
          </div>
        </>
      ),
    },
    {
      icon: CheckCircle2,
      title: 'Uso do Serviço',
      content: (
        <>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
            Elegibilidade
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            Você deve ter pelo menos 18 anos de idade e ter capacidade legal para celebrar contratos
            vinculativos. Ao criar uma conta, você garante que todas as informações fornecidas são
            verdadeiras e precisas.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
            Conta de Usuário
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            Você é responsável por manter a confidencialidade de sua conta e senha. Você concorda em
            aceitar a responsabilidade por todas as atividades que ocorram sob sua conta.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
            Uso Aceitável
          </h3>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Você concorda em NÃO usar o serviço para:</p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <span>Enviar spam ou mensagens não solicitadas</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <span>Violar leis locais, estaduais, nacionais ou internacionais</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <span>Transmitir vírus, malware ou qualquer código malicioso</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <span>Violar direitos de propriedade intelectual de terceiros</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <span>Coletar informações de outros usuários sem consentimento</span>
              </li>
            </ul>
          </div>
        </>
      ),
    },
    {
      icon: FileText,
      title: 'Planos e Pagamentos',
      content: (
        <>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
              <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">Starter</h4>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">R$ 97</p>
              <p className="text-sm text-indigo-700 dark:text-indigo-400">por mês</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4 border-2 border-purple-600 dark:border-purple-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 dark:bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                Popular
              </div>
              <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Professional</h4>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">R$ 297</p>
              <p className="text-sm text-purple-700 dark:text-purple-400">por mês</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Enterprise</h4>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mb-1">Custom</p>
              <p className="text-sm text-gray-700 dark:text-gray-400">sob consulta</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
                Renovação Automática
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                As assinaturas são renovadas automaticamente ao final de cada período de cobrança, a menos
                que você cancele antes da data de renovação.
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                Garantia de Reembolso
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Oferecemos garantia de reembolso de <strong>30 dias</strong> para novos clientes. Após este período, os
                pagamentos não são reembolsáveis, mas você pode cancelar a qualquer momento.
              </p>
            </div>
          </div>
        </>
      ),
    },
    {
      icon: Scale,
      title: 'Propriedade Intelectual',
      content: (
        <>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            Todo o conteúdo da plataforma PyTake, incluindo mas não limitado a texto, gráficos,
            logotipos, ícones, imagens, clipes de áudio e software, é de propriedade da PyTake e
            protegido por leis de direitos autorais.
          </p>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-600 dark:border-indigo-400 p-4 rounded-r-lg">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong className="text-indigo-900 dark:text-indigo-300">Você mantém todos os direitos</strong> sobre o conteúdo que criar usando nossa plataforma, incluindo
              chatbots, campanhas e mensagens.
            </p>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-sm sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <LogoWithText size="sm" onClick={() => router.push('/')} />
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 rounded-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium">Termos de Serviço</span>
            </div>
            <h1 className="text-5xl font-bold mb-4">Termos de Uso</h1>
            <p className="text-xl text-white/90 mb-2">Plataforma PyTake de Automação WhatsApp Business</p>
            <p className="text-white/70">Última atualização: 04 de Outubro de 2025</p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <section.icon className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold">{index + 1}. {section.title}</h2>
                </div>
              </div>
              <div className="p-6 md:p-8">
                {section.content}
              </div>
            </motion.div>
          ))}

          {/* Additional Sections */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                5
              </div>
              Limitação de Responsabilidade
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              A PyTake fornece o serviço "como está" e "conforme disponível". Não garantimos que o
              serviço será ininterrupto, livre de erros ou completamente seguro.
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Em nenhuma circunstância a PyTake será responsável por danos indiretos, incidentais,
                especiais, consequenciais ou punitivos resultantes do uso ou incapacidade de usar o
                serviço.
              </p>
            </div>
          </motion.div>

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg p-8 text-white"
          >
            <h2 className="text-2xl font-bold mb-4">Dúvidas sobre os Termos?</h2>
            <p className="text-white/90 mb-6">
              Se você tiver dúvidas sobre estes Termos de Serviço, entre em contato conosco:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-sm text-white/70 mb-1">Email</p>
                <p className="font-semibold">legal@pytake.com</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-sm text-white/70 mb-1">Telefone</p>
                <p className="font-semibold">+55 (11) 1234-5678</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-sm text-white/70 mb-1">Localização</p>
                <p className="font-semibold">São Paulo, SP</p>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <div className="text-center py-8">
            <button
              onClick={() => router.push('/')}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-lg font-semibold hover:shadow-xl transition-all transform hover:scale-105"
            >
              Voltar para a Página Inicial
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <LogoWithText size="sm" />
            <div className="flex gap-6 text-sm text-gray-400 dark:text-gray-500">
              <a href="/privacy" className="hover:text-white transition">
                Privacidade
              </a>
              <a href="/terms" className="hover:text-white transition">
                Termos
              </a>
              <a href="/" className="hover:text-white transition">
                Início
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 dark:border-gray-900 mt-6 pt-6 text-center text-gray-400 dark:text-gray-500 text-sm">
            <p>&copy; 2025 PyTake. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
