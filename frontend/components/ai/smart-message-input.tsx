'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Send, 
  Bot, 
  Zap, 
  Clock, 
  X,
  ArrowUp,
  ArrowDown,
  Command,
  MessageSquare,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SuggestionResponse, Conversation } from '@/lib/ai/suggestion-engine'
import { useSuggestions } from '@/lib/hooks/useSuggestions'

interface SmartMessageInputProps {
  conversation: Conversation | null
  onSendMessage: (message: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showSuggestions?: boolean
  maxRows?: number
}

export function SmartMessageInput({
  conversation,
  onSendMessage,
  placeholder = "Digite sua mensagem...",
  disabled = false,
  className,
  showSuggestions = true,
  maxRows = 4
}: SmartMessageInputProps) {
  const [message, setMessage] = useState('')
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [showInlineSuggestions, setShowInlineSuggestions] = useState(false)
  const [isComposing, setIsComposing] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionListRef = useRef<HTMLDivElement>(null)

  const {
    suggestions,
    isLoading,
    hasSuggestions,
    refreshSuggestions,
    useSuggestion,
    copySuggestion
  } = useSuggestions(conversation, {
    autoRefresh: true,
    refreshDelay: 300,
    maxSuggestions: 3
  })

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = maxRows * 24 // Approximate line height
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px'
    }
  }, [maxRows])

  // Handle message change and trigger suggestions
  const handleMessageChange = useCallback((value: string) => {
    setMessage(value)
    adjustTextareaHeight()
    
    // Show inline suggestions for longer messages
    if (value.length > 10) {
      setShowInlineSuggestions(true)
      refreshSuggestions(value)
    } else {
      setShowInlineSuggestions(false)
    }
    
    // Reset selection when typing
    setSelectedSuggestionIndex(-1)
  }, [adjustTextareaHeight, refreshSuggestions])

  // Handle suggestion selection with keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showInlineSuggestions || suggestions.length === 0) {
      // Normal send behavior
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault()
        handleSend()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => prev > -1 ? prev - 1 : prev)
        break
      
      case 'Tab':
      case 'Enter':
        if (selectedSuggestionIndex >= 0 && !e.shiftKey) {
          e.preventDefault()
          handleUseSuggestion(suggestions[selectedSuggestionIndex])
        } else if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
          e.preventDefault()
          handleSend()
        }
        break
      
      case 'Escape':
        e.preventDefault()
        setShowInlineSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }, [showInlineSuggestions, suggestions, selectedSuggestionIndex, isComposing])

  // Handle sending message
  const handleSend = useCallback(() => {
    if (!message.trim() || disabled) return
    
    onSendMessage(message.trim())
    setMessage('')
    setShowInlineSuggestions(false)
    setSelectedSuggestionIndex(-1)
    adjustTextareaHeight()
  }, [message, disabled, onSendMessage, adjustTextareaHeight])

  // Handle using a suggestion
  const handleUseSuggestion = useCallback(async (suggestion: SuggestionResponse) => {
    setMessage(suggestion.text)
    setShowInlineSuggestions(false)
    setSelectedSuggestionIndex(-1)
    adjustTextareaHeight()
    
    // Submit usage feedback
    await useSuggestion(suggestion, false, suggestion.text)
    
    // Focus back on textarea
    textareaRef.current?.focus()
  }, [adjustTextareaHeight, useSuggestion])

  // Handle copying suggestion
  const handleCopySuggestion = useCallback(async (suggestion: SuggestionResponse) => {
    const success = await copySuggestion(suggestion)
    if (success) {
      // Visual feedback could be added here
    }
  }, [copySuggestion])

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && suggestionListRef.current) {
      const selectedElement = suggestionListRef.current.children[selectedSuggestionIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedSuggestionIndex])

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  return (
    <div className={cn("relative", className)}>
      {/* Inline suggestions dropdown */}
      {showSuggestions && showInlineSuggestions && hasSuggestions && (
        <Card className="absolute bottom-full left-0 right-0 mb-2 z-50 shadow-lg border border-gray-200">
          <CardContent className="p-2" ref={suggestionListRef}>
            <div className="flex items-center justify-between mb-2 px-2">
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Bot className="h-3 w-3" />
                <span>Sugestões da IA</span>
                <Badge variant="secondary" className="text-xs">
                  {suggestions.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInlineSuggestions(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleUseSuggestion(suggestion)}
                  className={cn(
                    "w-full p-3 text-left text-sm rounded-lg border transition-all",
                    "hover:bg-gray-50 hover:border-gray-300",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    selectedSuggestionIndex === index
                      ? "bg-blue-50 border-blue-200 shadow-sm"
                      : "bg-white border-gray-100"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {suggestion.category}
                      </Badge>
                      {suggestion.confidence > 0.8 && (
                        <Badge variant="secondary" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {suggestion.estimatedResponseTime}s
                    </div>
                  </div>
                  
                  <p className="text-gray-900 line-clamp-2">
                    {suggestion.text}
                  </p>
                  
                  {suggestion.shortcuts && (
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Atalho:</span>
                      <kbd className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded border">
                        {suggestion.shortcuts[0]}
                      </kbd>
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    <ArrowDown className="h-3 w-3 mr-1" />
                    navegar
                  </span>
                  <span className="flex items-center">
                    <Command className="h-3 w-3 mr-1" />
                    Enter usar
                  </span>
                  <span>Esc fechar</span>
                </div>
                {isLoading && (
                  <div className="flex items-center">
                    <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full mr-2"></div>
                    <span>Carregando...</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message input area */}
      <div className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "min-h-[44px] resize-none pr-12",
              showInlineSuggestions && hasSuggestions && "ring-2 ring-blue-500/20"
            )}
            style={{ 
              maxHeight: `${maxRows * 24}px`,
              overflowY: 'auto'
            }}
          />
          
          {/* AI indicator when suggestions are available */}
          {showSuggestions && hasSuggestions && !showInlineSuggestions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInlineSuggestions(true)}
              className="absolute right-2 top-2 h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
              title="Mostrar sugestões da IA"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Button 
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          size="icon"
          className="h-11 w-11 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick suggestion pills (alternative to dropdown) */}
      {showSuggestions && !showInlineSuggestions && hasSuggestions && message.length <= 10 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.slice(0, 2).map((suggestion) => (
            <Button
              key={suggestion.id}
              variant="outline"
              size="sm"
              onClick={() => handleUseSuggestion(suggestion)}
              className="h-8 text-xs px-3 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            >
              <MessageSquare className="h-3 w-3 mr-2" />
              {suggestion.text.slice(0, 30)}
              {suggestion.text.length > 30 && '...'}
            </Button>
          ))}
          
          {suggestions.length > 2 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInlineSuggestions(true)}
              className="h-8 text-xs px-3 text-gray-600 hover:text-gray-900"
            >
              +{suggestions.length - 2} mais
            </Button>
          )}
        </div>
      )}
    </div>
  )
}