import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@lib/auth/AuthContext'
import { useNotifications } from '@hooks/useNotification'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Eye, EyeOff, MessageSquare, Loader2, ArrowRight } from 'lucide-react'

/**
 * Página de Login com integração de Toasts
 * Demonstra o uso de notificações em um formulário real
 */
export default function LoginWithNotifications() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const notifications = useNotifications()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validação
      if (!email || !password) {
        notifications.warning('Preencha todos os campos')
        setLoading(false)
        return
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        notifications.error('Email inválido')
        setLoading(false)
        return
      }

      // Login
      await login(email, password)
      
      // Sucesso!
      notifications.success('Login realizado com sucesso!')
      
      // Aguarda animação e navega
      setTimeout(() => navigate('/dashboard'), 800)
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao fazer login'
      notifications.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Column - Form */}
        <div className="flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-0 lg:border-r border-slate-200 dark:border-slate-700">
          <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center justify-center mb-8 lg:hidden">
              <MessageSquare className="w-8 h-8 text-blue-600 mr-2" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">PyTake</span>
            </div>

            <div className="mb-8">
              <h1 className="section-title">Bem-vindo de volta</h1>
              <p className="section-subtitle">
                Entre com sua conta para acessar o painel
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="input-focus"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Senha</Label>
                  <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="input-focus pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Link para Register */}
            <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
              Não tem conta?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                Criar conta grátis
              </Link>
            </p>

            {/* Demo Features */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                🧪 Credenciais de Teste:
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-200 font-mono">
                user@example.com / password123
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Benefits (Desktop Only) */}
        <div className="hidden lg:flex flex-col justify-center items-center px-8 py-0 bg-gradient-to-br from-blue-600 to-cyan-600">
          <div className="text-white text-center space-y-8">
            <div>
              <h2 className="text-4xl font-bold mb-4">Gerencie seus fluxos</h2>
              <p className="text-lg text-blue-100">
                Automação inteligente de WhatsApp para seu negócio
              </p>
            </div>

            <div className="space-y-4 text-left">
              {[
                '✓ Sem necessidade de cartão de crédito',
                '✓ 7 dias de teste completo',
                '✓ Acesso a todos os recursos',
                '✓ Suporte 24/7 por email',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-blue-50">
                  <span className="text-xl">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
