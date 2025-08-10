import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Notification, NotificationSettings, LoadingState } from '../types';
import { apiService } from '../services/api';
import { wsService } from '../services/websocket';
import toast from 'react-hot-toast';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  loadingState: LoadingState;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  isVisible: boolean;
}

interface NotificationActions {
  // Notifications management
  loadNotifications: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearNotifications: () => void;
  
  // Settings
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  toggleSound: () => void;
  toggleDesktop: () => void;
  
  // UI
  setVisible: (visible: boolean) => void;
  
  // Utilities
  getUnreadNotifications: () => Notification[];
  playNotificationSound: () => void;
  showDesktopNotification: (notification: Notification) => void;
  requestPermission: () => Promise<boolean>;
}

interface NotificationStore extends NotificationState, NotificationActions {}

const defaultSettings: NotificationSettings = {
  email: true,
  push: true,
  desktop: true,
  sound: true,
  newMessages: true,
  mentions: true,
  campaigns: true,
  systemAlerts: true,
};

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,
      settings: defaultSettings,
      loadingState: 'idle',
      soundEnabled: true,
      desktopEnabled: true,
      isVisible: false,

      // Actions
      loadNotifications: async () => {
        try {
          set({ loadingState: 'loading' });
          
          const response = await apiService.getNotifications({
            limit: 100,
            sortBy: 'timestamp',
            sortOrder: 'desc'
          });
          
          if (response.success) {
            const unreadCount = response.data.filter(n => !n.read).length;
            
            set({
              notifications: response.data,
              unreadCount,
              loadingState: 'succeeded'
            });
          } else {
            throw new Error(response.message);
          }
        } catch (error: any) {
          console.error('Error loading notifications:', error);
          set({ loadingState: 'failed' });
        }
      },

      addNotification: (notification: Notification) => {
        const { settings, soundEnabled, desktopEnabled } = get();
        
        set(state => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1
        }));

        // Show toast notification
        const toastType = notification.type === 'error' ? 'error' : 
                         notification.type === 'warning' ? 'error' :
                         notification.type === 'success' ? 'success' : 'default';
        
        toast[toastType](notification.message, {
          duration: 4000,
          position: 'top-right',
        });

        // Play sound if enabled and appropriate
        if (soundEnabled && settings.sound) {
          get().playNotificationSound();
        }

        // Show desktop notification if enabled and appropriate
        if (desktopEnabled && settings.desktop) {
          get().showDesktopNotification(notification);
        }
      },

      markAsRead: async (id: string) => {
        try {
          await apiService.markNotificationAsRead(id);
          
          set(state => ({
            notifications: state.notifications.map(n =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1)
          }));
        } catch (error: any) {
          console.error('Error marking notification as read:', error);
        }
      },

      markAllAsRead: async () => {
        try {
          await apiService.markAllNotificationsAsRead();
          
          set(state => ({
            notifications: state.notifications.map(n => ({ ...n, read: true })),
            unreadCount: 0
          }));
          
          toast.success('Todas as notificações foram marcadas como lidas');
        } catch (error: any) {
          console.error('Error marking all notifications as read:', error);
          toast.error('Erro ao marcar notificações como lidas');
        }
      },

      deleteNotification: async (id: string) => {
        try {
          await apiService.deleteNotification(id);
          
          set(state => {
            const notification = state.notifications.find(n => n.id === id);
            const wasUnread = notification && !notification.read;
            
            return {
              notifications: state.notifications.filter(n => n.id !== id),
              unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
            };
          });
        } catch (error: any) {
          console.error('Error deleting notification:', error);
          toast.error('Erro ao excluir notificação');
        }
      },

      clearNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0
        });
      },

      // Settings
      updateSettings: async (newSettings: Partial<NotificationSettings>) => {
        try {
          set(state => ({
            settings: { ...state.settings, ...newSettings }
          }));
          
          // Here you would call API to save settings
          // await apiService.updateNotificationSettings(newSettings);
          
          toast.success('Configurações de notificação atualizadas');
        } catch (error: any) {
          console.error('Error updating notification settings:', error);
          toast.error('Erro ao atualizar configurações');
        }
      },

      toggleSound: () => {
        set(state => ({ soundEnabled: !state.soundEnabled }));
      },

      toggleDesktop: () => {
        set(state => ({ desktopEnabled: !state.desktopEnabled }));
      },

      // UI
      setVisible: (visible: boolean) => {
        set({ isVisible: visible });
      },

      // Utilities
      getUnreadNotifications: () => {
        return get().notifications.filter(n => !n.read);
      },

      playNotificationSound: () => {
        try {
          // Create audio element and play notification sound
          const audio = new Audio('/sounds/notification.mp3');
          audio.volume = 0.5;
          audio.play().catch(error => {
            console.warn('Could not play notification sound:', error);
          });
        } catch (error) {
          console.warn('Notification sound not available:', error);
        }
      },

      showDesktopNotification: (notification: Notification) => {
        if (!('Notification' in window)) {
          console.warn('Desktop notifications not supported');
          return;
        }

        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: notification.id,
            renotify: false,
          });
        }
      },

      requestPermission: async (): Promise<boolean> => {
        if (!('Notification' in window)) {
          console.warn('Desktop notifications not supported');
          return false;
        }

        if (Notification.permission === 'denied') {
          return false;
        }

        if (Notification.permission === 'granted') {
          return true;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
      },
    }),
    {
      name: 'pytake-notifications',
      partialize: (state) => ({
        settings: state.settings,
        soundEnabled: state.soundEnabled,
        desktopEnabled: state.desktopEnabled,
      }),
    }
  )
);

// WebSocket event listeners
wsService.on('notification', (notification: Notification) => {
  useNotificationStore.getState().addNotification(notification);
});

wsService.on('system_alert', (alert: { type: string; message: string; data?: any }) => {
  const notification: Notification = {
    id: `alert-${Date.now()}`,
    type: alert.type as any,
    title: 'Alerta do Sistema',
    message: alert.message,
    timestamp: new Date().toISOString(),
    read: false,
    metadata: alert.data,
  };
  
  useNotificationStore.getState().addNotification(notification);
});

// Initialize desktop notification permission on load
if (typeof window !== 'undefined') {
  useNotificationStore.getState().requestPermission();
}