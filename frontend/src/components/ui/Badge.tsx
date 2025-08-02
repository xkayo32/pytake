import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150',
  {
    variants: {
      variant: {
        default:
          'bg-primary/10 text-primary border border-primary/20',
        secondary:
          'bg-secondary/10 text-secondary border border-secondary/20',
        destructive:
          'bg-destructive/10 text-destructive border border-destructive/20',
        success:
          'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20',
        warning:
          'bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20',
        outline: 'border border-border text-foreground bg-background',
        subtle: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }