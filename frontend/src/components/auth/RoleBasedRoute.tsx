import { Navigate, useLocation } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/store/slices/authSlice'
import type { Role, Permission } from '@/types/auth'

interface RoleBasedRouteProps {
  children: React.ReactNode
  requiredRoles?: Role[]
  requiredPermissions?: Permission[]
  fallbackRoute?: string
  fallbackComponent?: React.ComponentType
}

export function RoleBasedRoute({
  children,
  requiredRoles,
  requiredPermissions,
  fallbackRoute,
  fallbackComponent: FallbackComponent
}: RoleBasedRouteProps) {
  const { isAuthenticated } = useAuthStore()
  const { hasPermission, hasRole, canAccessRoute, getDefaultRoute, userRole } = usePermissions()
  const location = useLocation()

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role requirements
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role))
    if (!hasRequiredRole) {
      if (FallbackComponent) {
        return <FallbackComponent />
      }
      return <Navigate to={fallbackRoute || getDefaultRoute()} replace />
    }
  }

  // Check permission requirements
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermission = requiredPermissions.some(permission => hasPermission(permission))
    if (!hasRequiredPermission) {
      if (FallbackComponent) {
        return <FallbackComponent />
      }
      return <Navigate to={fallbackRoute || getDefaultRoute()} replace />
    }
  }

  // Check if user can access current route
  if (!canAccessRoute(location.pathname)) {
    if (FallbackComponent) {
      return <FallbackComponent />
    }
    return <Navigate to={fallbackRoute || getDefaultRoute()} replace />
  }

  return <>{children}</>
}

// Component for access denied page
export function AccessDenied() {
  const { getDefaultRoute, userRole } = usePermissions()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
        <p className="text-muted-foreground mb-6">
          Você não tem permissão para acessar esta página.
        </p>
        
        <div className="space-y-2 mb-6">
          <p className="text-sm text-muted-foreground">
            <strong>Seu nível de acesso:</strong> {userRole}
          </p>
          <p className="text-sm text-muted-foreground">
            Entre em contato com seu administrador se você acredita que deveria ter acesso a esta funcionalidade.
          </p>
        </div>
        
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            Voltar
          </button>
          <a
            href={getDefaultRoute()}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Ir para Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

// Component wrapper for conditional rendering based on permissions
interface PermissionGateProps {
  permissions?: Permission[]
  roles?: Role[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({ permissions, roles, fallback, children }: PermissionGateProps) {
  const { hasPermission, hasRole } = usePermissions()

  // Check permissions
  if (permissions && permissions.length > 0) {
    const hasRequiredPermission = permissions.some(permission => hasPermission(permission))
    if (!hasRequiredPermission) {
      return <>{fallback}</>
    }
  }

  // Check roles
  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.some(role => hasRole(role))
    if (!hasRequiredRole) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}