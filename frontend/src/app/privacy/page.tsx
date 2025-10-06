'use client';

import { useRouter } from 'next/navigation';
import { LogoWithText } from '@/components/Logo';
import { ArrowLeft, Lock, Eye, Database, Shield, Users, Cookie, Scale, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PrivacyPage() {
  const router = useRouter();

  const sections = [
    {
      icon: Eye,
      title: 'Informações que Coletamos',
      content: (
        <>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Dados de Cadastro
              </h4>
              <ul className="space-y-1 text-sm text-indigo-700 dark:text-indigo-400">
                <li>• Nome completo</li>
                <li>• Endereço de e-mail</li>
                <li>• Senha (criptografada)</li>
                <li>• Empresa (opcional)</li>
                <li>• Telefone (opcional)</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Dados de Uso
              </h4>
              <ul className="space-y-1 text-sm text-purple-700 dark:text-purple-400">
                <li>• Endereço IP</li>
                <li>• Tipo de navegador</li>
                <li>• Páginas visitadas</li>
                <li>• Sistema operacional</li>
                <li>• Dados de cliques</li>
              </ul>
            </div>
          </div>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-l-4 border-indigo-600 dark:border-indigo-400 p-4 rounded-r-lg">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong className="text-indigo-900 dark:text-indigo-300">Dados de Conversas:</strong> Como plataforma de automação de WhatsApp, processamos
              mensagens, contatos, histórico de conversas e métricas de engajamento conforme sua configuração.
            </p>
          </div>
        </>
      ),
    },
    {
      icon: Lock,
      title: 'Como Usamos suas Informações',
      content: (
        <>
          <div className="grid gap-3">
            {[
              { num: 1, title: 'Fornecer e Manter o Serviço', desc: 'Operar a plataforma e processar suas solicitações' },
              { num: 2, title: 'Processar Transações', desc: 'Gerenciar pagamentos e assinaturas com segurança' },
              { num: 3, title: 'Melhorar sua Experiência', desc: 'Personalizar e otimizar a plataforma para você' },
              { num: 4, title: 'Suporte e Comunicação', desc: 'Responder dúvidas e enviar notificações importantes' },
            ].map((item) => (
              <div key={item.num} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-600 dark:hover:border-indigo-500 transition">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">{item.num}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      icon: Shield,
      title: 'Segurança dos Dados',
      content: (
        <>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
            <h4 className="font-bold text-green-900 dark:text-green-300 mb-4 text-lg">Proteção de Nível Empresarial</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: Lock, title: 'SSL/TLS', desc: 'Dados em trânsito' },
                { icon: Shield, title: 'AES-256', desc: 'Dados em repouso' },
                { icon: Eye, title: '2FA', desc: 'Autenticação dupla' },
                { icon: Database, title: 'Backups', desc: 'Redundância total' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 dark:bg-green-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-300">{item.title}</p>
                    <p className="text-sm text-green-700 dark:text-green-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Implementamos medidas técnicas e organizacionais robustas com firewalls, detecção de intrusão,
            monitoramento 24/7 e testes de penetração regulares para garantir a segurança de seus dados.
          </p>
        </>
      ),
    },
    {
      icon: Scale,
      title: 'Seus Direitos (LGPD/GDPR)',
      content: (
        <>
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl p-6 mb-6">
            <h4 className="font-bold text-xl mb-4">Você tem controle total dos seus dados</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: '✓ Acesso', desc: 'Solicitar cópia dos dados' },
                { title: '✓ Retificação', desc: 'Corrigir informações' },
                { title: '✓ Exclusão', desc: 'Direito ao esquecimento' },
                { title: '✓ Portabilidade', desc: 'Exportar seus dados' },
                { title: '✓ Oposição', desc: 'Opor-se ao processamento' },
                { title: '✓ Revogação', desc: 'Retirar consentimento' },
              ].map((item, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <p className="font-semibold mb-1">{item.title}</p>
                  <p className="text-sm text-white/80">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Para exercer esses direitos:</strong> Entre em contato com <a href="mailto:privacy@pytake.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">privacy@pytake.com</a>
            </p>
          </div>
        </>
      ),
    },
    {
      icon: Cookie,
      title: 'Cookies e Tecnologias',
      content: (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { color: 'indigo', title: 'Essenciais', desc: 'Necessários para funcionamento básico da plataforma', border: 'border-2' },
              { color: 'blue', title: 'Desempenho', desc: 'Coletam dados sobre uso do site para melhorias', border: 'border' },
              { color: 'green', title: 'Funcionalidade', desc: 'Lembram preferências e configurações do usuário', border: 'border' },
              { color: 'orange', title: 'Marketing', desc: 'Rastreiam visitas para publicidade (com consentimento)', border: 'border' },
            ].map((item, i) => (
              <div key={i} className={`bg-white dark:bg-gray-800/50 ${item.border} border-${item.color}-200 dark:border-${item.color}-700 rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 bg-${item.color}-600 dark:bg-${item.color}-400 rounded-full`}></div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Você pode gerenciar cookies através das configurações do seu navegador.
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
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
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Política de Privacidade</span>
            </div>
            <h1 className="text-5xl font-bold mb-4">Sua Privacidade é Prioridade</h1>
            <p className="text-xl text-white/90 mb-2">Conformidade total com LGPD e GDPR</p>
            <p className="text-white/70">Última atualização: 04 de Outubro de 2025</p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-6">
          {/* Intro */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8"
          >
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              A <span className="font-semibold text-indigo-600 dark:text-indigo-400">PyTake</span> está comprometida em proteger sua privacidade. Esta
              Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas
              informações quando você usa nossa plataforma de automação de WhatsApp Business.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Shield className="w-4 h-4 text-green-600 dark:text-green-500" />
              <span>Conformidade total com LGPD (Lei Geral de Proteção de Dados) e GDPR</span>
            </div>
          </motion.div>

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

          {/* DPO Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg p-8 text-white"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Mail className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Encarregado de Proteção de Dados (DPO)</h2>
                <p className="text-white/80">Entre em contato para questões sobre privacidade</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-sm text-white/70 mb-1">Email DPO</p>
                <p className="font-semibold">dpo@pytake.com</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-sm text-white/70 mb-1">Email Geral</p>
                <p className="font-semibold">privacy@pytake.com</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-sm text-white/70 mb-1">Telefone</p>
                <p className="font-semibold">+55 (11) 1234-5678</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-sm text-white/70 mb-1">Horário</p>
                <p className="font-semibold">Seg-Sex, 9h às 18h</p>
              </div>
            </div>
            <div className="mt-6 bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-sm text-white/90">
                <strong>ANPD:</strong> Você tem o direito de apresentar reclamação à Autoridade Nacional de Proteção de Dados
              </p>
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
