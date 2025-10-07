'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { LogoWithText } from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    console.log('🔵 [LOGIN] handleSubmit called', {
      eventType: e?.type,
      isLoading,
      timestamp: new Date().toISOString()
    });

    // CRÍTICO: Prevenir qualquer comportamento padrão
    if (e) {
      try {
        console.log('🔵 [LOGIN] Calling preventDefault');
        e.preventDefault();
        e.stopPropagation();
      } catch (preventError) {
        console.error('Error preventing default:', preventError);
      }
    }

    // Se já está carregando, não faz nada
    if (isLoading) {
      console.log('🟡 [LOGIN] Already loading, skipping');
      return;
    }

    // Limpar erro e iniciar loading
    console.log('🔵 [LOGIN] Starting login process');
    setError('');
    setIsLoading(true);

    try {
      // Tentar fazer login
      console.log('🔵 [LOGIN] Calling login function');
      const result = await login(email, password);

      console.log('✅ [LOGIN] Login successful, redirecting...');

      // Login bem-sucedido - redirecionar baseado no role do usuário
      try {
        // O authStore já está atualizado com o usuário após o login
        const currentUser = useAuthStore.getState().user;

        if (currentUser) {
          console.log(`🔵 [LOGIN] User role: ${currentUser.role}`);

          // Redirecionar baseado no role
          if (currentUser.role === 'admin' || currentUser.role === 'org_admin' || currentUser.role === 'super_admin') {
            router.push('/admin');
            console.log('✅ [LOGIN] Redirecting to /admin');
          } else if (currentUser.role === 'agent' || currentUser.role === 'viewer') {
            router.push('/agent');
            console.log('✅ [LOGIN] Redirecting to /agent');
          } else if (currentUser.role === 'manager') {
            router.push('/dashboard');
            console.log('✅ [LOGIN] Redirecting to /dashboard (manager)');
          } else {
            // Fallback para dashboard que vai redirecionar
            router.push('/dashboard');
            console.log('⚠️ [LOGIN] Unknown role, redirecting to /dashboard');
          }
        } else {
          // Fallback se não conseguir pegar o usuário
          router.push('/dashboard');
          console.log('⚠️ [LOGIN] User not found in state, redirecting to /dashboard');
        }
      } catch (routerError) {
        console.error('❌ [LOGIN] Router error:', routerError);
        // Fallback: redirect direto para dashboard
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      console.error('❌ [LOGIN] Login error:', err);

      // Tratamento específico para diferentes tipos de erro
      if (err.message === 'Email e senha são obrigatórios') {
        setError('Por favor, preencha email e senha.');
      } else if (err.message === 'Resposta inválida do servidor') {
        setError('Erro na comunicação com o servidor. Tente novamente.');
      } else if (err.message === 'Dados de autenticação incompletos' || err.message === 'Tokens de autenticação ausentes') {
        setError('Erro ao processar login. Entre em contato com o suporte.');
      } else if (err.response?.status === 422) {
        const details = err.response?.data?.error?.details || err.response?.data?.detail;

        if (Array.isArray(details)) {
          // Erro de validação do Pydantic
          const passwordError = details.find((d: any) => d.loc?.includes('password'));
          const emailError = details.find((d: any) => d.loc?.includes('email'));

          if (passwordError) {
            setError('A senha deve ter pelo menos 8 caracteres.');
          } else if (emailError) {
            setError('Por favor, insira um email válido.');
          } else {
            setError('Por favor, verifique os dados inseridos.');
          }
        } else if (typeof details === 'string') {
          setError(details);
        } else {
          setError('Dados de login inválidos. Verifique email e senha.');
        }
      } else if (err.response?.status === 401) {
        setError('Email ou senha incorretos. Verifique suas credenciais.');
      } else if (err.response?.status === 500) {
        setError('Erro no servidor. Tente novamente em alguns instantes.');
      } else if (err.response?.status === 503) {
        setError('Servidor temporariamente indisponível. Tente novamente mais tarde.');
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('A requisição demorou muito. Verifique sua conexão e tente novamente.');
      } else if (err.response?.status === 429) {
        setError('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
      } else {
        // Erro genérico
        const message = err.response?.data?.error?.message
          || err.response?.data?.message
          || err.response?.data?.detail
          || err.message
          || 'Falha no login. Por favor, tente novamente.';

        setError(message);
      }
    } finally {
      console.log('🔵 [LOGIN] Finalizing, setting isLoading to false');
      setIsLoading(false);
    }
  };

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
              Bem-vindo de volta!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
              Acesse sua conta para continuar
            </p>
          </div>

          {/* Form */}
          <div className="mt-8 space-y-6">
            <div className="space-y-4">
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Senha
                </label>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="••••••••"
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
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Lembrar de mim
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                  Esqueceu a senha?
                </a>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200"
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
              type="button"
              onClick={(e) => handleSubmit(e)}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Sign Up Link */}
            <div className="text-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Não tem uma conta? </span>
              <Link href="/register" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                Cadastre-se gratuitamente
              </Link>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">Ou continue com</span>
              </div>
            </div>

            {/* Social Login */}
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
          </div>
        </motion.div>
      </div>

      {/* Right Side - Branding */}
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
              Automatize seu WhatsApp Business
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Gerencie conversas, crie chatbots inteligentes e envie campanhas em massa. Tudo em uma única plataforma.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-lg">Chatbots com IA</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-lg">Campanhas ilimitadas</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-lg">Analytics em tempo real</span>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-8">
              <div>
                <p className="text-3xl font-bold">10k+</p>
                <p className="text-white/80 text-sm">Empresas</p>
              </div>
              <div>
                <p className="text-3xl font-bold">1M+</p>
                <p className="text-white/80 text-sm">Mensagens/dia</p>
              </div>
              <div>
                <p className="text-3xl font-bold">99.9%</p>
                <p className="text-white/80 text-sm">Uptime</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
