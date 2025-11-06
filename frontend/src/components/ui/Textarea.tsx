import React, { forwardRef, useState, useEffect } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'error' | 'success';
  textareaSize?: 'sm' | 'md' | 'lg';
  helperText?: string;
  errorMessage?: string;
  label?: string;
  showCharCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      variant = 'default',
      textareaSize = 'md',
      helperText,
      errorMessage,
      label,
      showCharCount = false,
      maxLength,
      autoResize = false,
      className = '',
      disabled,
      id,
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substring(7)}`;
    const showError = variant === 'error' || errorMessage;
    const actualVariant = showError ? 'error' : variant;
    const [charCount, setCharCount] = useState(0);

    // Atualizar contagem de caracteres
    useEffect(() => {
      if (showCharCount && value) {
        setCharCount(value.toString().length);
      }
    }, [value, showCharCount]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (showCharCount) {
        setCharCount(e.target.value.length);
      }

      // Auto-resize
      if (autoResize && e.target) {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }

      onChange?.(e);
    };

    const baseStyles =
      'block w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-dark-bg-tertiary resize-none';

    const variants = {
      default:
        'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary-500 focus:ring-primary-500',
      error:
        'border-error bg-error-light dark:bg-red-950 text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:border-error focus:ring-error',
      success:
        'border-success bg-success-light dark:bg-green-950 text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-gray-500 focus:border-success focus:ring-success',
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm min-h-[80px]',
      md: 'px-4 py-2.5 text-base min-h-[100px]',
      lg: 'px-5 py-3 text-lg min-h-[120px]',
    };

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}

        {/* Textarea Field */}
        <textarea
          ref={ref}
          id={textareaId}
          className={`${baseStyles} ${variants[actualVariant]} ${sizes[textareaSize]} ${className}`}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          aria-invalid={showError}
          aria-describedby={
            showError
              ? `${textareaId}-error`
              : helperText
                ? `${textareaId}-helper`
                : undefined
          }
          {...props}
        />

        {/* Footer: Error/Helper/CharCount */}
        <div className="flex items-start justify-between gap-2 mt-1.5">
          {/* Error Message */}
          {showError && errorMessage ? (
            <p
              id={`${textareaId}-error`}
              className="text-sm text-error flex items-center gap-1"
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
          ) : variant === 'success' && !showError ? (
            /* Success Message */
            <p className="text-sm text-success flex items-center gap-1">
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
          ) : helperText ? (
            /* Helper Text */
            <p
              id={`${textareaId}-helper`}
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              {helperText}
            </p>
          ) : (
            <div /> /* Spacer para manter charCount à direita */
          )}

          {/* Character Counter */}
          {showCharCount && (
            <p
              className={`text-sm font-medium ${
                maxLength && charCount > maxLength
                  ? 'text-error'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {charCount}
              {maxLength && ` / ${maxLength}`}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
