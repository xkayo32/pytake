/**
 * PageHeader - Header padrão para páginas admin
 * Tema: Indigo/Purple
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  badge?: {
    text: string;
    variant?: 'indigo' | 'purple' | 'blue' | 'green' | 'yellow' | 'red';
  };
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  badge,
}: PageHeaderProps) {
  const badgeColors = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-md p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              {badge && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    badgeColors[badge.variant || 'indigo']
                  } bg-white/90`}
                >
                  {badge.text}
                </span>
              )}
            </div>
            {description && (
              <p className="text-indigo-100 mt-1 text-sm">
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
