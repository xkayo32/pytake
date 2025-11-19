'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LogoInline } from "@/components/ui/logo"
import { ChevronRight, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function TermsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const sections = [
    { id: "acceptance", title: "1. Aceitação dos Termos" },
    { id: "service", title: "2. Descrição do Serviço" },
    { id: "account", title: "3. Conta de Usuário" },
    { id: "acceptable-use", title: "4. Uso Aceitável" },
    { id: "payments", title: "5. Pagamentos e Assinaturas" },
    { id: "intellectual", title: "6. Propriedade Intelectual" },
    { id: "privacy", title: "7. Privacidade e Dados" },
    { id: "availability", title: "8. Disponibilidade do Serviço" },
    { id: "limitation", title: "9. Limitação de Responsabilidade" },
    { id: "termination", title: "10. Rescisão" },
    { id: "changes", title: "11. Alterações nos Termos" },
    { id: "law", title: "12. Lei Aplicável" },
    { id: "contact", title: "13. Contato" },
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
                <Link href="/privacy" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <ChevronRight className="h-3 w-3" />
                  Política de Privacidade
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
              <h1 className="text-4xl font-bold mb-3">Termos de Uso</h1>
              <p className="text-muted-foreground">Última atualização: 19 de novembro de 2025</p>
            </div>

            <div className="prose dark:prose-invert max-w-none space-y-8">
              {/* Section 1 */}
              <section id="acceptance">
                <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
                <p className="mb-4">
                  Ao acessar e usar o PyTake, você concorda com estes Termos de Uso. 
                  Se você não concordar com algum termo, não deve usar nosso serviço.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm">
                    <strong>ℹ️ Importante:</strong> Estes termos são vinculativos e estabelecem o relacionamento legal entre você e o PyTake.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section id="service">
                <h2 className="text-2xl font-semibold mb-4">2. Descrição do Serviço</h2>
                <p className="mb-4">
                  O PyTake é uma plataforma de automação para WhatsApp Business que oferece:
                </p>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Automação de conversas e fluxos inteligentes</li>
                  <li>Gestão de contatos e campanhas em massa</li>
                  <li>Integrações com sistemas ERP e CRM</li>
                  <li>Analytics avançado e relatórios personalizados</li>
                  <li>API para desenvolvedores e customizações</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="account">
                <h2 className="text-2xl font-semibold mb-4">3. Conta de Usuário</h2>
                
                <h3 className="text-xl font-medium mb-3">3.1 Registro</h3>
                <p className="mb-4">
                  Para usar o PyTake, você deve criar uma conta fornecendo informações 
                  precisas e completas. Você é responsável por manter a confidencialidade 
                  de suas credenciais e por todas as atividades realizadas em sua conta.
                </p>

                <h3 className="text-xl font-medium mb-3">3.2 Responsabilidades</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Manter suas informações de conta sempre atualizadas</li>
                  <li>Proteger suas credenciais de acesso de terceiros</li>
                  <li>Notificar imediatamente sobre uso não autorizado</li>
                  <li>Ser responsável por todas as atividades em sua conta</li>
                  <li>Respeitar as limitações de uso conforme seu plano</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="acceptable-use">
                <h2 className="text-2xl font-semibold mb-4">4. Uso Aceitável</h2>
                
                <h3 className="text-xl font-medium mb-3">4.1 Atividades Permitidas</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>Automação legítima de atendimento ao cliente</li>
                  <li>Marketing e campanhas conforme regulamentações aplicáveis</li>
                  <li>Integração com sistemas empresariais e ERP</li>
                  <li>Análise de dados e relatórios operacionais</li>
                  <li>Backup e recuperação de informações</li>
                </ul>

                <h3 className="text-xl font-medium mb-3">4.2 Atividades Proibidas</h3>
                <ul className="list-disc list-inside mb-4 space-y-2">
                  <li>🚫 Spam ou mensagens não solicitadas em massa</li>
                  <li>🚫 Conteúdo ilegal, ofensivo ou prejudicial</li>
                  <li>🚫 Violação das políticas e termos do WhatsApp</li>
                  <li>🚫 Tentativas de hack ou acesso não autorizado</li>
                  <li>🚫 Atividades fraudulentas ou enganosas</li>
                  <li>🚫 Revenda ou aluguel do serviço sem autorização</li>
                  <li>🚫 Compartilhamento de conta entre múltiplas organizações</li>
                </ul>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                  <p className="text-sm">
                    <strong>⚠️ Aviso:</strong> Violações podem resultar em suspensão ou encerramento permanente da conta.
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section id="payments">
                <h2 className="text-2xl font-semibold mb-4">5. Pagamentos e Assinaturas</h2>
                
                <h3 className="text-xl font-medium mb-3">5.1 Planos e Preços</h3>
                <p className="mb-4">
                  Os preços dos planos estão disponíveis em nossa página de preços. 
                  Reservamo-nos o direito de alterar preços com aviso prévio de 30 dias.
                </p>

                <h3 className="text-xl font-medium mb-3">5.2 Período Gratuito</h3>
                <p className="mb-4">
                  Oferecemos um período de teste gratuito de 14 dias. Após este período, 
                  será cobrada a assinatura escolhida, a menos que você cancele antes do final do período.
                </p>

                <h3 className="text-xl font-medium mb-3">5.3 Renovação Automática</h3>
                <p className="mb-4">
                  Sua assinatura será renovada automaticamente. Você receberá notificação 
                  por email 7 dias antes do vencimento.
                </p>

                <h3 className="text-xl font-medium mb-3">5.4 Cancelamento</h3>
                <p className="mb-4">
                  Você pode cancelar sua assinatura a qualquer momento. O cancelamento 
                  será efetivo no final do período de cobrança atual. Nenhum reembolso será feito.
                </p>
              </section>

              {/* Section 6 */}
              <section id="intellectual">
                <h2 className="text-2xl font-semibold mb-4">6. Propriedade Intelectual</h2>
                <p className="mb-4">
                  O PyTake, incluindo seu código, design, features e conteúdo, são propriedade 
                  intelectual da empresa e estão protegidos por leis de copyright e propriedade intelectual. 
                  Você recebe apenas uma licença limitada, pessoal e intransferível para usar o serviço.
                </p>
              </section>

              {/* Section 7 */}
              <section id="privacy">
                <h2 className="text-2xl font-semibold mb-4">7. Privacidade e Dados</h2>
                <p className="mb-4">
                  O tratamento de dados pessoais é regido por nossa 
                  <Link href="/privacy" className="text-primary hover:underline ml-1">
                    Política de Privacidade
                  </Link>
                  , que faz parte integrante destes termos. Recomendamos que você a leia atentamente.
                </p>
              </section>

              {/* Section 8 */}
              <section id="availability">
                <h2 className="text-2xl font-semibold mb-4">8. Disponibilidade do Serviço</h2>
                <p className="mb-4">
                  Nos esforçamos para manter o serviço disponível com SLA de 99.9% uptime. 
                  Podemos realizar manutenções programadas com aviso prévio de 48 horas. 
                  Não garantimos 100% de disponibilidade.
                </p>
              </section>

              {/* Section 9 */}
              <section id="limitation">
                <h2 className="text-2xl font-semibold mb-4">9. Limitação de Responsabilidade</h2>
                <p className="mb-4">
                  Em nenhuma circunstância seremos responsáveis por danos indiretos, 
                  incidentais, especiais ou consequenciais decorrentes do uso do serviço, 
                  mesmo que informados da possibilidade de tais danos.
                </p>
              </section>

              {/* Section 10 */}
              <section id="termination">
                <h2 className="text-2xl font-semibold mb-4">10. Rescisão</h2>
                <p className="mb-4">
                  Podemos suspender ou encerrar sua conta em caso de violação destes 
                  termos. Você também pode encerrar sua conta a qualquer momento pela 
                  página de configurações.
                </p>
              </section>

              {/* Section 11 */}
              <section id="changes">
                <h2 className="text-2xl font-semibold mb-4">11. Alterações nos Termos</h2>
                <p className="mb-4">
                  Podemos atualizar estes termos periodicamente. Alterações significativas 
                  serão comunicadas com antecedência de 30 dias. O uso continuado do serviço 
                  implica em aceitação das alterações.
                </p>
              </section>

              {/* Section 12 */}
              <section id="law">
                <h2 className="text-2xl font-semibold mb-4">12. Lei Aplicável</h2>
                <p className="mb-4">
                  Estes termos são regidos pelas leis brasileiras. Disputas serão 
                  resolvidas nos tribunais competentes de São Paulo, SP, Brasil.
                </p>
              </section>

              {/* Section 13 */}
              <section id="contact">
                <h2 className="text-2xl font-semibold mb-4">13. Contato</h2>
                <p className="mb-4">
                  Para questões sobre estes termos, entre em contato:
                </p>
                <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-6 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
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
            <p className="mb-4">
              Ao acessar e usar o PyTake, você concorda com estes Termos de Uso. 
              Se você não concordar com algum termo, não deve usar nosso serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Descrição do Serviço</h2>
            <p className="mb-4">
              O PyTake é uma plataforma de automação para WhatsApp Business que oferece:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Automação de conversas e fluxos</li>
              <li>Gestão de contatos e campanhas</li>
              <li>Integrações com sistemas ERP</li>
              <li>Analytics e relatórios</li>
              <li>API para desenvolvedores</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Conta de Usuário</h2>
            <h3 className="text-xl font-medium mb-3">3.1 Registro</h3>
            <p className="mb-4">
              Para usar o PyTake, você deve criar uma conta fornecendo informações 
              precisas e completas. Você é responsável por manter a confidencialidade 
              de suas credenciais.
            </p>

            <h3 className="text-xl font-medium mb-3">3.2 Responsabilidades</h3>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Manter suas informações de conta atualizadas</li>
              <li>Proteger suas credenciais de acesso</li>
              <li>Notificar sobre uso não autorizado</li>
              <li>Ser responsável por todas as atividades em sua conta</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Uso Aceitável</h2>
            <h3 className="text-xl font-medium mb-3">4.1 Atividades Permitidas</h3>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Automação legítima de atendimento ao cliente</li>
              <li>Marketing conforme regulamentações aplicáveis</li>
              <li>Integração com sistemas empresariais</li>
              <li>Análise de dados próprios</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">4.2 Atividades Proibidas</h3>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Spam ou mensagens não solicitadas</li>
              <li>Conteúdo ilegal, ofensivo ou prejudicial</li>
              <li>Violação das políticas do WhatsApp</li>
              <li>Tentativas de hack ou comprometimento do sistema</li>
              <li>Uso para atividades fraudulentas</li>
              <li>Revenda do serviço sem autorização</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Pagamentos e Assinaturas</h2>
            <h3 className="text-xl font-medium mb-3">5.1 Planos e Preços</h3>
            <p className="mb-4">
              Os preços dos planos estão disponíveis em nossa página de preços. 
              Reservamo-nos o direito de alterar preços com aviso prévio de 30 dias.
            </p>

            <h3 className="text-xl font-medium mb-3">5.2 Período Gratuito</h3>
            <p className="mb-4">
              Oferecemos um período de teste gratuito de 14 dias. Após este período, 
              será cobrada a assinatura escolhida, a menos que você cancele.
            </p>

            <h3 className="text-xl font-medium mb-3">5.3 Cancelamento</h3>
            <p className="mb-4">
              Você pode cancelar sua assinatura a qualquer momento. O cancelamento 
              será efetivo no final do período de cobrança atual.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Propriedade Intelectual</h2>
            <p className="mb-4">
              O PyTake e todo seu conteúdo são propriedade da empresa e estão 
              protegidos por leis de propriedade intelectual. Você recebe apenas 
              uma licença limitada para usar o serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Privacidade e Dados</h2>
            <p className="mb-4">
              O tratamento de dados pessoais é regido por nossa 
              <Link href="/privacy" className="text-primary hover:underline">
                Política de Privacidade
              </Link>
              , que faz parte integrante destes termos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Disponibilidade do Serviço</h2>
            <p className="mb-4">
              Nos esforçamos para manter o serviço disponível, mas não garantimos 
              100% de uptime. Podemos realizar manutenções programadas com aviso prévio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Limitação de Responsabilidade</h2>
            <p className="mb-4">
              Em nenhuma circunstância seremos responsáveis por danos indiretos, 
              incidentais, especiais ou consequenciais decorrentes do uso do serviço.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Rescisão</h2>
            <p className="mb-4">
              Podemos suspender ou encerrar sua conta em caso de violação destes 
              termos. Você também pode encerrar sua conta a qualquer momento.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Alterações nos Termos</h2>
            <p className="mb-4">
              Podemos atualizar estes termos periodicamente. Alterações significativas 
              serão comunicadas com antecedência de 30 dias.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Lei Aplicável</h2>
            <p className="mb-4">
              Estes termos são regidos pelas leis brasileiras. Disputas serão 
              resolvidas nos tribunais de São Paulo, SP.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Contato</h2>
            <p className="mb-4">
              Para questões sobre estes termos:
            </p>
            <ul className="list-none mb-4 space-y-2">
              <li><strong>Email:</strong> legal@pytake.net</li>
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