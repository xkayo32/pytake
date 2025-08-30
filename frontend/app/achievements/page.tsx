'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuthContext } from '@/contexts/auth-context'
import { useGamification } from '@/lib/hooks/useGamification'
import { AchievementGrid } from '@/components/gamification/achievement-card'
import { Achievement } from '@/lib/gamification/achievements'
import { 
  Trophy, 
  Award, 
  Star,
  Zap,
  Target,
  Clock,
  Heart,
  Gift,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  Lock,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AchievementsPage() {
  const { user } = useAuthContext()
  const {
    profile,
    achievements,
    unlockedAchievements,
    progressingAchievements,
    achievementSystem,
    isLoading,
    error,
    refreshData
  } = useGamification()

  const [selectedCategory, setSelectedCategory] = useState<'all' | Achievement['category']>('all')
  const [selectedRarity, setSelectedRarity] = useState<'all' | Achievement['rarity']>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyUnlocked, setShowOnlyUnlocked] = useState(false)

  // Filter achievements
  const filteredAchievements = useMemo(() => {
    let filtered = achievements

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory)
    }

    // Rarity filter
    if (selectedRarity !== 'all') {
      filtered = filtered.filter(a => a.rarity === selectedRarity)
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Unlocked filter
    if (showOnlyUnlocked) {
      filtered = filtered.filter(a => a.unlockedAt)
    }

    return filtered
  }, [achievements, selectedCategory, selectedRarity, searchTerm, showOnlyUnlocked])

  // Group achievements by category for stats
  const achievementStats = useMemo(() => {
    const categories: Achievement['category'][] = ['speed', 'satisfaction', 'volume', 'consistency', 'quality', 'special']
    
    return categories.map(category => {
      const categoryAchievements = achievements.filter(a => a.category === category)
      const unlockedCount = categoryAchievements.filter(a => a.unlockedAt).length
      const totalPoints = categoryAchievements.filter(a => a.unlockedAt).reduce((sum, a) => sum + a.points, 0)
      
      return {
        category,
        total: categoryAchievements.length,
        unlocked: unlockedCount,
        progress: categoryAchievements.length > 0 ? (unlockedCount / categoryAchievements.length) * 100 : 0,
        points: totalPoints
      }
    })
  }, [achievements])

  const getCategoryIcon = (category: Achievement['category']) => {
    switch (category) {
      case 'speed': return <Zap className="h-4 w-4" />
      case 'satisfaction': return <Heart className="h-4 w-4" />
      case 'volume': return <Target className="h-4 w-4" />
      case 'consistency': return <Clock className="h-4 w-4" />
      case 'quality': return <Star className="h-4 w-4" />
      case 'special': return <Gift className="h-4 w-4" />
      default: return <Trophy className="h-4 w-4" />
    }
  }

  const getCategoryName = (category: Achievement['category']) => {
    const names = {
      speed: 'Velocidade',
      satisfaction: 'Satisfação',
      volume: 'Volume',
      consistency: 'Consistência',
      quality: 'Qualidade',
      special: 'Especiais'
    }
    return names[category]
  }

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'legendary': return 'text-purple-600'
      case 'epic': return 'text-blue-600'
      case 'rare': return 'text-emerald-600'
      default: return 'text-gray-600'
    }
  }

  const totalAchievements = achievements.length
  const totalUnlocked = unlockedAchievements.length
  const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0)
  const completionRate = totalAchievements > 0 ? (totalUnlocked / totalAchievements) * 100 : 0

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Conquistas
            </h1>
            <p className="text-muted-foreground">
              Acompanhe seu progresso e desbloqueie novos achievements
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conquistas Desbloqueadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {totalUnlocked} / {totalAchievements}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {completionRate.toFixed(1)}% completo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pontos de Achievement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                {totalPoints.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pontos acumulados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Progresso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                {progressingAchievements.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Achievements ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Secrets Restantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Lock className="h-5 w-5 text-gray-500" />
                {achievements.filter(a => a.secret && !a.unlockedAt).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Para descobrir
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Category Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progresso por Categoria</CardTitle>
            <CardDescription>
              Veja seu progresso em cada tipo de achievement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievementStats.map((stat) => (
                <div key={stat.category} className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(stat.category)}
                      <span className="font-medium">{getCategoryName(stat.category)}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {stat.unlocked}/{stat.total}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${stat.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{Math.round(stat.progress)}% completo</span>
                      <span>+{stat.points} pts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Explorar Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar achievements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={showOnlyUnlocked ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOnlyUnlocked(!showOnlyUnlocked)}
                >
                  <Eye className="mr-2 h-3 w-3" />
                  Apenas Desbloqueados
                </Button>
                
                {/* Category Filter */}
                <div className="flex gap-1">
                  <Button
                    variant={selectedCategory === 'all' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                  >
                    Todas
                  </Button>
                  {(['speed', 'satisfaction', 'volume', 'consistency', 'quality', 'special'] as const).map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="hidden sm:inline-flex"
                    >
                      {getCategoryIcon(category)}
                      <span className="ml-1 hidden lg:inline">{getCategoryName(category)}</span>
                    </Button>
                  ))}
                </div>

                {/* Rarity Filter */}
                <div className="flex gap-1">
                  <Button
                    variant={selectedRarity === 'all' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRarity('all')}
                  >
                    Todas
                  </Button>
                  {(['common', 'rare', 'epic', 'legendary'] as const).map((rarity) => (
                    <Button
                      key={rarity}
                      variant={selectedRarity === rarity ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedRarity(rarity)}
                      className={cn("capitalize", getRarityColor(rarity))}
                    >
                      {rarity}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {filteredAchievements.length} Achievement{filteredAchievements.length !== 1 ? 's' : ''}
              {searchTerm && ` para "${searchTerm}"`}
            </h2>
          </div>
          
          <AchievementGrid
            achievements={filteredAchievements}
            onAchievementClick={(achievement) => {
              // Could open a modal with more details
              console.log('Achievement clicked:', achievement)
            }}
            showProgress={!showOnlyUnlocked}
          />
        </div>
      </div>
    </AppLayout>
  )
}