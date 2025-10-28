/**
 * StatsCard - Card de estatísticas para admin
 * Tema: Indigo/Purple
 */

import React from 'react';
import { formatNumberLocale } from '@/lib/formatNumber';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  color?: 'indigo' | 'purple' | 'blue' | 'green' | 'orange' | 'red';
  loading?: boolean;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'indigo',
  loading = false,
}: StatsCardProps) {
  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      gradient: 'from-indigo-500 to-indigo-600',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400',
      gradient: 'from-purple-500 to-purple-600',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      gradient: 'from-blue-500 to-blue-600',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-600 dark:text-green-400',
      gradient: 'from-green-500 to-green-600',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-600 dark:text-orange-400',
      gradient: 'from-orange-500 to-orange-600',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-600 dark:text-red-400',
      gradient: 'from-red-500 to-red-600',
    },
  };

  const colors = colorClasses[color];

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:border dark:border-gray-700 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {typeof value === 'number' ? formatNumberLocale(value, 0) : value}
          </p>
          <div className="flex items-center gap-2">
            {trend && (
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  trend.direction === 'up'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend.direction === 'up' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.value}
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div
          className={`p-3 rounded-lg ${colors.bg} transition-transform duration-200`}
        >
          <Icon className={`h-5 w-5 ${colors.text}`} />
        </div>
      </div>
    </div>
  );
}
