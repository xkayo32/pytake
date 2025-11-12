import { useToast } from '@/store/notificationStore';

export interface ApiError {
  response?: {
    data?: {
      detail?: string;
      message?: string;
      error?: string;
    };
    status?: number;
    statusText?: string;
  };
  message?: string;
}

/**
 * Extract error message from various API error formats
 */
export const extractErrorMessage = (error: any, defaultMessage: string = 'Erro na requisição'): string => {
  // Check various error message locations
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.message) {
    return error.message;
  }

  return defaultMessage;
};

/**
 * Handle API errors with toast notifications
 * Usage: handleApiError(error, 'Erro ao atualizar usuário')
 */
export const handleApiError = (error: any, defaultMessage: string = 'Erro na operação') => {
  // Get the appropriate toast function based on error status
  const toast = useToast();
  const errorMessage = extractErrorMessage(error, defaultMessage);
  const statusCode = error?.response?.status;

  // Log for debugging
  console.error('API Error:', { statusCode, message: errorMessage, error });

  // Show appropriate toast based on error type
  if (statusCode === 401) {
    toast.warning('Sua sessão expirou. Por favor, faça login novamente.');
  } else if (statusCode === 403) {
    toast.error('Você não tem permissão para realizar esta ação.');
  } else if (statusCode === 404) {
    toast.error('Recurso não encontrado.');
  } else if (statusCode === 500) {
    toast.error('Erro no servidor. Por favor, tente novamente mais tarde.');
  } else {
    toast.error(errorMessage);
  }

  return errorMessage;
};

/**
 * Wrap async function with automatic error handling
 * Usage: const result = await withErrorHandling(apiCall, 'Erro ao carregar dados')
 */
export const withErrorHandling = async (
  asyncFn: () => Promise<any>,
  errorMessage: string = 'Erro na operação'
) => {
  try {
    return await asyncFn();
  } catch (error: any) {
    handleApiError(error, errorMessage);
    throw error;
  }
};
