import React from 'react'
import { WhatsAppButton } from '@/lib/data/whatsapp-templates'

interface ButtonSelectorProps {
  buttons: WhatsAppButton[]
  selectedButtons: string[]
  captureAll: boolean
  onSelectionChange: (selected: string[]) => void
}

export function ButtonSelector({ 
  buttons, 
  selectedButtons = [], 
  captureAll, 
  onSelectionChange 
}: ButtonSelectorProps) {
  
  const handleCheckboxChange = (buttonId: string, checked: boolean) => {
    console.log('ButtonSelector - checkbox change:', buttonId, checked)
    
    const currentSelection = Array.isArray(selectedButtons) ? selectedButtons : []
    const newSelection = checked
      ? [...currentSelection, buttonId]
      : currentSelection.filter(id => id !== buttonId)
    
    console.log('ButtonSelector - new selection:', newSelection)
    onSelectionChange(newSelection)
  }
  
  if (buttons.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-2 border rounded">
        Este template não possui botões
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {buttons.map((button) => {
        const buttonId = button.id || button.text
        const isSelected = captureAll || (Array.isArray(selectedButtons) && selectedButtons.includes(buttonId))
        
        return (
          <div key={buttonId} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`btn-select-${buttonId}`}
              checked={isSelected}
              disabled={captureAll}
              onChange={(e) => {
                if (!captureAll) {
                  handleCheckboxChange(buttonId, e.target.checked)
                }
              }}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <label 
              htmlFor={`btn-select-${buttonId}`}
              className={`text-sm flex items-center gap-1 ${captureAll ? 'opacity-60' : 'cursor-pointer'} select-none`}
            >
              {button.type === 'QUICK_REPLY' && '⚡'}
              {button.type === 'URL' && '🔗'}
              {button.type === 'PHONE_NUMBER' && '📞'}
              <span>{button.text}</span>
              <span className="text-xs text-muted-foreground">({button.type})</span>
            </label>
          </div>
        )
      })}
      
      <p className="text-xs text-muted-foreground">
        {captureAll 
          ? 'Todos os botões estão sendo capturados' 
          : 'Selecione os botões que deseja capturar'}
      </p>
    </div>
  )
}