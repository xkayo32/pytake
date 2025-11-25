export type TemplateStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'disabled'
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
export type ComponentType = 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
export type ButtonType = 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL'
export type HeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'

export interface TemplateVariable {
  key: string
  example: string
  description?: string
}

export interface TemplateButton {
  type: ButtonType
  text: string
  phone_number?: string
  url?: string
  url_type?: 'STATIC' | 'DYNAMIC'
  example?: string
}

export interface TemplateComponent {
  type: ComponentType
  format?: HeaderFormat
  text?: string
  buttons?: TemplateButton[]
  variables?: TemplateVariable[]
  example?: {
    header_text?: string[]
    header_url?: string[]
    body_text?: string[][]
  }
}

export interface Template {
  id: string
  name: string
  category: TemplateCategory
  language: string
  status: TemplateStatus
  components: TemplateComponent[]
  createdAt: string
  updatedAt: string
  approvedAt?: string
  rejectedAt?: string
  rejectionReason?: string
  tags: string[]
  stats?: {
    sent: number
    delivered: number
    read: number
    replied: number
  }
}

// Mock data para templates
export const MOCK_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'welcome_message',
    category: 'UTILITY',
    language: 'pt_BR',
    status: 'approved',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Bem-vindo ao {{1}}!'
      },
      {
        type: 'BODY',
        text: 'Olá {{1}}! 👋\n\nÉ um prazer ter você conosco. Somos especialistas em {{2}} e estamos aqui para ajudar.\n\n📞 Atendimento: Segunda a Sexta, das 9h às 18h\n📧 Email: contato@empresa.com\n\nComo podemos ajudá-lo hoje?',
        variables: [
          { key: '{{1}}', example: 'João', description: 'Nome do cliente' },
          { key: '{{2}}', example: 'soluções digitais', description: 'Especialidade da empresa' }
        ]
      },
      {
        type: 'FOOTER',
        text: 'Responda com um número:\n1 - Fazer pedido\n2 - Suporte técnico\n3 - Falar com atendente'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Fazer Pedido' },
          { type: 'QUICK_REPLY', text: 'Suporte' },
          { type: 'QUICK_REPLY', text: 'Atendente' }
        ]
      }
    ],
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    approvedAt: '2024-01-11T14:20:00Z',
    tags: ['boas-vindas', 'automático'],
    stats: {
      sent: 1250,
      delivered: 1230,
      read: 1180,
      replied: 450
    }
  },
  {
    id: '2',
    name: 'order_confirmation',
    category: 'UTILITY',
    language: 'pt_BR',
    status: 'approved',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        example: {
          header_url: ['https://example.com/order-success.png']
        }
      },
      {
        type: 'BODY',
        text: '✅ *Pedido Confirmado!*\n\nOlá {{1}}, seu pedido #{{2}} foi confirmado com sucesso!\n\n📦 *Itens do pedido:*\n{{3}}\n\n💰 *Total:* R$ {{4}}\n📍 *Endereço de entrega:*\n{{5}}\n\n🚚 *Prazo estimado:* {{6}} dias úteis\n\nVocê receberá atualizações sobre o status da entrega.',
        variables: [
          { key: '{{1}}', example: 'Maria', description: 'Nome do cliente' },
          { key: '{{2}}', example: '12345', description: 'Número do pedido' },
          { key: '{{3}}', example: '2x Produto A\n1x Produto B', description: 'Lista de itens' },
          { key: '{{4}}', example: '150,00', description: 'Valor total' },
          { key: '{{5}}', example: 'Rua Example, 123', description: 'Endereço' },
          { key: '{{6}}', example: '3-5', description: 'Prazo de entrega' }
        ]
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Rastrear Pedido', url: 'https://exemplo.com/rastreio/{{1}}', url_type: 'DYNAMIC' }
        ]
      }
    ],
    createdAt: '2024-01-12T09:00:00Z',
    updatedAt: '2024-01-14T11:20:00Z',
    approvedAt: '2024-01-13T08:30:00Z',
    tags: ['pedido', 'confirmação', 'e-commerce'],
    stats: {
      sent: 890,
      delivered: 885,
      read: 850,
      replied: 120
    }
  },
  {
    id: '3',
    name: 'payment_reminder',
    category: 'UTILITY',
    language: 'pt_BR',
    status: 'approved',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '⚠️ Lembrete de Pagamento'
      },
      {
        type: 'BODY',
        text: 'Olá {{1}},\n\nIdentificamos que sua fatura de {{2}} no valor de R$ {{3}} vence em {{4}}.\n\n📄 *Detalhes da fatura:*\nReferência: {{5}}\nVencimento: {{4}}\nValor: R$ {{3}}\n\nPara sua comodidade, você pode pagar através do link abaixo ou PIX.',
        variables: [
          { key: '{{1}}', example: 'Carlos', description: 'Nome do cliente' },
          { key: '{{2}}', example: 'Janeiro/2024', description: 'Mês de referência' },
          { key: '{{3}}', example: '299,90', description: 'Valor da fatura' },
          { key: '{{4}}', example: '20/01/2024', description: 'Data de vencimento' },
          { key: '{{5}}', example: 'FAT-2024-001', description: 'Código da fatura' }
        ]
      },
      {
        type: 'FOOTER',
        text: 'Evite cortes ou suspensões. Mantenha seu pagamento em dia.'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Pagar Agora', url: 'https://pagamento.exemplo.com/{{1}}', url_type: 'DYNAMIC' },
          { type: 'QUICK_REPLY', text: 'Ver Fatura' },
          { type: 'PHONE_NUMBER', text: 'Ligar Suporte', phone_number: '+5511999999999' }
        ]
      }
    ],
    createdAt: '2024-01-08T14:30:00Z',
    updatedAt: '2024-01-10T09:15:00Z',
    approvedAt: '2024-01-09T16:45:00Z',
    tags: ['cobrança', 'lembrete', 'financeiro'],
    stats: {
      sent: 3450,
      delivered: 3400,
      read: 3200,
      replied: 890
    }
  },
  {
    id: '4',
    name: 'promotional_offer',
    category: 'MARKETING',
    language: 'pt_BR',
    status: 'pending',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        example: {
          header_url: ['https://example.com/promo-banner.jpg']
        }
      },
      {
        type: 'BODY',
        text: '🎉 *OFERTA ESPECIAL PARA VOCÊ!*\n\nOlá {{1}}! Temos uma oferta imperdível:\n\n🏷️ *{{2}}% de desconto* em {{3}}\n\n⏰ Válido até: {{4}}\n🎯 Código promocional: *{{5}}*\n\nNão perca essa oportunidade única de economizar!',
        variables: [
          { key: '{{1}}', example: 'Ana', description: 'Nome do cliente' },
          { key: '{{2}}', example: '30', description: 'Percentual de desconto' },
          { key: '{{3}}', example: 'toda a loja', description: 'Produtos em promoção' },
          { key: '{{4}}', example: '31/01/2024', description: 'Data limite' },
          { key: '{{5}}', example: 'PROMO30', description: 'Código promocional' }
        ]
      },
      {
        type: 'FOOTER',
        text: 'Termos e condições se aplicam.'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Comprar Agora', url: 'https://loja.exemplo.com/promo', url_type: 'STATIC' },
          { type: 'QUICK_REPLY', text: 'Ver Produtos' }
        ]
      }
    ],
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
    tags: ['promoção', 'desconto', 'marketing'],
    stats: {
      sent: 0,
      delivered: 0,
      read: 0,
      replied: 0
    }
  },
  {
    id: '5',
    name: 'appointment_reminder',
    category: 'UTILITY',
    language: 'pt_BR',
    status: 'approved',
    components: [
      {
        type: 'BODY',
        text: '📅 *Lembrete de Agendamento*\n\nOlá {{1}}, lembramos que você tem um agendamento marcado:\n\n📍 Local: {{2}}\n📅 Data: {{3}}\n⏰ Horário: {{4}}\n👨‍⚕️ Profissional: {{5}}\n\n*Importante:*\n• Chegue com 15 minutos de antecedência\n• Traga documentos necessários\n• Em caso de cancelamento, avise com 24h de antecedência',
        variables: [
          { key: '{{1}}', example: 'Roberto', description: 'Nome do paciente' },
          { key: '{{2}}', example: 'Clínica Saúde', description: 'Local do atendimento' },
          { key: '{{3}}', example: '25/01/2024', description: 'Data do agendamento' },
          { key: '{{4}}', example: '14:30', description: 'Horário' },
          { key: '{{5}}', example: 'Dr. Silva', description: 'Nome do profissional' }
        ]
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Confirmar Presença' },
          { type: 'QUICK_REPLY', text: 'Reagendar' },
          { type: 'QUICK_REPLY', text: 'Cancelar' }
        ]
      }
    ],
    createdAt: '2024-01-05T15:20:00Z',
    updatedAt: '2024-01-06T10:10:00Z',
    approvedAt: '2024-01-06T14:30:00Z',
    tags: ['agendamento', 'lembrete', 'saúde'],
    stats: {
      sent: 567,
      delivered: 560,
      read: 540,
      replied: 234
    }
  },
  {
    id: '6',
    name: 'feedback_request',
    category: 'MARKETING',
    language: 'pt_BR',
    status: 'draft',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Sua opinião é importante! ⭐'
      },
      {
        type: 'BODY',
        text: 'Olá {{1}},\n\nEsperamos que tenha tido uma ótima experiência com {{2}}!\n\nSua opinião é fundamental para melhorarmos nossos serviços. Que tal avaliar seu atendimento?\n\n⭐⭐⭐⭐⭐\n\nLeva apenas 1 minuto!',
        variables: [
          { key: '{{1}}', example: 'Cliente', description: 'Nome do cliente' },
          { key: '{{2}}', example: 'nosso produto', description: 'Produto ou serviço' }
        ]
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Avaliar Agora', url: 'https://feedback.exemplo.com', url_type: 'STATIC' },
          { type: 'QUICK_REPLY', text: 'Mais Tarde' }
        ]
      }
    ],
    createdAt: '2024-01-15T16:00:00Z',
    updatedAt: '2024-01-15T16:00:00Z',
    tags: ['feedback', 'avaliação', 'pós-venda'],
    stats: {
      sent: 0,
      delivered: 0,
      read: 0,
      replied: 0
    }
  }
]