'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Achievement } from '@/lib/gamification/achievements'
import { 
  Lock, 
  CheckCircle, 
  Star, 
  Zap, 
  Trophy,
  Target,
  Clock,
  Heart,
  Gift,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AchievementCardProps {
  achievement: Achievement
  isUnlocked?: boolean
  onClick?: () => void
  showProgress?: boolean
  compact?: boolean
  className?: string
}

export function AchievementCard({
  achievement,
  isUnlocked = false,
  onClick,
  showProgress = true,
  compact = false,
  className
}: AchievementCardProps) {
  const getRarityConfig = () => {
    switch (achievement.rarity) {
      case 'legendary':
        return {
          color: 'from-purple-500 to-pink-500',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-200',
          bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
          badge: 'bg-purple-100 text-purple-800 border-purple-300'
        }
      case 'epic':
        return {
          color: 'from-blue-500 to-purple-500',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          bgColor: 'bg-gradient-to-br from-blue-50 to-purple-50',
          badge: 'bg-blue-100 text-blue-800 border-blue-300'
        }
      case 'rare':
        return {
          color: 'from-emerald-500 to-blue-500',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-200',
          bgColor: 'bg-gradient-to-br from-emerald-50 to-blue-50',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
        }
      default: // common
        return {
          color: 'from-gray-500 to-gray-600',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          bgColor: 'bg-gradient-to-br from-gray-50 to-gray-100',
          badge: 'bg-gray-100 text-gray-800 border-gray-300'
        }
    }
  }

  const getCategoryIcon = () => {
    switch (achievement.category) {
      case 'speed':
        return <Zap className="h-4 w-4" />
      case 'satisfaction':
        return <Heart className="h-4 w-4" />
      case 'volume':
        return <Target className="h-4 w-4" />
      case 'consistency':
        return <Clock className="h-4 w-4" />
      case 'quality':
        return <Star className="h-4 w-4" />
      case 'special':
        return <Gift className="h-4 w-4" />
      default:
        return <Trophy className="h-4 w-4" />
    }
  }

  const rarityConfig = getRarityConfig()
  const progress = achievement.progress || 0
  const isCompleted = isUnlocked || progress >= 100

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
          isCompleted ? rarityConfig.bgColor + " " + rarityConfig.borderColor : "bg-muted/30 border-muted",
          !isCompleted && "opacity-60",
          className
        )}
        onClick={onClick}
      >
        <div className="relative">
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
              isCompleted ? `bg-gradient-to-br ${rarityConfig.color} text-white` : "bg-muted text-muted-foreground"
            )}
          >
            {achievement.icon}
          </div>
          {isCompleted && (
            <CheckCircle className="absolute -top-1 -right-1 h-5 w-5 text-green-600 bg-white rounded-full" />
          )}
          {!isCompleted && achievement.secret && (
            <Lock className="absolute -top-1 -right-1 h-4 w-4 text-gray-500 bg-white rounded-full" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className={cn("font-medium", isCompleted ? rarityConfig.textColor : "text-muted-foreground")}>
              {achievement.title}
            </h4>
            <Badge className={cn("text-xs", isCompleted ? rarityConfig.badge : "bg-muted text-muted-foreground")}>
              {achievement.rarity}
            </Badge>
          </div>
          {!achievement.secret && showProgress && !isCompleted && (
            <div className="mt-1">
              <Progress value={progress} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}% concluído</p>
            </div>
          )}
          {achievement.secret && !isCompleted && (
            <div className="flex items-center gap-1 mt-1">
              <EyeOff className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Achievement secreto</p>
            </div>
          )}
        </div>
        
        <div className="text-right">
          <p className="font-medium text-primary">+{achievement.points}</p>
          <p className="text-xs text-muted-foreground">pontos</p>
        </div>
      </div>
    )
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isCompleted ? rarityConfig.bgColor + " " + rarityConfig.borderColor : "opacity-60",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-3xl",
                  isCompleted ? `bg-gradient-to-br ${rarityConfig.color} text-white shadow-lg` : "bg-muted text-muted-foreground"
                )}
              >
                {achievement.icon}
              </div>
              {isCompleted && (
                <CheckCircle className="absolute -top-1 -right-1 h-6 w-6 text-green-600 bg-white rounded-full" />
              )}
              {!isCompleted && achievement.secret && (
                <Lock className="absolute -top-1 -right-1 h-5 w-5 text-gray-500 bg-white rounded-full" />
              )}
            </div>
            
            <div>
              <CardTitle className={cn("text-lg", isCompleted ? rarityConfig.textColor : "text-muted-foreground")}>
                {achievement.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn("text-xs", isCompleted ? rarityConfig.badge : "bg-muted text-muted-foreground")}>
                  {getCategoryIcon()}
                  <span className="ml-1">{achievement.rarity}</span>
                </Badge>
                <Badge variant="outline" className="text-xs">
                  +{achievement.points} pts
                </Badge>
              </div>
            </div>
          </div>
          
          {isCompleted && achievement.unlockedAt && (
            <div className="text-right text-sm text-muted-foreground">
              <Eye className="h-4 w-4 inline mr-1" />
              {format(achievement.unlockedAt, "dd/MM/yyyy", { locale: ptBR })}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {!achievement.secret || isCompleted ? (
          <CardDescription className="text-sm">
            {achievement.description}
          </CardDescription>
        ) : (
          <CardDescription className="text-sm italic flex items-center gap-2">
            <EyeOff className="h-4 w-4" />
            Achievement secreto - complete para revelar
          </CardDescription>
        )}
        
        {!achievement.secret && showProgress && !isCompleted && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {isCompleted && (
          <div className="mt-4">
            <Badge className={cn("w-full justify-center py-2", rarityConfig.badge)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Achievement Desbloqueado!
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Achievement Grid Component
interface AchievementGridProps {
  achievements: Achievement[]
  onAchievementClick?: (achievement: Achievement) => void
  showProgress?: boolean
  compact?: boolean
  className?: string
}

export function AchievementGrid({
  achievements,
  onAchievementClick,
  showProgress = true,
  compact = false,
  className
}: AchievementGridProps) {
  if (achievements.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum achievement encontrado</p>
      </div>
    )
  }

  return (
    <div className={cn(
      compact 
        ? "space-y-2" 
        : "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
      className
    )}>
      {achievements.map((achievement) => (
        <AchievementCard
          key={achievement.id}
          achievement={achievement}
          isUnlocked={!!achievement.unlockedAt}
          onClick={() => onAchievementClick?.(achievement)}
          showProgress={showProgress}
          compact={compact}
        />
      ))}
    </div>
  )
}