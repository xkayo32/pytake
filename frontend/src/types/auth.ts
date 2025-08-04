export type Role = 'Admin' | 'Supervisor' | 'Agent' | 'Viewer'

export type Permission = 
  // User Management
  | 'ViewUsers' | 'CreateUsers' | 'UpdateUsers' | 'DeleteUsers'
  // Conversation Management
  | 'ViewConversations' | 'CreateConversations' | 'UpdateConversations' | 'DeleteConversations' | 'AssignConversations'
  // Message Management
  | 'ViewMessages' | 'SendMessages' | 'DeleteMessages'
  // Contact Management
  | 'ViewContacts' | 'CreateContacts' | 'UpdateContacts' | 'DeleteContacts'
  // Template Management
  | 'ViewTemplates' | 'CreateTemplates' | 'UpdateTemplates' | 'DeleteTemplates'
  // Media Management
  | 'ViewMedia' | 'UploadMedia' | 'DeleteMedia'
  // System & Analytics
  | 'ViewDashboard' | 'ViewReports' | 'ExportData' | 'ViewOrganization' | 'UpdateOrganization'
  | 'ManageIntegrations' | 'ViewSystemSettings' | 'UpdateSystemSettings' | 'ViewAuditLogs' | 'ManageWebhooks'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  organization_id: string
  permissions: Permission[]
  avatar?: string
  status: 'Active' | 'Inactive' | 'Suspended'
}

export interface AuthContext {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  hasPermission: (permission: Permission) => boolean
  hasRole: (role: Role) => boolean
  canAccessRoute: (route: string) => boolean
}