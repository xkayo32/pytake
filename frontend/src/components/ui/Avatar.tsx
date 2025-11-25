'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'gradient' | 'outline';
  status?: 'online' | 'offline' | 'busy' | 'away';
  fallback?: ReactNode;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const statusSizeClasses = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
};

const gradientVariants = [
  'from-primary-500 to-primary-600',
  'from-primary-500 to-accent-500',
  'from-accent-500 to-accent-600',
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-orange-500 to-orange-600',
  'from-green-500 to-green-600',
];

// Generate a consistent gradient based on the name
function getGradient(name?: string): string {
  if (!name) return gradientVariants[0];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % gradientVariants.length;
  return gradientVariants[index];
}

// Get initials from name
function getInitials(name?: string): string {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  variant = 'gradient',
  status,
  fallback,
  className = '',
}: AvatarProps) {
  const initials = getInitials(name);
  const gradient = getGradient(name);

  const baseClasses = cn(
    'relative inline-flex items-center justify-center rounded-full font-semibold overflow-hidden',
    sizeClasses[size],
    className
  );

  const variantClasses = {
    default: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    gradient: `bg-gradient-to-br ${gradient} text-white`,
    outline: 'border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300',
  };

  return (
    <div className={cn(baseClasses, !src && variantClasses[variant])}>
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide the image if it fails to load
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : fallback ? (
        fallback
      ) : (
        <span>{initials}</span>
      )}

      {/* Status Indicator */}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-gray-800',
            statusSizeClasses[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

// Avatar Group for showing multiple avatars
interface AvatarGroupProps {
  avatars: Array<{
    src?: string | null;
    name?: string;
    alt?: string;
  }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = 'md',
  className = '',
}: AvatarGroupProps) {
  const displayAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const overlapClasses = {
    xs: '-ml-1.5',
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3',
  };

  return (
    <div className={cn('flex items-center', className)}>
      {displayAvatars.map((avatar, index) => (
        <div
          key={index}
          className={cn(
            'relative ring-2 ring-white dark:ring-gray-800 rounded-full',
            index > 0 && overlapClasses[size]
          )}
          style={{ zIndex: displayAvatars.length - index }}
        >
          <Avatar
            src={avatar.src}
            name={avatar.name}
            alt={avatar.alt}
            size={size}
          />
        </div>
      ))}

      {remaining > 0 && (
        <div
          className={cn(
            'relative ring-2 ring-white dark:ring-gray-800 rounded-full',
            overlapClasses[size]
          )}
          style={{ zIndex: 0 }}
        >
          <div
            className={cn(
              'inline-flex items-center justify-center rounded-full font-semibold',
              'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
              sizeClasses[size]
            )}
          >
            +{remaining}
          </div>
        </div>
      )}
    </div>
  );
}
