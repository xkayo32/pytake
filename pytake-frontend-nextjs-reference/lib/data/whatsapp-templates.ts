// Mock de templates do WhatsApp Business API
// Em produção, isso viria da API

export interface WhatsAppButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'
  text: string
  id?: string
  url?: string
  phone_number?: string
}

export interface WhatsAppTemplate {
  id: string
  name: string
  language: string
  category: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  components: {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
    text?: string
    buttons?: WhatsAppButton[]
  }[]
  variables?: string[]
}

// Templates de exemplo
export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'welcome_message',
    name: 'welcome_message',
    language: 'pt_BR',
    category: 'MARKETING',
    status: 'APPROVED',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Bem-vindo à {{1}}!'
      },
      {
        type: 'BODY',
        text: 'Olá {{2}}! Obrigado por entrar em contato conosco. Como podemos ajudar você hoje?'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Ver Produtos', id: 'view_products' },
          { type: 'QUICK_REPLY', text: 'Falar com Vendedor', id: 'talk_sales' },
          { type: 'QUICK_REPLY', text: 'Suporte Técnico', id: 'tech_support' }
        ]
      }
    ],
    variables: ['company_name', 'customer_name']
  },
  {
    id: 'payment_reminder',
    name: 'payment_reminder',
    language: 'pt_BR',
    category: 'UTILITY',
    status: 'APPROVED',
    components: [
      {
        type: 'BODY',
        text: 'Olá {{1}}, sua fatura no valor de R$ {{2}} vence em {{3}}. Gostaria de negociar?'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Ver Fatura', id: 'view_invoice' },
          { type: 'QUICK_REPLY', text: 'Negociar', id: 'negotiate' },
          { type: 'QUICK_REPLY', text: 'Pagar com PIX', id: 'pay_pix' }
        ]
      }
    ],
    variables: ['customer_name', 'amount', 'due_date']
  },
  {
    id: 'order_confirmation',
    name: 'order_confirmation', 
    language: 'pt_BR',
    category: 'MARKETING',
    status: 'APPROVED',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE'
      },
      {
        type: 'BODY',
        text: 'Pedido #{{1}} confirmado! Valor total: R$ {{2}}. Previsão de entrega: {{3}}'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Rastrear Pedido', id: 'track_order' },
          { type: 'URL', text: 'Ver no Site', url: 'https://example.com/order/{{1}}' }
        ]
      }
    ],
    variables: ['order_id', 'total_amount', 'delivery_date']
  },
  {
    id: 'satisfaction_survey',
    name: 'satisfaction_survey',
    language: 'pt_BR',
    category: 'MARKETING',
    status: 'APPROVED',
    components: [
      {
        type: 'BODY',
        text: 'Olá {{1}}, como foi sua experiência com nosso atendimento?'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: '😃 Ótimo', id: 'rating_great' },
          { type: 'QUICK_REPLY', text: '😐 Regular', id: 'rating_regular' },
          { type: 'QUICK_REPLY', text: '😞 Ruim', id: 'rating_bad' }
        ]
      }
    ],
    variables: ['customer_name']
  },
  {
    id: 'appointment_reminder',
    name: 'appointment_reminder',
    language: 'pt_BR',
    category: 'UTILITY',
    status: 'APPROVED',
    components: [
      {
        type: 'BODY',
        text: 'Lembrete: Você tem um agendamento em {{1}} às {{2}} com {{3}}.'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Confirmar', id: 'confirm_appointment' },
          { type: 'QUICK_REPLY', text: 'Reagendar', id: 'reschedule' },
          { type: 'QUICK_REPLY', text: 'Cancelar', id: 'cancel_appointment' },
          { type: 'PHONE_NUMBER', text: 'Ligar', phone_number: '+5511999999999' }
        ]
      }
    ],
    variables: ['date', 'time', 'professional_name']
  }
]

// Função para buscar templates
export function getWhatsAppTemplates(): WhatsAppTemplate[] {
  return WHATSAPP_TEMPLATES.filter(t => t.status === 'APPROVED')
}

// Função para buscar template por nome
export function getTemplateByName(name: string): WhatsAppTemplate | undefined {
  return WHATSAPP_TEMPLATES.find(t => t.name === name)
}

// Função para obter botões de um template
export function getTemplateButtons(templateName: string): WhatsAppButton[] {
  const template = getTemplateByName(templateName)
  if (!template) return []
  
  const buttonsComponent = template.components.find(c => c.type === 'BUTTONS')
  return buttonsComponent?.buttons || []
}