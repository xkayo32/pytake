'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthContext } from '@/contexts/auth-context'
import { useAgentMetrics } from './useAgentMetrics'
import { GamificationScoring, AgentMetrics, ScoreBreakdown } from '@/lib/gamification/scoring'
import { AchievementSystem, Achievement, AgentMetricsForAchievements } from '@/lib/gamification/achievements'

export interface GamificationProfile {
  agentId: string
  totalScore: number
  level: number
  league: string
  rank: number
  xpProgress: {
    current: number
    needed: number
    progress: number
  }
  scoreBreakdown: ScoreBreakdown
  achievements: Achievement[]
  recentAchievements: Achievement[]
  badges: string[]
  streaks: {
    current: number
    longest: number
    perfectDays: number
  }
  seasonStats: {
    position: number
    totalPlayers: number
    percentile: number
    pointsThisSeason: number
  }
}

export interface LeaderboardEntry {
  agentId: string
  name: string
  avatar?: string
  totalScore: number
  level: number
  league: string
  rank: number
  change: number // Mudança de posição (+1, -1, 0)
  trendDirection: 'up' | 'down' | 'stable'
  todayPoints: number
  streakDays: number
}

export interface GameStats {
  totalAgents: number
  averageScore: number
  topScore: number
  averageLevel: number
  achievementsUnlocked: number
  totalAchievements: number
}

interface UseGamificationOptions {
  refreshInterval?: number
  includeLeaderboard?: boolean
  leaderboardSize?: number
}

