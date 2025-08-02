import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWA } from '@/utils/pwa';

interface PWAInstallBannerProps {
  className?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ className = '' }) => {
  const pwa = usePWA();
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if banner should be shown
    const checkInstallAvailability = () => {
      const isInstallAvailable = pwa.isInstallPromptAvailable();
      const isAlreadyInstalled = pwa.isAppInstalled();
      const wasDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
      
      setShowBanner(isInstallAvailable && !isAlreadyInstalled && !wasDismissed);
    };

    // Check on mount
    checkInstallAvailability();

    // Listen for PWA install prompt events
    const handleInstallPrompt = () => {
      setTimeout(checkInstallAvailability, 100);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstallPrompt);
    };
  }, [pwa]);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const installed = await pwa.showInstallPrompt();
      if (installed) {
        setShowBanner(false);
      }
    } catch (error) {
      console.error('Failed to install PWA:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showBanner || dismissed) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg ${className}`}>
      <div className="px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-6 w-6 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium">
                Instalar PyTake
              </h3>
              <p className="text-sm text-blue-100">
                Acesse rapidamente suas conversas direto da tela inicial
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="inline-flex items-center px-3 py-1.5 border border-blue-500 text-xs font-medium rounded text-blue-100 bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mr-1.5"></div>
                  Instalando...
                </>
              ) : (
                <>
                  <Download className="h-3 w-3 mr-1.5" />
                  Instalar
                </>
              )}
            </button>
            
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 transition-colors"
              aria-label="Dispensar banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Floating install button for better visibility
export const PWAInstallButton: React.FC = () => {
  const pwa = usePWA();
  const [showButton, setShowButton] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const checkInstallAvailability = () => {
      const isInstallAvailable = pwa.isInstallPromptAvailable();
      const isAlreadyInstalled = pwa.isAppInstalled();
      const wasDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
      
      setShowButton(isInstallAvailable && !isAlreadyInstalled && !wasDismissed);
    };

    checkInstallAvailability();

    const handleInstallPrompt = () => {
      setTimeout(checkInstallAvailability, 100);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstallPrompt);
    };
  }, [pwa]);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const installed = await pwa.showInstallPrompt();
      if (installed) {
        setShowButton(false);
      }
    } catch (error) {
      console.error('Failed to install PWA:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  if (!showButton) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalling}
      className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
      title="Instalar PyTake como app"
    >
      {isInstalling ? (
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
      ) : (
        <Download className="h-5 w-5" />
      )}
    </button>
  );
};

export default PWAInstallBanner;