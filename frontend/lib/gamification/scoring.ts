/**
 * Sistema de Pontuação para Gamificação de Agentes
 * 
 * Este arquivo contém toda a lógica de cálculo de pontos baseada 
 * nas métricas de performance dos agentes
 */

export interface AgentMetrics {
  // Métricas básicas
  conversationsHandled: number
  messagesResponded: number
  avgResponseTime: number // em segundos
  satisfaction: number // 1-5
  hoursWorked: number
  
  // Métricas de qualidade
  resolutionRate: number // 0-1
  slaCompliance: number // 0-1
  customerRetention: number // 0-1
  
  // Métricas de eficiência
  transferRate: number // 0-1 (menor é melhor)
  abandonmentRate: number // 0-1 (menor é melhor)
  
  // Dados temporais
  currentStreak: number // dias consecutivos com boa performance
  timestamp: Date
}

export interface ScoringWeights {
  conversations: number
  satisfaction: number
  responseTime: number
  resolution: number
  slaCompliance: number
  quality: number
  efficiency: number
  consistency: number
}

export interface ScoreBreakdown {
  totalScore: number
  categoryScores: {
    conversations: number
    satisfaction: number
    responseTime: number
    resolution: number
    slaCompliance: number
    quality: number
    efficiency: number
    consistency: number
  }
  bonuses: {
    streak: number
    perfectDay: number
    overtime: number
    specialAchievement: number
  }
  multipliers: {
    peak: number
    consistency: number
    teamwork: number
  }
}

export class GamificationScoring {
  private defaultWeights: ScoringWeights = {
    conversations: 0.20,     // 20% - Volume de atendimento
    satisfaction: 0.25,      // 25% - Satisfação do cliente
    responseTime: 0.15,      // 15% - Velocidade de resposta
    resolution: 0.15,        // 15% - Taxa de resolução
    slaCompliance: 0.10,     // 10% - Cumprimento de SLA
    quality: 0.10,           // 10% - Qualidade geral
    efficiency: 0.03,        // 3% - Eficiência
    consistency: 0.02        // 2% - Consistência
  }

  constructor(private weights: ScoringWeights = this.defaultWeights) {}

  /**
   * Calcula a pontuação total de um agente baseado em suas métricas
   */
  calculateScore(metrics: AgentMetrics): ScoreBreakdown {
    const categoryScores = this.calculateCategoryScores(metrics)
    const bonuses = this.calculateBonuses(metrics)
    const multipliers = this.calculateMultipliers(metrics)
    
    const baseScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0)
    const bonusScore = Object.values(bonuses).reduce((sum, bonus) => sum + bonus, 0)
    const multiplierFactor = Object.values(multipliers).reduce((mult, factor) => mult * factor, 1)
    
    const totalScore = Math.round((baseScore + bonusScore) * multiplierFactor)
    
