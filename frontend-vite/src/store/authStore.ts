import { create } from 'zustand';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      console.log('🔐 Iniciando login...');
      const response = await authAPI.login({ email, password });
      console.log('✅ Resposta do login:', response.data);

      // Backend retorna { user: {...}, token: { access_token, refresh_token } }
      const { user, token } = response.data;
      const { access_token, refresh_token } = token;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      console.log('💾 Tokens salvos no localStorage');

      set({ user, isAuthenticated: true });
      console.log('✅ Estado atualizado: isAuthenticated = true, user =', user);
    } catch (error) {
      console.error('❌ Erro no login:', error);
      set({ user: null, isAuthenticated: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      console.log('🔍 Verificando autenticação...');
      const token = localStorage.getItem('access_token');

      if (!token) {
        console.log('❌ Sem token, usuário não autenticado');
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      console.log('🔑 Token encontrado, validando com servidor...');
      const response = await authAPI.me();
      console.log('✅ Autenticação válida, user =', response.data);
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('❌ Erro ao verificar auth:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
