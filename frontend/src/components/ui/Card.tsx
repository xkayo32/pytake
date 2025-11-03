import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const baseStyles = 'bg-white dark:bg-dark-bg-secondary rounded-xl border border-gray-200 dark:border-dark-border transition-all';

  const variants = {
    default: 'shadow-sm',
    bordered: 'border-2',
    elevated: 'shadow-lg',
    gradient: 'bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-950 dark:to-accent-950 border-primary-200 dark:border-primary-800',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyles = hoverable
    ? 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 hover:scale-[1.01] cursor-pointer'
    : '';

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`} {...props}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardContent({ className = '', children, ...props }: CardContentProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({ className = '', children, ...props }: CardFooterProps) {
  return (
    <div className={`border-t border-gray-200 dark:border-dark-border pt-4 mt-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
