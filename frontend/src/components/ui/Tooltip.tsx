'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  delayMs?: number;
  disabled?: boolean;
  className?: string;
}

export function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  delayMs = 200,
  disabled = false,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Position calculation
  const getPositionClasses = () => {
    const positions = {
      top: 'bottom-full mb-2',
      bottom: 'top-full mt-2',
      left: 'right-full mr-2',
      right: 'left-full ml-2',
    };

    const alignments = {
      start: side === 'top' || side === 'bottom' ? 'left-0' : 'top-0',
      center: side === 'top' || side === 'bottom' 
        ? 'left-1/2 -translate-x-1/2' 
        : 'top-1/2 -translate-y-1/2',
      end: side === 'top' || side === 'bottom' ? 'right-0' : 'bottom-0',
    };

    return `${positions[side]} ${alignments[align]}`;
  };

  // Animation variants
  const getAnimationVariants = () => {
    const variants = {
      top: { initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 } },
      bottom: { initial: { opacity: 0, y: -5 }, animate: { opacity: 1, y: 0 } },
      left: { initial: { opacity: 0, x: 5 }, animate: { opacity: 1, x: 0 } },
      right: { initial: { opacity: 0, x: -5 }, animate: { opacity: 1, x: 0 } },
    };
    return variants[side];
  };

  const variants = getAnimationVariants();

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.initial}
            transition={{ duration: 0.15 }}
            className={`
              absolute z-50 ${getPositionClasses()}
              px-3 py-2 text-sm font-medium
              text-white bg-gray-900 dark:bg-gray-700
              rounded-lg shadow-lg
              whitespace-nowrap
              pointer-events-none
              ${className}
            `}
            role="tooltip"
          >
            {content}
            
            {/* Arrow */}
            <div
              className={`
                absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45
                ${side === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
                ${side === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
                ${side === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : ''}
                ${side === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''}
              `}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// IconButton with Tooltip
interface IconButtonProps {
  icon: ReactNode;
  tooltip: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function IconButton({
  icon,
  tooltip,
  onClick,
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
}: IconButtonProps) {
  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const variants = {
    default: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800',
    primary: 'text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:text-primary-400 dark:hover:text-primary-300 dark:hover:bg-primary-900/30',
    danger: 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30',
    success: 'text-green-500 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30',
  };

  return (
    <Tooltip content={tooltip} disabled={disabled}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          ${sizes[size]}
          ${variants[variant]}
          rounded-lg transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
