import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@lib/auth/AuthContext'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Eye, EyeOff, AlertCircle, MessageSquare, Loader2, ArrowRight, CheckCircle, Check } from 'lucide-react'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== passwordConfirm) {
      setError('As senhas não correspondem')
      return
    }

    if (!agreedTerms) {
      setError('Você deve aceitar os termos de serviço')
      return
    }

    setLoading(true)

    try {
      await register(email, password, name)
      setSuccess('Conta criada com sucesso!')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-center mb-8">
            <MessageSquare className="w-8 h-8 text-blue-600 mr-2" />
            <span className="text-2xl font-bold text-slate-900 dark:text-white">PyTake</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">Criar conta</h1>
            <p className="text-slate-600 dark:text-slate-400">Comece a automatizar seus fluxos WhatsApp hoje</p>
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
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-900 dark:text-white">
                Nome Completo
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              />
            </div>

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
                className="h-10 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-900 dark:text-white">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm" className="text-sm font-medium text-slate-900 dark:text-white">
                Confirmar Senha
              </Label>
              <div className="relative">
                <Input
                  id="passwordConfirm"
                  type={showPasswordConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  className="h-10 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPasswordConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2 py-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-slate-600 dark:text-slate-400">
                Concordo com os{' '}
                <Link to="#" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Termos de Serviço
                </Link>
                {' '}e a{' '}
                <Link to="#" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Política de Privacidade
                </Link>
              </label>
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
                  Criando conta...
                </>
              ) : (
                <>
                  Criar Conta
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Login Link */}
          <p className="text-center mt-6 text-slate-600 dark:text-slate-400">
            Já tem conta?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Faça login
            </Link>
          </p>

          {/* Benefits */}
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Começar é grátis:</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              {[
                'Sem necessidade de cartão de crédito',
                '7 dias de teste completo',
                'Acesso a todos os recursos',
                'Suporte por email incluído'
              ].map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
