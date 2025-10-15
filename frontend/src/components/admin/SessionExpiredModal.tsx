'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Clock, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface SessionExpiredModalProps {
  onClose?: () => void;
}

export default function SessionExpiredModal({ onClose }: SessionExpiredModalProps) {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleBackToLogin = () => {
    // Clear auth state
    logout();

    // Close modal if callback provided
    if (onClose) {
      onClose();
    }

    // Redirect to login
    router.push('/login');
  };

  const handleRefresh = () => {
    // Try to refresh the page (token might have been renewed)
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
        {/* Icon */}
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
          Sessão Expirada
        </h2>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          Sua sessão expirou devido à inatividade ou o servidor foi reiniciado.
          Por favor, faça login novamente para continuar.
        </p>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 <strong>Dica:</strong> Suas alterações não salvas podem ser perdidas.
            Lembre-se de salvar seu trabalho regularmente.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar
          </button>
          <button
            onClick={handleBackToLogin}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            Fazer Login
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          Por segurança, você será desconectado automaticamente após períodos de inatividade.
        </p>
      </div>
    </div>
  );
}
