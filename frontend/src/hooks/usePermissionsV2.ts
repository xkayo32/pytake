import { useMemo } from 'react'
import { useAuthStore } from '@/store/slices/authSlice'
import { 
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
  hasModuleAccess as checkModuleAccess,
  defaultRoles
} from '@/types/permissions'
import type { UserPermissions, ModuleType } from '@/types/permissions'

export function usePermissionsV2() {
  const { user } = useAuthStore()
  
  const permissions = useMemo(() => {
    if (!user) {
      return {
        hasPermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
        hasModuleAccess: () => false,
        canViewModule: () => false,
        canEditModule: () => false,
        userPermissions: null
      }
    }
    
    // Encontrar o role correspondente
    const role = defaultRoles.find(r => r.id === user.role.toLowerCase()) || defaultRoles[3] // default to viewer
    
    const userPermissions: UserPermissions = {
      userId: user.id,
      roleId: role.id,
      role: role,
      additionalPermissions: [], // TODO: buscar do backend
      revokedPermissions: [] // TODO: buscar do backend
    }
    
    return {
      hasPermission: (permissionId: string) => checkPermission(userPermissions, permissionId),
      hasAnyPermission: (permissionIds: string[]) => checkAnyPermission(userPermissions, permissionIds),
      hasAllPermissions: (permissionIds: string[]) => checkAllPermissions(userPermissions, permissionIds),
      hasModuleAccess: (module: ModuleType) => checkModuleAccess(userPermissions, module),
      canViewModule: (module: ModuleType) => checkPermission(userPermissions, `${module}.view`),
      canEditModule: (module: ModuleType) => checkPermission(userPermissions, `${module}.edit`) || checkPermission(userPermissions, `${module}.manage`),
      userPermissions
    }
  }, [user])
  
  return permissions
}

// Hook para UI baseada em permissões
export function usePermissionBasedUI() {
  const { hasPermission, hasModuleAccess, userPermissions } = usePermissionsV2()
  
  return {
    // Módulos visíveis no menu
    showDashboard: hasModuleAccess('dashboard'),
    showConversations: hasModuleAccess('conversations'),
    showAgents: hasModuleAccess('agents'),
    showAnalytics: hasModuleAccess('analytics'),
    showSettings: hasModuleAccess('settings'),
    showWhatsApp: hasModuleAccess('whatsapp'),
    showUsers: hasModuleAccess('users'),
    showRoles: hasModuleAccess('roles'),
    showTemplates: hasModuleAccess('templates'),
    showMedia: hasModuleAccess('media'),
    
    // Ações específicas
    canCreateConversation: hasPermission('conversations.create'),
    canAssignConversation: hasPermission('conversations.assign'),
    canDeleteConversation: hasPermission('conversations.delete'),
    canExportAnalytics: hasPermission('analytics.export'),
    canManageWhatsApp: hasPermission('whatsapp.manage'),
    canCreateUsers: hasPermission('users.create'),
    canEditRoles: hasPermission('roles.edit'),
    
    // Role info
    roleName: userPermissions?.role.name || 'Visitante',
    isCustomRole: userPermissions?.role.isCustom || false
  }
}