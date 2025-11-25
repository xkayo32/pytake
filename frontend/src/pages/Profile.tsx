import { useState } from 'react'
import { User, Mail, Phone, MapPin, Calendar, Edit2, Save, X, Camera, Award } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao.silva@empresa.com',
    phone: '+55 11 99999-8888',
    location: 'São Paulo, Brasil',
    bio: 'Especialista em automação e otimização de processos',
    joinDate: '15 de Janeiro de 2024',
    role: 'Super Admin',
    department: 'Gestão',
    avatar: 'JS',
  })

  const stats = [
    { label: 'Conversas Criadas', value: '1,234', icon: '💬' },
    { label: 'Campanhas Ativas', value: '23', icon: '📊' },
    { label: 'Taxa de Sucesso', value: '94.2%', icon: '✅' },
    { label: 'Pontos de Experiência', value: '2,450', icon: '⭐' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="section-title flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            Meu Perfil
          </h1>
        </div>

        {/* Profile Card */}
        <div className="card-interactive mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                  {formData.avatar}
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 text-center">
                <h2 className="text-2xl font-bold">{formData.firstName} {formData.lastName}</h2>
                <p className="text-sm text-muted-foreground mt-1">{formData.role}</p>
                <p className="text-xs text-muted-foreground mt-1 badge-info inline-block">{formData.department}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="p-3 bg-secondary/20 rounded-lg border border-border/50">
                  <p className="text-2xl mb-1">{stat.icon}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground italic">"{formData.bio}"</p>
          </div>
        </div>

        {/* Information Card */}
        <div className="card-interactive">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Informações Pessoais</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" />
                  Cancelar
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  Editar
                </>
              )}
            </button>
          </div>

          <div className="space-y-6">
            {/* Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Primeiro Nome</label>
                <Input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sobrenome</label>
                <Input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Localização
              </label>
              <Input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-2">Biografia</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!isEditing}
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Entrada
                </label>
                <Input type="text" value={formData.joinDate} disabled className="bg-secondary/20" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Papel
                </label>
                <Input type="text" value={formData.role} disabled className="bg-secondary/20" />
              </div>
            </div>

            {/* Actions */}
            {isEditing && (
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button className="btn-primary flex-1 gap-2">
                  <Save className="w-4 h-4" />
                  Salvar Mudanças
                </Button>
                <Button className="btn-secondary flex-1" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div className="card-interactive mt-8">
          <h3 className="text-xl font-semibold mb-4">🏆 Conquistas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🚀', label: 'Pioneiro' },
              { icon: '💯', label: '100% Precisão' },
              { icon: '🔥', label: 'Usuário Ativo' },
              { icon: '⭐', label: 'Top Performer' },
            ].map((achievement, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg text-center border border-primary/20">
                <p className="text-3xl mb-2">{achievement.icon}</p>
                <p className="text-sm font-medium">{achievement.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
