import React from 'react'
import { Check, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WhatsAppPreviewProps {
  message: string
  phoneNumber?: string
  contactName?: string
  timestamp?: Date
  status?: 'sending' | 'sent' | 'delivered' | 'read'
}

export function WhatsAppPreview({ 
  message, 
  phoneNumber = '+55 11 98765-4321',
  contactName = 'Cliente',
  timestamp = new Date(),
  status = 'sent'
}: WhatsAppPreviewProps) {
  // Formatar mensagem com estilos do WhatsApp
  const formatMessage = (text: string) => {
    if (!text) return ''
    
    // Substituir formatação do WhatsApp
    let formatted = text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>') // *negrito*
      .replace(/_(.*?)_/g, '<em>$1</em>') // _itálico_
      .replace(/~(.*?)~/g, '<del>$1</del>') // ~tachado~
      .replace(/```(.*?)```/gs, '<code class="block">$1</code>') // ```código```
      .replace(/`(.*?)`/g, '<code>$1</code>') // `código inline`
      .replace(/\n/g, '<br />') // quebras de linha
    
    return formatted
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'read':
        return <CheckCheck className="h-4 w-4 text-blue-500" />
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-gray-400" />
      case 'sent':
        return <Check className="h-4 w-4 text-gray-400" />
      default:
        return null
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* WhatsApp Container */}
      <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-lg p-4">
        {/* Header */}
        <div className="bg-[#075e54] dark:bg-[#1f2c33] text-white p-3 -m-4 mb-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
              {contactName.substring(0, 1).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{contactName}</div>
              <div className="text-xs opacity-90">{phoneNumber}</div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="space-y-2">
          {/* Received Message Example */}
          <div className="flex justify-start">
            <div className="max-w-[75%] bg-white dark:bg-[#1f2c33] rounded-lg p-2 shadow-sm">
              <p className="text-sm text-gray-800 dark:text-gray-200">
                Olá! Gostaria de saber mais sobre seus produtos.
              </p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-xs text-gray-500">10:30</span>
              </div>
            </div>
          </div>

          {/* Sent Message */}
          <div className="flex justify-end">
            <div className="max-w-[75%] bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg p-2 shadow-sm">
              <div 
                className="text-sm text-gray-800 dark:text-gray-200"
                dangerouslySetInnerHTML={{ __html: formatMessage(message || 'Digite sua mensagem...') }}
              />
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {format(timestamp, 'HH:mm', { locale: ptBR })}
                </span>
                {getStatusIcon()}
              </div>
            </div>
          </div>
        </div>

        {/* Input Area (Visual only) */}
        <div className="mt-4 -mx-4 -mb-4 p-3 bg-[#f0f0f0] dark:bg-[#1f2c33] rounded-b-lg">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-4 py-2">
              <span className="text-sm text-gray-500">Digite uma mensagem</span>
            </div>
            <div className="w-10 h-10 bg-[#075e54] dark:bg-[#00a884] rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Character Counter */}
      {message && (
        <div className="mt-2 text-center">
          <span className={`text-xs ${message.length > 1024 ? 'text-red-500' : 'text-gray-500'}`}>
            {message.length} / 1024 caracteres
          </span>
        </div>
      )}
    </div>
  )
}