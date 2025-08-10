import { api, tokenManager, isApiSuccess } from './api';
import type { 
  User, 
  LoginRequest, 
  LoginResponse, 
  ApiResponse 
} from '../types';

export class AuthService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>('/api/v1/auth/login', credentials);
      
      if (isApiSuccess(response)) {
        const { token, user, expires_at } = response.data;
        
        // Store token and user data
        tokenManager.setToken(token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token_expires', expires_at);
        
        return response.data;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint if token exists and is valid
      const token = tokenManager.getToken();
      if (token && tokenManager.isTokenValid()) {
        try {
          await api.post('/api/v1/auth/logout');
        } catch (error) {
          // Ignore logout endpoint errors, still clean local storage
          console.warn('Logout endpoint failed:', error);
        }
      }
    } finally {
      // Always clean up local storage
      this.clearAuthData();
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const token = tokenManager.getToken();
      if (!token || !tokenManager.isTokenValid()) {
        this.clearAuthData();
        return null;
      }

      const response = await api.get<User>('/api/v1/auth/me');
      
      if (isApiSuccess(response)) {
        // Update user data in localStorage
        localStorage.setItem('user', JSON.stringify(response.data));
        return response.data;
      } else {
        this.clearAuthData();
        return null;
      }
    } catch (error: any) {
      console.error('Get current user error:', error);
      
      // If unauthorized, clear auth data
      if (error.code === 'HTTP_401') {
        this.clearAuthData();
      }
      
      return null;
    }
  }

  /**
   * Register new user
   */
  async register(userData: {
    email: string;
    password: string;
    name: string;
    role?: 'admin' | 'agent' | 'supervisor';
  }): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>('/api/v1/auth/register', userData);
      
      if (isApiSuccess(response)) {
        const { token, user, expires_at } = response.data;
        
        // Store token and user data
        tokenManager.setToken(token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token_expires', expires_at);
        
        return response.data;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const response = await api.post<{ token: string; expires_at: string }>('/api/v1/auth/refresh');
      
      if (isApiSuccess(response)) {
        const { token, expires_at } = response.data;
        
        tokenManager.setToken(token);
        localStorage.setItem('token_expires', expires_at);
        
        return token;
      } else {
        this.clearAuthData();
        return null;
      }
    } catch (error: any) {
      console.error('Token refresh error:', error);
      this.clearAuthData();
      return null;
    }
  }

  /**
   * Change user password
   */
  async changePassword(data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<void> {
    try {
      const response = await api.post('/api/v1/auth/change-password', data);
      
      if (!isApiSuccess(response)) {
        throw new Error(response.message || 'Password change failed');
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: {
    name?: string;
    email?: string;
    profile_picture?: string;
  }): Promise<User> {
    try {
      const response = await api.put<User>('/api/v1/auth/profile', profileData);
      
      if (isApiSuccess(response)) {
        // Update user data in localStorage
        localStorage.setItem('user', JSON.stringify(response.data));
        return response.data;
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await api.post('/api/v1/auth/forgot-password', { email });
      
      if (!isApiSuccess(response)) {
        throw new Error(response.message || 'Password reset request failed');
      }
    } catch (error: any) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: {
    token: string;
    password: string;
    confirm_password: string;
  }): Promise<void> {
    try {
      const response = await api.post('/api/v1/auth/reset-password', data);
      
      if (!isApiSuccess(response)) {
        throw new Error(response.message || 'Password reset failed');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = tokenManager.getToken();
    return token !== null && tokenManager.isTokenValid();
  }

  /**
   * Get user from localStorage
   */
  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr) as User;
      }
    } catch (error) {
      console.error('Error parsing stored user:', error);
      this.clearAuthData();
    }
    return null;
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(): Date | null {
    try {
      const expiresStr = localStorage.getItem('token_expires');
      if (expiresStr) {
        return new Date(expiresStr);
      }
    } catch (error) {
      console.error('Error parsing token expiration:', error);
    }
    return null;
  }

  /**
   * Check if token will expire soon (within 5 minutes)
   */
  willTokenExpireSoon(): boolean {
    const expiration = this.getTokenExpiration();
    if (!expiration) return true;
    
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return expiration <= fiveMinutesFromNow;
  }

  /**
   * Clear all authentication data
   */
  private clearAuthData(): void {
    tokenManager.removeToken();
    localStorage.removeItem('user');
    localStorage.removeItem('token_expires');
  }

  /**
   * Check user permissions
   */
  hasRole(requiredRole: 'admin' | 'agent' | 'supervisor'): boolean {
    const user = this.getStoredUser();
    if (!user) return false;

    // Role hierarchy: admin > supervisor > agent
    const roleHierarchy = { admin: 3, supervisor: 2, agent: 1 };
    const userLevel = roleHierarchy[user.role];
    const requiredLevel = roleHierarchy[requiredRole];

    return userLevel >= requiredLevel;
  }

  /**
   * Check if user has specific permissions
   */
  hasPermission(permission: string): boolean {
    const user = this.getStoredUser();
    if (!user) return false;

    // Define role-based permissions
    const rolePermissions: Record<string, string[]> = {
      admin: [
        'view_dashboard',
        'manage_users',
        'manage_conversations',
        'view_metrics',
        'send_messages',
        'manage_settings',
        'access_agent_workspace',
        'manage_flows',
        'view_reports'
      ],
      supervisor: [
        'view_dashboard',
        'manage_conversations',
        'view_metrics',
        'send_messages',
        'access_agent_workspace',
        'view_reports'
      ],
      agent: [
        'view_dashboard',
        'send_messages',
        'access_agent_workspace',
        'manage_assigned_conversations'
      ]
    };

    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes(permission);
  }

  /**
   * Initialize authentication check
   * Call this on app startup to verify existing session
   */
  async initializeAuth(): Promise<User | null> {
    if (!this.isAuthenticated()) {
      this.clearAuthData();
      return null;
    }

    // If token will expire soon, try to refresh it
    if (this.willTokenExpireSoon()) {
      const newToken = await this.refreshToken();
      if (!newToken) {
        return null;
      }
    }

    // Get current user data from server
    return await this.getCurrentUser();
  }

  /**
   * Set up automatic token refresh
   */
  setupTokenRefresh(): () => void {
    const checkInterval = 60000; // Check every minute
    
    const intervalId = setInterval(async () => {
      if (this.isAuthenticated() && this.willTokenExpireSoon()) {
        console.log('Token will expire soon, refreshing...');
        await this.refreshToken();
      }
    }, checkInterval);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}

// Create and export auth service instance
export const authService = new AuthService();

// Export default
export default authService;