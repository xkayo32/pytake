import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@lib/auth/AuthContext'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Eye, EyeOff, AlertCircle, MessageSquare, Loader2, ArrowRight, CheckCircle, Check } from 'lucide-react'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
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
      await register(email, password, fullName, organizationName)
      setSuccess('Conta criada com sucesso!')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err: any) {
      setError(err?.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    'Sem necessidade de cartão de crédito',
    '7 dias de teste completo',
    'Acesso a todos os recursos',
    'Suporte por email incluído',
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8">
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
          <h1 className="text-3xl font-bold mb-2 text-foreground">Criar conta</h1>
          <p className="text-muted-foreground">Comece a automatizar seus fluxos WhatsApp hoje</p>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name Field */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
              Nome Completo
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Seu nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-11"
            />
          </div>

          {/* Organization Name Field */}
          <div className="space-y-2">
            <Label htmlFor="organizationName" className="text-sm font-medium text-foreground">
              Nome da Organização
            </Label>
            <Input
              id="organizationName"
              type="text"
              placeholder="Nome da sua empresa ou projeto"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
              className="h-11"
            />
          </div>

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
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
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
                autoComplete="new-password"
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="passwordConfirm" className="text-sm font-medium text-foreground">
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
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3 py-2">
            <div className="mt-0.5">
              <input
                type="checkbox"
                id="terms"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
              />
            </div>
            <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
              Concordo com os{' '}
              <Link to="#" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                Termos de Serviço
              </Link>
              {' '}e a{' '}
              <Link to="#" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                Política de Privacidade
              </Link>
            </label>
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
                Criando conta...
              </>
            ) : (
              <>
                Criar Conta
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        {/* Login Link */}
        <p className="text-center mt-6 text-muted-foreground">
          Já tem conta?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
            Faça login
          </Link>
        </p>

        {/* Benefits */}
        <div className="mt-8 pt-8 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Começar é grátis:</h3>
          <ul className="space-y-3">
            {benefits.map((benefit, idx) => (
              <li key={idx} className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                </div>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
