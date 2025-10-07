'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

type UserRole = 'super_admin' | 'org_admin' | 'admin' | 'agent' | 'viewer' | 'manager';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * Component to protect routes based on user role
 * Usage:
 * <RoleGuard allowedRoles={['org_admin', 'super_admin']}>
 *   <AdminContent />
 * </RoleGuard>
 */
export function RoleGuard({ allowedRoles, children, fallbackPath = '/dashboard' }: RoleGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();

  useEffect(() => {
    // Wait for auth check to complete
    if (authLoading) {
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if user has required role
    if (user && !allowedRoles.includes(user.role as UserRole)) {
      console.log(`🔒 [ROLE GUARD] Access denied. User role: ${user.role}, Required: ${allowedRoles.join(', ')}`);
      router.push(fallbackPath);
      return;
    }
  }, [isAuthenticated, authLoading, user, allowedRoles, fallbackPath, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <div className="text-lg text-gray-600 dark:text-gray-400">
          Verificando permissões...
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated or doesn't have required role
  if (!isAuthenticated || !user || !allowedRoles.includes(user.role as UserRole)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook to check if user has specific role
 */
export function useHasRole(role: UserRole | UserRole[]): boolean {
  const { user } = useAuthStore();

  if (!user) return false;

  if (Array.isArray(role)) {
    return role.includes(user.role as UserRole);
  }

  return user.role === role;
}

/**
 * Hook to check if user is admin (admin, org_admin or super_admin)
 */
export function useIsAdmin(): boolean {
  return useHasRole(['admin', 'org_admin', 'super_admin']);
}

/**
 * Hook to check if user is agent
 */
export function useIsAgent(): boolean {
  return useHasRole('agent');
}
