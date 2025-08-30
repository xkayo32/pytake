/**
 * Sistema de Conquistas (Achievements) para Gamificação
 * 
 * Define badges, conquistas e desafios que os agentes podem alcançar
 */

export interface Achievement {
  id: string
  title: string
  description: string
  category: 'speed' | 'satisfaction' | 'volume' | 'consistency' | 'quality' | 'special'
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  points: number
  requirements: AchievementRequirement[]
  secret?: boolean // Achievements secretos não mostram requisitos
  unlockedAt?: Date
  progress?: number // 0-100
}

export interface AchievementRequirement {
  type: 'metric' | 'streak' | 'total' | 'comparison' | 'time' | 'special'
  metric?: keyof AgentMetricsForAchievements
  operator: '>=' | '>' | '<=' | '<' | '==' | 'between'
  value: number | [number, number]
  period?: 'day' | 'week' | 'month' | 'all_time'
  consecutiveDays?: number
}

export interface AgentMetricsForAchievements {
  // Métricas básicas
  conversationsHandled: number
  messagesResponded: number
  avgResponseTime: number
  satisfaction: number
  hoursWorked: number
  
  // Métricas de qualidade
  resolutionRate: number
  slaCompliance: number
  customerRetention: number
  
  // Streaks e consistência
  currentStreak: number
  longestStreak: number
  perfectDays: number
  
  // Totals acumulados
  totalConversations: number
  totalMessages: number
  totalHours: number
  
  // Comparação com equipe
  rankPosition: number
  teamSize: number
  
  // Métricas especiais
  overtimeHours: number
  weekendWork: number
  nightShiftHours: number
  mentoringSessions: number
}

