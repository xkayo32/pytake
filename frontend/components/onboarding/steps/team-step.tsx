'use client'

import { useState } from 'react'
import { Users, Mail, Plus, X, UserPlus, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TeamMember {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'agent'
  status: 'pending' | 'invited'
}

interface TeamStepProps {
  data?: TeamMember[]
  onComplete: (data: TeamMember[]) => void
  onNext: () => void
  onPrevious: () => void
}

export function TeamStep({ data, onComplete, onNext, onPrevious }: TeamStepProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(data || [])
  const [newMember, setNewMember] = useState({
    email: '',
    name: '',
    role: 'agent' as TeamMember['role']
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const roles = [
    {
      value: 'admin',
      label: 'Administrador',
      description: 'Acesso total ao sistema',
      permissions: ['Configurar sistema', 'Gerenciar equipe', 'Atender clientes', 'Ver relatórios']
    },
    {
      value: 'manager',
      label: 'Gerente',
      description: 'Gerencia equipe e relatórios',
      permissions: ['Gerenciar agentes', 'Atender clientes', 'Ver relatórios', 'Configurar fluxos']
    },
    {
      value: 'agent',
      label: 'Agente',
      description: 'Atendimento ao cliente',
      permissions: ['Atender clientes', 'Ver próprios relatórios']
    }
  ]

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleAddMember = () => {
    const newErrors: Record<string, string> = {}

    if (!newMember.email.trim()) {
      newErrors.email = 'Email é obrigatório'
    } else if (!validateEmail(newMember.email)) {
      newErrors.email = 'Email inválido'
    } else if (teamMembers.some(member => member.email === newMember.email)) {
      newErrors.email = 'Este email já foi adicionado'
    }

    if (!newMember.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      const member: TeamMember = {
        id: Date.now().toString(),
        email: newMember.email,
        name: newMember.name,
        role: newMember.role,
        status: 'pending'
      }

      setTeamMembers(prev => [...prev, member])
      setNewMember({ email: '', name: '', role: 'agent' })
    }
  }

  const handleRemoveMember = (id: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== id))
  }

  const handleRoleChange = (id: string, role: TeamMember['role']) => {
    setTeamMembers(prev => 
      prev.map(member => 
        member.id === id ? { ...member, role } : member
      )
    )
  }

  const handleComplete = () => {
    // Simulate sending invitations
    const updatedMembers = teamMembers.map(member => ({
      ...member,
      status: 'invited' as const
    }))
    
    onComplete(updatedMembers)
    onNext()
  }

  const handleSkip = () => {
    onComplete([])
    onNext()
  }

  const getRoleInfo = (roleValue: string) => {
    return roles.find(role => role.value === roleValue) || roles[2]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
        </div>
        <p className="text-muted-foreground">
          Convide sua equipe para colaborar no atendimento
        </p>
        <Badge variant="secondary" className="mt-2">
          Etapa Opcional
        </Badge>
      </div>

      {/* Add New Member */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Membro da Equipe
          </CardTitle>
          <CardDescription>
            Adicione colegas para ajudar no atendimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="memberName">Nome *</Label>
              <Input
                id="memberName"
                placeholder="Nome completo"
                value={newMember.name}
                onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberEmail">Email *</Label>
              <Input
                id="memberEmail"
                type="email"
                placeholder="email@exemplo.com"
                value={newMember.email}
                onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberRole">Função *</Label>
              <Select
                value={newMember.role}
                onValueChange={(value: TeamMember['role']) => 
                  setNewMember(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleAddMember} disabled={!newMember.email || !newMember.name}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Membro
          </Button>
        </CardContent>
      </Card>

      {/* Team Members List */}
      {teamMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Membros da Equipe ({teamMembers.length})
            </CardTitle>
            <CardDescription>
              Pessoas que serão convidadas para sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamMembers.map((member) => {
              const roleInfo = getRoleInfo(member.role)
              
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Select
                      value={member.role}
                      onValueChange={(value: TeamMember['role']) => 
                        handleRoleChange(member.id, value)
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Badge variant="outline">
                      {member.status === 'pending' ? 'Aguardando' : 'Convidado'}
                    </Badge>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Role Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões por Função
          </CardTitle>
          <CardDescription>
            Entenda o que cada função pode fazer na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.value} className="p-3 border rounded-lg">
                <div className="mb-3">
                  <h4 className="font-medium">{role.label}</h4>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
                <ul className="space-y-1">
                  {role.permissions.map((permission, index) => (
                    <li key={index} className="text-xs flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Information */}
      {teamMembers.length > 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">
            📧 O que acontece depois?
          </h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Convites serão enviados por email para cada membro</li>
            <li>• Eles receberão instruções para criar suas contas</li>
            <li>• Você pode alterar permissões a qualquer momento</li>
            <li>• Membros podem começar a atender imediatamente</li>
          </ul>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">
            👥 Trabalho em Equipe
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Distribua automaticamente as conversas entre a equipe</li>
            <li>• Monitore a performance de cada atendente</li>
            <li>• Configure horários e disponibilidade individual</li>
            <li>• Você pode adicionar membros depois nas configurações</li>
          </ul>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious}>
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Pular Equipe
          </Button>
          <Button onClick={handleComplete}>
            {teamMembers.length > 0 
              ? `Enviar ${teamMembers.length} Convite${teamMembers.length > 1 ? 's' : ''}`
              : 'Continuar'
            }
          </Button>
        </div>
      </div>
    </div>
  )
}