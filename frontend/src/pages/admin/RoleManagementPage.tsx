import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Users,
  Check,
  Search,
  Filter
} from 'lucide-react'
import { 
  systemPermissions, 
  defaultRoles
} from '@/types/permissions'
import type { Permission, Role, ModuleType } from '@/types/permissions'
import { useToast } from '@/hooks/useToast'

interface EditingRole extends Role {
  isNew?: boolean
}

export function RoleManagementPage() {
  const { showToast } = useToast()
  const [roles, setRoles] = useState<Role[]>(defaultRoles)
  const [editingRole, setEditingRole] = useState<EditingRole | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModule, setSelectedModule] = useState<ModuleType | 'all'>('all')

  // Agrupar permissões por módulo
  const permissionsByModule = systemPermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = []
    }
    acc[permission.module].push(permission)
    return acc
  }, {} as Record<ModuleType, Permission[]>)

  const handleCreateRole = () => {
    const newRole: EditingRole = {
      id: `custom_${Date.now()}`,
      name: '',
      description: '',
      permissions: [],
      isCustom: true,
      isNew: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setEditingRole(newRole)
  }

  const handleEditRole = (role: Role) => {
    if (!role.isCustom && role.id !== 'admin') {
      showToast('Perfis padrão não podem ser editados', 'warning')
      return
    }
    setEditingRole({ ...role })
  }

  const handleSaveRole = () => {
    if (!editingRole) return

    if (!editingRole.name.trim()) {
      showToast('Nome do perfil é obrigatório', 'error')
      return
    }

    if (editingRole.isNew) {
      const { isNew, ...newRole } = editingRole
      setRoles([...roles, newRole])
      showToast('Perfil criado com sucesso', 'success')
    } else {
      const { isNew, ...updatedRole } = editingRole
      setRoles(roles.map(r => r.id === editingRole.id ? updatedRole : r))
      showToast('Perfil atualizado com sucesso', 'success')
    }

    setEditingRole(null)
  }

  const handleDeleteRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    if (!role?.isCustom) {
      showToast('Perfis padrão não podem ser excluídos', 'error')
      return
    }

    setRoles(roles.filter(r => r.id !== roleId))
    showToast('Perfil excluído com sucesso', 'success')
  }

  const togglePermission = (permissionId: string) => {
    if (!editingRole) return

    const newPermissions = editingRole.permissions.includes(permissionId)
      ? editingRole.permissions.filter(p => p !== permissionId)
      : [...editingRole.permissions, permissionId]

    setEditingRole({ ...editingRole, permissions: newPermissions })
  }

  const toggleAllModulePermissions = (module: ModuleType) => {
    if (!editingRole) return

    const modulePermissionIds = permissionsByModule[module].map(p => p.id)
    const hasAll = modulePermissionIds.every(id => editingRole.permissions.includes(id))

    if (hasAll) {
      // Remove todas as permissões do módulo
      setEditingRole({
        ...editingRole,
        permissions: editingRole.permissions.filter(p => !modulePermissionIds.includes(p))
      })
    } else {
      // Adiciona todas as permissões do módulo
      const newPermissions = [...new Set([...editingRole.permissions, ...modulePermissionIds])]
      setEditingRole({ ...editingRole, permissions: newPermissions })
    }
  }

  const filteredPermissions = selectedModule === 'all' 
    ? systemPermissions 
    : systemPermissions.filter(p => p.module === selectedModule)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciamento de Perfis"
        description="Configure perfis e permissões de usuários"
        icon={Shield}
        actions={
          <Button onClick={handleCreateRole}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Perfil
          </Button>
        }
      />

      {/* Lista de Perfis */}
      {!editingRole && (
        <div className="grid gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{role.name}</h3>
                    {!role.isCustom && (
                      <Badge variant="secondary">Padrão</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">12 usuários</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {role.permissions.length} permissões
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditRole(role)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {role.isCustom && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRole(role.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Editor de Perfil */}
      {editingRole && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {editingRole.isNew ? 'Novo Perfil' : 'Editar Perfil'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingRole(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Perfil</label>
                <Input
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  placeholder="Ex: Gerente de Vendas"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Input
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  placeholder="Ex: Gerencia equipe de vendas e acompanha métricas"
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Permissões */}
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Permissões</h3>
              
              {/* Filtros */}
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar permissões..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value as ModuleType | 'all')}
                  className="px-3 py-2 bg-background border border-input rounded-md text-sm"
                >
                  <option value="all">Todos os módulos</option>
                  {Object.keys(permissionsByModule).map(module => (
                    <option key={module} value={module}>
                      {module.charAt(0).toUpperCase() + module.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista de Permissões por Módulo */}
              <div className="space-y-6">
                {Object.entries(permissionsByModule).map(([module, permissions]) => {
                  if (selectedModule !== 'all' && selectedModule !== module) return null

                  const modulePermissions = permissions.filter(p =>
                    searchTerm === '' || 
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.description.toLowerCase().includes(searchTerm.toLowerCase())
                  )

                  if (modulePermissions.length === 0) return null

                  const allSelected = modulePermissions.every(p => 
                    editingRole.permissions.includes(p.id)
                  )

                  return (
                    <div key={module} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium capitalize">{module}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAllModulePermissions(module as ModuleType)}
                          className="text-xs"
                        >
                          {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {modulePermissions.map(permission => (
                          <div
                            key={permission.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="space-y-1">
                              <p className="font-medium text-sm">{permission.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                            <Switch
                              checked={editingRole.permissions.includes(permission.id)}
                              onCheckedChange={() => togglePermission(permission.id)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setEditingRole(null)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveRole}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Perfil
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}