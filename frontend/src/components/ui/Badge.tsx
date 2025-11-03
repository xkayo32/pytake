import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  dot?: boolean;
  children: React.ReactNode;
}

export function Badge({
  variant = 'default',
  size = 'md',
  icon: Icon,
  dot = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors';

  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
    primary: 'bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800',
    success: 'bg-success-light dark:bg-green-950 text-success-dark dark:text-green-400 border border-green-200 dark:border-green-800',
    warning: 'bg-warning-light dark:bg-amber-950 text-warning-dark dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    error: 'bg-error-light dark:bg-red-950 text-error-dark dark:text-red-400 border border-red-200 dark:border-red-800',
    info: 'bg-info-light dark:bg-blue-950 text-info-dark dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    secondary: 'bg-accent-100 dark:bg-accent-950 text-accent-700 dark:text-accent-400 border border-accent-200 dark:border-accent-800',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`${dotSizes[size]} rounded-full bg-current`} />}
      {Icon && <Icon className={iconSizes[size]} />}
      {children}
    </span>
  );
}

// Variante especial para contadores (números)
export interface CountBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  max?: number;
}

export function CountBadge({
  count,
  variant = 'primary',
  max = 99,
  className = '',
  ...props
}: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  const variants = {
    default: 'bg-gray-600 text-white',
    primary: 'bg-primary-600 text-white',
    success: 'bg-success text-white',
    warning: 'bg-warning text-white',
    error: 'bg-error text-white',
  };

  if (count === 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${variants[variant]} ${className}`}
      {...props}
    >
      {displayCount}
    </span>
  );
}
