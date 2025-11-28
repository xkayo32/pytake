import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          'w-full h-10 px-3 py-2',
          'bg-background border rounded-xl',
          'text-foreground placeholder:text-muted-foreground',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          // Normal state
          !error && 'border-border focus:border-primary focus:ring-primary/20',
          // Error state
          error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
          // Disabled state
          'disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
