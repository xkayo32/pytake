import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/slices/authSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { Mail, Lock, MessageSquare, Users, Zap, Shield } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error, isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent any default form behavior
    const form = e.target as HTMLFormElement
    if (form.reportValidity && !form.reportValidity()) {
      return
    }
    
    try {
      await login(email, password)
    } catch (error) {
      console.error('Login submit error:', error)
    }
    
    return false
  }

  const handleQuickLogin = async (userEmail: string, userPassword: string) => {
    setEmail(userEmail)
    setPassword(userPassword)
    
    // Add small delay to ensure state updates
    setTimeout(async () => {
      await login(userEmail, userPassword)
    }, 100)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">
          {/* Logo and Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <Logo size="lg" />
            </div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">Bem-vindo de volta</h1>
            <p className="text-muted-foreground">
              Entre com suas credenciais para acessar o painel
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 pl-10 text-base"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pl-10 text-base"
                />
              </div>
            </div>
            
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-destructive/20 p-1">
                    <svg className="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">
                      Erro na autenticação
                    </p>
                    <p className="text-sm text-destructive/80 mt-1">
                      {error}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          {/* Quick Login Buttons - Development Only */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Login Rápido (Dev)</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin('admin@pytake.com', 'admin123')}
                  className="text-xs"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin('supervisor@pytake.com', 'supervisor123')}
                  className="text-xs"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Supervisor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin('agent@pytake.com', 'agent123')}
                  className="text-xs"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Agente
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickLogin('viewer@pytake.com', 'viewer123')}
                  className="text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Visualizador
                </Button>
              </div>
            </div>
          )}

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <a href="#" className="text-sm text-primary hover:underline">
              Esqueceu sua senha?
            </a>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              Desenvolvido com ❤️ por{' '}
              <a 
                href="https://pydev.com.br" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                PyDev
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Feature Showcase */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 p-12 items-center justify-center">
        <div className="max-w-lg">
          <div className="mb-8">
            <Logo size="xl" className="mb-6" />
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Gerencie conversas do WhatsApp Business com eficiência
            </h2>
            <p className="text-lg text-muted-foreground">
              Plataforma completa para integração e automação de atendimento
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Multi-conversas</h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie múltiplas conversas simultaneamente
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Multi-agentes</h3>
                <p className="text-sm text-muted-foreground">
                  Distribua atendimentos entre sua equipe
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Automação inteligente</h3>
                <p className="text-sm text-muted-foreground">
                  Respostas automáticas e fluxos personalizados
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Seguro e confiável</h3>
                <p className="text-sm text-muted-foreground">
                  Dados protegidos com criptografia de ponta
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}