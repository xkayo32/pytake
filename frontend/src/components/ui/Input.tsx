import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  inputSize?: 'sm' | 'md' | 'lg';
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  helperText?: string;
  errorMessage?: string;
  label?: string;
  isLoading?: boolean;
  onRightIconClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      inputSize = 'md',
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      helperText,
      errorMessage,
      label,
      isLoading = false,
      onRightIconClick,
      className = '',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substring(7)}`;
    const showError = variant === 'error' || errorMessage;
    const actualVariant = showError ? 'error' : variant;

    const baseStyles =
      'block w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-dark-bg-tertiary';

    const variants = {
      default:
        'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:ring-primary-500',
      error:
        'border-error bg-error-light dark:bg-red-950 text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:border-error focus:ring-error',
      success:
        'border-success bg-success-light dark:bg-green-950 text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:border-success focus:ring-success',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg',
    };

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    // Ajustar padding quando há ícones
    const paddingWithIcons = () => {
      const basePadding = sizes[inputSize];
      if (LeftIcon && RightIcon) {
        return basePadding.replace(/px-\d+/, inputSize === 'sm' ? 'pl-9 pr-9' : inputSize === 'md' ? 'pl-11 pr-11' : 'pl-13 pr-13');
      }
      if (LeftIcon) {
        return basePadding.replace(/px-\d+/, inputSize === 'sm' ? 'pl-9' : inputSize === 'md' ? 'pl-11' : 'pl-13');
      }
      if (RightIcon || isLoading) {
        return basePadding.replace(/px-\d+/, inputSize === 'sm' ? 'pr-9' : inputSize === 'md' ? 'pr-11' : 'pr-13');
      }
      return basePadding;
    };

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {LeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <LeftIcon
                className={`${iconSizes[inputSize]} text-gray-400 dark:text-gray-500`}
              />
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            id={inputId}
            className={`${baseStyles} ${variants[actualVariant]} ${paddingWithIcons()} ${className}`}
            disabled={disabled || isLoading}
            aria-invalid={showError}
            aria-describedby={
              showError
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            {...props}
          />

          {/* Right Icon or Loading Spinner */}
          {isLoading ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className={`animate-spin ${iconSizes[inputSize]} text-gray-400`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : (
            RightIcon && (
              <div
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${onRightIconClick ? 'cursor-pointer hover:text-gray-600 dark:hover:text-gray-300' : 'pointer-events-none'}`}
                onClick={onRightIconClick}
              >
                <RightIcon
                  className={`${iconSizes[inputSize]} text-gray-400 dark:text-gray-500`}
                />
              </div>
            )
          )}
        </div>

        {/* Error Message */}
        {showError && errorMessage && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-error flex items-center gap-1"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {errorMessage}
          </p>
        )}

        {/* Helper Text */}
        {!showError && helperText && (
          <p
            id={`${inputId}-helper`}
            className="mt-1.5 text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}

        {/* Success Message (quando variant='success' e não tem error) */}
        {variant === 'success' && !showError && (
          <p className="mt-1.5 text-sm text-success flex items-center gap-1">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {helperText || 'Campo válido'}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
