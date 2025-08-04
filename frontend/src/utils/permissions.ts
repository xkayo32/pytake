import type { Role, Permission } from '@/types/auth'

// Define permissions for each role
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Admin: [
    // User Management
    'ViewUsers', 'CreateUsers', 'UpdateUsers', 'DeleteUsers',
    // Conversation Management
    'ViewConversations', 'CreateConversations', 'UpdateConversations', 'DeleteConversations', 'AssignConversations',
    // Message Management
    'ViewMessages', 'SendMessages', 'DeleteMessages',
    // Contact Management
    'ViewContacts', 'CreateContacts', 'UpdateContacts', 'DeleteContacts',
    // Template Management
    'ViewTemplates', 'CreateTemplates', 'UpdateTemplates', 'DeleteTemplates',
    // Media Management
    'ViewMedia', 'UploadMedia', 'DeleteMedia',
    // System & Analytics
    'ViewDashboard', 'ViewReports', 'ExportData', 'ViewOrganization', 'UpdateOrganization',
    'ManageIntegrations', 'ViewSystemSettings', 'UpdateSystemSettings', 'ViewAuditLogs', 'ManageWebhooks'
  ],
  
  Supervisor: [
    // User Management (limited)
    'ViewUsers', 'CreateUsers', 'UpdateUsers',
    // Conversation Management
    'ViewConversations', 'CreateConversations', 'UpdateConversations', 'DeleteConversations', 'AssignConversations',
    // Message Management
    'ViewMessages', 'SendMessages', 'DeleteMessages',
    // Contact Management
    'ViewContacts', 'CreateContacts', 'UpdateContacts', 'DeleteContacts',
    // Template Management
    'ViewTemplates', 'CreateTemplates', 'UpdateTemplates', 'DeleteTemplates',
    // Media Management
    'ViewMedia', 'UploadMedia', 'DeleteMedia',
    // System & Analytics
    'ViewDashboard', 'ViewReports', 'ExportData', 'ViewAuditLogs'
  ],
  
  Agent: [
    // Conversation Management (limited)
    'ViewConversations', 'UpdateConversations',
    // Message Management
    'ViewMessages', 'SendMessages',
    // Contact Management
    'ViewContacts', 'CreateContacts', 'UpdateContacts',
    // Template Management (basic)
    'ViewTemplates', 'CreateTemplates',
    // Media Management (basic)
    'ViewMedia', 'UploadMedia',
    // System & Analytics (basic)
    'ViewDashboard'
  ],
  
  Viewer: [
    // Read-only access
    'ViewConversations', 'ViewMessages', 'ViewContacts', 'ViewTemplates', 'ViewMedia', 'ViewDashboard'
  ]
}

// Define base routes for each role to avoid circular dependencies
const AGENT_ROUTES = [
  '/app/dashboard',
  '/app/conversations',
  '/app/conversations/:id',
  '/app/contacts',
  '/app/templates',
  '/app/media/upload',
  '/app/profile',
  '/app/settings'
]

const SUPERVISOR_ROUTES = [
  '/app/dashboard',
  '/app/conversations',
  '/app/conversations/:id',
  '/app/conversations/assignment',
  '/app/conversations/monitor',
  '/app/team',
  '/app/analytics',
  '/app/performance',
  '/app/contacts',
  '/app/templates',
  '/app/flows',
  '/app/media',
  '/app/reports',
  '/app/profile',
  '/app/settings',
  ...AGENT_ROUTES
]

const ADMIN_ROUTES = [
  '/app/admin/*',
  '/app/admin/users',
  '/app/admin/system',
  '/app/admin/integrations',
  '/app/admin/webhooks',
  '/app/admin/audit',
  '/app/admin/billing',
  '/app/admin/organization',
  '/app/settings/advanced',
  ...SUPERVISOR_ROUTES
]

const VIEWER_ROUTES = [
  '/app/dashboard',
  '/app/analytics/view',
  '/app/reports/view',
  '/app/contacts/view',
  '/app/profile'
]

// Define routes accessible by each role
export const ROLE_ROUTES: Record<Role, string[]> = {
  Agent: AGENT_ROUTES,
  Supervisor: SUPERVISOR_ROUTES,
  Admin: ADMIN_ROUTES,
  Viewer: VIEWER_ROUTES
}

// Route-permission mapping
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/app/dashboard': ['ViewDashboard'],
  '/app/conversations': ['ViewConversations'],
  '/app/conversations/:id': ['ViewConversations', 'ViewMessages'],
  '/app/conversations/assignment': ['AssignConversations'],
  '/app/team': ['ViewUsers'],
  '/app/analytics': ['ViewReports'],
  '/app/contacts': ['ViewContacts'],
  '/app/templates': ['ViewTemplates'],
  '/app/flows': ['UpdateConversations'], // Flow management
  '/app/media': ['ViewMedia'],
  '/app/reports': ['ViewReports'],
  '/app/admin/users': ['ViewUsers', 'CreateUsers'],
  '/app/admin/system': ['ViewSystemSettings'],
  '/app/admin/integrations': ['ManageIntegrations'],
  '/app/admin/webhooks': ['ManageWebhooks'],
  '/app/admin/audit': ['ViewAuditLogs']
}

// Utility functions
export function hasPermission(userRole: Role, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || []
  return rolePermissions.includes(permission)
}

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy: Record<Role, number> = {
    Viewer: 1,
    Agent: 2,
    Supervisor: 3,
    Admin: 4
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export function canAccessRoute(userRole: Role, route: string): boolean {
  // Check if route matches any allowed routes for the role
  const allowedRoutes = ROLE_ROUTES[userRole] || []
  
  // Direct match
  if (allowedRoutes.includes(route)) {
    return true
  }
  
  // Pattern matching (e.g., /app/admin/* for admin routes)
  const routeMatches = allowedRoutes.some(allowedRoute => {
    if (allowedRoute.endsWith('/*')) {
      const baseRoute = allowedRoute.slice(0, -2)
      return route.startsWith(baseRoute)
    }
    
    // Parameter matching (e.g., /conversations/:id)
    if (allowedRoute.includes(':')) {
      const routeParts = route.split('/')
      const allowedParts = allowedRoute.split('/')
      
      if (routeParts.length !== allowedParts.length) {
        return false
      }
      
      return allowedParts.every((part, index) => {
        return part.startsWith(':') || part === routeParts[index]
      })
    }
    
    return false
  })
  
  if (routeMatches) {
    return true
  }
  
  // Check route permissions
  const requiredPermissions = ROUTE_PERMISSIONS[route] || []
  if (requiredPermissions.length === 0) {
    return true // No specific permissions required
  }
  
  return requiredPermissions.some(permission => hasPermission(userRole, permission))
}

export function getDefaultRoute(role: Role): string {
  switch (role) {
    case 'Agent':
      return '/app/conversations'
    case 'Supervisor':
      return '/app/dashboard'
    case 'Admin':
      return '/app/dashboard'
    case 'Viewer':
      return '/app/dashboard/readonly'
    default:
      return '/app/dashboard'
  }
}

export function getAllowedRoutes(role: Role): string[] {
  return ROLE_ROUTES[role] || []
}