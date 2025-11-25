import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@lib/auth/AuthContext'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Eye, EyeOff, AlertCircle, MessageSquare, Loader2, ArrowRight, CheckCircle } from 'lucide-react'

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
              <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">Bem-vindo de volta</h1>
              <p className="text-slate-600 dark:text-slate-400">Entre com sua conta para acessar o painel</p>
            </div>

            {/* Success Alert */}
            {success && (
              <div className="flex items-start gap-3 rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800 animate-in fade-in duration-300 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">{success}</span>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 animate-in fade-in duration-300 mb-4">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-900 dark:text-white">
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
                  className="h-10 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-900 dark:text-white">
                    Senha
                  </Label>
                  <Link to="#" className="text-xs text-blue-600 hover:text-blue-700">
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
                    className="h-10 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
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
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Register Link */}
            <p className="text-center mt-6 text-slate-600 dark:text-slate-400">
              Não tem conta?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                Registre-se grátis
              </Link>
            </p>
          </div>
        </div>

        {/* Right Column - Benefits (Desktop only) */}
        <div className="hidden lg:flex flex-col justify-center px-8 py-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <h2 className="text-3xl font-bold mb-12 text-slate-900 dark:text-white">
            Por que escolher PyTake?
          </h2>
          <ul className="space-y-6">
            {[
              'Automação completa de fluxos WhatsApp',
              'Analytics em tempo real',
              'Suporte 24/7 em português',
              'Segurança de nível enterprise',
              'Integração com suas ferramentas favoritas',
              'Começar grátis, sem cartão'
            ].map((benefit, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-lg text-slate-700 dark:text-slate-300">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
