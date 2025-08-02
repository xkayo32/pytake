import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft,
  BookOpen,
  Rocket,
  Code2,
  Smartphone,
  MessageSquare,
  Settings,
  Shield,
  Zap,
  Database,
  Globe,
  Search,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function DocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('getting-started')

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const sections = [
    {
      id: 'getting-started',
      title: 'Começando',
      icon: Rocket,
      items: [
        { id: 'intro', title: 'Introdução' },
        { id: 'quick-start', title: 'Início Rápido' },
        { id: 'installation', title: 'Instalação' },
        { id: 'first-message', title: 'Primeira Mensagem' }
      ]
    },
    {
      id: 'integration',
      title: 'Integração',
      icon: Smartphone,
      items: [
        { id: 'whatsapp-setup', title: 'Configurar WhatsApp' },
        { id: 'webhook-config', title: 'Configurar Webhooks' },
        { id: 'auth-tokens', title: 'Tokens de Autenticação' }
      ]
    },
    {
      id: 'automation',
      title: 'Automação',
      icon: Zap,
      items: [
        { id: 'auto-replies', title: 'Respostas Automáticas' },
        { id: 'flow-builder', title: 'Construtor de Fluxos' },
        { id: 'ai-responses', title: 'Respostas com IA' }
      ]
    },
    {
      id: 'api-basics',
      title: 'API Básico',
      icon: Code2,
      items: [
        { id: 'endpoints', title: 'Endpoints' },
        { id: 'authentication', title: 'Autenticação' },
        { id: 'rate-limits', title: 'Limites de Taxa' }
      ]
    },
    {
      id: 'advanced',
      title: 'Avançado',
      icon: Settings,
      items: [
        { id: 'custom-integrations', title: 'Integrações Customizadas' },
        { id: 'bulk-messaging', title: 'Mensagens em Massa' },
        { id: 'analytics-api', title: 'API de Analytics' }
      ]
    }
  ]

  const codeExamples = {
    quickStart: `// Instalação via npm
npm install @pytake/sdk

// Configuração inicial
import { PyTake } from '@pytake/sdk'

const pytake = new PyTake({
  apiKey: 'sua-api-key',
  webhook: 'https://seu-site.com/webhook'
})

// Enviar primeira mensagem
await pytake.messages.send({
  to: '5511999999999',
  message: 'Olá! Bem-vindo ao PyTake!'
})`,
    
    webhookSetup: `// Configurar webhook para receber mensagens
app.post('/webhook', async (req, res) => {
  const { message, from, timestamp } = req.body
  
  // Processar mensagem recebida
  console.log(\`Nova mensagem de \${from}: \${message}\`)
  
  // Responder automaticamente
  await pytake.messages.send({
    to: from,
    message: 'Obrigado pela mensagem! Em breve retornaremos.'
  })
  
  res.status(200).send('OK')
})`,
    
    autoResponse: `// Configurar resposta automática com IA
const autoResponder = pytake.automation.create({
  name: 'Atendimento Inicial',
  triggers: ['oi', 'olá', 'bom dia', 'boa tarde'],
  
  response: async (message) => {
    // Usar IA para gerar resposta contextual
    const aiResponse = await pytake.ai.generateResponse({
      context: message,
      tone: 'friendly',
      language: 'pt-BR'
    })
    
    return aiResponse
  }
})`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/">
                <Logo size="md" />
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link to="/docs" className="text-sm font-medium text-primary">
                  Documentação
                </Link>
                <Link to="/api" className="text-sm font-medium hover:text-primary transition-colors">
                  API Reference
                </Link>
                <a href="https://github.com/pytake" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary transition-colors">
                  GitHub
                </a>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <Search size={16} className="mr-2" />
                Buscar
              </Button>
              <Link to="/login">
                <Button size="sm">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft size={16} className="mr-2" />
          Voltar ao início
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BookOpen size={20} />
                  Documentação
                </h3>
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <div key={section.id}>
                      <button
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                          activeSection === section.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        )}
                      >
                        <section.icon size={16} />
                        {section.title}
                      </button>
                      {activeSection === section.id && (
                        <div className="ml-6 mt-1 space-y-1">
                          {section.items.map((item) => (
                            <a
                              key={item.id}
                              href={`#${item.id}`}
                              className="block px-3 py-1 text-sm text-muted-foreground hover:text-primary"
                            >
                              {item.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {/* Getting Started Section */}
              {activeSection === 'getting-started' && (
                <>
                  <h1 className="text-4xl font-bold mb-6">Começando com o PyTake</h1>
                  
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-8">
                    <p className="text-lg">
                      Bem-vindo à documentação do PyTake! Este guia vai te ajudar a configurar e começar a usar nossa plataforma em poucos minutos.
                    </p>
                  </div>

                  <h2 id="intro" className="text-2xl font-semibold mt-8 mb-4">Introdução</h2>
                  <p>
                    O PyTake é uma plataforma completa para gerenciar conversas do WhatsApp Business. Com nossa API, você pode:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Enviar e receber mensagens automaticamente</li>
                    <li>Criar fluxos de conversa inteligentes</li>
                    <li>Integrar com seus sistemas existentes</li>
                    <li>Analisar métricas detalhadas de atendimento</li>
                  </ul>

                  <h2 id="quick-start" className="text-2xl font-semibold mt-8 mb-4">Início Rápido</h2>
                  <p>Siga estes passos para começar rapidamente:</p>
                  
                  <div className="bg-muted rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Instalação e Configuração</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCode(codeExamples.quickStart, 'quickStart')}
                      >
                        {copiedCode === 'quickStart' ? (
                          <Check size={16} className="text-green-500" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </Button>
                    </div>
                    <pre className="text-sm overflow-x-auto">
                      <code>{codeExamples.quickStart}</code>
                    </pre>
                  </div>

                  <h2 id="installation" className="text-2xl font-semibold mt-8 mb-4">Instalação</h2>
                  <p>O PyTake SDK está disponível via npm, yarn e pnpm:</p>
                  
                  <div className="space-y-4">
                    <div className="bg-muted rounded-lg p-4">
                      <code className="text-sm">npm install @pytake/sdk</code>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <code className="text-sm">yarn add @pytake/sdk</code>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <code className="text-sm">pnpm add @pytake/sdk</code>
                    </div>
                  </div>

                  <h2 id="first-message" className="text-2xl font-semibold mt-8 mb-4">Enviando sua Primeira Mensagem</h2>
                  <p>
                    Após a instalação, você já pode enviar sua primeira mensagem. Certifique-se de ter sua API key configurada.
                  </p>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                    <p className="text-sm">
                      <strong>Importante:</strong> Você precisa ter um número WhatsApp Business verificado e conectado à sua conta.
                    </p>
                  </div>
                </>
              )}

              {/* Integration Section */}
              {activeSection === 'integration' && (
                <>
                  <h1 className="text-4xl font-bold mb-6">Integração com WhatsApp</h1>
                  
                  <h2 id="whatsapp-setup" className="text-2xl font-semibold mt-8 mb-4">Configurar WhatsApp Business</h2>
                  <p>
                    Para integrar seu WhatsApp Business com o PyTake, siga estes passos:
                  </p>
                  
                  <ol className="list-decimal pl-6 space-y-3">
                    <li>Acesse o painel do PyTake e vá para Configurações</li>
                    <li>Clique em "Adicionar WhatsApp"</li>
                    <li>Escaneie o QR Code com seu WhatsApp Business</li>
                    <li>Aguarde a confirmação da conexão</li>
                  </ol>

                  <h2 id="webhook-config" className="text-2xl font-semibold mt-8 mb-4">Configurar Webhooks</h2>
                  <p>
                    Webhooks permitem que você receba notificações em tempo real sobre mensagens recebidas:
                  </p>
                  
                  <div className="bg-muted rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Exemplo de Webhook</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCode(codeExamples.webhookSetup, 'webhookSetup')}
                      >
                        {copiedCode === 'webhookSetup' ? (
                          <Check size={16} className="text-green-500" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </Button>
                    </div>
                    <pre className="text-sm overflow-x-auto">
                      <code>{codeExamples.webhookSetup}</code>
                    </pre>
                  </div>
                </>
              )}

              {/* Automation Section */}
              {activeSection === 'automation' && (
                <>
                  <h1 className="text-4xl font-bold mb-6">Automação de Conversas</h1>
                  
                  <h2 id="auto-replies" className="text-2xl font-semibold mt-8 mb-4">Respostas Automáticas</h2>
                  <p>
                    Configure respostas automáticas inteligentes que respondem instantaneamente aos seus clientes:
                  </p>
                  
                  <div className="bg-muted rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Resposta Automática com IA</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCode(codeExamples.autoResponse, 'autoResponse')}
                      >
                        {copiedCode === 'autoResponse' ? (
                          <Check size={16} className="text-green-500" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </Button>
                    </div>
                    <pre className="text-sm overflow-x-auto">
                      <code>{codeExamples.autoResponse}</code>
                    </pre>
                  </div>

                  <h2 id="flow-builder" className="text-2xl font-semibold mt-8 mb-4">Construtor de Fluxos</h2>
                  <p>
                    Crie fluxos de conversa complexos usando nossa interface visual ou via código:
                  </p>
                  
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Arrastar e soltar blocos de conversa</li>
                    <li>Condições e ramificações inteligentes</li>
                    <li>Integração com APIs externas</li>
                    <li>Variáveis e personalização dinâmica</li>
                  </ul>
                </>
              )}

              {/* CTA Section */}
              <div className="mt-16 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Precisa de ajuda?</h3>
                <p className="text-muted-foreground mb-6">
                  Nossa equipe está pronta para ajudar você a configurar e otimizar seu PyTake
                </p>
                <div className="flex gap-4 justify-center">
                  <Button>
                    Falar com Suporte
                  </Button>
                  <Button variant="outline">
                    Agendar Demo
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}