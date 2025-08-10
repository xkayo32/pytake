import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import { PyTakeLogo } from '../icons/PyTakeLogo';

interface RegisterFormProps {
  onRegister: (userData: {
    name: string;
    email: string;
    password: string;
    company: string;
  }) => void;
  onSwitchToLogin: () => void;
  loading?: boolean;
  error?: string;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegister,
  onSwitchToLogin,
  loading = false,
  error
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { actualTheme } = useTheme();

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      return;
    }
    
    if (!acceptTerms) {
      return;
    }
    
    onRegister({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      company: formData.company
    });
  };

  const passwordsMatch = formData.password === formData.confirmPassword || formData.confirmPassword === '';
  const isFormValid = formData.name && formData.email && formData.password && 
                     formData.confirmPassword && formData.company && passwordsMatch && acceptTerms;

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
          Criar Conta
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Cadastre-se para começar a usar o PyTake
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

      {/* Register Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name Field */}
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nome Completo
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            placeholder="Seu nome completo"
            className={`
              w-full px-4 py-3 rounded-xl border transition-all duration-200
              ${actualTheme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:bg-gray-750'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white'
              }
              focus:ring-4 focus:ring-blue-500/10 focus:outline-none
            `}
          />
        </motion.div>

        {/* Email Field */}
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
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
        </motion.div>

        {/* Company Field */}
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Empresa
          </label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) => handleChange('company', e.target.value)}
            required
            placeholder="Nome da sua empresa"
            className={`
              w-full px-4 py-3 rounded-xl border transition-all duration-200
              ${actualTheme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:bg-gray-750'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white'
              }
              focus:ring-4 focus:ring-blue-500/10 focus:outline-none
            `}
          />
        </motion.div>

        {/* Password Field */}
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                {showPassword ? (
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C7 20 2.73 16.39 1 12A16.69 16.69 0 0 1 6.06 6.06M9.9 4.24A9.12 9.12 0 0 1 12 4C17 4 21.27 7.61 23 12A16.8 16.8 0 0 1 20.49 15.07M14.12 14.12A3 3 0 1 1 9.88 9.88M1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                ) : (
                  <>
                    <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </>
                )}
              </svg>
            </button>
          </div>
          {formData.password && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              A senha deve ter pelo menos 8 caracteres
            </div>
          )}
        </motion.div>

        {/* Confirm Password Field */}
        <motion.div variants={itemVariants}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confirmar Senha
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              required
              placeholder="••••••••"
              className={`
                w-full px-4 py-3 pr-12 rounded-xl border transition-all duration-200
                ${!passwordsMatch && formData.confirmPassword
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                  : actualTheme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:bg-gray-750'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white'
                }
                focus:ring-4 focus:ring-blue-500/10 focus:outline-none
              `}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                {showConfirmPassword ? (
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C7 20 2.73 16.39 1 12A16.69 16.69 0 0 1 6.06 6.06M9.9 4.24A9.12 9.12 0 0 1 12 4C17 4 21.27 7.61 23 12A16.8 16.8 0 0 1 20.49 15.07M14.12 14.12A3 3 0 1 1 9.88 9.88M1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                ) : (
                  <>
                    <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </>
                )}
              </svg>
            </button>
          </div>
          {!passwordsMatch && formData.confirmPassword && (
            <div className="mt-2 text-xs text-red-500">
              As senhas não coincidem
            </div>
          )}
        </motion.div>

        {/* Terms Checkbox */}
        <motion.div variants={itemVariants}>
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Eu concordo com os{' '}
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Termos de Serviço
              </a>{' '}
              e{' '}
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                Política de Privacidade
              </a>
            </span>
          </label>
        </motion.div>

        {/* Register Button */}
        <motion.button
          variants={itemVariants}
          type="submit"
          disabled={loading || !isFormValid}
          whileHover={{ scale: loading || !isFormValid ? 1 : 1.02 }}
          whileTap={{ scale: loading || !isFormValid ? 1 : 0.98 }}
          className={`
            w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200
            ${loading || !isFormValid
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
            }
            focus:outline-none focus:ring-4 focus:ring-blue-500/50
          `}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Criando conta...</span>
            </div>
          ) : (
            'Criar Conta'
          )}
        </motion.button>
      </form>

      {/* Login Link */}
      <motion.div variants={itemVariants} className="text-center mt-6">
        <p className="text-gray-600 dark:text-gray-400">
          Já tem uma conta?{' '}
          <button
            onClick={onSwitchToLogin}
            className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            Faça login
          </button>
        </p>
      </motion.div>
    </motion.div>
  );
};

export default RegisterForm;