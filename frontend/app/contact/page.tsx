'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LogoInline } from "@/components/ui/logo"
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, ArrowRight, Zap as ZapIcon, Globe, Users, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <LogoInline className="h-8" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-64px)]">
        {/* Left Column - Contact Form */}
        <div className="flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-0 lg:border-r border-slate-200 dark:border-slate-700">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-3">Fale Conosco</h1>
              <p className="text-muted-foreground text-lg">Responderemos em até 24 horas</p>
            </div>

            {submitted ? (
              <div className="flex items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20 p-6 border border-green-200 dark:border-green-800 mb-6">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100">Mensagem enviada!</h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">Obrigado! Entraremos em contato em breve.</p>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name and Email */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-sm font-medium">Nome *</Label>
                  <Input 
                    id="name"
                    placeholder="Seu nome"
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                  <Input 
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    className="h-10"
                  />
                </div>
              </div>

              {/* Phone and Company */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-sm font-medium">Telefone</Label>
                  <Input 
                    id="phone"
                    placeholder="+55 (11) 9..."
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="company" className="text-sm font-medium">Empresa</Label>
                  <Input 
                    id="company"
                    placeholder="Sua empresa"
                    className="h-10"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <Label htmlFor="subject" className="text-sm font-medium">Assunto *</Label>
                <Select>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione o assunto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">💰 Vendas</SelectItem>
                    <SelectItem value="support">🆘 Suporte Técnico</SelectItem>
                    <SelectItem value="demo">🎮 Demonstração</SelectItem>
                    <SelectItem value="partnership">🤝 Parcerias</SelectItem>
                    <SelectItem value="billing">💳 Faturamento</SelectItem>
                    <SelectItem value="other">📝 Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div className="space-y-1">
                <Label htmlFor="message" className="text-sm font-medium">Mensagem *</Label>
                <Textarea 
                  id="message"
                  placeholder="Descreva sua dúvida ou necessidade..."
                  rows={5}
                  required
                  className="resize-none"
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 h-10 text-base font-semibold transition-all"
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar Mensagem
              </Button>

              {/* Back to Home */}
              <Link 
                href="/"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2 border-t border-slate-200 dark:border-slate-700"
              >
                <div className="group-hover:-translate-x-1 transition-transform">
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </div>
                Voltar para início
              </Link>
            </form>
          </div>
        </div>

        {/* Right Column - Contact Info & Benefits (Desktop only) */}
        <div className="hidden lg:flex flex-col justify-between px-8 py-12 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 dark:from-slate-950 dark:via-blue-950 dark:to-slate-950 relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />

          <div className="relative z-10">
            <div className="mb-12">
              <h2 className="text-4xl font-bold text-white mb-3 leading-tight">Estamos Aqui para Ajudar</h2>
              <p className="text-lg text-slate-300">Dúvidas? Conecte-se com nosso time de especialistas</p>
            </div>

            {/* Contact Methods */}
            <div className="space-y-6">
              <div className="group">
                <div className="flex gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-blue-500/30">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                      <Mail className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-blue-300 transition-colors">Email</h3>
                    <p className="text-sm text-slate-400">contato@pytake.net</p>
                    <p className="text-xs text-slate-500">Suporte: suporte@pytake.net</p>
                  </div>
                </div>
              </div>

              <div className="group">
                <div className="flex gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-emerald-500/30">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                      <Phone className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-emerald-300 transition-colors">WhatsApp</h3>
                    <p className="text-sm text-slate-400">+55 (11) 99999-9999</p>
                    <p className="text-xs text-slate-500">Atendimento prioritário</p>
                  </div>
                </div>
              </div>

              <div className="group">
                <div className="flex gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-cyan-500/30">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
                      <Clock className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-cyan-300 transition-colors">Horários</h3>
                    <p className="text-sm text-slate-400">Seg-Sex: 9h às 18h</p>
                    <p className="text-xs text-slate-500">Chat 24/7 para clientes</p>
                  </div>
                </div>
              </div>

              <div className="group">
                <div className="flex gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-amber-500/30">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
                      <MapPin className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-amber-300 transition-colors">Localização</h3>
                    <p className="text-sm text-slate-400">São Paulo, SP</p>
                    <p className="text-xs text-slate-500">Suporte global</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="relative z-10 mt-auto pt-8 border-t border-slate-700/50">
            <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg p-6 border border-blue-500/20 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-slate-200 font-semibold text-lg mb-1">Precisa de ajuda?</p>
                  <p className="text-sm text-slate-400">Acesse nossa documentação completa</p>
                </div>
                <div className="flex-shrink-0 text-blue-400">
                  <ZapIcon className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}