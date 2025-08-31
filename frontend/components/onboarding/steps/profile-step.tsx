'use client'

import { useState } from 'react'
import { Building2, User, Mail, Phone, Briefcase, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { UserProfile } from '@/lib/hooks/useOnboarding'

interface ProfileStepProps {
  data?: UserProfile
  onComplete: (data: UserProfile) => void
  onNext: () => void
  onPrevious: () => void
}

export function ProfileStep({ data, onComplete, onNext, onPrevious }: ProfileStepProps) {
  const [formData, setFormData] = useState<UserProfile>({
    name: data?.name || '',
    email: data?.email || '',
    phone: data?.phone || '',
    company: data?.company || '',
    role: data?.role || 'admin',
    industry: data?.industry || '',
    teamSize: data?.teamSize || '',
    useCase: data?.useCase || []
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const industries = [
    'Varejo/E-commerce',
    'Serviços',
    'Saúde',
    'Educação',
    'Tecnologia',
    'Alimentação',
    'Imobiliário',
    'Beleza/Estética',
    'Advocacia',
    'Consultoria',
    'Outros'
  ]

  const teamSizes = [
    '1 pessoa (só eu)',
    '2-5 pessoas',
    '6-15 pessoas',
    '16-50 pessoas',
    '51-200 pessoas',
    '200+ pessoas'
  ]

  const useCases = [
    { id: 'customer_support', label: 'Atendimento ao cliente' },
    { id: 'sales', label: 'Vendas e conversões' },
    { id: 'marketing', label: 'Campanhas de marketing' },
    { id: 'notifications', label: 'Notificações automatizadas' },
    { id: 'scheduling', label: 'Agendamentos' },
    { id: 'feedback', label: 'Coleta de feedback' },
    { id: 'orders', label: 'Gestão de pedidos' },
    { id: 'support_ticket', label: 'Tickets de suporte' }
  ]

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    if (!formData.company.trim()) {
      newErrors.company = 'Nome da empresa é obrigatório'
    }

    if (!formData.industry) {
      newErrors.industry = 'Segmento é obrigatório'
    }

    if (!formData.teamSize) {
      newErrors.teamSize = 'Tamanho da equipe é obrigatório'
    }

    if (formData.useCase.length === 0) {
      newErrors.useCase = 'Selecione pelo menos um caso de uso'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onComplete(formData)
      onNext()
    }
  }

  const handleUseCaseToggle = (useCaseId: string) => {
    setFormData(prev => ({
      ...prev,
      useCase: prev.useCase.includes(useCaseId)
        ? prev.useCase.filter(id => id !== useCaseId)
        : [...prev.useCase, useCaseId]
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
        </div>
        <p className="text-muted-foreground">
          Vamos conhecer você e sua empresa para personalizar a experiência
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Dados básicos do administrador da conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                placeholder="Seu nome completo"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone/WhatsApp</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Sua Função</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: UserProfile['role']) => 
                  setFormData(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador/Owner</SelectItem>
                  <SelectItem value="manager">Gerente/Supervisor</SelectItem>
                  <SelectItem value="agent">Agente/Atendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Informações da Empresa
            </CardTitle>
            <CardDescription>
              Dados da sua organização
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Nome da Empresa *</Label>
              <Input
                id="company"
                placeholder="Nome da sua empresa"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className={errors.company ? 'border-red-500' : ''}
              />
              {errors.company && <p className="text-sm text-red-600">{errors.company}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Segmento/Setor *</Label>
              <Select 
                value={formData.industry} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
              >
                <SelectTrigger className={errors.industry ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.industry && <p className="text-sm text-red-600">{errors.industry}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamSize">Tamanho da Equipe *</Label>
              <Select 
                value={formData.teamSize} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, teamSize: value }))}
              >
                <SelectTrigger className={errors.teamSize ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Quantas pessoas na equipe?" />
                </SelectTrigger>
                <SelectContent>
                  {teamSizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.teamSize && <p className="text-sm text-red-600">{errors.teamSize}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5" />
            Como pretende usar a plataforma? *
          </CardTitle>
          <CardDescription>
            Selecione os principais casos de uso (pode escolher vários)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {useCases.map((useCase) => (
              <div
                key={useCase.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  formData.useCase.includes(useCase.id)
                    ? 'bg-primary/5 border-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleUseCaseToggle(useCase.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{useCase.label}</span>
                  {formData.useCase.includes(useCase.id) && (
                    <Badge variant="default" className="text-xs">
                      Selecionado
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          {errors.useCase && <p className="text-sm text-red-600 mt-2">{errors.useCase}</p>}
        </CardContent>
      </Card>

      {/* Summary */}
      {formData.company && formData.industry && formData.teamSize && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">
            📋 Resumo do seu perfil:
          </h4>
          <p className="text-sm text-green-700">
            <strong>{formData.company}</strong> • {formData.industry} • {formData.teamSize}
            {formData.useCase.length > 0 && (
              <>
                <br />
                Casos de uso: {formData.useCase.map(id => 
                  useCases.find(uc => uc.id === id)?.label
                ).join(', ')}
              </>
            )}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious}>
          Voltar
        </Button>
        <Button onClick={handleSubmit} disabled={Object.keys(errors).length > 0}>
          Continuar Configuração
        </Button>
      </div>
    </div>
  )
}