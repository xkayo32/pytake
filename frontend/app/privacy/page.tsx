'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LogoInline } from "@/components/ui/logo"
import { ChevronRight, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function PrivacyPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const sections = [
    { id: "general", title: "1. Informações Gerais" },
    { id: "collection", title: "2. Informações que Coletamos" },
    { id: "usage", title: "3. Como Usamos suas Informações" },
    { id: "sharing", title: "4. Compartilhamento de Informações" },
    { id: "security", title: "5. Segurança dos Dados" },
    { id: "rights", title: "6. Seus Direitos (LGPD)" },
    { id: "retention", title: "7. Retenção de Dados" },
    { id: "cookies", title: "8. Cookies" },
    { id: "changes", title: "9. Alterações nesta Política" },
    { id: "contact", title: "10. Contato" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <LogoInline className="h-10" />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="outline" size="sm">Login</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90" size="sm">Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 container mx-auto px-4 py-12">
        {/* Sidebar - Table of Contents */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* TOC */}
            <nav className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                Conteúdo
              </p>
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-foreground-secondary hover:text-primary group"
                >
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="line-clamp-2">{section.title}</span>
                </a>
              ))}
            </nav>

            {/* Quick Links */}
            <div className="mt-8 pt-8 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                Relacionado
              </p>
              <div className="space-y-2">
                <Link href="/terms" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <ChevronRight className="h-3 w-3" />
                  Termos de Uso
                </Link>
                <Link href="/contact" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <ChevronRight className="h-3 w-3" />
                  Contato
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 border">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-3">Política de Privacidade</h1>
              <p className="text-muted-foreground">Última atualização: 19 de novembro de 2025</p>
            </div>

            <div className="prose dark:prose-invert max-w-none space-y-8">
              {/* Section 1 */}
              <section id="general">
                <h2 className="text-2xl font-semibold mb-4">1. Informações Gerais</h2>
                <p className="mb-4">
                  Esta Política de Privacidade descreve como a PyTake ("nós", "nosso" ou "empresa") 
                  coleta, usa, protege e compartilha suas informações quando você usa nosso serviço.
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm">
                    <strong>✓ Compromisso:</strong> Estamos comprometidos com a proteção de sua privacidade e cumprimos integralmente a Lei Geral de Proteção de Dados (LGPD), GDPR e outras regulamentações aplicáveis.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section id="collection">
                <h2 className="text-2xl font-semibold mb-4">2. Informações que Coletamos</h2>
                
                <h3 className="text-xl font-medium mb-3">2.1 Informações Fornecidas por Você</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Dados de cadastro (nome, email, telefone, empresa, CNPJ)</li>
                  <li>Informações de pagamento (processadas por terceiros seguros)</li>
                  <li>Configurações de conta e preferências de comunicação</li>
                  <li>Conteúdo das mensagens do WhatsApp (quando autorizado)</li>
                  <li>Dados de integração com sistemas externos</li>
                </ul>

                <h3 className="text-xl font-medium mb-3">2.2 Informações Coletadas Automaticamente</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Logs de uso da plataforma e interações</li>
                  <li>Endereço IP e informações do dispositivo</li>
                  <li>Dados de performance, analytics e erros</li>
                  <li>Cookies e tecnologias similares</li>
                  <li>Dados de localização (com consentimento)</li>
                </ul>

                <h3 className="text-xl font-medium mb-3">2.3 Informações de Terceiros</h3>
                <p className="mb-4">
                  Podemos receber informações sobre você de terceiros, como provedores de pagamento 
                  ou parceiros integrados, sempre em conformidade com a legislação aplicável.
                </p>
              </section>

              {/* Section 3 */}
              <section id="usage">
                <h2 className="text-2xl font-semibold mb-4">3. Como Usamos suas Informações</h2>
                <p className="mb-4">Usamos suas informações para os seguintes propósitos:</p>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li><strong>Fornecimento:</strong> Fornecer e manter nosso serviço</li>
                  <li><strong>Pagamentos:</strong> Processar transações e pagamentos</li>
                  <li><strong>Comunicação:</strong> Enviar comunicações importantes sobre o serviço</li>
                  <li><strong>Melhoria:</strong> Melhorar nosso produto e experiência do usuário</li>
                  <li><strong>Segurança:</strong> Detectar e prevenir fraudes e ataques</li>
                  <li><strong>Compliance:</strong> Cumprir obrigações legais e regulatórias</li>
                  <li><strong>Marketing:</strong> Enviar materiais de marketing (com seu consentimento)</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="sharing">
                <h2 className="text-2xl font-semibold mb-4">4. Compartilhamento de Informações</h2>
                <p className="mb-4">
                  Não vendemos, trocamos ou transferimos suas informações pessoais para terceiros 
                  para fins de marketing, exceto nas seguintes situações:
                </p>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Com provedores de serviços confiáveis (processadores de pagamento, hosts, etc.)</li>
                  <li>Com parceiros de integração aprovados e com consentimento</li>
                  <li>Quando exigido por lei ou processo legal válido</li>
                  <li>Para proteger nossos direitos, privacidade, segurança ou propriedade</li>
                  <li>Com seu consentimento explícito e informado</li>
                </ul>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm">
                    <strong>📋 Acordos:</strong> Todos os provedores terceirizados assinam acordos de proteção de dados (Data Processing Agreements - DPA) que garantem a segurança de seus dados.
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section id="security">
                <h2 className="text-2xl font-semibold mb-4">5. Segurança dos Dados</h2>
                <p className="mb-4">
                  Implementamos múltiplas camadas de medidas de segurança técnicas e organizacionais 
                  para proteger suas informações:
                </p>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>🔒 Criptografia AES-256 de dados em repouso</li>
                  <li>🔒 Criptografia TLS 1.3 de dados em trânsito</li>
                  <li>🔒 Controles de acesso rigorosos e autenticação multi-fator</li>
                  <li>🔒 Monitoramento contínuo de segurança e intrusão</li>
                  <li>🔒 Auditorias regulares de segurança por terceiros</li>
                  <li>🔒 Backup seguro e redundante dos dados</li>
                  <li>🔒 Certificação SOC 2 Type II</li>
                </ul>

                <p className="mt-4 text-sm text-foreground-secondary">
                  Apesar de nossos esforços, nenhum sistema é 100% seguro. Recomendamos que você 
                  mantenha suas credenciais confidenciais e reporte qualquer suspeita de segurança.
                </p>
              </section>

              {/* Section 6 */}
              <section id="rights">
                <h2 className="text-2xl font-semibold mb-4">6. Seus Direitos (LGPD)</h2>
                <p className="mb-4">
                  Conforme a Lei Geral de Proteção de Dados (LGPD), você tem os seguintes direitos 
                  sobre seus dados pessoais:
                </p>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Confirmação da existência de tratamento</li>
                  <li>Acesso aos dados e cópias</li>
                  <li>Correção de dados incompletos, inexatos ou desatualizados</li>
                  <li>Anonimização, bloqueio ou eliminação de dados</li>
                  <li>Portabilidade dos dados em formato estruturado</li>
                  <li>Revogação do consentimento a qualquer momento</li>
                </ul>

                <p className="mt-4">
                  Para exercer seus direitos, entre em contato através dos canais abaixo. 
                  Responderemos em até 30 dias:
                </p>
                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-6 space-y-3 mt-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email de Privacidade</p>
                    <p className="font-semibold">privacidade@pytake.net</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                    <p className="font-semibold">+55 (11) 99999-9999</p>
                  </div>
                </div>
              </section>

              {/* Section 7 */}
              <section id="retention">
                <h2 className="text-2xl font-semibold mb-4">7. Retenção de Dados</h2>
                <p className="mb-4">
                  Mantemos suas informações apenas pelo tempo necessário para:
                </p>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Fornecer nossos serviços e suportar sua conta</li>
                  <li>Cumprir obrigações legais e regulatórias</li>
                  <li>Resolver disputas e fazer valer nossos acordos</li>
                  <li>Conformidade fiscal e contábil</li>
                </ul>
                <p className="mt-4">
                  Após a exclusão de sua conta, nós retemos dados agregados e anonimizados para 
                  análise. Dados específicos são excluídos em conformidade com a legislação.
                </p>
              </section>

              {/* Section 8 */}
              <section id="cookies">
                <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
                <p className="mb-4">
                  Usamos cookies e tecnologias similares para melhorar sua experiência na plataforma:
                </p>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li><strong>Sessão:</strong> Cookies de sessão para manter você autenticado</li>
                  <li><strong>Preferências:</strong> Salvar idioma, tema e preferências</li>
                  <li><strong>Analytics:</strong> Para entender uso da plataforma</li>
                  <li><strong>Segurança:</strong> Para prevenir fraudes e abusos</li>
                </ul>
                <p className="mt-4">
                  Você pode controlar o uso de cookies através das configurações do seu navegador. 
                  Desabilitar cookies pode afetar a funcionalidade do serviço.
                </p>
              </section>

              {/* Section 9 */}
              <section id="changes">
                <h2 className="text-2xl font-semibold mb-4">9. Alterações nesta Política</h2>
                <p className="mb-4">
                  Podemos atualizar esta política periodicamente para refletir mudanças em nossas 
                  práticas. Notificaremos sobre mudanças significativas através de:
                </p>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Email para seu endereço cadastrado</li>
                  <li>Aviso em destaque na plataforma</li>
                  <li>Publicação da versão atualizada</li>
                </ul>
              </section>

              {/* Section 10 */}
              <section id="contact">
                <h2 className="text-2xl font-semibold mb-4">10. Contato</h2>
                <p className="mb-4">
                  Para questões, exercer direitos ou reportar problemas de privacidade:
                </p>
                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-6 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email de Privacidade</p>
                    <p className="font-semibold">privacidade@pytake.net</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email Legal</p>
                    <p className="font-semibold">legal@pytake.net</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                    <p className="font-semibold">+55 (11) 99999-9999</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                    <p className="font-semibold">São Paulo, SP - Brasil</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-background py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © 2024 PyTake. Todos os direitos reservados.
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