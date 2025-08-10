import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import { PyTakeLogo } from '../icons/PyTakeLogo';

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
  onSwitchToRegister: () => void;
  loading?: boolean;
  error?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onSwitchToRegister,
  loading = false,
  error
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { actualTheme } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLogin(email, password);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`
        w-full max-w-md mx-auto p-8 rounded-2xl shadow-2xl
        ${actualTheme === 'dark'
          ? 'bg-gray-900/95 backdrop-blur-sm border border-gray-800'
          : 'bg-white/95 backdrop-blur-sm border border-gray-200'
        }
      `}
    >
      {/* Logo and Title */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <PyTakeLogo variant="icon" size={64} animated />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Bem-vindo ao PyTake
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Faça login para acessar sua conta
        </p>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Field */}
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              className={`
                w-full px-4 py-3 rounded-xl border transition-all duration-200
                ${actualTheme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:bg-gray-750'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white'
                }
                focus:ring-4 focus:ring-blue-500/10 focus:outline-none
              `}
            />
          </div>
        </motion.div>

        {/* Password Field */}
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className={`
                w-full px-4 py-3 pr-12 rounded-xl border transition-all duration-200
                ${actualTheme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:bg-gray-750'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white'
                }
                focus:ring-4 focus:ring-blue-500/10 focus:outline-none
              `}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {showPassword ? (
                  <path
                    d="M17.94 17.94A10.07 10.07 0 0 1 12 20C7 20 2.73 16.39 1 12A16.69 16.69 0 0 1 6.06 6.06M9.9 4.24A9.12 9.12 0 0 1 12 4C17 4 21.27 7.61 23 12A16.8 16.8 0 0 1 20.49 15.07M14.12 14.12A3 3 0 1 1 9.88 9.88M1 1L23 23"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {!showPassword && (
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                )}
              </svg>
            </button>
          </div>
        </motion.div>

        {/* Remember Me & Forgot Password */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Lembrar de mim
            </span>
          </label>
          
          <button
            type="button"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            Esqueceu a senha?
          </button>
        </motion.div>

        {/* Login Button */}
        <motion.button
          variants={itemVariants}
          type="submit"
          disabled={loading || !email || !password}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          className={`
            w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200
            ${loading || !email || !password
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
            }
            focus:outline-none focus:ring-4 focus:ring-blue-500/50
          `}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Entrando...</span>
            </div>
          ) : (
            'Entrar'
          )}
        </motion.button>

        {/* Divider */}
        <motion.div variants={itemVariants} className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
              ou
            </span>
          </div>
        </motion.div>

        {/* Demo Login */}
        <motion.button
          variants={itemVariants}
          type="button"
          onClick={() => onLogin('admin@pytake.com', 'admin123')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 border
            ${actualTheme === 'dark'
              ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }
            focus:outline-none focus:ring-4 focus:ring-gray-500/20
          `}
        >
          Entrar como Demo (admin@pytake.com)
        </motion.button>
      </form>

      {/* Register Link */}
      <motion.div variants={itemVariants} className="text-center mt-6">
        <p className="text-gray-600 dark:text-gray-400">
          Não tem uma conta?{' '}
          <button
            onClick={onSwitchToRegister}
            className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            Cadastre-se
          </button>
        </p>
      </motion.div>
    </motion.div>
  );
};

export default LoginForm;