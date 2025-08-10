import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface DashboardCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'indigo';
  loading?: boolean;
  onClick?: () => void;
  badge?: number;
  subtitle?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  loading = false,
  onClick,
  badge,
  subtitle
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      accent: 'bg-blue-500'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      icon: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
      accent: 'bg-green-500'
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      icon: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800',
      accent: 'bg-yellow-500'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      icon: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      accent: 'bg-purple-500'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      icon: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
      accent: 'bg-red-500'
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      icon: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-800',
      accent: 'bg-indigo-500'
    }
  };

  const colors = colorClasses[color];

  const getTrendIcon = () => {
    if (change === undefined || change === 0) return Minus;
    return change > 0 ? TrendingUp : TrendingDown;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-gray-500';
    return change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString('pt-BR');
    }
    return val;
  };

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={clsx(
        'relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600',
        loading && 'animate-pulse'
      )}
      onClick={onClick}
    >
      {/* Badge */}
      {badge && badge > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={clsx('p-2 rounded-lg', colors.bg)}>
          <Icon size={20} className={colors.icon} />
        </div>
        
        {change !== undefined && (
          <div className={clsx('flex items-center space-x-1', getTrendColor())}>
            {React.createElement(getTrendIcon(), { size: 16 })}
            <span className="text-sm font-medium">
              {Math.abs(change)}%
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </p>
        
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatValue(value)}
            </p>
            
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
            
            {change !== undefined && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {change > 0 ? 'Aumento' : change < 0 ? 'Diminuição' : 'Sem alteração'} em relação ao período anterior
              </p>
            )}
          </>
        )}
      </div>

      {/* Progress bar for certain metrics */}
      {!loading && typeof value === 'string' && value.includes('%') && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={clsx('h-2 rounded-full transition-all duration-500', colors.accent)}
              style={{ width: `${Math.min(parseFloat(value), 100)}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};