    return {
      totalScore,
      categoryScores,
      bonuses,
      multipliers
    }
  }

  /**
   * Calcula pontos por categoria
   */
  private calculateCategoryScores(metrics: AgentMetrics): ScoreBreakdown['categoryScores'] {
    return {
      conversations: this.scoreConversations(metrics.conversationsHandled) * this.weights.conversations * 1000,
      satisfaction: this.scoreSatisfaction(metrics.satisfaction) * this.weights.satisfaction * 1000,
      responseTime: this.scoreResponseTime(metrics.avgResponseTime) * this.weights.responseTime * 1000,
      resolution: this.scoreResolution(metrics.resolutionRate) * this.weights.resolution * 1000,
      slaCompliance: this.scoreSlaCompliance(metrics.slaCompliance) * this.weights.slaCompliance * 1000,
      quality: this.scoreQuality(metrics) * this.weights.quality * 1000,
      efficiency: this.scoreEfficiency(metrics) * this.weights.efficiency * 1000,
      consistency: this.scoreConsistency(metrics.currentStreak) * this.weights.consistency * 1000
    }
  }

  /**
   * Pontuação baseada no número de conversas
   * Curva logarítmica para evitar apenas volume
   */
  private scoreConversations(conversations: number): number {
    const target = 20 // Conversas alvo por dia
    const ratio = conversations / target
    
    if (ratio <= 0.5) return 0.3 // Muito abaixo
    if (ratio <= 0.8) return 0.6 // Abaixo
    if (ratio <= 1.0) return 1.0 // Na meta
    if (ratio <= 1.3) return 0.95 // Acima (leve penalidade por possível pressa)
    return 0.8 // Muito acima (possível perda de qualidade)
  }

  /**
   * Pontuação baseada na satisfação do cliente
   * Peso alto pois é métrica crítica
   */
  private scoreSatisfaction(satisfaction: number): number {
    if (satisfaction >= 4.8) return 1.0
    if (satisfaction >= 4.5) return 0.9
    if (satisfaction >= 4.0) return 0.7
    if (satisfaction >= 3.5) return 0.5
    if (satisfaction >= 3.0) return 0.3
    return 0.1
  }

  /**
   * Pontuação baseada no tempo de resposta
   * Curva inversa - menor tempo = maior pontuação
   */
  private scoreResponseTime(responseTime: number): number {
    const targetTime = 60 // 1 minuto alvo
    const excellentTime = 30 // 30 segundos excelente
    
    if (responseTime <= excellentTime) return 1.0
    if (responseTime <= targetTime) return 0.9
    if (responseTime <= 90) return 0.7
    if (responseTime <= 120) return 0.5
    if (responseTime <= 180) return 0.3
    return 0.1
  }

  /**
   * Pontuação baseada na taxa de resolução
   */
  private scoreResolution(resolutionRate: number): number {
    if (resolutionRate >= 0.95) return 1.0
    if (resolutionRate >= 0.90) return 0.9
    if (resolutionRate >= 0.85) return 0.8
    if (resolutionRate >= 0.80) return 0.6
    if (resolutionRate >= 0.70) return 0.4
    return 0.2
  }

  /**
   * Pontuação baseada na compliance de SLA
   */
  private scoreSlaCompliance(slaCompliance: number): number {
    if (slaCompliance >= 0.98) return 1.0
    if (slaCompliance >= 0.95) return 0.9
    if (slaCompliance >= 0.90) return 0.8
    if (slaCompliance >= 0.85) return 0.6
    if (slaCompliance >= 0.80) return 0.4
    return 0.2
  }

  /**
   * Pontuação de qualidade geral (métrica composta)
   */
  private scoreQuality(metrics: AgentMetrics): number {
    const retentionScore = metrics.customerRetention
    const transferPenalty = 1 - (metrics.transferRate * 0.5) // Penalidade por muitas transferências
    const abandonmentPenalty = 1 - (metrics.abandonmentRate * 0.8) // Penalidade forte por abandonos
    
    return Math.max(0, (retentionScore + transferPenalty + abandonmentPenalty) / 3)
  }

  /**
   * Pontuação de eficiência
   */
  private scoreEfficiency(metrics: AgentMetrics): number {
    const messagesPerHour = metrics.messagesResponded / Math.max(metrics.hoursWorked, 0.1)
    const conversationsPerHour = metrics.conversationsHandled / Math.max(metrics.hoursWorked, 0.1)
    
    // Normalização baseada em benchmarks
    const messageEfficiency = Math.min(messagesPerHour / 50, 1) // 50 mensagens/hora benchmark
    const conversationEfficiency = Math.min(conversationsPerHour / 3, 1) // 3 conversas/hora benchmark
    
    return (messageEfficiency + conversationEfficiency) / 2
  }

  /**
   * Pontuação de consistência baseada em streaks
   */
  private scoreConsistency(currentStreak: number): number {
    if (currentStreak >= 30) return 1.0 // 1 mês consistente
    if (currentStreak >= 14) return 0.9 // 2 semanas
    if (currentStreak >= 7) return 0.8  // 1 semana
    if (currentStreak >= 3) return 0.6  // 3 dias
    if (currentStreak >= 1) return 0.4  // 1 dia
    return 0.2
  }

  /**
   * Calcula bônus especiais
   */
  private calculateBonuses(metrics: AgentMetrics): ScoreBreakdown['bonuses'] {
    return {
      streak: this.calculateStreakBonus(metrics.currentStreak),
      perfectDay: this.calculatePerfectDayBonus(metrics),
      overtime: this.calculateOvertimeBonus(metrics.hoursWorked),
      specialAchievement: 0 // Implementar achievements específicos
    }
  }

  private calculateStreakBonus(streak: number): number {
    if (streak >= 30) return 500 // Bônus mensal
    if (streak >= 14) return 300 // Bônus quinzenal
    if (streak >= 7) return 150  // Bônus semanal
    if (streak >= 3) return 50   // Bônus pequeno
    return 0
  }

  private calculatePerfectDayBonus(metrics: AgentMetrics): number {
    // Dia perfeito: alta satisfação + bom tempo + alta resolução
    const isPerfect = metrics.satisfaction >= 4.8 && 
                     metrics.avgResponseTime <= 45 && 
                     metrics.resolutionRate >= 0.95 &&
                     metrics.slaCompliance >= 0.98
    return isPerfect ? 300 : 0
  }

  private calculateOvertimeBonus(hoursWorked: number): number {
    const standardHours = 8
    const overtimeHours = Math.max(0, hoursWorked - standardHours)
    return Math.min(overtimeHours * 25, 200) // Máximo 200 pontos por overtime
  }

  /**
   * Calcula multiplicadores
   */
  private calculateMultipliers(metrics: AgentMetrics): ScoreBreakdown['multipliers'] {
    return {
      peak: this.getPeakHourMultiplier(metrics.timestamp),
      consistency: this.getConsistencyMultiplier(metrics.currentStreak),
      teamwork: 1.0 // Implementar baseado em colaboração
    }
  }

  private getPeakHourMultiplier(timestamp: Date): number {
    const hour = timestamp.getHours()
    const day = timestamp.getDay()
    
    // Horário comercial em dias úteis
    if (day >= 1 && day <= 5 && hour >= 9 && hour <= 17) {
      return 1.1 // 10% bônus
    }
    
    // Horário noturno ou fins de semana
    if ((hour >= 19 && hour <= 22) || day === 0 || day === 6) {
      return 1.15 // 15% bônus
    }
    
    return 1.0
  }

  private getConsistencyMultiplier(streak: number): number {
    if (streak >= 30) return 1.2  // 20% bônus por consistência mensal
    if (streak >= 14) return 1.15 // 15% bônus
    if (streak >= 7) return 1.1   // 10% bônus
    return 1.0
  }

  /**
   * Calcula nível baseado na pontuação total
   */
  calculateLevel(totalScore: number): number {
    // Sistema exponencial: cada nível requer mais pontos
    return Math.floor(Math.sqrt(totalScore / 1000)) + 1
  }

  /**
   * Calcula XP necessário para o próximo nível
   */
  calculateXpToNextLevel(totalScore: number): { current: number; needed: number; progress: number } {
    const currentLevel = this.calculateLevel(totalScore)
    const currentLevelXp = Math.pow(currentLevel - 1, 2) * 1000
    const nextLevelXp = Math.pow(currentLevel, 2) * 1000
    
    return {
      current: totalScore - currentLevelXp,
      needed: nextLevelXp - currentLevelXp,
      progress: ((totalScore - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    }
  }

  /**
   * Determina a liga baseada no nível
   */
  calculateLeague(level: number): string {
    if (level >= 50) return 'Diamante'
    if (level >= 40) return 'Platina'
    if (level >= 30) return 'Ouro'
    if (level >= 20) return 'Prata'
    if (level >= 10) return 'Bronze'
    return 'Iniciante'
  }
}