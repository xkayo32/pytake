'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, ArrowLeft, Mail, Phone, MapPin, Clock } from "lucide-react"
import Link from "next/link"

export default function ContactPage() {
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

      {/* Header */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r gradient-text-primary bg-clip-text text-transparent">
            Entre em Contato
          </h1>
          <p className="text-xl text-foreground-secondary mb-8 max-w-2xl mx-auto">
            Tem alguma dúvida ou precisa de ajuda? Nossa equipe está pronta para atendê-lo.
          </p>
        </div>
      </section>

      {/* Contact Form and Info */}
      <section className="container mx-auto px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle>Envie sua Mensagem</CardTitle>
                <CardDescription>
                  Preencha o formulário e responderemos em até 24 horas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Nome *</Label>
                      <Input id="firstName" placeholder="Seu nome" required />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Sobrenome *</Label>
                      <Input id="lastName" placeholder="Seu sobrenome" required />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" placeholder="seu@email.com" required />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" placeholder="+55 (11) 99999-9999" />
                  </div>
                  
                  <div>
                    <Label htmlFor="company">Empresa</Label>
                    <Input id="company" placeholder="Nome da sua empresa" />
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">Assunto *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o assunto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Vendas</SelectItem>
                        <SelectItem value="support">Suporte Técnico</SelectItem>
                        <SelectItem value="demo">Demonstração</SelectItem>
                        <SelectItem value="partnership">Parcerias</SelectItem>
                        <SelectItem value="billing">Faturamento</SelectItem>
                        <SelectItem value="other">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="message">Mensagem *</Label>
                    <Textarea 
                      id="message" 
                      placeholder="Descreva sua dúvida ou necessidade..." 
                      rows={5}
                      required 
                    />
                  </div>
                  
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    Enviar Mensagem
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Email</h3>
                      <p className="text-muted-foreground">contato@pytake.net</p>
                      <p className="text-sm text-muted-foreground">Suporte: suporte@pytake.net</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Telefone</h3>
                      <p className="text-muted-foreground">+55 (11) 99999-9999</p>
                      <p className="text-sm text-muted-foreground">WhatsApp disponível</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Endereço</h3>
                      <p className="text-muted-foreground">
                        São Paulo, SP<br />
                        Brasil
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-medium">Horário de Atendimento</h3>
                      <p className="text-muted-foreground">
                        Segunda à Sexta: 9h às 18h<br />
                        Sábado: 9h às 12h<br />
                        Domingo: Fechado
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Support Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Outras Formas de Suporte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-surface rounded-lg">
                    <h3 className="font-medium mb-2">Central de Ajuda</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Encontre respostas para dúvidas comuns
                    </p>
                    <Link href="/docs">
                      <Button variant="outline" size="sm">
                        Acessar Documentação
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="p-4 bg-slate-50 dark:bg-surface rounded-lg">
                    <h3 className="font-medium mb-2">Chat ao Vivo</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Fale conosco em tempo real (clientes)
                    </p>
                    <Button variant="outline" size="sm">
                      Iniciar Chat
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-slate-50 dark:bg-surface rounded-lg">
                    <h3 className="font-medium mb-2">Status da Plataforma</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Verifique o status dos nossos serviços
                    </p>
                    <Button variant="outline" size="sm">
                      Ver Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-slate-50 dark:bg-surface/50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Perguntas Frequentes
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Quanto tempo leva para configurar?</h3>
                  <p className="text-muted-foreground text-sm">
                    A configuração básica leva cerca de 15 minutos. Nossa equipe pode 
                    ajudar com configurações mais complexas.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Vocês oferecem suporte em português?</h3>
                  <p className="text-muted-foreground text-sm">
                    Sim! Todo nosso suporte é em português, por uma equipe brasileira.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Há limite de mensagens?</h3>
                  <p className="text-muted-foreground text-sm">
                    Depende do plano escolhido. Temos opções desde 1.000 até 
                    mensagens ilimitadas.
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Posso migrar de outra plataforma?</h3>
                  <p className="text-muted-foreground text-sm">
                    Sim! Oferecemos migração gratuita de dados e configurações 
                    de outras plataformas.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">O PyTake é seguro?</h3>
                  <p className="text-muted-foreground text-sm">
                    Absolutamente. Usamos criptografia de ponta e somos 
                    totalmente conformes com a LGPD.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Oferecem treinamento?</h3>
                  <p className="text-muted-foreground text-sm">
                    Sim! Oferecemos onboarding completo e treinamento para 
                    sua equipe sem custo adicional.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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