export class AchievementSystem {
  private achievements: Achievement[] = [
    // === SPEED CATEGORY ===
    {
      id: 'lightning_response',
      title: 'Resposta Relâmpago',
      description: 'Responda em menos de 15 segundos por 10 conversas seguidas',
      category: 'speed',
      icon: '⚡',
      rarity: 'common',
      points: 100,
      requirements: [
        { type: 'metric', metric: 'avgResponseTime', operator: '<=', value: 15, period: 'day' }
      ]
    },
    {
      id: 'speed_demon',
      title: 'Demônio da Velocidade',
      description: 'Mantenha tempo médio abaixo de 30s por uma semana',
      category: 'speed',
      icon: '🏃‍♂️',
      rarity: 'rare',
      points: 300,
      requirements: [
        { type: 'metric', metric: 'avgResponseTime', operator: '<=', value: 30, consecutiveDays: 7 }
      ]
    },
    {
      id: 'flash',
      title: 'Flash',
      description: 'Resposta em menos de 10 segundos',
      category: 'speed',
      icon: '💨',
      rarity: 'epic',
      points: 500,
      requirements: [
        { type: 'metric', metric: 'avgResponseTime', operator: '<=', value: 10, period: 'day' }
      ]
    },

    // === SATISFACTION CATEGORY ===
    {
      id: 'customer_favorite',
      title: 'Queridinho dos Clientes',
      description: 'Mantenha satisfação acima de 4.5 por uma semana',
      category: 'satisfaction',
      icon: '😍',
      rarity: 'common',
      points: 150,
      requirements: [
        { type: 'metric', metric: 'satisfaction', operator: '>=', value: 4.5, consecutiveDays: 7 }
      ]
    },
    {
      id: 'perfect_service',
      title: 'Atendimento Perfeito',
      description: 'Alcance satisfação de 5.0 em um dia',
      category: 'satisfaction',
      icon: '🌟',
      rarity: 'rare',
      points: 250,
      requirements: [
        { type: 'metric', metric: 'satisfaction', operator: '==', value: 5.0, period: 'day' }
      ]
    },
    {
      id: 'satisfaction_legend',
      title: 'Lenda da Satisfação',
      description: 'Mantenha satisfação acima de 4.8 por um mês',
      category: 'satisfaction',
      icon: '👑',
      rarity: 'legendary',
      points: 1000,
      requirements: [
        { type: 'metric', metric: 'satisfaction', operator: '>=', value: 4.8, consecutiveDays: 30 }
      ]
    },

    // === VOLUME CATEGORY ===
    {
      id: 'busy_bee',
      title: 'Abelha Ocupada',
      description: 'Atenda 25 conversas em um dia',
      category: 'volume',
      icon: '🐝',
      rarity: 'common',
      points: 100,
      requirements: [
        { type: 'metric', metric: 'conversationsHandled', operator: '>=', value: 25, period: 'day' }
      ]
    },
    {
      id: 'conversation_machine',
      title: 'Máquina de Conversas',
      description: 'Atenda 1000 conversas no total',
      category: 'volume',
      icon: '🤖',
      rarity: 'rare',
      points: 400,
      requirements: [
        { type: 'total', metric: 'totalConversations', operator: '>=', value: 1000 }
      ]
    },
    {
      id: 'message_master',
      title: 'Mestre das Mensagens',
      description: 'Responda 200 mensagens em um dia',
      category: 'volume',
      icon: '📱',
      rarity: 'epic',
      points: 300,
      requirements: [
        { type: 'metric', metric: 'messagesResponded', operator: '>=', value: 200, period: 'day' }
      ]
    },

    // === CONSISTENCY CATEGORY ===
    {
      id: 'reliable_agent',
      title: 'Agente Confiável',
      description: 'Mantenha performance consistente por 7 dias',
      category: 'consistency',
      icon: '🛡️',
      rarity: 'common',
      points: 200,
      requirements: [
        { type: 'streak', metric: 'currentStreak', operator: '>=', value: 7 }
      ]
    },
    {
      id: 'iron_will',
      title: 'Vontade de Ferro',
      description: 'Mantenha streak de 30 dias',
      category: 'consistency',
      icon: '🔥',
      rarity: 'epic',
      points: 750,
      requirements: [
        { type: 'streak', metric: 'currentStreak', operator: '>=', value: 30 }
      ]
    },
    {
      id: 'unstoppable',
      title: 'Imparável',
      description: 'Mantenha streak de 100 dias',
      category: 'consistency',
      icon: '💎',
      rarity: 'legendary',
      points: 2000,
      secret: true,
      requirements: [
        { type: 'streak', metric: 'currentStreak', operator: '>=', value: 100 }
      ]
    },

    // === QUALITY CATEGORY ===
    {
      id: 'problem_solver',
      title: 'Solucionador',
      description: 'Mantenha taxa de resolução acima de 95%',
      category: 'quality',
      icon: '🔧',
      rarity: 'common',
      points: 150,
      requirements: [
        { type: 'metric', metric: 'resolutionRate', operator: '>=', value: 0.95, period: 'week' }
      ]
    },
    {
      id: 'sla_champion',
      title: 'Campeão do SLA',
      description: 'Mantenha 100% de compliance por uma semana',
      category: 'quality',
      icon: '⏰',
      rarity: 'rare',
      points: 350,
      requirements: [
        { type: 'metric', metric: 'slaCompliance', operator: '==', value: 1.0, consecutiveDays: 7 }
      ]
    },
    {
      id: 'quality_master',
      title: 'Mestre da Qualidade',
      description: 'Combine alta satisfação, resolução e SLA por um mês',
      category: 'quality',
      icon: '🏆',
      rarity: 'legendary',
      points: 1500,
      requirements: [
        { type: 'metric', metric: 'satisfaction', operator: '>=', value: 4.5, consecutiveDays: 30 },
        { type: 'metric', metric: 'resolutionRate', operator: '>=', value: 0.90, consecutiveDays: 30 },
        { type: 'metric', metric: 'slaCompliance', operator: '>=', value: 0.95, consecutiveDays: 30 }
      ]
    },

    // === SPECIAL CATEGORY ===
    {
      id: 'early_bird',
      title: 'Madrugador',
      description: 'Trabalhe 50 horas antes das 9h',
      category: 'special',
      icon: '🌅',
      rarity: 'rare',
      points: 200,
      requirements: [
        { type: 'special', value: 50 } // Implementar lógica especial
      ]
    },
    {
      id: 'night_owl',
      title: 'Coruja Noturna',
      description: 'Trabalhe 100 horas após 18h',
      category: 'special',
      icon: '🦉',
      rarity: 'rare',
      points: 250,
      requirements: [
        { type: 'metric', metric: 'nightShiftHours', operator: '>=', value: 100, period: 'all_time' }
      ]
    },
    {
      id: 'weekend_warrior',
      title: 'Guerreiro do Fim de Semana',
      description: 'Trabalhe 20 fins de semana',
      category: 'special',
      icon: '⚔️',
      rarity: 'epic',
      points: 400,
      requirements: [
        { type: 'metric', metric: 'weekendWork', operator: '>=', value: 20, period: 'all_time' }
      ]
    },
    {
      id: 'mentor',
      title: 'Mentor',
      description: 'Conduza 10 sessões de mentoria',
      category: 'special',
      icon: '👨‍🏫',
      rarity: 'epic',
      points: 500,
      requirements: [
        { type: 'metric', metric: 'mentoringSessions', operator: '>=', value: 10, period: 'all_time' }
      ]
    },
    {
      id: 'team_leader',
      title: 'Líder da Equipe',
      description: 'Seja #1 no ranking por uma semana',
      category: 'special',
      icon: '🥇',
      rarity: 'legendary',
      points: 1000,
      requirements: [
        { type: 'comparison', metric: 'rankPosition', operator: '==', value: 1, consecutiveDays: 7 }
      ]
    },
    {
      id: 'first_day',
      title: 'Primeiro Dia',
      description: 'Complete seu primeiro dia de trabalho',
      category: 'special',
      icon: '🎉',
      rarity: 'common',
      points: 50,
      requirements: [
        { type: 'metric', metric: 'conversationsHandled', operator: '>=', value: 1, period: 'day' }
      ]
    }
  ]

