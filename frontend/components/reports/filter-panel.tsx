'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRange } from 'react-day-picker'
import { Calendar as CalendarIcon, Filter, X, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface ReportFilters {
  dateRange?: DateRange
  agents?: string[]
  queues?: string[]
  status?: string[]
  priority?: string
  metric?: string
  period?: 'hour' | 'day' | 'week' | 'month'
  customRange?: boolean
}

interface FilterPanelProps {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
  availableAgents?: Array<{ id: string; name: string }>
  availableQueues?: Array<{ id: string; name: string }>
  isLoading?: boolean
  onRefresh?: () => void
  className?: string
}

export function FilterPanel({
  filters,
  onFiltersChange,
  availableAgents = [],
  availableQueues = [],
  isLoading = false,
  onRefresh,
  className
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [date, setDate] = useState<DateRange | undefined>(filters.dateRange)

  const handleDateSelect = (dateRange: DateRange | undefined) => {
    setDate(dateRange)
    onFiltersChange({ ...filters, dateRange })
  }

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    setDate(undefined)
    onFiltersChange({
      period: 'day'
    })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.dateRange) count++
    if (filters.agents?.length) count++
    if (filters.queues?.length) count++
    if (filters.status?.length) count++
    if (filters.priority && filters.priority !== 'all') count++
    if (filters.metric && filters.metric !== 'all') count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  const presetRanges = [
    {
      label: 'Hoje',
      value: () => ({
        from: new Date(),
        to: new Date()
      })
    },
    {
      label: 'Últimos 7 dias',
      value: () => {
        const to = new Date()
        const from = new Date()
        from.setDate(from.getDate() - 6)
        return { from, to }
      }
    },
    {
      label: 'Últimos 30 dias',
      value: () => {
        const to = new Date()
        const from = new Date()
        from.setDate(from.getDate() - 29)
        return { from, to }
      }
    },
    {
      label: 'Este mês',
      value: () => {
        const now = new Date()
        const from = new Date(now.getFullYear(), now.getMonth(), 1)
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return { from, to }
      }
    }
  ]

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-7 text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            )}
            {onRefresh && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onRefresh}
                disabled={isLoading}
                className="h-7"
              >
                <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {presetRanges.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handleDateSelect(preset.value())}
              className="h-8 text-xs justify-start"
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Main Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Período</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "dd/MM", { locale: ptBR })} -{" "}
                        {format(date.to, "dd/MM", { locale: ptBR })}
                      </>
                    ) : (
                      format(date.from, "dd/MM", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecionar período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={handleDateSelect}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Period Granularity */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Agrupamento</Label>
            <Select
              value={filters.period || 'day'}
              onValueChange={(value) => handleFilterChange('period', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Por Hora</SelectItem>
                <SelectItem value="day">Por Dia</SelectItem>
                <SelectItem value="week">Por Semana</SelectItem>
                <SelectItem value="month">Por Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Metric Type */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Métrica</Label>
            <Select
              value={filters.metric || 'all'}
              onValueChange={(value) => handleFilterChange('metric', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="conversations">Conversas</SelectItem>
                <SelectItem value="satisfaction">Satisfação</SelectItem>
                <SelectItem value="responseTime">Tempo de Resposta</SelectItem>
                <SelectItem value="efficiency">Eficiência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Prioridade</Label>
            <Select
              value={filters.priority || 'all'}
              onValueChange={(value) => handleFilterChange('priority', value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-9 w-full"
            >
              {isExpanded ? 'Menos filtros' : 'Mais filtros'}
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            {/* Agent Filter */}
            {availableAgents.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Agentes</Label>
                <Select
                  value={filters.agents?.[0] || 'all'}
                  onValueChange={(value) => 
                    handleFilterChange('agents', value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos os agentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os agentes</SelectItem>
                    {availableAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Queue Filter */}
            {availableQueues.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Filas</Label>
                <Select
                  value={filters.queues?.[0] || 'all'}
                  onValueChange={(value) => 
                    handleFilterChange('queues', value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todas as filas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as filas</SelectItem>
                    {availableQueues.map((queue) => (
                      <SelectItem key={queue.id} value={queue.id}>
                        {queue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}