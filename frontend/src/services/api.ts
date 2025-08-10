import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import type { ApiResponse, PaginatedResponse } from '../types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Token management
export const tokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },

  setToken: (token: string): void => {
    localStorage.setItem('auth_token', token);
  },

  removeToken: (): void => {
    localStorage.removeItem('auth_token');
  },

  isTokenValid: (): boolean => {
    const token = tokenManager.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  },
};

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    
    if (token && tokenManager.isTokenValid()) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and auth
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time for debugging
    const endTime = new Date();
    const startTime = response.config.metadata?.startTime;
    if (startTime) {
      const duration = endTime.getTime() - startTime.getTime();
      console.debug(`API Request ${response.config.url} took ${duration}ms`);
    }

    return response;
  },
  (error: AxiosError) => {
    const { response, request } = error;

    // Network error
    if (!response && request) {
      console.error('Network error:', error.message);
      toast.error('Network error. Please check your connection.');
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        details: { originalError: error.message },
        timestamp: new Date().toISOString(),
      });
    }

    // HTTP error responses
    if (response) {
      const status = response.status;
      const data = response.data as any;

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          tokenManager.removeToken();
          toast.error('Session expired. Please login again.');
          
          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;

        case 403:
          toast.error('Access denied. You do not have permission to perform this action.');
          break;

        case 404:
          toast.error('The requested resource was not found.');
          break;

        case 422:
          // Validation errors
          if (data.errors) {
            const firstError = Object.values(data.errors)[0];
            if (Array.isArray(firstError) && firstError.length > 0) {
              toast.error(firstError[0] as string);
            } else {
              toast.error(data.message || 'Validation error');
            }
          } else {
            toast.error(data.message || 'Validation error');
          }
          break;

        case 429:
          toast.error('Too many requests. Please try again later.');
          break;

        case 500:
          toast.error('Internal server error. Please try again later.');
          break;

        default:
          const errorMessage = data?.message || data?.error || 'An unexpected error occurred';
          toast.error(errorMessage);
      }

      // Return standardized error object
      return Promise.reject({
        message: data?.message || data?.error || 'An unexpected error occurred',
        code: data?.code || `HTTP_${status}`,
        details: {
          status,
          statusText: response.statusText,
          data: data || null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Unknown error
    console.error('Unknown API error:', error);
    toast.error('An unexpected error occurred');
    
    return Promise.reject({
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      details: { originalError: error.message },
      timestamp: new Date().toISOString(),
    });
  }
);

// API service class
export class ApiService {
  private client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // Paginated requests
  async getPaginated<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<PaginatedResponse<T>> {
    const response = await this.client.get<PaginatedResponse<T>>(url, {
      ...config,
      params: { ...params, ...config?.params },
    });
    return response.data;
  }

  // File upload
  async uploadFile<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      };
    }

    const response = await this.client.post<ApiResponse<T>>(url, formData, config);
    return response.data;
  }

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.get('/api/v1/health');
  }

  // Retry mechanism for failed requests
  async retryRequest<T = any>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const waitTime = delay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError;
  }
}

// Create and export the API service instance
export const api = new ApiService(apiClient);

// Export the raw axios instance for direct use if needed
export { apiClient };

// Utility function to handle API errors in components
export const handleApiError = (error: any, customMessage?: string) => {
  console.error('API Error:', error);
  
  if (customMessage) {
    toast.error(customMessage);
  } else if (error?.message) {
    toast.error(error.message);
  } else {
    toast.error('An unexpected error occurred');
  }
};

// Type guard for API responses
export const isApiSuccess = <T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } => {
  return response.success === true && response.data !== undefined;
};

// Utility to create query parameters
export const createQueryParams = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
};

export default api;