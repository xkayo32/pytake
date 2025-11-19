'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getApiUrl, getAuthHeaders } from '@/lib/api-client' 
  MessageSquare,
  Code,
  Play,
  Download,
  ExternalLink,
  Github,
  Zap,
  Users,
  Star,
  Copy,
  CheckCircle,
  ArrowRight,
  CreditCard,
  Settings,
  Rocket,
  FileText,
  Globe,
  Heart,
  ArrowLeft,
  Workflow,
  Bot,
  Database,
  Terminal,
  Layers,
  Share2,
  Sparkles,
  Clock,
  Target,
  Building,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'

export default function DocsPage() {
  const [copiedCode, setCopiedCode] = useState('')

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(''), 2000)
  }

  const features = [
    {
      icon: <Workflow className="h-6 w-6" />,
      title: "Editor Visual de Flows",
      description: "Interface drag-and-drop para criar automações complexas",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Bot className="h-6 w-6" />,
      title: "IA Integrada",
      description: "ChatGPT, Claude e Gemini nativamente integrados",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: "Backend em Rust",
      description: "Performance e segurança de nível empresarial",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "WhatsApp Business",
      description: "API oficial + Evolution API para máxima compatibilidade",
      color: "from-green-500 to-emerald-500"
    }
  ]

  const nodeTypes = [
    { name: "Template Negotiation", icon: "💬", description: "Templates de negociação com botões inteligentes" },
    { name: "Queue Management", icon: "📋", description: "Fila automática de atendimento com prioridades" },
    { name: "AI Classifier", icon: "🤖", description: "Classificação inteligente de mensagens" },
    { name: "Payment Integration", icon: "💳", description: "PIX, boleto e cartão integrados" },
    { name: "API Calls", icon: "🔗", description: "Integração com sistemas externos" },
    { name: "Conditional Logic", icon: "🎯", description: "Decisões baseadas em dados dinâmicos" }
  ]

  const apiExample = `// Iniciar flow de negociação
const response = await fetch('/api/v1/flows/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    flow_id: 'negotiation_template',
    contact_id: '5511999999999',
    variables: {
      customer_name: 'João Silva',
      amount: 350.00,
      due_date: '2024-01-15'
    }
  })
})

const result = await response.json()
console.log('Flow iniciado:', result.session_id)`

  const rustEngineExample = `// Flow Engine em Rust - Exemplo de execução
pub async fn execute_negotiation_flow(
    session: &mut FlowSession,
    node: &FlowNode
) -> Result<FlowExecutionResult, FlowError> {
    match &node.node_type {
        NodeType::NegotiationTemplate { template, options } => {
            // Processar template de negociação
            let message = render_template(template, &session.variables)?;
            send_whatsapp_template(&session.contact_id, message).await?;
            
            Ok(FlowExecutionResult::WaitingForInput {
                expected_inputs: options.buttons.clone(),
                timeout: Duration::from_secs(3600)
            })
        }
        NodeType::QueueManagement { criteria } => {
            // Adicionar à fila baseado em critérios
            queue_service.add_to_negotiation_queue(
                &session.contact_id,
                criteria
            ).await?;
            
            Ok(FlowExecutionResult::Completed)
        }
        _ => Err(FlowError::UnsupportedNodeType)
    }
}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              <MessageSquare className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                PyTake
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/flows">
              <Button variant="ghost">
                <Workflow className="h-4 w-4 mr-2" />
                Flow Builder
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full px-4 py-2 mb-6">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Flow Builder Profissional para WhatsApp</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            PyTake Flow Engine
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Sistema completo de automação para WhatsApp com editor visual profissional, 
            backend em Rust de alta performance e templates especializados para negociação.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link href="/flows">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Play className="h-5 w-5 mr-2" />
                Testar Flow Builder
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              <Download className="h-5 w-5 mr-2" />
              Ver Documentação
            </Button>
            <Button variant="outline" size="lg">
              <Github className="h-5 w-5 mr-2" />
              Código Fonte
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, index) => (
              <Card key={index} className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${feature.color} text-white mb-4`}>
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Flow Builder Demo */}
      <section className="bg-slate-50 dark:bg-slate-900/50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Editor Visual Profissional</h2>
              <p className="text-lg text-muted-foreground">
                Arraste, conecte e configure nodes especializados para criar automações complexas
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-500 text-white rounded-lg">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Template de Negociação</h3>
                      <p className="text-sm text-muted-foreground">Pendência: R$ 350,00</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white/50 rounded border text-sm">
                      <span>💬 Negociar</span>
                      <Badge variant="outline" className="text-xs">start_flow</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white/50 rounded border text-sm">
                      <span>💳 Pagar PIX</span>
                      <Badge variant="outline" className="text-xs">pix_payment</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white/50 rounded border text-sm">
                      <span>🧑‍💼 Atendente</span>
                      <Badge variant="outline" className="text-xs">transfer</Badge>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Nodes Especializados</h3>
                <div className="grid grid-cols-2 gap-4">
                  {nodeTypes.map((node, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border">
                      <span className="text-lg">{node.icon}</span>
                      <div>
                        <div className="font-medium text-sm">{node.name}</div>
                        <div className="text-xs text-muted-foreground">{node.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Documentation */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="api" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="api">API REST</TabsTrigger>
                <TabsTrigger value="rust">Engine Rust</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>
              
              <TabsContent value="api" className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">API de Flows</h2>
                  <p className="text-lg text-muted-foreground">
                    Execute flows, gerencie sessões e integre com seus sistemas
                  </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Execução de Flow</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(apiExample, 'api')}
                        className="h-8 w-8 p-0"
                      >
                        {copiedCode === 'api' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm text-slate-300">
                        <code>{apiExample}</code>
                      </pre>
                    </div>
                  </Card>

                  <div className="space-y-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <h4 className="font-medium">Endpoints Principais</h4>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li><code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">POST /api/v1/flows/execute</code></li>
                        <li><code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">GET /api/v1/flows/session/{'id'}</code></li>
                        <li><code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">POST /api/v1/flows/webhook</code></li>
                        <li><code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">GET /api/v1/flows/templates</code></li>
                      </ul>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                          <Terminal className="h-4 w-4 text-blue-600" />
                        </div>
                        <h4 className="font-medium">Autenticação</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">JWT Bearer Token</p>
                      <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs">
                        Authorization: Bearer your_jwt_token
                      </code>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rust" className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">Engine em Rust</h2>
                  <p className="text-lg text-muted-foreground">
                    Performance e confiabilidade para execução de flows em escala
                  </p>
                </div>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">FlowEngine - Execução de Nodes</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(rustEngineExample, 'rust')}
                      className="h-8 w-8 p-0"
                    >
                      {copiedCode === 'rust' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-slate-300">
                      <code>{rustEngineExample}</code>
                    </pre>
                  </div>
                </Card>

                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium">Performance</h4>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Execução assíncrona</li>
                      <li>• Pool de conexões</li>
                      <li>• Memory safety</li>
                    </ul>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium">Arquitetura</h4>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Modular workspace</li>
                      <li>• Type-safe APIs</li>
                      <li>• Error handling</li>
                    </ul>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-5 w-5 text-purple-600" />
                      <h4 className="font-medium">Persistência</h4>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• PostgreSQL + Redis</li>
                      <li>• Session management</li>
                      <li>• State persistence</li>
                    </ul>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="templates" className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">Templates Prontos</h2>
                  <p className="text-lg text-muted-foreground">
                    Flows pré-configurados para casos de uso comuns
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <CreditCard className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Template de Negociação</h3>
                        <p className="text-sm text-muted-foreground">Cobrança automatizada</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>8 nodes especializados</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Verificação de elegibilidade</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>3 opções de desconto</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>PIX integrado</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Fila automática</span>
                      </div>
                    </div>

                    <Button className="w-full mt-4" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Carregar Template
                    </Button>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Bot className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Atendimento IA</h3>
                        <p className="text-sm text-muted-foreground">ChatGPT + classificação</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span>Em desenvolvimento</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>• Classificação inteligente</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>• Respostas contextuais</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>• Escalação automática</span>
                      </div>
                    </div>

                    <Button className="w-full mt-4" variant="outline" disabled>
                      Em Breve
                    </Button>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Comunidade PyTake</h2>
            <p className="text-xl opacity-90 mb-8">
              Junte-se à comunidade de desenvolvedores e empresas que usam PyTake para automatizar WhatsApp
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">50+</div>
                <div className="opacity-90">Empresas ativas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">1M+</div>
                <div className="opacity-90">Mensagens processadas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">99.9%</div>
                <div className="opacity-90">Uptime garantido</div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="secondary" size="lg">
                <MessageSquare className="h-5 w-5 mr-2" />
                Discord Comunidade
              </Button>
              <Button variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Github className="h-5 w-5 mr-2" />
                GitHub
              </Button>
              <Button variant="outline" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <FileText className="h-5 w-5 mr-2" />
                Blog Técnico
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">PyTake</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Plataforma profissional de automação WhatsApp com flow builder visual e engine Rust.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/flows" className="hover:text-primary">Flow Builder</Link></li>
                <li><Link href="/pricing" className="hover:text-primary">Preços</Link></li>
                <li><Link href="/enterprise" className="hover:text-primary">Enterprise</Link></li>
                <li><Link href="/updates" className="hover:text-primary">Atualizações</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Desenvolvedores</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs" className="hover:text-primary">Documentação</Link></li>
                <li><Link href="/api" className="hover:text-primary">API Reference</Link></li>
                <li><Link href="/sdk" className="hover:text-primary">SDKs</Link></li>
                <li><Link href="/webhooks" className="hover:text-primary">Webhooks</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary">Sobre</Link></li>
                <li><Link href="/contact" className="hover:text-primary">Contato</Link></li>
                <li><Link href="/privacy" className="hover:text-primary">Privacidade</Link></li>
                <li><Link href="/terms" className="hover:text-primary">Termos</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-muted-foreground mb-4 md:mb-0">
              © 2024 PyTake. Todos os direitos reservados.
            </div>
            <div className="flex items-center gap-4">
              <Link href="/status" className="text-sm text-muted-foreground hover:text-primary">
                Status da Plataforma
              </Link>
              <Link href="/security" className="text-sm text-muted-foreground hover:text-primary">
                Segurança
              </Link>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                Feito com <Heart className="h-3 w-3 text-red-500" /> em São Paulo
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}