export function useGamification(options: UseGamificationOptions = {}) {
  const { user, isAuthenticated } = useAuthContext()
  const { 
    refreshInterval = 60000, 
    includeLeaderboard = true,
    leaderboardSize = 50 
  } = options

  const {
    metrics: agentMetrics,
    isLoading: metricsLoading,
    error: metricsError
  } = useAgentMetrics()

  const [profile, setProfile] = useState<GamificationProfile | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [gameStats, setGameStats] = useState<GameStats>({
    totalAgents: 0,
    averageScore: 0,
    topScore: 0,
    averageLevel: 0,
    achievementsUnlocked: 0,
    totalAchievements: 0
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize gamification systems
  const scoringSystem = useMemo(() => new GamificationScoring(), [])
  const achievementSystem = useMemo(() => new AchievementSystem(), [])

  // Convert agent metrics to gamification metrics
  const convertToGamificationMetrics = useCallback((metrics: any): AgentMetrics => {
    return {
      conversationsHandled: metrics.todayStats?.conversationsHandled || 0,
      messagesResponded: metrics.todayStats?.messagesResponded || 0,
      avgResponseTime: metrics.todayStats?.avgResponseTime || 0,
      satisfaction: metrics.todayStats?.satisfaction || 0,
      hoursWorked: metrics.todayStats?.hoursWorked || 0,
      resolutionRate: metrics.weekStats?.resolutionRate || 0,
      slaCompliance: metrics.weekStats?.avgSatisfaction || 0,
      customerRetention: metrics.weekStats?.customerRetention || 0,
      transferRate: 0.05, // Mock data
      abandonmentRate: 0.02, // Mock data
      currentStreak: metrics.todayStats?.currentStreak || 0,
      timestamp: new Date()
    }
  }, [])

  // Convert metrics for achievements system
  const convertToAchievementMetrics = useCallback((metrics: any, profile: GamificationProfile | null): AgentMetricsForAchievements => {
    return {
      conversationsHandled: metrics.todayStats?.conversationsHandled || 0,
      messagesResponded: metrics.todayStats?.messagesResponded || 0,
      avgResponseTime: metrics.todayStats?.avgResponseTime || 0,
      satisfaction: metrics.todayStats?.satisfaction || 0,
      hoursWorked: metrics.todayStats?.hoursWorked || 0,
      resolutionRate: metrics.weekStats?.resolutionRate || 0,
      slaCompliance: metrics.weekStats?.avgSatisfaction || 0,
      customerRetention: metrics.weekStats?.customerRetention || 0,
      currentStreak: metrics.todayStats?.currentStreak || 0,
      longestStreak: profile?.streaks.longest || 0,
      perfectDays: profile?.streaks.perfectDays || 0,
      totalConversations: metrics.monthStats?.totalConversations || 0,
      totalMessages: metrics.monthStats?.totalMessages || 0,
      totalHours: metrics.monthStats?.totalHours || 0,
      rankPosition: profile?.rank || 0,
      teamSize: gameStats.totalAgents,
      overtimeHours: Math.max(0, (metrics.todayStats?.hoursWorked || 0) - 8),
      weekendWork: 0, // Mock data
      nightShiftHours: 0, // Mock data
      mentoringSessions: 0 // Mock data
    }
  }, [gameStats.totalAgents])

  // Fetch gamification data from API
  const fetchGamificationData = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return

    try {
      setError(null)
      
      // In a real implementation, this would be API calls
      const response = await fetch(`/api/v1/gamification/profile/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      }).catch(() => null)

      let profileData: GamificationProfile | null = null

      if (response?.ok) {
        profileData = await response.json()
      } else {
        // Generate mock profile from agent metrics
        if (agentMetrics) {
          const gamificationMetrics = convertToGamificationMetrics(agentMetrics)
          const scoreBreakdown = scoringSystem.calculateScore(gamificationMetrics)
          const level = scoringSystem.calculateLevel(scoreBreakdown.totalScore)
          const league = scoringSystem.calculateLeague(level)
          const xpProgress = scoringSystem.calculateXpToNextLevel(scoreBreakdown.totalScore)

          profileData = {
            agentId: user.id,
            totalScore: scoreBreakdown.totalScore,
            level,
            league,
            rank: Math.floor(Math.random() * 20) + 1,
            xpProgress,
            scoreBreakdown,
            achievements: [],
            recentAchievements: [],
            badges: [],
            streaks: {
              current: agentMetrics.todayStats?.currentStreak || 0,
              longest: Math.max(agentMetrics.todayStats?.currentStreak || 0, Math.floor(Math.random() * 50) + 10),
              perfectDays: Math.floor(Math.random() * 15) + 2
            },
            seasonStats: {
              position: Math.floor(Math.random() * 20) + 1,
              totalPlayers: 45,
              percentile: 85 - Math.floor(Math.random() * 30),
              pointsThisSeason: scoreBreakdown.totalScore
            }
          }

          // Check achievements
          const achievementMetrics = convertToAchievementMetrics(agentMetrics, profileData)
          const allAchievements = achievementSystem.calculateProgress(achievementMetrics, [])
          const unlockedAchievements = achievementSystem.checkAchievements(achievementMetrics, [])
          
          profileData.achievements = allAchievements
          profileData.recentAchievements = unlockedAchievements.slice(0, 3)
        }
      }

      setProfile(profileData)
    } catch (error: any) {
      console.error('Error fetching gamification data:', error)
      setError(`Erro ao carregar dados de gamificação: ${error.message}`)
    }
  }, [isAuthenticated, user?.id, agentMetrics, scoringSystem, achievementSystem, convertToGamificationMetrics, convertToAchievementMetrics])

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    if (!includeLeaderboard || !isAuthenticated) return

    try {
      const response = await fetch(`/api/v1/gamification/leaderboard?limit=${leaderboardSize}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      }).catch(() => null)

      if (response?.ok) {
        const data = await response.json()
        setLeaderboard(data)
      } else {
        // Generate mock leaderboard
        const mockAgents = [
          { id: '1', name: 'Maria Silva', avatar: '' },
          { id: '2', name: 'João Santos', avatar: '' },
          { id: '3', name: 'Ana Costa', avatar: '' },
          { id: '4', name: 'Pedro Oliveira', avatar: '' },
          { id: '5', name: 'Carlos Lima', avatar: '' },
          { id: '6', name: 'Fernanda Souza', avatar: '' },
          { id: '7', name: 'Roberto Alves', avatar: '' },
          { id: '8', name: 'Juliana Pereira', avatar: '' },
          { id: '9', name: 'Diego Ferreira', avatar: '' },
          { id: '10', name: 'Larissa Mendes', avatar: '' }
        ]

        const mockLeaderboard = mockAgents.map((agent, index) => ({
          agentId: agent.id,
          name: agent.name,
          avatar: agent.avatar,
          totalScore: 15000 - (index * 800) + Math.floor(Math.random() * 400),
          level: Math.max(1, 45 - (index * 4) + Math.floor(Math.random() * 3)),
          league: scoringSystem.calculateLeague(Math.max(1, 45 - (index * 4))),
          rank: index + 1,
          change: [-2, -1, 0, 1, 2][Math.floor(Math.random() * 5)],
          trendDirection: (['up', 'down', 'stable'] as const)[Math.floor(Math.random() * 3)],
          todayPoints: Math.floor(Math.random() * 800) + 200,
          streakDays: Math.floor(Math.random() * 30) + 1
        }))

        setLeaderboard(mockLeaderboard)
        
        // Update game stats
        setGameStats({
          totalAgents: mockLeaderboard.length,
          averageScore: mockLeaderboard.reduce((sum, entry) => sum + entry.totalScore, 0) / mockLeaderboard.length,
          topScore: Math.max(...mockLeaderboard.map(entry => entry.totalScore)),
          averageLevel: mockLeaderboard.reduce((sum, entry) => sum + entry.level, 0) / mockLeaderboard.length,
          achievementsUnlocked: Math.floor(Math.random() * 50) + 120,
          totalAchievements: achievementSystem.getAllAchievements().length
        })
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    }
  }, [includeLeaderboard, isAuthenticated, leaderboardSize, scoringSystem, achievementSystem])

  // Calculate new achievements
  const checkNewAchievements = useCallback(async () => {
    if (!profile || !agentMetrics) return []

    const achievementMetrics = convertToAchievementMetrics(agentMetrics, profile)
    const newAchievements = achievementSystem.checkAchievements(achievementMetrics, [])
    
    // Filter out already unlocked achievements
    const existingAchievementIds = profile.achievements
      .filter(a => a.unlockedAt)
      .map(a => a.id)
    
    return newAchievements.filter(achievement => 
      !existingAchievementIds.includes(achievement.id)
    )
  }, [profile, agentMetrics, achievementSystem, convertToAchievementMetrics])

  // Award achievement
  const awardAchievement = useCallback(async (achievementId: string) => {
    if (!isAuthenticated || !user?.id) return false

    try {
      const response = await fetch(`/api/v1/gamification/achievements/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          agentId: user.id,
          achievementId
        })
      })

      if (response.ok) {
        // Refresh profile data
        fetchGamificationData()
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error awarding achievement:', error)
      return false
    }
  }, [isAuthenticated, user?.id, fetchGamificationData])

  // Update score manually (for testing)
  const updateScore = useCallback(async (additionalPoints: number) => {
    if (!profile) return

    setProfile(prev => {
      if (!prev) return null
      
      const newTotalScore = prev.totalScore + additionalPoints
      const newLevel = scoringSystem.calculateLevel(newTotalScore)
      const newLeague = scoringSystem.calculateLeague(newLevel)
      const newXpProgress = scoringSystem.calculateXpToNextLevel(newTotalScore)

      return {
        ...prev,
        totalScore: newTotalScore,
        level: newLevel,
        league: newLeague,
        xpProgress: newXpProgress
      }
    })
  }, [profile, scoringSystem])

  // Initial load
  useEffect(() => {
    if (isAuthenticated && user?.id && !metricsLoading && agentMetrics) {
      setIsLoading(true)
      Promise.all([
        fetchGamificationData(),
        fetchLeaderboard()
      ]).finally(() => {
        setIsLoading(false)
      })
    }
  }, [isAuthenticated, user?.id, metricsLoading, agentMetrics, fetchGamificationData, fetchLeaderboard])

  // Periodic refresh
  useEffect(() => {
    if (!isAuthenticated || refreshInterval <= 0) return

    const interval = setInterval(() => {
      fetchGamificationData()
      fetchLeaderboard()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [isAuthenticated, refreshInterval, fetchGamificationData, fetchLeaderboard])

  return {
    // Data
    profile,
    leaderboard,
    gameStats,
    
    // State
    isLoading: isLoading || metricsLoading,
    error: error || metricsError,
    
    // Actions
    refreshData: () => Promise.all([fetchGamificationData(), fetchLeaderboard()]),
    checkNewAchievements,
    awardAchievement,
    updateScore,
    
    // Systems (for advanced usage)
    scoringSystem,
    achievementSystem,
    
    // Computed values
    userPosition: profile?.rank || 0,
    nextLevelProgress: profile?.xpProgress.progress || 0,
    isTopPerformer: (profile?.rank || Infinity) <= 3,
    achievements: profile?.achievements || [],
    unlockedAchievements: profile?.achievements.filter(a => a.unlockedAt) || [],
    progressingAchievements: profile?.achievements.filter(a => !a.unlockedAt && (a.progress || 0) > 0) || [],
    
    // League standings
    sameLeagueAgents: leaderboard.filter(entry => 
      profile ? entry.league === profile.league : false
    ),
    
    // Performance indicators
    isImproving: leaderboard.find(entry => entry.agentId === user?.id)?.trendDirection === 'up',
    rankChange: leaderboard.find(entry => entry.agentId === user?.id)?.change || 0
  }
}