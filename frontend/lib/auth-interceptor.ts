import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

/**
 * Interceptor para lidar com erros de autenticação (401, 403)
 * Redireciona para login e limpa token se expirado
 */
export async function handleAuthError(
  response: Response,
  router?: ReturnType<typeof useRouter>
): Promise<Response> {
  // 401: Não autenticado (token expirado ou inválido)
  // 403: Não autorizado (permissões insuficientes)
  if (response.status === 401) {
    console.warn('⚠️ Token expirado ou inválido. Redirecionando para login...')
    
    // Limpar token
    Cookies.remove('auth-token')
    
    // Redirecionar para login
    if (router) {
      router.push('/auth/login')
    } else if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    
    return response
  }

  // 403: Sem permissão
  if (response.status === 403) {
    console.warn('⚠️ Sem permissão para acessar este recurso')
    
    // Redirecionar para página de acesso negado ou home
    if (router) {
      router.push('/403')
    }
    
    return response
  }

  return response
}

/**
 * Wrapper para fetch que intercepta erros de autenticação
 */
export async function fetchWithAuth(
  url: string,
  options?: RequestInit & { skipAuthCheck?: boolean }
): Promise<Response> {
  const response = await fetch(url, options)

  // Pular interceptor se explicitamente pedido (ex: em chamadas de auth)
  if (options?.skipAuthCheck) {
    return response
  }

  // Interceptar erros de autenticação
  if (response.status === 401 || response.status === 403) {
    await handleAuthError(response)
  }

  return response
}
