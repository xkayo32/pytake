/**
 * EmptyState - Estado vazio para listas e páginas
 * Tema: Indigo/Purple
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  variant?: 'default' | 'gradient';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:border dark:border-gray-700 p-12 text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Icon className="h-10 w-10 text-gray-600 dark:text-gray-400" />
      </div>

      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8 text-lg">
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
