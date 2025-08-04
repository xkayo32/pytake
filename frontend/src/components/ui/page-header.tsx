import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from './button'
import type { Icon } from '@/types/icons'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  icon?: Icon
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
  className
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("mb-8", className)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface PageSectionProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className
}: PageSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("mb-8", className)}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-6">
          <div>
            {title && (
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </motion.div>
  )
}