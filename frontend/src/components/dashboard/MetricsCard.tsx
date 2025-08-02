import React from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: LucideIcon;
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
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-lg border border-border p-6"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
            <div className="h-8 bg-muted rounded animate-pulse w-16"></div>
            <div className="h-3 bg-muted rounded animate-pulse w-20"></div>
          </div>
          <div className="h-12 w-12 bg-muted rounded-full animate-pulse"></div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground mb-2">{value}</p>
          {change && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-sm ${getChangeColor(change.type)} flex items-center`}
            >
              {change.type === 'increase' && '↗ '}
              {change.type === 'decrease' && '↘ '}
              {change.value}
            </motion.p>
          )}
        </div>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`p-3 rounded-full bg-accent/50 ${iconColor}`}
        >
          <Icon className="h-6 w-6" />
        </motion.div>
      </div>
    </motion.div>
  )
}

export default MetricsCard