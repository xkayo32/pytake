'use client'

import { useState } from 'react'
import { 
  FLOW_VARIABLES, 
  VARIABLE_CATEGORIES,
  searchVariables,
  formatVariable
} from '@/lib/data/flow-variables'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Copy, Variable, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VariablesPanelProps {
  onVariableSelect?: (variableId: string) => void
  selectedVariables?: string[]
  showCopyButtons?: boolean
}

export function VariablesPanel({ 
  onVariableSelect, 
  selectedVariables = [],
  showCopyButtons = true 
}: VariablesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  // Filtrar variáveis baseado na busca e categoria
  const filteredVariables = searchVariables(searchQuery).filter(
    v => !selectedCategory || v.category === selectedCategory
  )
  
  // Agrupar por categoria
  const variablesByCategory = Object.entries(VARIABLE_CATEGORIES).map(([key, label]) => ({
    key,
    label,
    variables: filteredVariables.filter(v => v.category === label)
  })).filter(group => group.variables.length > 0)
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }
  
  const handleVariableClick = (variableId: string) => {
    if (onVariableSelect) {
      onVariableSelect(variableId)
    }
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Variable className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Variáveis Disponíveis</h3>
        <Badge variant="secondary" className="text-xs">
          <Hash className="h-3 w-3 mr-1" />
          {FLOW_VARIABLES.length}
        </Badge>
      </div>
      
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar variáveis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {/* Filtros de categoria */}
      <div className="flex flex-wrap gap-1">
        <Badge
          variant={!selectedCategory ? "default" : "outline"}
          className="cursor-pointer text-xs"
          onClick={() => setSelectedCategory(null)}
        >
          Todas
        </Badge>
        {Object.entries(VARIABLE_CATEGORIES).map(([key, label]) => (
          <Badge
            key={key}
            variant={selectedCategory === label ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setSelectedCategory(label)}
          >
            {label}
          </Badge>
        ))}
      </div>
      
      {/* Lista de variáveis por categoria */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {variablesByCategory.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <Variable className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Nenhuma variável encontrada
          </div>
        ) : (
          variablesByCategory.map((group) => (
            <div key={group.key} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {group.label}
              </h4>
              <div className="space-y-1">
                {group.variables.map((variable) => {
                  const isSelected = selectedVariables.includes(variable.id)
                  const formattedVar = formatVariable(variable.id)
                  
                  return (
                    <Card 
                      key={variable.id} 
                      className={cn(
                        "transition-colors cursor-pointer hover:bg-accent",
                        isSelected && "ring-2 ring-primary bg-primary/5"
                      )}
                      onClick={() => handleVariableClick(variable.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <span className="text-lg mt-0.5">{variable.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{variable.name}</span>
                              {isSelected && (
                                <Badge variant="secondary" className="text-xs">
                                  Em uso
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {variable.description}
                            </p>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {formattedVar}
                              </code>
                              {showCopyButtons && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    copyToClipboard(formattedVar)
                                  }}
                                  title="Copiar variável"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-primary mt-1">
                              <strong>Exemplo:</strong> {variable.example}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Estatísticas */}
      <div className="border-t pt-3 mt-4">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Mostrando {filteredVariables.length} variáveis</span>
          {selectedVariables.length > 0 && (
            <span>{selectedVariables.length} em uso</span>
          )}
        </div>
      </div>
    </div>
  )
}