import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Math.random().toString(36).substr(2, 9);
    const duration = notification.duration ?? 5000; // Default 5 seconds

    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),
}));

// Convenience hooks
export const useToast = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  return {
    success: (message: string, title?: string) =>
      addNotification({ type: 'success', message, title }),
    error: (message: string, title?: string) =>
      addNotification({ type: 'error', message, title, duration: 7000 }),
    warning: (message: string, title?: string) =>
      addNotification({ type: 'warning', message, title }),
    info: (message: string, title?: string) =>
      addNotification({ type: 'info', message, title }),
  };
};
