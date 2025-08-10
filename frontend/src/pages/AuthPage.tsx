import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { PyTakeLogo } from '../components/icons/PyTakeLogo';

interface AuthPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (userData: {
    name: string;
    email: string;
    password: string;
    company: string;
  }) => Promise<void>;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { actualTheme } = useTheme();

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    setError('');
    
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (userData: {
    name: string;
    email: string;
    password: string;
    company: string;
  }) => {
    setLoading(true);
    setError('');
    
    try {
      await onRegister(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const backgroundVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 1 }
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      transition: { duration: 0.2 }
    })
  };

  return (
    <div className={`
      min-h-screen flex items-center justify-center p-4 relative overflow-hidden
      ${actualTheme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
      }
    `}>
      {/* Animated Background Elements */}
      <motion.div
        variants={backgroundVariants}
        initial="hidden"
        animate="visible"
        className="absolute inset-0 overflow-hidden"
      >
        {/* Floating Shapes */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className={`
            absolute top-1/4 left-1/4 w-32 h-32 rounded-full opacity-10
            ${actualTheme === 'dark' ? 'bg-blue-500' : 'bg-blue-300'}
          `}
        />
        
        <motion.div
          animate={{
            x: [0, -150, 0],
            y: [0, 100, 0],
            rotate: [0, -180, -360]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className={`
            absolute top-1/2 right-1/4 w-24 h-24 rounded-full opacity-10
            ${actualTheme === 'dark' ? 'bg-green-500' : 'bg-green-300'}
          `}
        />
        
        <motion.div
          animate={{
            x: [0, 75, 0],
            y: [0, -75, 0],
            rotate: [0, 90, 180]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          className={`
            absolute bottom-1/4 left-1/3 w-16 h-16 rounded-full opacity-10
            ${actualTheme === 'dark' ? 'bg-purple-500' : 'bg-purple-300'}
          `}
        />

        {/* Grid Pattern */}
        <div className={`
          absolute inset-0 opacity-5
          ${actualTheme === 'dark' ? 'bg-white' : 'bg-gray-900'}
        `}
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="inline-block p-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-2xl mb-4">
            <PyTakeLogo variant="icon" size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
            PyTake
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Plataforma de Automação WhatsApp Business
          </p>
        </motion.div>

        {/* Form Container */}
        <div className="relative">
          <AnimatePresence mode="wait" custom={isLogin ? 1 : -1}>
            {isLogin ? (
              <motion.div
                key="login"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <LoginForm
                  onLogin={handleLogin}
                  onSwitchToRegister={() => {
                    setIsLogin(false);
                    setError('');
                  }}
                  loading={loading}
                  error={error}
                />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                custom={-1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <RegisterForm
                  onRegister={handleRegister}
                  onSwitchToLogin={() => {
                    setIsLogin(true);
                    setError('');
                  }}
                  loading={loading}
                  error={error}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center"
        >
          <div className={`
            p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} 
            backdrop-blur-sm border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
          `}>
            <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Automação Completa
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Fluxos automatizados para WhatsApp
            </p>
          </div>

          <div className={`
            p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} 
            backdrop-blur-sm border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
          `}>
            <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="text-white text-sm">💬</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Multi-Agente
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Gestão completa de equipes
            </p>
          </div>

          <div className={`
            p-4 rounded-lg ${actualTheme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} 
            backdrop-blur-sm border ${actualTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
          `}>
            <div className="w-8 h-8 bg-purple-500 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="text-white text-sm">📊</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Analytics Avançado
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Métricas em tempo real
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="text-center mt-8"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2024 PyTake. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;