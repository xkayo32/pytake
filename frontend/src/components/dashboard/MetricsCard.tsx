import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  icon: React.ComponentType<any>;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  loading?: boolean;
  onClick?: () => void;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color = 'blue',
  loading = false,
  onClick
}) => {
  const { actualTheme } = useTheme();

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        icon: 'from-blue-500 to-blue-600',
        bg: actualTheme === 'dark' ? 'from-blue-500/10 to-blue-600/5' : 'from-blue-50 to-blue-100/50',
        border: actualTheme === 'dark' ? 'border-blue-500/20' : 'border-blue-200',
        text: 'text-blue-600 dark:text-blue-400'
      },
      green: {
        icon: 'from-green-500 to-green-600',
        bg: actualTheme === 'dark' ? 'from-green-500/10 to-green-600/5' : 'from-green-50 to-green-100/50',
        border: actualTheme === 'dark' ? 'border-green-500/20' : 'border-green-200',
        text: 'text-green-600 dark:text-green-400'
      },
      yellow: {
        icon: 'from-yellow-500 to-yellow-600',
        bg: actualTheme === 'dark' ? 'from-yellow-500/10 to-yellow-600/5' : 'from-yellow-50 to-yellow-100/50',
        border: actualTheme === 'dark' ? 'border-yellow-500/20' : 'border-yellow-200',
        text: 'text-yellow-600 dark:text-yellow-400'
      },
      red: {
        icon: 'from-red-500 to-red-600',
        bg: actualTheme === 'dark' ? 'from-red-500/10 to-red-600/5' : 'from-red-50 to-red-100/50',
        border: actualTheme === 'dark' ? 'border-red-500/20' : 'border-red-200',
        text: 'text-red-600 dark:text-red-400'
      },
      purple: {
        icon: 'from-purple-500 to-purple-600',
        bg: actualTheme === 'dark' ? 'from-purple-500/10 to-purple-600/5' : 'from-purple-50 to-purple-100/50',
        border: actualTheme === 'dark' ? 'border-purple-500/20' : 'border-purple-200',
        text: 'text-purple-600 dark:text-purple-400'
      },
      indigo: {
        icon: 'from-indigo-500 to-indigo-600',
        bg: actualTheme === 'dark' ? 'from-indigo-500/10 to-indigo-600/5' : 'from-indigo-50 to-indigo-100/50',
        border: actualTheme === 'dark' ? 'border-indigo-500/20' : 'border-indigo-200',
        text: 'text-indigo-600 dark:text-indigo-400'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M7 14L12 9L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'decrease':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M17 10L12 15L7 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
    }
  };

  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return 'text-green-600 dark:text-green-400';
      case 'decrease':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const colorClasses = getColorClasses(color);

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.4 }
    },
    hover: {
      y: -2,
      scale: 1.02,
      transition: { type: "spring", stiffness: 400, damping: 10 }
    }
  };

  const loadingVariants = {
    animate: {
      opacity: [0.5, 1, 0.5],
      transition: { duration: 1.5, repeat: Infinity }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={onClick ? "hover" : undefined}
      onClick={onClick}
      className={`
        relative p-6 rounded-2xl border-2 bg-gradient-to-br backdrop-blur-sm
        ${colorClasses.bg} ${colorClasses.border}
        ${actualTheme === 'dark' 
          ? 'bg-gray-800/50 shadow-xl' 
          : 'bg-white/80 shadow-lg'
        }
        ${onClick ? 'cursor-pointer' : ''}
        transition-all duration-200
      `}
    >
      {/* Loading State */}
      {loading && (
        <motion.div
          variants={loadingVariants}
          animate="animate"
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
        />
      )}

      {/* Content */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`
              p-3 rounded-xl bg-gradient-to-br ${colorClasses.icon} 
              shadow-lg flex items-center justify-center
            `}>
              <Icon size={24} className="text-white" />
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {title}
              </h3>
            </div>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
            )}

            {change && !loading && (
              <div className={`flex items-center space-x-1 ${getChangeColor(change.type)}`}>
                {getChangeIcon(change.type)}
                <span className="text-sm font-medium">
                  {Math.abs(change.value)}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  vs {change.period}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Decorative Element */}
        <div className={`absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br ${colorClasses.icon} opacity-10 -mr-10 -mt-10`} />
      </div>

      {/* Subtle Animation */}
      {!loading && (
        <motion.div
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`absolute bottom-2 right-2 w-2 h-2 rounded-full bg-gradient-to-r ${colorClasses.icon}`}
        />
      )}
    </motion.div>
  );
};

export default MetricsCard;