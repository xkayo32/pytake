'use client'

import { Button } from "@/components/ui/button"
import { MessageSquare, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold mb-8">Termos de Uso</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 13 de agosto de 2024</p>

        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
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