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
  register: (email: string, password: string, full_name: string, organization_name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    console.log('🟢 [AUTH STORE] login() called', { email, hasPassword: !!password });

    try {
      // Validação básica antes de fazer a requisição
      if (!email || !password) {
        console.log('❌ [AUTH STORE] Validation failed - empty fields');
        const error = new Error('Email e senha são obrigatórios');
        set({ user: null, isAuthenticated: false });
        throw error;
      }

      console.log('🟢 [AUTH STORE] Calling authAPI.login');
      const response = await authAPI.login({ email, password });
      console.log('🟢 [AUTH STORE] authAPI.login response received', { hasData: !!response?.data });

      // Validação da resposta
      if (!response?.data) {
        const error = new Error('Resposta inválida do servidor');
        set({ user: null, isAuthenticated: false });
        throw error;
      }

      const { user, token } = response.data;

      // Validação dos dados recebidos
      if (!user || !token) {
        const error = new Error('Dados de autenticação incompletos');
        set({ user: null, isAuthenticated: false });
        throw error;
      }

      if (!token.access_token || !token.refresh_token) {
        const error = new Error('Tokens de autenticação ausentes');
        set({ user: null, isAuthenticated: false });
        throw error;
      }

      // Salvar tokens com proteção
      try {
        localStorage.setItem('access_token', token.access_token);
        localStorage.setItem('refresh_token', token.refresh_token);
      } catch (storageError) {
        console.error('LocalStorage error:', storageError);
        const error = new Error('Erro ao salvar credenciais. Verifique o armazenamento do navegador.');
        set({ user: null, isAuthenticated: false });
        throw error;
      }

      // Atualizar estado
      console.log('✅ [AUTH STORE] Login successful, updating state');
      set({ user, isAuthenticated: true });
      console.log('✅ [AUTH STORE] State updated successfully');
    } catch (error: any) {
      // Log do erro sem quebrar
      try {
        console.error('❌ [AUTH STORE] Login failed:', error);
      } catch (logError) {
        // Ignora erro no log
      }

      // Garantir que o estado está limpo
      try {
        set({ user: null, isAuthenticated: false });
      } catch (setState) {
        // Ignora erro ao setar estado
      }

      // Re-lançar o erro para o componente tratar
      throw error;
    }
  },

  register: async (email: string, password: string, full_name: string, organization_name: string) => {
    try {
      // Validação básica antes de fazer a requisição
      if (!email || !password || !full_name || !organization_name) {
        throw new Error('Todos os campos são obrigatórios');
      }

      const response = await authAPI.register({ email, password, full_name, organization_name });

      // Validação da resposta
      if (!response?.data) {
        throw new Error('Resposta inválida do servidor');
      }

      // IMPORTANTE: NÃO fazer login automático após registro
      // O usuário será redirecionado para a tela de login
      // Apenas retornar sucesso sem salvar tokens ou atualizar estado
      console.log('✅ [AUTH STORE] Registration successful - user must login manually');
    } catch (error: any) {
      console.error('Registration failed:', error);

      // Limpar estado em caso de erro
      set({ user: null, isAuthenticated: false });

      // Re-lançar o erro para o componente tratar
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
      const token = localStorage.getItem('access_token');

      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const response = await authAPI.me();

      // Validação da resposta
      if (!response?.data) {
        throw new Error('Resposta inválida do servidor');
      }

      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      console.error('Token validation failed:', error);

      // Limpar tokens inválidos
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      // Resetar estado
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
