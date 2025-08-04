// Sistema de Permissões Personalizáveis

export interface Permission {
  id: string
  name: string
  description: string
  module: ModuleType
  action: ActionType
}

// Tipos de módulos do sistema
export type ModuleType = 
  | 'dashboard'
  | 'conversations'
  | 'agents'
  | 'analytics'
  | 'settings'
  | 'whatsapp'
  | 'users'
  | 'roles'
  | 'templates'
  | 'media'
  | 'reports'
  | 'integrations'

// Tipos de ações do sistema
export type ActionType = 
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'import'
  | 'assign'
  | 'manage'

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[] // array of permission IDs
  isCustom: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserPermissions {
  userId: string
  roleId: string
  role: Role
  additionalPermissions: string[] // permissions added beyond role
  revokedPermissions: string[] // permissions removed from role
}

// Permissões pré-definidas do sistema
export const systemPermissions: Permission[] = [
  // Dashboard
  { id: 'dashboard.view', name: 'Ver Dashboard', description: 'Acesso ao dashboard principal', module: 'dashboard', action: 'view' },
  { id: 'dashboard.export', name: 'Exportar Dados Dashboard', description: 'Exportar relatórios do dashboard', module: 'dashboard', action: 'export' },
  
  // Conversas
  { id: 'conversations.view', name: 'Ver Conversas', description: 'Visualizar lista de conversas', module: 'conversations', action: 'view' },
  { id: 'conversations.create', name: 'Criar Conversas', description: 'Iniciar novas conversas', module: 'conversations', action: 'create' },
  { id: 'conversations.edit', name: 'Editar Conversas', description: 'Editar informações de conversas', module: 'conversations', action: 'edit' },
  { id: 'conversations.delete', name: 'Deletar Conversas', description: 'Remover conversas do sistema', module: 'conversations', action: 'delete' },
  { id: 'conversations.assign', name: 'Atribuir Conversas', description: 'Atribuir conversas para agentes', module: 'conversations', action: 'assign' },
  
  // Agentes
  { id: 'agents.view', name: 'Ver Agentes', description: 'Visualizar lista de agentes', module: 'agents', action: 'view' },
  { id: 'agents.manage', name: 'Gerenciar Agentes', description: 'Gerenciar status e configurações de agentes', module: 'agents', action: 'manage' },
  
  // Analytics
  { id: 'analytics.view', name: 'Ver Analytics', description: 'Acesso aos relatórios analíticos', module: 'analytics', action: 'view' },
  { id: 'analytics.export', name: 'Exportar Analytics', description: 'Exportar dados analíticos', module: 'analytics', action: 'export' },
  
  // Configurações
  { id: 'settings.view', name: 'Ver Configurações', description: 'Acesso às configurações do sistema', module: 'settings', action: 'view' },
  { id: 'settings.edit', name: 'Editar Configurações', description: 'Modificar configurações do sistema', module: 'settings', action: 'edit' },
  
  // WhatsApp
  { id: 'whatsapp.view', name: 'Ver Config WhatsApp', description: 'Ver configurações do WhatsApp', module: 'whatsapp', action: 'view' },
  { id: 'whatsapp.manage', name: 'Gerenciar WhatsApp', description: 'Configurar e gerenciar WhatsApp', module: 'whatsapp', action: 'manage' },
  
  // Usuários
  { id: 'users.view', name: 'Ver Usuários', description: 'Visualizar lista de usuários', module: 'users', action: 'view' },
  { id: 'users.create', name: 'Criar Usuários', description: 'Adicionar novos usuários', module: 'users', action: 'create' },
  { id: 'users.edit', name: 'Editar Usuários', description: 'Modificar dados de usuários', module: 'users', action: 'edit' },
  { id: 'users.delete', name: 'Deletar Usuários', description: 'Remover usuários do sistema', module: 'users', action: 'delete' },
  
  // Roles
  { id: 'roles.view', name: 'Ver Perfis', description: 'Visualizar perfis de usuário', module: 'roles', action: 'view' },
  { id: 'roles.create', name: 'Criar Perfis', description: 'Criar novos perfis personalizados', module: 'roles', action: 'create' },
  { id: 'roles.edit', name: 'Editar Perfis', description: 'Modificar perfis existentes', module: 'roles', action: 'edit' },
  { id: 'roles.delete', name: 'Deletar Perfis', description: 'Remover perfis do sistema', module: 'roles', action: 'delete' },
  
  // Templates
  { id: 'templates.view', name: 'Ver Templates', description: 'Visualizar templates de mensagem', module: 'templates', action: 'view' },
  { id: 'templates.create', name: 'Criar Templates', description: 'Criar novos templates', module: 'templates', action: 'create' },
  { id: 'templates.edit', name: 'Editar Templates', description: 'Modificar templates existentes', module: 'templates', action: 'edit' },
  { id: 'templates.delete', name: 'Deletar Templates', description: 'Remover templates', module: 'templates', action: 'delete' },
  
  // Media
  { id: 'media.view', name: 'Ver Mídia', description: 'Visualizar arquivos de mídia', module: 'media', action: 'view' },
  { id: 'media.create', name: 'Upload Mídia', description: 'Fazer upload de arquivos', module: 'media', action: 'create' },
  { id: 'media.delete', name: 'Deletar Mídia', description: 'Remover arquivos de mídia', module: 'media', action: 'delete' },
]

// Perfis padrão do sistema
export const defaultRoles: Role[] = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acesso total ao sistema',
    permissions: systemPermissions.map(p => p.id), // todas as permissões
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    description: 'Gerencia equipes e monitora desempenho',
    permissions: [
      'dashboard.view', 'dashboard.export',
      'conversations.view', 'conversations.assign',
      'agents.view', 'agents.manage',
      'analytics.view', 'analytics.export',
      'templates.view', 'templates.create', 'templates.edit',
      'media.view', 'media.create'
    ],
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'agent',
    name: 'Agente',
    description: 'Atende conversas e gerencia atendimentos',
    permissions: [
      'dashboard.view',
      'conversations.view', 'conversations.create', 'conversations.edit',
      'templates.view',
      'media.view', 'media.create'
    ],
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'viewer',
    name: 'Visualizador',
    description: 'Apenas visualização de dados',
    permissions: [
      'dashboard.view',
      'conversations.view',
      'analytics.view'
    ],
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// Helper functions
export function hasPermission(
  userPermissions: UserPermissions,
  permissionId: string
): boolean {
  // Verifica se a permissão foi revogada
  if (userPermissions.revokedPermissions.includes(permissionId)) {
    return false
  }
  
  // Verifica se tem a permissão adicional
  if (userPermissions.additionalPermissions.includes(permissionId)) {
    return true
  }
  
  // Verifica se tem a permissão no role
  return userPermissions.role.permissions.includes(permissionId)
}

export function hasAnyPermission(
  userPermissions: UserPermissions,
  permissionIds: string[]
): boolean {
  return permissionIds.some(id => hasPermission(userPermissions, id))
}

export function hasAllPermissions(
  userPermissions: UserPermissions,
  permissionIds: string[]
): boolean {
  return permissionIds.every(id => hasPermission(userPermissions, id))
}

export function hasModuleAccess(
  userPermissions: UserPermissions,
  module: ModuleType
): boolean {
  const modulePermissions = systemPermissions
    .filter(p => p.module === module)
    .map(p => p.id)
  
  return hasAnyPermission(userPermissions, modulePermissions)
}