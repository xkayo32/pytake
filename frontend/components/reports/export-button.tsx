'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf'
  type: 'summary' | 'detailed'
}

interface ExportButtonProps {
  onExport: (options: ExportOptions) => Promise<boolean>
  isLoading?: boolean
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function ExportButton({
  onExport,
  isLoading = false,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  className
}: ExportButtonProps) {
  const [exportStatus, setExportStatus] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error'
    message: string
  }>({
    status: 'idle',
    message: ''
  })

  const handleExport = async (format: ExportOptions['format'], type: ExportOptions['type'] = 'detailed') => {
    setExportStatus({ status: 'loading', message: 'Exportando...' })
    
    try {
      const success = await onExport({ format, type })
      
      if (success) {
        setExportStatus({ 
          status: 'success', 
          message: 'Relatório exportado com sucesso!' 
        })
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setExportStatus({ status: 'idle', message: '' })
        }, 3000)
      } else {
        setExportStatus({ 
          status: 'error', 
          message: 'Falha ao exportar relatório' 
        })
      }
    } catch (error) {
      console.error('Export error:', error)
      setExportStatus({ 
        status: 'error', 
        message: 'Erro durante a exportação' 
      })
    }
  }

  const getStatusIcon = () => {
    switch (exportStatus.status) {
      case 'loading':
        return <Loader2 className="h-3 w-3 animate-spin" />
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-600" />
      default:
        return <Download className="h-3 w-3" />
    }
  }

  const exportFormats = [
    {
      format: 'csv' as const,
      label: 'CSV',
      description: 'Planilha compatível com Excel',
      icon: FileSpreadsheet,
      color: 'text-green-600'
    },
    {
      format: 'excel' as const,
      label: 'Excel',
      description: 'Arquivo Excel nativo (.xlsx)',
      icon: FileSpreadsheet,
      color: 'text-green-700'
    },
    {
      format: 'pdf' as const,
      label: 'PDF',
      description: 'Documento formatado para impressão',
      icon: FileText,
      color: 'text-red-600'
    }
  ]

  return (
    <div className={cn('relative', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled || isLoading || exportStatus.status === 'loading'}
            className="relative"
          >
            {getStatusIcon()}
            <span className="ml-2">
              {exportStatus.status === 'loading' ? 'Exportando...' : 'Exportar'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            Escolha o formato
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {exportFormats.map((format) => (
            <div key={format.format}>
              <DropdownMenuLabel className="px-2 py-1 text-xs font-medium">
                {format.label}
              </DropdownMenuLabel>
              
              {/* Summary version */}
              <DropdownMenuItem
                onClick={() => handleExport(format.format, 'summary')}
                className="pl-4 text-xs"
                disabled={exportStatus.status === 'loading'}
              >
                <format.icon className={cn('mr-2 h-3 w-3', format.color)} />
                <div className="flex-1">
                  <div className="font-medium">Resumo</div>
                  <div className="text-muted-foreground text-xs">
                    Métricas principais
                  </div>
                </div>
              </DropdownMenuItem>
              
              {/* Detailed version */}
              <DropdownMenuItem
                onClick={() => handleExport(format.format, 'detailed')}
                className="pl-4 text-xs"
                disabled={exportStatus.status === 'loading'}
              >
                <format.icon className={cn('mr-2 h-3 w-3', format.color)} />
                <div className="flex-1">
                  <div className="font-medium">Detalhado</div>
                  <div className="text-muted-foreground text-xs">
                    Dados completos
                  </div>
                </div>
              </DropdownMenuItem>
              
              {format.format !== 'pdf' && <DropdownMenuSeparator />}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Status Message */}
      {exportStatus.message && exportStatus.status !== 'loading' && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <Badge 
            variant={exportStatus.status === 'success' ? 'default' : 'destructive'}
            className="text-xs whitespace-nowrap animate-in fade-in-0 slide-in-from-top-2"
          >
            {exportStatus.status === 'success' && (
              <CheckCircle className="mr-1 h-3 w-3" />
            )}
            {exportStatus.status === 'error' && (
              <AlertCircle className="mr-1 h-3 w-3" />
            )}
            {exportStatus.message}
          </Badge>
        </div>
      )}
    </div>
  )
}

// Simplified export button for quick actions
export function QuickExportButton({
  format = 'excel',
  onExport,
  isLoading = false,
  disabled = false,
  className
}: {
  format?: 'csv' | 'excel' | 'pdf'
  onExport: (options: ExportOptions) => Promise<boolean>
  isLoading?: boolean
  disabled?: boolean
  className?: string
}) {
  const [isExporting, setIsExporting] = useState(false)

  const handleQuickExport = async () => {
    setIsExporting(true)
    try {
      await onExport({ format, type: 'detailed' })
    } finally {
      setIsExporting(false)
    }
  }

  const getFormatIcon = () => {
    switch (format) {
      case 'csv':
        return <FileSpreadsheet className="h-3 w-3 text-green-600" />
      case 'excel':
        return <FileSpreadsheet className="h-3 w-3 text-green-700" />
      case 'pdf':
        return <FileText className="h-3 w-3 text-red-600" />
      default:
        return <Download className="h-3 w-3" />
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleQuickExport}
      disabled={disabled || isLoading || isExporting}
      className={cn('h-8', className)}
    >
      {isExporting ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        getFormatIcon()
      )}
      <span className="ml-1 text-xs uppercase">
        {format}
      </span>
    </Button>
  )
}