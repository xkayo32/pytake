import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Bell, 
  BellOff, 
  Trash2, 
  Download, 
  RefreshCw,
  Settings,
  Smartphone 
} from 'lucide-react';
import { usePWA } from '@/utils/pwa';

interface PWAStatusProps {
  className?: string;
}

export const PWAStatus: React.FC<PWAStatusProps> = ({ className = '' }) => {
  const pwa = usePWA();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [isInstalled, setIsInstalled] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [pendingMessages, setPendingMessages] = useState(0);

  useEffect(() => {
    // Update online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check PWA installation status
    setIsInstalled(pwa.isAppInstalled());

    // Get cache size
    pwa.getCacheSize().then(setCacheSize);

    // Get pending messages count
    pwa.getPendingMessages().then(messages => setPendingMessages(messages.length));

    // Listen for PWA updates
    const handleUpdateAvailable = () => {
      console.log('PWA update available');
    };

    window.addEventListener('pwa:update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pwa:update-available', handleUpdateAvailable);
    };
  }, [pwa]);

  const handleEnableNotifications = async () => {
    const permission = await pwa.subscribeToPushNotifications();
    if (permission) {
      setNotificationPermission('granted');
    }
  };

  const handleClearCache = async () => {
    await pwa.clearCache();
    setCacheSize(0);
  };

  const handleClearPendingMessages = async () => {
    await pwa.clearPendingMessages();
    setPendingMessages(0);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-4">
        {/* Status Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <Settings className="h-4 w-4 mr-2 text-gray-500" />
            Status do App
          </h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showDetails ? 'Ocultar' : 'Detalhes'}
          </button>
        </div>

        {/* Status Indicators */}
        <div className="space-y-3">
          {/* Online Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500 mr-2" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500 mr-2" />
              )}
              <span className="text-sm text-gray-700">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            {!isOnline && pendingMessages > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {pendingMessages} pendentes
              </span>
            )}
          </div>

          {/* Installation Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Smartphone className={`h-4 w-4 mr-2 ${isInstalled ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-700">
                {isInstalled ? 'App Instalado' : 'Versão Web'}
              </span>
            </div>
            {!isInstalled && pwa.isInstallPromptAvailable() && (
              <button
                onClick={pwa.showInstallPrompt}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Instalar
              </button>
            )}
          </div>

          {/* Notifications Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {notificationPermission === 'granted' ? (
                <Bell className="h-4 w-4 text-green-500 mr-2" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-400 mr-2" />
              )}
              <span className="text-sm text-gray-700">
                {notificationPermission === 'granted' ? 'Notificações Ativas' : 
                 notificationPermission === 'denied' ? 'Notificações Negadas' : 
                 'Notificações Desabilitadas'}
              </span>
            </div>
            {notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
              <button
                onClick={handleEnableNotifications}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                Ativar
              </button>
            )}
          </div>
        </div>

        {/* Detailed Information */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-3">
              {/* Cache Size */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Cache ({cacheSize} itens)
                </span>
                <button
                  onClick={handleClearCache}
                  className="inline-flex items-center text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpar
                </button>
              </div>

              {/* Pending Messages */}
              {pendingMessages > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Mensagens pendentes ({pendingMessages})
                  </span>
                  <button
                    onClick={handleClearPendingMessages}
                    className="inline-flex items-center text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Limpar
                  </button>
                </div>
              )}

              {/* Update Available */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Atualizações
                </span>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Verificar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple online/offline indicator
export const OnlineStatus: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={`inline-flex items-center ${className}`}>
      {isOnline ? (
        <div className="flex items-center text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          <span className="text-xs font-medium">Online</span>
        </div>
      ) : (
        <div className="flex items-center text-red-600">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
          <span className="text-xs font-medium">Offline</span>
        </div>
      )}
    </div>
  );
};

export default PWAStatus;