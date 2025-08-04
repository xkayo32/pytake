import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Icon } from '@/types/icons'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: Icon
  iconColor?: string
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-primary',
  trend = 'neutral',
  className
}: StatsCardProps) {
  const isPositive = trend === 'up'
  const isNegative = trend === 'down'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "bg-card rounded-xl border border-border/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300",
        "bg-gradient-to-br from-card via-card to-primary/5",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center",
          "border border-primary/20"
        )}>
          <Icon className={cn("h-6 w-6", iconColor)} />
        </div>
        {change !== undefined && (
          <div className={cn(
            "text-sm font-medium px-2.5 py-1 rounded-md",
            isPositive && "bg-green-500/10 text-green-600",
            isNegative && "bg-red-500/10 text-red-600",
            !isPositive && !isNegative && "bg-muted text-muted-foreground"
          )}>
            {isPositive && '+'}
            {change}%
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {changeLabel && (
          <p className="text-xs text-muted-foreground mt-1">{changeLabel}</p>
        )}
      </div>
    </motion.div>
  )
}