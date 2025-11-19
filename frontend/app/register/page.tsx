'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, MessageSquare, Loader2, AlertCircle, CheckCircle, Zap, Shield, Rocket, Github, Chrome, ArrowRight, Zap as ZapIcon, Users, BarChart3, Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LogoInline } from '@/components/ui/logo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/hooks/useAuth'
import { registerSchema, type RegisterFormData } from '@/lib/validators/auth'

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { register: registerUser } = useAuth()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  })

  const password = watch('password')

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError('')

    const result = await registerUser({
      email: data.email,
      password: data.password,
      name: data.name,
      tenant_name: data.tenant_name,
    })

    if (result.success) {
      router.push('/dashboard')
    } else {
      setError(result.error || 'Erro no cadastro')
    }

    setIsLoading(false)
  }

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '', icon: null }
    
    let score = 0
    if (password.length >= 6) score++
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    const levels = [
      { score: 0, label: '', color: '', icon: null },
      { score: 1, label: 'Muito fraca', color: 'bg-red-500', icon: '🔴' },
      { score: 2, label: 'Fraca', color: 'bg-orange-500', icon: '🟠' },
      { score: 3, label: 'Regular', color: 'bg-yellow-500', icon: '🟡' },
      { score: 4, label: 'Forte', color: 'bg-blue-500', icon: '🔵' },
      { score: 5, label: 'Muito forte', color: 'bg-green-500', icon: '✅' },
    ]

    return levels[score] || levels[0]
  }

  const passwordStrength = getPasswordStrength(password)
  const confirmPassword = watch('confirmPassword')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Column - Form (Mobile first, then 50% on desktop) */}
        <div className="flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-0 lg:border-r border-slate-200 dark:border-slate-700">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6 lg:hidden">
            <LogoInline className="h-10" />
          </div>

          <div className="w-full max-w-md mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Crie sua conta</h1>
              <p className="text-muted-foreground">Comece seu teste gratuito de 14 dias</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 animate-in fade-in duration-300 mb-4">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nome completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="João Silva"
                  {...register('name')}
                  className={`transition-colors h-10 ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.name && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name.message}
                  </div>
                )}
              </div>

              {/* Company Name Field */}
              <div className="space-y-2">
                <Label htmlFor="tenant_name" className="text-sm font-medium">
                  Nome da empresa
                </Label>
                <Input
                  id="tenant_name"
                  type="text"
                  placeholder="Sua Empresa LTDA"
                  {...register('tenant_name')}
                  className={`transition-colors h-10 ${errors.tenant_name ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.tenant_name && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.tenant_name.message}
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  {...register('email')}
                  className={`transition-colors h-10 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.email && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email.message}
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    {...register('password')}
                    className={`transition-colors h-10 pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Compact Password Strength Indicator */}
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            level <= passwordStrength.score
                              ? passwordStrength.color
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    {passwordStrength.label && (
                      <p className="text-xs text-muted-foreground">
                        Força: <span className="text-foreground font-semibold">{passwordStrength.label}</span>
                      </p>
                    )}
                  </div>
                )}

                {errors.password && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password.message}
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua senha"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                    className={`transition-colors h-10 pr-10 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {confirmPassword && password === confirmPassword && (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    <span>Senhas coincidem</span>
                  </div>
                )}

                {errors.confirmPassword && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.confirmPassword.message}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-base font-semibold h-10 transition-all duration-200 transform hover:scale-[1.02] active:scale-95"
                disabled={isLoading || !isValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Criar conta
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-950 px-2 text-muted-foreground">
                    Ou continue com
                  </span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Github className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">GitHub</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Google</span>
                </Button>
              </div>

              {/* Terms */}
              <p className="text-xs text-center text-muted-foreground">
                Ao continuar, você concorda com nossos{' '}
                <Link href="/terms" className="text-primary hover:underline font-medium">
                  Termos
                </Link>{' '}
                e{' '}
                <Link href="/privacy" className="text-primary hover:underline font-medium">
                  Privacidade
                </Link>
              </p>

              {/* Login Link */}
              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link 
                  href="/login" 
                  className="text-primary hover:text-primary/80 font-semibold transition-colors hover:underline"
                >
                  Faça login
                </Link>
              </p>

              {/* Back to Landing Link */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <Link 
                  href="/" 
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <div className="group-hover:-translate-x-1 transition-transform">
                    <ArrowRight className="h-4 w-4 rotate-180" />
                  </div>
                  Voltar para início
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Features (Desktop only) */}
        <div className="hidden lg:flex flex-col justify-between px-8 py-12 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 dark:from-slate-950 dark:via-blue-950 dark:to-slate-950 relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="flex-shrink-0">
                <LogoInline className="h-8" />
              </div>
              <Link 
                href="/" 
                className="text-lg font-bold text-white hover:text-slate-200 transition-colors flex items-center gap-2"
              >
                PyTake
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mb-12">
              <h2 className="text-4xl font-bold text-white mb-3 leading-tight">Transforme sua Empresa</h2>
              <p className="text-lg text-slate-300">Automação inteligente que conecta tudo</p>
            </div>

            {/* Features Grid with better styling */}
            <div className="space-y-6">
              <div className="group">
                <div className="flex gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-blue-500/30">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                      <ZapIcon className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-blue-300 transition-colors">Automatize Processos</h3>
                    <p className="text-sm text-slate-400">Elimine tarefas repetitivas e aumente a produtividade em até 10x</p>
                  </div>
                </div>
              </div>

              <div className="group">
                <div className="flex gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-emerald-500/30">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-emerald-300 transition-colors">Colabore em Tempo Real</h3>
                    <p className="text-sm text-slate-400">Trabalhe com seu time de forma sincronizada e integrada</p>
                  </div>
                </div>
              </div>

              <div className="group">
                <div className="flex gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-cyan-500/30">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-cyan-300 transition-colors">Insights em Tempo Real</h3>
                    <p className="text-sm text-slate-400">Dashboards poderosos com dados precisos e atualizados</p>
                  </div>
                </div>
              </div>

              <div className="group">
                <div className="flex gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-amber-500/30">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
                      <Lock className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-amber-300 transition-colors">Segurança Avançada</h3>
                    <p className="text-sm text-slate-400">Criptografia end-to-end e conformidade LGPD completa</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA with better styling */}
          <div className="relative z-10 mt-auto pt-8 border-t border-slate-700/50">
            <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg p-6 border border-blue-500/20 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-slate-200 font-semibold text-lg mb-1">Comece Agora</p>
                  <p className="text-sm text-slate-400">14 dias grátis • Sem cartão de crédito</p>
                </div>
                <div className="flex-shrink-0 text-blue-400 animate-bounce">
                  <Rocket className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}