'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuthContext } from '@/contexts/auth-context'
import { useGamification } from '@/lib/hooks/useGamification'
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Crown,
  Flame,
  Zap,
  Star,
  Target,
  Clock,
  Users,
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LeaderboardPage() {
  const { user } = useAuthContext()
  const {
    profile,
    leaderboard,
    gameStats,
    sameLeagueAgents,
    userPosition,
    isLoading,
    error,
    refreshData
  } = useGamification({ includeLeaderboard: true, leaderboardSize: 50 })

  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'allTime'>('weekly')
  const [selectedCategory, setSelectedCategory] = useState<'overall' | 'satisfaction' | 'speed' | 'consistency'>('overall')

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const getTrendIcon = (direction: string, change: number) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
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
      case 'Diamante':
        return '💎'
      case 'Platina':
        return '🏆'
      case 'Ouro':
        return '🥇'
      case 'Prata':
        return '🥈'
      case 'Bronze':
        return '🥉'
      default:
        return '🌟'
    }
  }

  const userEntry = leaderboard.find(entry => entry.agentId === user?.id)

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Ranking de Agentes
            </h1>
            <p className="text-muted-foreground">
              Competição saudável para motivar a excelência no atendimento
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* User Position Card */}
        {userEntry && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Sua Posição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getRankIcon(userEntry.rank)}
                    <div>
                      <p className="font-medium">{userEntry.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {userEntry.totalScore.toLocaleString()} pontos
                      </p>
                    </div>
                  </div>
                  <Badge className={getLeagueColor(userEntry.league)}>
                    {getLeagueIcon(userEntry.league)} {userEntry.league}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {getTrendIcon(userEntry.trendDirection, userEntry.change)}
                    <span className="text-sm">
                      {userEntry.change > 0 && '+'}
                      {userEntry.change}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {userEntry.todayPoints} pts hoje
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Agentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                {gameStats.totalAgents}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Competindo ativamente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pontuação Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Star className="h-5 w-5 text-muted-foreground" />
                {Math.round(gameStats.averageScore).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Benchmark da equipe
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Maior Pontuação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                {gameStats.topScore.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Recorde atual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Nível Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-muted-foreground" />
                {Math.round(gameStats.averageLevel)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Experiência da equipe
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Leaderboard */}
        <Tabs value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="overall">Geral</TabsTrigger>
              <TabsTrigger value="satisfaction">Satisfação</TabsTrigger>
              <TabsTrigger value="speed">Velocidade</TabsTrigger>
              <TabsTrigger value="consistency">Consistência</TabsTrigger>
            </TabsList>

            {/* Period Filter */}
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly', 'allTime'] as const).map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period === 'daily' && 'Hoje'}
                  {period === 'weekly' && 'Semana'}
                  {period === 'monthly' && 'Mês'}
                  {period === 'allTime' && 'Todos'}
                </Button>
              ))}
            </div>
          </div>

          <TabsContent value={selectedCategory} className="space-y-6">
            {/* Top 3 Podium */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🏆 Pódio</CardTitle>
                <CardDescription>
                  Os 3 melhores agentes da {selectedPeriod === 'daily' ? 'hoje' : 
                    selectedPeriod === 'weekly' ? 'semana' : 
                    selectedPeriod === 'monthly' ? 'mês' : 'temporada'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {leaderboard.slice(0, 3).map((entry, index) => (
                    <div
                      key={entry.agentId}
                      className={cn(
                        "text-center p-4 rounded-lg border",
                        index === 0 && "bg-yellow-50 border-yellow-200",
                        index === 1 && "bg-gray-50 border-gray-200", 
                        index === 2 && "bg-amber-50 border-amber-200"
                      )}
                    >
                      <div className="flex justify-center mb-2">
                        {getRankIcon(entry.rank)}
                      </div>
                      <Avatar className="h-16 w-16 mx-auto mb-3">
                        <AvatarImage src={entry.avatar} />
                        <AvatarFallback>
                          {entry.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-medium">{entry.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {entry.totalScore.toLocaleString()} pts
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-2">
                        <Flame className="h-3 w-3 text-orange-500" />
                        <span className="text-xs">{entry.streakDays} dias</span>
                      </div>
                      <Badge 
                        className={cn("mt-2", getLeagueColor(entry.league))}
                        variant="outline"
                      >
                        {getLeagueIcon(entry.league)} {entry.league}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Full Ranking Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Ranking Completo
                </CardTitle>
                <CardDescription>
                  Posições de todos os agentes ordenados por pontuação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.agentId}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        entry.agentId === user?.id && "bg-primary/5 border-primary/20",
                        entry.rank <= 3 && "bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center justify-center w-8">
                          {entry.rank <= 3 ? (
                            getRankIcon(entry.rank)
                          ) : (
                            <span className="text-sm font-medium text-muted-foreground">
                              #{entry.rank}
                            </span>
                          )}
                        </div>
                        
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={entry.avatar} />
                          <AvatarFallback>
                            {entry.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{entry.name}</p>
                            {entry.agentId === user?.id && (
                              <Badge variant="secondary" className="text-xs">Você</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Nível {entry.level}</span>
                            <div className="flex items-center gap-1">
                              <Flame className="h-3 w-3 text-orange-500" />
                              <span>{entry.streakDays} dias</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge 
                          className={getLeagueColor(entry.league)}
                          variant="outline"
                        >
                          {getLeagueIcon(entry.league)} {entry.league}
                        </Badge>
                        
                        <div className="text-right">
                          <p className="font-medium">
                            {entry.totalScore.toLocaleString()}
                          </p>
                          <div className="flex items-center gap-1 justify-end">
                            {getTrendIcon(entry.trendDirection, entry.change)}
                            <span className="text-xs text-muted-foreground">
                              {entry.change > 0 && '+'}
                              {entry.change}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">
                            +{entry.todayPoints}
                          </p>
                          <p className="text-xs text-muted-foreground">hoje</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}