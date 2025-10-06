'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, CheckCircle2, Building2, Sparkles } from 'lucide-react';
import { LogoWithText } from '@/components/Logo';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);

  const [organizationName, setOrganizationName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const generateStrongPassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';

    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';

    // Garantir pelo menos um de cada tipo
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Completar com caracteres aleatórios até 12 caracteres
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Embaralhar a senha
    password = password.split('').sort(() => Math.random() - 0.5).join('');

    setPassword(password);
    setConfirmPassword(password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('A senha deve conter pelo menos uma letra maiúscula');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError('A senha deve conter pelo menos uma letra minúscula');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError('A senha deve conter pelo menos um número');
      return;
    }

    if (!organizationName.trim()) {
      setError('Nome da empresa é obrigatório');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, fullName, organizationName);

      // Mostrar mensagem de sucesso
      setSuccess(true);
      setError('');

      // Aguardar 2 segundos para mostrar a mensagem e redirecionar para login
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Register error:', err);
      setSuccess(false);

      // Tratamento específico para diferentes tipos de erro
      if (err.response?.status === 422) {
        const details = err.response?.data?.error?.details || err.response?.data?.detail;

        if (Array.isArray(details)) {
          // Erro de validação do Pydantic
          const messages = details.map((d: any) => {
            if (d.loc?.includes('email')) return 'Email inválido';
            if (d.loc?.includes('password')) return 'Senha não atende aos requisitos';
            if (d.loc?.includes('full_name')) return 'Nome completo é obrigatório';
            return d.msg;
          });
          setError(messages.join('. '));
        } else if (typeof details === 'string') {
          setError(details);
        } else {
          setError('Dados de cadastro inválidos. Verifique os campos.');
        }
      } else if (err.response?.status === 409) {
        setError('Este email já está cadastrado.');
      } else if (err.response?.status === 500) {
        setError('Erro no servidor. Tente novamente mais tarde.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Não foi possível conectar ao servidor.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.detail || 'Falha no cadastro. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length < 8) return 2;
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 4;
    return 3;
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full space-y-8"
        >
          {/* Logo */}
          <div>
            <div className="flex justify-center">
              <LogoWithText size="md" onClick={() => router.push('/')} />
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
              Cadastro de Nova Empresa
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Crie sua conta empresarial e comece a gerenciar sua equipe
            </p>
          </div>

          {/* Form */}
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Organization Name Input */}
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome da Empresa <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition dark:bg-gray-800 dark:text-white"
                    placeholder="Digite o nome da sua empresa"
                  />
                </div>
              </div>

              {/* Full Name Input */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition dark:bg-gray-800 dark:text-white"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition dark:bg-gray-800 dark:text-white"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition"
                  >
                    <Sparkles className="w-3 h-3" />
                    Gerar senha forte
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition dark:bg-gray-800 dark:text-white"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400" />
                    )}
                  </button>
                </div>
                {/* Password Strength */}
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition ${
                            level <= strength
                              ? strength === 1
                                ? 'bg-red-500'
                                : strength === 2
                                ? 'bg-yellow-500'
                                : strength === 3
                                ? 'bg-blue-500'
                                : 'bg-green-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {strength === 1 && 'Senha fraca'}
                      {strength === 2 && 'Senha média'}
                      {strength === 3 && 'Senha boa'}
                      {strength === 4 && 'Senha forte'}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition dark:bg-gray-800 dark:text-white"
                    placeholder="Digite a senha novamente"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded mt-1 dark:bg-gray-800"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Concordo com os{' '}
                <a href="/terms" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                  Termos de Serviço
                </a>{' '}
                e{' '}
                <a href="/privacy" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                  Política de Privacidade
                </a>
              </label>
            </div>

            {/* Success Message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800"
              >
                <CheckCircle2 className="w-5 h-5" />
                <div>
                  <p className="font-medium">Conta criada com sucesso!</p>
                  <p className="text-xs mt-1">Redirecionando para o login...</p>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Criando conta...
                </>
              ) : (
                <>
                  Criar Conta Grátis
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Sign In Link */}
            <div className="text-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Já tem uma conta? </span>
              <Link href="/login" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                Faça login
              </Link>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">Ou cadastre-se com</span>
              </div>
            </div>

            {/* Social Registration */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Right Side - Benefits */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 -right-4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -left-4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-6">
              Por que escolher PyTake?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              A plataforma mais completa para automação de WhatsApp Business no mercado.
            </p>

            <div className="space-y-4 mb-12">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">14 dias grátis</h3>
                  <p className="text-white/80">Teste todas as funcionalidades sem compromisso</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Configuração rápida</h3>
                  <p className="text-white/80">Comece a usar em menos de 5 minutos</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Suporte dedicado</h3>
                  <p className="text-white/80">Equipe pronta para ajudar você crescer</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Sem cartão de crédito</h3>
                  <p className="text-white/80">Não pedimos pagamento no trial</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <p className="text-sm text-white/70 mb-2">Junte-se a</p>
              <p className="text-3xl font-bold mb-1">10.000+ empresas</p>
              <p className="text-white/80">que já automatizaram seu WhatsApp</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
