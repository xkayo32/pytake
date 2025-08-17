'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  FLOW_VARIABLES, 
  VARIABLE_CATEGORIES,
  searchVariables, 
  formatVariable,
  extractVariables,
  replaceWithExamples 
} from '@/lib/data/flow-variables'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Plus, Variable, Eye, EyeOff, Search, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VariableEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string
  label?: string
}

export function VariableEditor({
  value = '',
  onChange,
  placeholder = 'Digite o texto... Use {{variável}} para inserir variáveis',
  multiline = false,
  className,
  label
}: VariableEditorProps) {
  console.log('🔷 VariableEditor props:', {
    value,
    placeholder,
    multiline,
    hasOnChange: !!onChange
  })
  const [showPreview, setShowPreview] = useState(false)
  const [showVariables, setShowVariables] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Extrair variáveis usadas no texto
  const usedVariables = extractVariables(value)
  const previewText = showPreview ? replaceWithExamples(value) : value
  
  // Filtrar variáveis baseado na busca e categoria
  const filteredVariables = searchVariables(searchQuery).filter(
    v => !selectedCategory || v.category === selectedCategory
  )
  
  // Inserir variável no cursor
  const insertVariable = (variableId: string) => {
    const formattedVar = formatVariable(variableId)
    const element = multiline ? textareaRef.current : inputRef.current
    
    if (element) {
      const start = element.selectionStart || 0
      const end = element.selectionEnd || 0
      const newValue = 
        value.substring(0, start) + 
        formattedVar + 
        value.substring(end)
      
      onChange(newValue)
      
      // Reposicionar cursor após a variável
      setTimeout(() => {
        element.focus()
        const newPosition = start + formattedVar.length
        element.setSelectionRange(newPosition, newPosition)
      }, 0)
    } else {
      // Fallback: adicionar ao final
      onChange(value + formattedVar)
    }
    
    setShowVariables(false)
    setSearchQuery('')
  }
  
  // Componente de lista de variáveis
  const VariablesList = () => (
    <div className="w-full">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Variable className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Variáveis Disponíveis</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowVariables(false)}
          className="h-6 w-6 p-0"
        >
          ✕
        </Button>
      </div>
      
      {/* Categorias */}
      <div className="flex flex-wrap gap-1 p-2 border-b">
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
      
      {/* Busca */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar variáveis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>
      
      {/* Lista de variáveis */}
      <div className="max-h-64 overflow-y-auto">
        {filteredVariables.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma variável encontrada
          </div>
        ) : (
          <div className="p-1">
            {filteredVariables.map((variable) => (
              <div
                key={variable.id}
                className="flex items-start gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                onClick={() => insertVariable(variable.id)}
              >
                <span className="text-lg mt-0.5">{variable.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{variable.name}</span>
                    <code className="text-xs bg-muted px-1 rounded">
                      {formatVariable(variable.id)}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {variable.description}
                  </p>
                  <p className="text-xs text-primary mt-0.5">
                    Ex: {variable.example}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">{label}</label>
          <div className="flex items-center gap-1">
            {usedVariables.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Hash className="h-3 w-3 mr-1" />
                {usedVariables.length} variáveis
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPreview(!showPreview)}
              className="h-7 px-2"
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Ocultar
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </>
              )}
            </Button>
            
            <Popover open={showVariables} onOpenChange={setShowVariables}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Variável
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <VariablesList />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
      
      {multiline ? (
        <div className="space-y-1">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              console.log('🔹 VariableEditor textarea onChange:', e.target.value)
              onChange(e.target.value)
            }}
            placeholder={placeholder}
            className={cn(
              "font-mono text-sm",
              showPreview && "hidden"
            )}
            rows={4}
          />
          {showPreview && (
            <div className="p-3 bg-muted rounded-md min-h-[100px]">
              <div className="text-sm whitespace-pre-wrap">
                {previewText || <span className="text-muted-foreground">{placeholder}</span>}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="relative">
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => {
              console.log('🔹 VariableEditor textarea onChange:', e.target.value)
              onChange(e.target.value)
            }}
              placeholder={placeholder}
              className={cn(
                "pr-20 font-mono text-sm",
                showPreview && "hidden"
              )}
            />
            {!showPreview && value && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Popover open={showVariables} onOpenChange={setShowVariables}>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0" align="end">
                    <VariablesList />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          {showPreview && (
            <div className="p-2 bg-muted rounded-md">
              <div className="text-sm">
                {previewText || <span className="text-muted-foreground">{placeholder}</span>}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Variáveis usadas */}
      {usedVariables.length > 0 && !showPreview && (
        <div className="flex flex-wrap gap-1">
          {usedVariables.map((varId, index) => {
            const variable = FLOW_VARIABLES.find(v => v.id === varId)
            return (
              <Badge key={index} variant="secondary" className="text-xs">
                {variable?.icon} {variable?.name || varId}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}