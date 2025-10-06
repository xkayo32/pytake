'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/**
 * Dashboard Router - Redirects users to appropriate dashboard based on role
 *
 * - org_admin, super_admin -> /admin
 * - agent -> /agent
 * - viewer -> /agent (read-only mode)
 */
export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();

  useEffect(() => {
    // Wait for auth check to complete
    if (authLoading) {
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      console.log('🔴 [DASHBOARD] Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    // Redirect based on user role
    if (user) {
      console.log(`🔵 [DASHBOARD] Redirecting user with role: ${user.role}`);

      if (user.role === 'org_admin' || user.role === 'super_admin') {
        router.push('/admin');
      } else if (user.role === 'agent' || user.role === 'viewer') {
        router.push('/agent');
      } else {
        // Fallback for unknown roles
        console.warn(`⚠️ [DASHBOARD] Unknown role: ${user.role}, redirecting to /agent`);
        router.push('/agent');
      }
    }
  }, [isAuthenticated, authLoading, user, router]);

  // Show loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-indigo-600 border-r-transparent mb-4"></div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {authLoading ? 'Verificando autenticação...' : 'Redirecionando...'}
        </p>
      </div>
    </div>
  );
}
