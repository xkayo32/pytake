import { useMemo } from 'react'
import { useAuthStore } from '@/store/slices/authSlice'
import { hasPermission, hasRole, canAccessRoute, getDefaultRoute } from '@/utils/permissions'
import type { Role, Permission } from '@/types/auth'

export function usePermissions() {
  const { user } = useAuthStore()

  const permissions = useMemo(() => {
    if (!user) {
      return {
        hasPermission: () => false,
        hasRole: () => false,
        canAccessRoute: () => false,
        getDefaultRoute: () => '/login',
        userRole: null as Role | null,
        userPermissions: [] as Permission[]
      }
    }

    return {
      hasPermission: (permission: Permission) => hasPermission(user.role, permission),
      hasRole: (role: Role) => hasRole(user.role, role),
      canAccessRoute: (route: string) => canAccessRoute(user.role, route),
      getDefaultRoute: () => getDefaultRoute(user.role),
      userRole: user.role,
      userPermissions: user.permissions
    }
  }, [user])

  return permissions
}

// Hook específico para verificações de UI
export function useRoleBasedUI() {
  const { userRole } = usePermissions()

  return {
    isAgent: userRole === 'Agent',
    isSupervisor: userRole === 'Supervisor',
    isAdmin: userRole === 'Admin',
    isViewer: userRole === 'Viewer',
    canManageUsers: userRole === 'Admin' || userRole === 'Supervisor',
    canAssignConversations: userRole === 'Admin' || userRole === 'Supervisor',
    canViewAnalytics: userRole !== 'Viewer',
    canExportData: userRole === 'Admin' || userRole === 'Supervisor',
    canAccessAdmin: userRole === 'Admin'
  }
}