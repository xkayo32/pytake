import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserRole, Permission } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requiredPermissions?: Array<{ resource: string; action: string }>;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallback
}) => {
  const location = useLocation();
  const { user, isAuthenticated, isLoading, hasPermission, isRole } = useAuthStore();

  // Show loading spinner while authentication is being checked
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to="/auth/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check for inactive or suspended user
  if (user.status !== 'active') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Conta {user.status === 'suspended' ? 'Suspensa' : 'Inativa'}
            </h2>
            <p className="text-yellow-700 dark:text-yellow-300">
              {user.status === 'suspended' 
                ? 'Sua conta foi suspensa. Entre em contato com o administrador.'
                : 'Sua conta está inativa. Entre em contato com o administrador para ativar.'
              }
            </p>
          </div>
          <button
            onClick={() => useAuthStore.getState().logout()}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Fazer Logout
          </button>
        </div>
      </div>
    );
  }

  // Check role requirements
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => isRole(role));
    
    if (!hasRequiredRole) {
      if (fallback) {
        return <>{fallback}</>;
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                Acesso Negado
              </h2>
              <p className="text-red-700 dark:text-red-300">
                Você não possui a função necessária para acessar esta página.
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                Função atual: {user.role}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Funções necessárias: {requiredRoles.join(', ')}
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      );
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(({ resource, action }) =>
      hasPermission(resource, action)
    );
    
    if (!hasAllPermissions) {
      if (fallback) {
        return <>{fallback}</>;
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                Permissão Insuficiente
              </h2>
              <p className="text-red-700 dark:text-red-300">
                Você não possui as permissões necessárias para acessar esta página.
              </p>
              <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                <p className="font-medium">Permissões necessárias:</p>
                <ul className="mt-1 space-y-1">
                  {requiredPermissions.map(({ resource, action }, index) => (
                    <li key={index}>
                      • {resource}:{action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      );
    }
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};

// HOC version for class components (if needed)
export const withProtectedRoute = <P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'>
) => {
  const ProtectedComponent: React.FC<P> = (props) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );
  
  ProtectedComponent.displayName = `withProtectedRoute(${Component.displayName || Component.name})`;
  
  return ProtectedComponent;
};

// Hook for checking permissions within components
export const usePermissions = () => {
  const { hasPermission, isRole, user } = useAuthStore();
  
  return {
    hasPermission,
    isRole,
    user,
    canRead: (resource: string) => hasPermission(resource, 'read'),
    canCreate: (resource: string) => hasPermission(resource, 'create'),
    canUpdate: (resource: string) => hasPermission(resource, 'update'),
    canDelete: (resource: string) => hasPermission(resource, 'delete'),
    isOwner: () => isRole('Owner'),
    isAdmin: () => isRole('Admin') || isRole('Owner'),
    isManager: () => ['Owner', 'Admin', 'Manager'].includes(user?.role || ''),
    isAgent: () => user?.role === 'Agent',
    isReadOnly: () => user?.role === 'ReadOnly',
  };
};