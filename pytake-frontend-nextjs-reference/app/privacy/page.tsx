'use client'

import { Button } from "@/components/ui/button"
import { MessageSquare, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              <MessageSquare className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-to-r gradient-text-primary bg-clip-text text-transparent">
                PyTake
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 13 de agosto de 2024</p>

        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Informações Gerais</h2>
            <p className="mb-4">
              Esta Política de Privacidade descreve como a PyTake ("nós", "nosso" ou "empresa") 
              coleta, usa e protege suas informações quando você usa nosso serviço.
            </p>
            <p className="mb-4">
              Estamos comprometidos com a proteção de sua privacidade e cumprimos integralmente 
              a Lei Geral de Proteção de Dados (LGPD) e outras regulamentações aplicáveis.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Informações que Coletamos</h2>
            <h3 className="text-xl font-medium mb-3">2.1 Informações Fornecidas por Você</h3>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Dados de cadastro (nome, email, telefone, empresa)</li>
              <li>Informações de pagamento (processadas por terceiros seguros)</li>
              <li>Configurações de conta e preferências</li>
              <li>Conteúdo das mensagens do WhatsApp (quando autorizado)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">2.2 Informações Coletadas Automaticamente</h3>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Logs de uso da plataforma</li>
              <li>Endereço IP e informações do dispositivo</li>
              <li>Dados de performance e análise</li>
              <li>Cookies e tecnologias similares</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Como Usamos suas Informações</h2>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Fornecer e manter nosso serviço</li>
              <li>Processar transações e pagamentos</li>
              <li>Enviar comunicações importantes sobre o serviço</li>
              <li>Melhorar nosso produto e experiência do usuário</li>
              <li>Detectar e prevenir fraudes</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Compartilhamento de Informações</h2>
            <p className="mb-4">
              Não vendemos, trocamos ou transferimos suas informações pessoais para terceiros, 
              exceto nas seguintes situações:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Com provedores de serviços confiáveis (pagamento, hospedagem, etc.)</li>
              <li>Quando exigido por lei ou processo legal</li>
              <li>Para proteger nossos direitos ou segurança</li>
              <li>Com seu consentimento explícito</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Segurança dos Dados</h2>
            <p className="mb-4">
              Implementamos medidas de segurança técnicas e organizacionais para proteger 
              suas informações:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controles de acesso rigorosos</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Auditorias regulares de segurança</li>
              <li>Backup seguro dos dados</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Seus Direitos (LGPD)</h2>
            <p className="mb-4">Você tem os seguintes direitos sobre seus dados pessoais:</p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Confirmação da existência de tratamento</li>
              <li>Acesso aos dados</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados</li>
              <li>Anonimização, bloqueio ou eliminação</li>
              <li>Portabilidade dos dados</li>
              <li>Revogação do consentimento</li>
            </ul>
            <p className="mb-4">
              Para exercer seus direitos, entre em contato através do email: 
              <a href="mailto:privacidade@pytake.net" className="text-primary hover:underline">
                privacidade@pytake.net
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Retenção de Dados</h2>
            <p className="mb-4">
              Mantemos suas informações apenas pelo tempo necessário para:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Fornecer nossos serviços</li>
              <li>Cumprir obrigações legais</li>
              <li>Resolver disputas</li>
              <li>Fazer valer nossos acordos</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
            <p className="mb-4">
              Usamos cookies e tecnologias similares para melhorar sua experiência. 
              Você pode controlar o uso de cookies através das configurações do seu navegador.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Alterações nesta Política</h2>
            <p className="mb-4">
              Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças 
              significativas através do email ou aviso em nossa plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Contato</h2>
            <p className="mb-4">
              Para questões sobre esta política de privacidade:
            </p>
            <ul className="list-none mb-4 space-y-2">
              <li><strong>Email:</strong> privacidade@pytake.net</li>
              <li><strong>Telefone:</strong> +55 (11) 99999-9999</li>
              <li><strong>Endereço:</strong> São Paulo, SP - Brasil</li>
            </ul>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <span className="font-semibold">PyTake © 2024</span>
            </div>
            <div className="flex gap-6">
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">
                Termos
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">
                Privacidade
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">
                Contato
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}