  /**
   * Verifica quais achievements um agente desbloqueou
   */
  checkAchievements(
    metrics: AgentMetricsForAchievements, 
    historicalData: AgentMetricsForAchievements[]
  ): Achievement[] {
    return this.achievements.filter(achievement => 
      this.isAchievementUnlocked(achievement, metrics, historicalData)
    ).map(achievement => ({
      ...achievement,
      unlockedAt: new Date(),
      progress: 100
    }))
  }

  /**
   * Calcula progresso dos achievements não desbloqueados
   */
  calculateProgress(
    metrics: AgentMetricsForAchievements,
    historicalData: AgentMetricsForAchievements[]
  ): Achievement[] {
    return this.achievements.map(achievement => ({
      ...achievement,
      progress: this.calculateAchievementProgress(achievement, metrics, historicalData)
    }))
  }

  /**
   * Verifica se um achievement específico foi desbloqueado
   */
  private isAchievementUnlocked(
    achievement: Achievement,
    metrics: AgentMetricsForAchievements,
    historicalData: AgentMetricsForAchievements[]
  ): boolean {
    return achievement.requirements.every(req => 
      this.checkRequirement(req, metrics, historicalData)
    )
  }

  /**
   * Verifica um requisito específico
   */
  private checkRequirement(
    requirement: AchievementRequirement,
    metrics: AgentMetricsForAchievements,
    historicalData: AgentMetricsForAchievements[]
  ): boolean {
    switch (requirement.type) {
      case 'metric':
        return this.checkMetricRequirement(requirement, metrics)
      
      case 'streak':
        return this.checkStreakRequirement(requirement, metrics)
      
      case 'total':
        return this.checkTotalRequirement(requirement, metrics)
      
      case 'comparison':
        return this.checkComparisonRequirement(requirement, metrics)
      
      case 'time':
        return this.checkTimeRequirement(requirement, historicalData)
      
      case 'special':
        return this.checkSpecialRequirement(requirement, metrics)
      
      default:
        return false
    }
  }

