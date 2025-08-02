import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft,
  Code2,
  Terminal,
  Key,
  Globe,
  Shield,
  Zap,
  Database,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  AlertCircle
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function ApiPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'javascript' | 'python' | 'php'>('curl')

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const endpoints = [
    {
      method: 'POST',
      path: '/api/v1/messages/send',
      description: 'Enviar mensagem de texto',
      category: 'messages'
    },
    {
      method: 'POST',
      path: '/api/v1/messages/send-media',
      description: 'Enviar mídia (imagem, vídeo, áudio)',
      category: 'messages'
    },
    {
      method: 'GET',
      path: '/api/v1/messages/:id',
      description: 'Obter detalhes de uma mensagem',
      category: 'messages'
    },
    {
      method: 'GET',
      path: '/api/v1/conversations',
      description: 'Listar conversas',
      category: 'conversations'
    },
    {
      method: 'GET',
      path: '/api/v1/conversations/:id',
      description: 'Obter conversa específica',
      category: 'conversations'
    },
    {
      method: 'POST',
      path: '/api/v1/webhooks/subscribe',
      description: 'Configurar webhook',
      category: 'webhooks'
    },
    {
      method: 'GET',
      path: '/api/v1/contacts',
      description: 'Listar contatos',
      category: 'contacts'
    },
    {
      method: 'POST',
      path: '/api/v1/automation/flows',
      description: 'Criar fluxo de automação',
      category: 'automation'
    }
  ]

  const codeExamples = {
    sendMessage: {
      curl: `curl -X POST https://api.pytake.com/v1/messages/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "5511999999999",
    "message": {
      "text": "Olá! Esta é uma mensagem do PyTake."
    }
  }'`,
      
      javascript: `const response = await fetch('https://api.pytake.com/v1/messages/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: '5511999999999',
    message: {
      text: 'Olá! Esta é uma mensagem do PyTake.'
    }
  })
});

const data = await response.json();
console.log(data);`,
      
      python: `import requests

url = "https://api.pytake.com/v1/messages/send"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
data = {
    "to": "5511999999999",
    "message": {
        "text": "Olá! Esta é uma mensagem do PyTake."
    }
}

response = requests.post(url, json=data, headers=headers)
print(response.json())`,
      
      php: `<?php
$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "https://api.pytake.com/v1/messages/send",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer YOUR_API_KEY",
    "Content-Type: application/json"
  ],
  CURLOPT_POSTFIELDS => json_encode([
    "to" => "5511999999999",
    "message" => [
      "text" => "Olá! Esta é uma mensagem do PyTake."
    ]
  ])
]);

$response = curl_exec($curl);
curl_close($curl);

echo $response;`
    },
    
    webhookPayload: `{
  "event": "message.received",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "msg_123456",
    "from": "5511999999999",
    "to": "5511888888888",
    "message": {
      "text": "Olá, gostaria de saber mais sobre o produto",
      "type": "text"
    },
    "contact": {
      "name": "João Silva",
      "phone": "5511999999999"
    }
  }
}`,

    responseFormat: `{
  "success": true,
  "data": {
    "id": "msg_123456",
    "status": "sent",
    "timestamp": "2024-01-15T10:30:00Z",
    "to": "5511999999999",
    "message": {
      "text": "Olá! Esta é uma mensagem do PyTake.",
      "type": "text"
    }
  },
  "meta": {
    "request_id": "req_abc123",
    "credits_used": 1,
    "credits_remaining": 9999
  }
}`
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
                <Link to="/docs" className="text-sm font-medium hover:text-primary transition-colors">
                  Documentação
                </Link>
                <Link to="/api" className="text-sm font-medium text-primary">
                  API Reference
                </Link>
                <a href="https://github.com/pytake" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary transition-colors">
                  GitHub
                </a>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button size="sm">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft size={16} className="mr-2" />
          Voltar ao início
        </Link>

        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">API Reference</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Integre o PyTake em suas aplicações com nossa API RESTful completa e fácil de usar.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border/50 rounded-lg p-6">
              <Terminal className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">API RESTful</h3>
              <p className="text-sm text-muted-foreground">
                Interface simples e intuitiva seguindo padrões REST
              </p>
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-6">
              <Shield className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Segurança</h3>
              <p className="text-sm text-muted-foreground">
                Autenticação via API Key e HTTPS obrigatório
              </p>
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-6">
              <Zap className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Alta Performance</h3>
              <p className="text-sm text-muted-foreground">
                Resposta rápida com rate limiting inteligente
              </p>
            </div>
          </div>
        </div>

        {/* Base URL */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Base URL</h2>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            https://api.pytake.com/v1
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Autenticação</h2>
          <p className="mb-4">
            Todas as requisições à API devem incluir sua API Key no header de autorização:
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            Authorization: Bearer YOUR_API_KEY
          </div>
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="text-yellow-600" size={20} />
              <div>
                <p className="text-sm font-medium">Mantenha sua API Key segura!</p>
                <p className="text-sm text-muted-foreground">
                  Nunca exponha sua API Key em código cliente ou repositórios públicos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Rate Limiting */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Rate Limiting</h2>
          <p className="mb-4">
            A API tem os seguintes limites de taxa por plano:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Plano</th>
                  <th className="text-left p-2">Requisições/Minuto</th>
                  <th className="text-left p-2">Requisições/Dia</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">Starter</td>
                  <td className="p-2">60</td>
                  <td className="p-2">10,000</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Professional</td>
                  <td className="p-2">300</td>
                  <td className="p-2">100,000</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Enterprise</td>
                  <td className="p-2">Ilimitado</td>
                  <td className="p-2">Ilimitado</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Endpoints</h2>
          <div className="space-y-4">
            {endpoints.map((endpoint, index) => (
              <div key={index} className="bg-card border border-border/50 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    endpoint.method === 'GET' && "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                    endpoint.method === 'POST' && "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
                    endpoint.method === 'PUT' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
                    endpoint.method === 'DELETE' && "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                  )}>
                    {endpoint.method}
                  </span>
                  <code className="font-mono text-sm flex-1">{endpoint.path}</code>
                  <ChevronRight className="text-muted-foreground" size={16} />
                </div>
                <p className="text-sm text-muted-foreground mt-2">{endpoint.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Code Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Exemplos de Código</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Enviar Mensagem</h3>
            
            {/* Language Selector */}
            <div className="flex gap-2 mb-4">
              {(['curl', 'javascript', 'python', 'php'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={cn(
                    "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                    selectedLanguage === lang
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{selectedLanguage.toUpperCase()}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyCode(codeExamples.sendMessage[selectedLanguage], 'sendMessage')}
                >
                  {copiedCode === 'sendMessage' ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
              </div>
              <pre className="text-sm overflow-x-auto">
                <code>{codeExamples.sendMessage[selectedLanguage]}</code>
              </pre>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Formato de Resposta</h3>
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">JSON Response</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyCode(codeExamples.responseFormat, 'responseFormat')}
                >
                  {copiedCode === 'responseFormat' ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
              </div>
              <pre className="text-sm overflow-x-auto">
                <code>{codeExamples.responseFormat}</code>
              </pre>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Webhook Payload</h3>
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Exemplo de Payload</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyCode(codeExamples.webhookPayload, 'webhookPayload')}
                >
                  {copiedCode === 'webhookPayload' ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
              </div>
              <pre className="text-sm overflow-x-auto">
                <code>{codeExamples.webhookPayload}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* SDKs */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">SDKs Oficiais</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a href="https://github.com/pytake/sdk-js" target="_blank" rel="noopener noreferrer" 
               className="bg-card border border-border/50 rounded-lg p-6 hover:border-primary transition-colors group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">JavaScript/TypeScript</h3>
                <ExternalLink className="text-muted-foreground group-hover:text-primary" size={16} />
              </div>
              <code className="text-sm bg-muted px-2 py-1 rounded">npm install @pytake/sdk</code>
            </a>
            
            <a href="https://github.com/pytake/sdk-python" target="_blank" rel="noopener noreferrer"
               className="bg-card border border-border/50 rounded-lg p-6 hover:border-primary transition-colors group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Python</h3>
                <ExternalLink className="text-muted-foreground group-hover:text-primary" size={16} />
              </div>
              <code className="text-sm bg-muted px-2 py-1 rounded">pip install pytake</code>
            </a>
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">Pronto para começar?</h3>
          <p className="text-muted-foreground mb-6">
            Crie sua conta e obtenha sua API Key para começar a integrar
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/login">
              <Button>
                Obter API Key
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="outline">
                Ver Documentação
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}