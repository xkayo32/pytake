import React from 'react'
import { motion } from 'framer-motion'
import type { Icon } from '@/types/icons'

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: Icon;
  iconColor?: string;
  loading?: boolean;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor = 'text-blue-600',
  loading = false,
}) => {
  const getChangeColor = (type: string) => {
    switch (type) {
      case 'increase':
        return 'text-green-600 dark:text-green-400';
      case 'decrease':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-lg border border-border/50 p-6"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-3 bg-muted rounded w-20"></div>
            <div className="h-6 bg-muted rounded w-16"></div>
            <div className="h-3 bg-muted rounded w-12"></div>
          </div>
          <div className="h-10 w-10 bg-muted rounded-md"></div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className="bg-card rounded-lg border border-border/50 p-6 hover:border-border transition-colors duration-150"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-2">{title}</p>
          <p className="text-2xl font-medium text-foreground mb-1">{value}</p>
          {change && (
            <div className={`text-xs ${getChangeColor(change.type)} flex items-center space-x-1`}>
              {change.type === 'increase' && <span>↗</span>}
              {change.type === 'decrease' && <span>↘</span>}
              <span>{change.value}</span>
            </div>
          )}
        </div>
        <div className={`p-2 rounded-md bg-muted/50 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  )
}

export default MetricsCard