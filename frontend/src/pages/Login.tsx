import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@lib/auth/AuthContext'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Eye, EyeOff, AlertCircle, MessageSquare, Loader2, ArrowRight, CheckCircle, Sparkles } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await login(email, password)
      setSuccess('Login realizado com sucesso!')
      setTimeout(() => navigate('/dashboard'), 1000)
    } catch (err: any) {
      setError(err?.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Column - Form */}
        <div className="flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-0">
          <div className="w-full max-w-md mx-auto animate-fade-in">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 bg-gradient-whatsapp rounded-xl flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">PyTake</span>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 text-foreground">Bem-vindo de volta</h1>
              <p className="text-muted-foreground">Entre com sua conta para acessar o painel</p>
            </div>

            {/* Success Alert */}
            {success && (
              <div className="flex items-start gap-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 p-4 border border-primary-200 dark:border-primary-800 animate-scale-in mb-4">
                <CheckCircle className="h-5 w-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-primary-700 dark:text-primary-300 font-medium">{success}</span>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 animate-scale-in mb-4">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Senha
                  </Label>
                  <Link to="#" className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11"
                size="lg"
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

            {/* Register Link */}
            <p className="text-center mt-6 text-muted-foreground">
              Não tem conta?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                Registre-se grátis
              </Link>
            </p>
          </div>
        </div>

        {/* Right Column - Benefits (Desktop only) */}
        <div className="hidden lg:flex flex-col justify-center px-8 py-8 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-md">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-6 h-6 text-white/80" />
              <span className="text-white/80 text-sm font-medium">Plataforma líder em automação</span>
            </div>

            <h2 className="text-4xl font-bold mb-8 text-white leading-tight">
              Automatize seu WhatsApp Business com inteligência
            </h2>

            <ul className="space-y-4">
              {[
                'Automação completa de fluxos WhatsApp',
                'Analytics em tempo real',
                'Suporte 24/7 em português',
                'Segurança de nível enterprise',
                'Integração com suas ferramentas',
                'Começar grátis, sem cartão',
              ].map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="w-6 h-6 bg-white/20 backdrop-blur rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-lg text-white/90">{benefit}</span>
                </li>
              ))}
            </ul>

            {/* Testimonial */}
            <div className="mt-12 p-6 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
              <p className="text-white/90 italic mb-4">
                "PyTake revolucionou nosso atendimento. Reduzimos o tempo de resposta em 70%."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-semibold">
                  MC
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Maria Clara</p>
                  <p className="text-white/60 text-xs">Gerente de Atendimento, TechCorp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