  private checkMetricRequirement(
    req: AchievementRequirement,
    metrics: AgentMetricsForAchievements
  ): boolean {
    if (!req.metric) return false
    
    const value = metrics[req.metric] as number
    
    switch (req.operator) {
      case '>=': return value >= req.value as number
      case '>': return value > req.value as number
      case '<=': return value <= req.value as number
      case '<': return value < req.value as number
      case '==': return value === req.value as number
      case 'between':
        const [min, max] = req.value as [number, number]
        return value >= min && value <= max
      default: return false
    }
  }

  private checkStreakRequirement(
    req: AchievementRequirement,
    metrics: AgentMetricsForAchievements
  ): boolean {
    return metrics.currentStreak >= (req.value as number)
  }

  private checkTotalRequirement(
    req: AchievementRequirement,
    metrics: AgentMetricsForAchievements
  ): boolean {
    if (!req.metric) return false
    const value = metrics[req.metric] as number
    return value >= (req.value as number)
  }

  private checkComparisonRequirement(
    req: AchievementRequirement,
    metrics: AgentMetricsForAchievements
  ): boolean {
    return metrics.rankPosition === (req.value as number)
  }

  private checkTimeRequirement(
    req: AchievementRequirement,
    historicalData: AgentMetricsForAchievements[]
  ): boolean {
    // Implementar lógica baseada em dados históricos
    return true
  }

  private checkSpecialRequirement(
    req: AchievementRequirement,
    metrics: AgentMetricsForAchievements
  ): boolean {
    // Implementar lógicas especiais customizadas
    return true
  }

  /**
   * Calcula progresso de um achievement (0-100)
   */
  private calculateAchievementProgress(
    achievement: Achievement,
    metrics: AgentMetricsForAchievements,
    historicalData: AgentMetricsForAchievements[]
  ): number {
    if (achievement.requirements.length === 0) return 0
    
    // Para achievements com múltiplos requisitos, usar o menor progresso
    const progresses = achievement.requirements.map(req => 
      this.calculateRequirementProgress(req, metrics, historicalData)
    )
    
    return Math.min(...progresses)
  }

  private calculateRequirementProgress(
    req: AchievementRequirement,
    metrics: AgentMetricsForAchievements,
    historicalData: AgentMetricsForAchievements[]
  ): number {
    switch (req.type) {
      case 'metric':
        if (!req.metric) return 0
        const currentValue = metrics[req.metric] as number
        const targetValue = req.value as number
        
        if (req.operator === '>=' || req.operator === '>') {
          return Math.min((currentValue / targetValue) * 100, 100)
        } else if (req.operator === '<=' || req.operator === '<') {
          return currentValue <= targetValue ? 100 : Math.max(100 - (currentValue / targetValue) * 100, 0)
        }
        return currentValue === targetValue ? 100 : 0
      
      case 'streak':
        return Math.min((metrics.currentStreak / (req.value as number)) * 100, 100)
      
      case 'total':
        if (!req.metric) return 0
        const totalValue = metrics[req.metric] as number
        return Math.min((totalValue / (req.value as number)) * 100, 100)
      
      default:
        return 0
    }
  }

  /**
   * Obtém achievements por categoria
   */
  getAchievementsByCategory(category: Achievement['category']): Achievement[] {
    return this.achievements.filter(a => a.category === category)
  }

  /**
   * Obtém achievements por raridade
   */
  getAchievementsByRarity(rarity: Achievement['rarity']): Achievement[] {
    return this.achievements.filter(a => a.rarity === rarity)
  }

  /**
   * Obtém achievement por ID
   */
  getAchievementById(id: string): Achievement | undefined {
    return this.achievements.find(a => a.id === id)
  }

  /**
   * Obtém todos os achievements
   */
  getAllAchievements(): Achievement[] {
    return [...this.achievements]
  }
}