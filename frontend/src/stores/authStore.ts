import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { authService } from '../services/auth';
import type { User, LoginRequest, AuthState } from '../types';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    role?: 'admin' | 'agent' | 'supervisor';
  }) => Promise<void>;
  getCurrentUser: () => Promise<void>;
  updateProfile: (profileData: {
    name?: string;
    email?: string;
    profile_picture?: string;
  }) => Promise<void>;
  changePassword: (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => Promise<void>;
  clearError: () => void;
  setLoading: (isLoading: boolean) => void;
  initializeAuth: () => Promise<void>;
  hasRole: (role: 'admin' | 'agent' | 'supervisor') => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Actions
        login: async (credentials: LoginRequest) => {
          try {
            set({ isLoading: true, error: null });
            
            const response = await authService.login(credentials);
            
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error: any) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: error.message || 'Login failed',
            });
            throw error;
          }
        },

        logout: async () => {
          try {
            set({ isLoading: true });
            
            await authService.logout();
            
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          } catch (error: any) {
            console.error('Logout error:', error);
            // Clear state even if logout request fails
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        },

        register: async (userData: {
          email: string;
          password: string;
          name: string;
          role?: 'admin' | 'agent' | 'supervisor';
        }) => {
          try {
            set({ isLoading: true, error: null });
            
            const response = await authService.register(userData);
            
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error: any) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: error.message || 'Registration failed',
            });
            throw error;
          }
        },

        getCurrentUser: async () => {
          try {
            set({ isLoading: true, error: null });
            
            const user = await authService.getCurrentUser();
            
            if (user) {
              set({
                user,
                token: authService.getStoredUser() ? 'valid' : null,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } else {
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: 'Session expired',
              });
            }
          } catch (error: any) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: error.message || 'Failed to get user data',
            });
          }
        },

        updateProfile: async (profileData: {
          name?: string;
          email?: string;
          profile_picture?: string;
        }) => {
          try {
            set({ isLoading: true, error: null });
            
            const updatedUser = await authService.updateProfile(profileData);
            
            set({
              user: updatedUser,
              isLoading: false,
              error: null,
            });
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.message || 'Profile update failed',
            });
            throw error;
          }
        },

        changePassword: async (data: {
          current_password: string;
          new_password: string;
          confirm_password: string;
        }) => {
          try {
            set({ isLoading: true, error: null });
            
            await authService.changePassword(data);
            
            set({
              isLoading: false,
              error: null,
            });
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.message || 'Password change failed',
            });
            throw error;
          }
        },

        clearError: () => {
          set({ error: null });
        },

        setLoading: (isLoading: boolean) => {
          set({ isLoading });
        },

        initializeAuth: async () => {
          try {
            set({ isLoading: true, error: null });
            
            const user = await authService.initializeAuth();
            
            if (user) {
              set({
                user,
                token: 'valid',
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            } else {
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
              });
            }
          } catch (error: any) {
            console.error('Auth initialization error:', error);
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        },

        hasRole: (role: 'admin' | 'agent' | 'supervisor') => {
          return authService.hasRole(role);
        },

        hasPermission: (permission: string) => {
          return authService.hasPermission(permission);
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          // Handle store migrations if needed
          if (version === 0) {
            // Migrate from version 0 to 1
            return {
              ...persistedState,
              // Add any migration logic here
            };
          }
          return persistedState;
        },
      }
    ),
    {
      name: 'auth-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for better performance
export const useAuth = () => {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    getCurrentUser,
    updateProfile,
    changePassword,
    clearError,
    setLoading,
    initializeAuth,
    hasRole,
    hasPermission,
  } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    getCurrentUser,
    updateProfile,
    changePassword,
    clearError,
    setLoading,
    initializeAuth,
    hasRole,
    hasPermission,
  };
};

// Specific selectors
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);

// Action selectors
export const useAuthActions = () => {
  const {
    login,
    logout,
    register,
    getCurrentUser,
    updateProfile,
    changePassword,
    clearError,
    setLoading,
    initializeAuth,
    hasRole,
    hasPermission,
  } = useAuthStore();

  return {
    login,
    logout,
    register,
    getCurrentUser,
    updateProfile,
    changePassword,
    clearError,
    setLoading,
    initializeAuth,
    hasRole,
    hasPermission,
  };
};

// Permission hooks
export const useHasRole = (role: 'admin' | 'agent' | 'supervisor') => {
  return useAuthStore((state) => state.hasRole(role));
};

export const useHasPermission = (permission: string) => {
  return useAuthStore((state) => state.hasPermission(permission));
};

// Combined permissions
export const useCanAccessAdminPanel = () => {
  return useHasRole('admin');
};

export const useCanManageUsers = () => {
  return useHasPermission('manage_users');
};

export const useCanAccessAgentWorkspace = () => {
  return useHasPermission('access_agent_workspace');
};

export const useCanSendMessages = () => {
  return useHasPermission('send_messages');
};

export const useCanViewMetrics = () => {
  return useHasPermission('view_metrics');
};

export const useCanManageConversations = () => {
  return useHasPermission('manage_conversations');
};

// Auto-refresh token setup hook
export const useTokenRefresh = () => {
  const isAuthenticated = useIsAuthenticated();
  
  React.useEffect(() => {
    if (!isAuthenticated) return;
    
    const cleanup = authService.setupTokenRefresh();
    return cleanup;
  }, [isAuthenticated]);
};

// React import for useEffect in the hook above
import React from 'react';

export default useAuth;