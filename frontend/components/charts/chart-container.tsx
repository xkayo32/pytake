'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Download, RefreshCw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChartContainerProps {
  title: string
  description?: string
  children: ReactNode
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  onExport?: () => void
  className?: string
  actions?: ReactNode
  height?: number | string
}

export function ChartContainer({
  title,
  description,
  children,
  badge,
  badgeVariant = 'secondary',
  isLoading = false,
  error = null,
  onRefresh,
  onExport,
  className = '',
  actions,
  height = 300
}: ChartContainerProps) {
  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            {title}
            {badge && (
              <Badge variant={badgeVariant} className="text-xs">
                {badge}
              </Badge>
            )}
            {isLoading && (
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {actions}
          
          {(onRefresh || onExport) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onRefresh && (
                  <DropdownMenuItem onClick={onRefresh} className="text-xs">
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Atualizar
                  </DropdownMenuItem>
                )}
                {onExport && (
                  <>
                    {onRefresh && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={onExport} className="text-xs">
                      <Download className="mr-2 h-3 w-3" />
                      Exportar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div 
          className="w-full flex items-center justify-center"
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        >
          {error ? (
            <div className="text-center space-y-2 p-4">
              <p className="text-sm text-muted-foreground">
                Erro ao carregar dados do gráfico
              </p>
              <p className="text-xs text-muted-foreground/70">
                {error}
              </p>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Tentar novamente
                </Button>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <div className="w-full h-full p-4">
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Specialized chart containers
export function MetricCard({
  title,
  value,
  description,
  change,
  changeType = 'neutral',
  icon: Icon,
  onClick,
  className = ''
}: {
  title: string
  value: string | number
  description?: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon?: any
  onClick?: () => void
  className?: string
}) {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-muted-foreground'
  }

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </div>
        {(description || change) && (
          <div className="flex items-center justify-between mt-2">
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
            {change && (
              <p className={`text-xs font-medium ${changeColors[changeType]}`}>
                {change}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Chart wrapper for consistent styling
export function ChartWrapper({ 
  children, 
  className = '',
  ...props 
}: { 
  children: ReactNode
  className?: string
  [key: string]: any
}) {
  return (
    <div 
      className={`w-full h-full ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}