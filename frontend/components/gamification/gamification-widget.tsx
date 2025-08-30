'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { useGamification } from '@/lib/hooks/useGamification'
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown,
  Star,
  Flame,
  Target,
  Award,
  Crown,
  Zap,
  ChevronRight,
  Medal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface GamificationWidgetProps {
  compact?: boolean
  showLeaderboard?: boolean
  className?: string
}

export function GamificationWidget({ 
  compact = false, 
  showLeaderboard = true,
  className 
}: GamificationWidgetProps) {
  const {
    profile,
    leaderboard,
    userPosition,
    nextLevelProgress,
    isTopPerformer,
    rankChange,
    isLoading
  } = useGamification()

  if (isLoading || !profile) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Gamificação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getLeagueColor = (league: string) => {
    const colors = {
      'Diamante': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'Platina': 'bg-slate-100 text-slate-800 border-slate-300',
      'Ouro': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Prata': 'bg-gray-100 text-gray-800 border-gray-300',
      'Bronze': 'bg-amber-100 text-amber-800 border-amber-300',
      'Iniciante': 'bg-green-100 text-green-800 border-green-300'
    }
    return colors[league as keyof typeof colors] || 'bg-muted text-muted-foreground'
  }

  const getLeagueIcon = (league: string) => {
    switch (league) {
      case 'Diamante': return '💎'
      case 'Platina': return '🏆'
      case 'Ouro': return '🥇'
      case 'Prata': return '🥈'
      case 'Bronze': return '🥉'
      default: return '🌟'
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-4 w-4 text-yellow-500" />
      case 2: return <Medal className="h-4 w-4 text-gray-400" />
      case 3: return <Award className="h-4 w-4 text-amber-600" />
      default: return null
    }
  }

  if (compact) {
    return (
      <Card className={cn("border-l-4 border-l-primary", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-bold">
                  {profile.level}
                </div>
                {getRankIcon(profile.rank) && (
                  <div className="absolute -top-1 -right-1">
                    {getRankIcon(profile.rank)}
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-sm">Nível {profile.level}</p>
                <p className="text-xs text-muted-foreground">
                  #{profile.rank} • {profile.totalScore.toLocaleString()} pts
                </p>
              </div>
            </div>
            
            <Badge className={getLeagueColor(profile.league)} variant="outline">
              {getLeagueIcon(profile.league)} {profile.league}
            </Badge>
          </div>
          
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span>Próximo nível</span>
              <span>{Math.round(nextLevelProgress)}%</span>
            </div>
            <Progress value={nextLevelProgress} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Profile Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Sua Performance
            </div>
            <Link href="/leaderboard">
              <Button variant="ghost" size="sm" className="text-xs">
                Ver Ranking <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level and Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {profile.level}
                </div>
                {getRankIcon(profile.rank) && (
                  <div className="absolute -top-1 -right-1">
                    {getRankIcon(profile.rank)}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">Nível {profile.level}</h3>
                <p className="text-sm text-muted-foreground">
                  {profile.totalScore.toLocaleString()} pontos totais
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getLeagueColor(profile.league)} variant="outline">
                    {getLeagueIcon(profile.league)} {profile.league}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    #{profile.rank}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1">
                {rankChange > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : rankChange < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span className={cn(
                  "text-sm font-medium",
                  rankChange > 0 && "text-green-600",
                  rankChange < 0 && "text-red-600",
                  rankChange === 0 && "text-muted-foreground"
                )}>
                  {rankChange > 0 && '+'}
                  {rankChange}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">mudança</p>
            </div>
          </div>

          {/* XP Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso para Nível {profile.level + 1}</span>
              <span>{Math.round(nextLevelProgress)}%</span>
            </div>
            <Progress value={nextLevelProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {profile.xpProgress.current.toLocaleString()} / {profile.xpProgress.needed.toLocaleString()} XP
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-3 w-3 text-orange-500" />
                <span className="font-medium">{profile.streaks.current}</span>
              </div>
              <p className="text-xs text-muted-foreground">dias streak</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" />
                <span className="font-medium">{profile.streaks.perfectDays}</span>
              </div>
              <p className="text-xs text-muted-foreground">dias perfeitos</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Target className="h-3 w-3 text-blue-500" />
                <span className="font-medium">{profile.achievements.filter(a => a.unlockedAt).length}</span>
              </div>
              <p className="text-xs text-muted-foreground">achievements</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      {profile.recentAchievements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              Conquistas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profile.recentAchievements.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="text-lg">{achievement.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground">+{achievement.points} pontos</p>
                  </div>
                  <Badge className="text-xs">{achievement.rarity}</Badge>
                </div>
              ))}
            </div>
            <Link href="/achievements">
              <Button variant="outline" size="sm" className="w-full mt-3">
                Ver Todas as Conquistas
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Mini Leaderboard */}
      {showLeaderboard && leaderboard.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Top 5 da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry) => (
                <div key={entry.agentId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium w-6">#{entry.rank}</span>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={entry.avatar} />
                      <AvatarFallback className="text-xs">
                        {entry.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{entry.name.split(' ')[0]}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{entry.totalScore.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">pts</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/leaderboard">
              <Button variant="outline" size="sm" className="w-full mt-3">
                Ver Ranking Completo
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}