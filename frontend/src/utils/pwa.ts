// PWA utilities for service worker registration and push notifications

interface PWAInstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class PWAManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private installPrompt: PWAInstallPrompt | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as PWAInstallPrompt;
      console.log('[PWA] Install prompt captured');
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.installPrompt = null;
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[PWA] App is online');
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[PWA] App is offline');
    });

    // Listen for service worker messages
    navigator.serviceWorker?.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data);
    });
  }

  async registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Worker not supported');
      return false;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registered:', this.swRegistration);

      // Handle updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.notifyAppUpdate();
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
      return false;
    }
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[PWA] Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission:', permission);
    return permission;
  }

  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      console.error('[PWA] Service Worker not registered');
      return null;
    }

    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('[PWA] Notification permission denied');
      return null;
    }

    try {
      // This would need a real VAPID public key in production
      const applicationServerKey = this.urlBase64ToUint8Array(
        'BMqSvZe_4JrNJyLAi3jRZlhCShEcNfXLCTr0fVs_wT8dGKZi3gM4jJJtLPGk-8QF0nV3ZQKfFUQc_7V2WQj-M7Q'
      );

      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      console.log('[PWA] Push subscription created:', subscription);

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);

      return subscription;
    } catch (error) {
      console.error('[PWA] Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  private async sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      
      await fetch('/api/v1/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      console.log('[PWA] Push subscription sent to backend');
    } catch (error) {
      console.error('[PWA] Failed to send subscription to backend:', error);
    }
  }

  async showInstallPrompt(): Promise<boolean> {
    if (!this.installPrompt) {
      console.warn('[PWA] Install prompt not available');
      return false;
    }

    try {
      await this.installPrompt.prompt();
      const result = await this.installPrompt.userChoice;
      
      console.log('[PWA] Install prompt result:', result.outcome);
      
      if (result.outcome === 'accepted') {
        this.installPrompt = null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Failed to show install prompt:', error);
      return false;
    }
  }

  isInstallPromptAvailable(): boolean {
    return this.installPrompt !== null;
  }

  isAppInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  private notifyAppUpdate(): void {
    // Dispatch custom event for app updates
    window.dispatchEvent(new CustomEvent('pwa:update-available'));
  }

  async updateApp(): Promise<void> {
    if (!this.swRegistration?.waiting) {
      return;
    }

    this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload the page after service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  private handleServiceWorkerMessage(data: any): void {
    console.log('[PWA] Message from Service Worker:', data);

    switch (data.type) {
      case 'NAVIGATE_TO_CONVERSATION':
        // Handle navigation from notification click
        window.history.pushState({}, '', `/conversations/${data.conversationId}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
        break;
      
      case 'SYNC_COMPLETED':
        console.log('[PWA] Background sync completed:', data.data);
        break;
      
      default:
        console.log('[PWA] Unknown message type:', data.type);
    }
  }

  private syncPendingData(): void {
    if (this.swRegistration && 'sync' in this.swRegistration) {
      // Type assertion for experimental background sync API
      (this.swRegistration as any).sync.register('send-pending-messages').catch((error: Error) => {
        console.warn('[PWA] Background sync not supported:', error);
      });
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Cache management
  async getCacheSize(): Promise<number> {
    if (!this.swRegistration) return 0;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.cacheSize || 0);
      };

      this.swRegistration?.active?.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [messageChannel.port2]
      );
    });
  }

  async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('[PWA] All caches cleared');
    }
  }

  // Offline storage for pending messages
  async savePendingMessage(message: any): Promise<void> {
    if ('indexedDB' in window) {
      // In a real implementation, we'd use IndexedDB to store pending messages
      const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
      pendingMessages.push({ ...message, timestamp: Date.now() });
      localStorage.setItem('pendingMessages', JSON.stringify(pendingMessages));
      console.log('[PWA] Message saved for offline sending');
    }
  }

  async getPendingMessages(): Promise<any[]> {
    const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
    return pendingMessages;
  }

  async clearPendingMessages(): Promise<void> {
    localStorage.removeItem('pendingMessages');
    console.log('[PWA] Pending messages cleared');
  }
}

// Create singleton instance
export const pwaManager = new PWAManager();

// Hook for React components
export function usePWA() {
  return {
    registerServiceWorker: () => pwaManager.registerServiceWorker(),
    subscribeToPushNotifications: () => pwaManager.subscribeToPushNotifications(),
    showInstallPrompt: () => pwaManager.showInstallPrompt(),
    isInstallPromptAvailable: () => pwaManager.isInstallPromptAvailable(),
    isAppInstalled: () => pwaManager.isAppInstalled(),
    isOnline: () => pwaManager.getOnlineStatus(),
    updateApp: () => pwaManager.updateApp(),
    getCacheSize: () => pwaManager.getCacheSize(),
    clearCache: () => pwaManager.clearCache(),
    savePendingMessage: (message: any) => pwaManager.savePendingMessage(message),
    getPendingMessages: () => pwaManager.getPendingMessages(),
    clearPendingMessages: () => pwaManager.clearPendingMessages()
  };
}

export default pwaManager;