import { Node, Edge } from 'reactflow'

// Template de flow para negociação de dívidas via builder visual
export const negotiationTemplateFlow = {
  id: 'template_negotiation_flow',
  name: 'Template: Negociação de Dívidas',
  description: 'Flow pré-configurado para processar clientes em fila de negociação via template WhatsApp',
  
  nodes: [
    // 1. Trigger: Template Button Click
    {
      id: 'trigger_1',
      type: 'trigger_template_button',
      position: { x: 100, y: 100 },
      data: {
        label: 'Clique no Template',
        template_name: 'payment_negotiation',
        button_id: 'negotiate',
        action_type: 'start_flow',
        target_flow: 'negotiation_flow'
      }
    },

    // 2. Check Customer Eligibility
    {
      id: 'api_1',
      type: 'api_rest',
      position: { x: 400, y: 100 },
      data: {
        label: 'Verificar Elegibilidade',
        endpoint: '/api/customers/{{contact_id}}/eligibility',
        method: 'GET',
        description: 'Verifica se cliente é elegível para negociação'
      }
    },

    // 3. Decision: Eligible?
    {
      id: 'condition_1',
      type: 'logic',
      position: { x: 700, y: 100 },
      data: {
        label: 'Cliente Elegível?',
        condition: '{{eligibility.eligible}} === true',
        description: 'Verifica critérios de elegibilidade'
      }
    },

    // 4a. If Eligible: Send Negotiation Template
    {
      id: 'template_1',
      type: 'msg_negotiation_template',
      position: { x: 1000, y: 50 },
      data: {
        label: 'Template Negociação',
        customer_name: '{{customer.name}}',
        amount: '{{debt.amount}}',
        due_date: '{{debt.due_date}}',
        discount_options: [
          { percentage: 30, deadline: 'hoje', enabled: true },
          { percentage: 20, deadline: '3 dias', enabled: true },
          { percentage: 10, deadline: '7 dias', enabled: true }
        ],
        buttons: [
          {
            id: 'negotiate',
            text: '💬 Negociar',
            action: 'start_flow',
            payload: 'negotiation_flow'
          },
          {
            id: 'pay_pix',
            text: '💳 Pagar PIX',
            action: 'pix_payment',
            payload: ''
          },
          {
            id: 'talk_agent',
            text: '🧑‍💼 Atendente',
            action: 'transfer',
            payload: 'billing_agent'
          }
        ]
      }
    },

    // 4b. If Not Eligible: Add to Queue
    {
      id: 'queue_1',
      type: 'api_negotiation_queue',
      position: { x: 1000, y: 200 },
      data: {
        label: 'Fila de Negociação',
        queue_type: 'manual',
        priority: 'medium',
        department: 'Cobrança',
        auto_assign: true,
        criteria: {
          amount_threshold: 100,
          overdue_days: 30,
          customer_score: 500
        }
      }
    },

    // 5. Handle Template Responses
    {
      id: 'switch_1',
      type: 'logic',
      position: { x: 1300, y: 50 },
      data: {
        label: 'Processar Resposta',
        description: 'Roteia baseado na ação do usuário'
      }
    },

    // 6a. Start Negotiation Flow
    {
      id: 'flow_1',
      type: 'api_start_negotiation_flow',
      position: { x: 1600, y: 0 },
      data: {
        label: 'Iniciar Negociação',
        flow_id: 'negotiation_flow',
        customer_id: '{{contact_id}}',
        amount: '{{debt.amount}}',
        auto_discounts: true
      }
    },

    // 6b. Generate PIX Payment
    {
      id: 'api_2',
      type: 'api_rest',
      position: { x: 1600, y: 100 },
      data: {
        label: 'Gerar PIX',
        endpoint: '/api/payments/generate-pix',
        method: 'POST',
        description: 'Gera código PIX para pagamento imediato'
      }
    },

    // 6c. Transfer to Agent
    {
      id: 'api_3',
      type: 'api_rest',
      position: { x: 1600, y: 200 },
      data: {
        label: 'Transferir Atendente',
        endpoint: '/api/agents/transfer',
        method: 'POST',
        description: 'Transfere para atendente humano'
      }
    },

    // 7. Queue Success
    {
      id: 'message_1',
      type: 'message',
      position: { x: 1300, y: 200 },
      data: {
        label: 'Cliente Enfileirado',
        content: '📋 Seu caso foi adicionado à fila de negociação. Nossa equipe entrará em contato em até 2 horas úteis.'
      }
    },

    // 8. Not Eligible Message
    {
      id: 'message_2',
      type: 'message',
      position: { x: 700, y: 250 },
      data: {
        label: 'Não Elegível',
        content: '⚠️ No momento você não está elegível para negociação. Entre em contato com nosso suporte.'
      }
    }
  ] as Node[],

  edges: [
    // Template click → Check eligibility
    {
      id: 'e1',
      source: 'trigger_1',
      target: 'api_1',
      type: 'default'
    },
    
    // Check eligibility → Decision
    {
      id: 'e2',
      source: 'api_1',
      target: 'condition_1',
      type: 'default'
    },
    
    // Eligible → Send template
    {
      id: 'e3',
      source: 'condition_1',
      target: 'template_1',
      sourceHandle: 'true',
      type: 'default',
      label: 'Elegível'
    },
    
    // Not eligible → Add to queue
    {
      id: 'e4',
      source: 'condition_1',
      target: 'queue_1',
      sourceHandle: 'false',
      type: 'default',
      label: 'Não elegível'
    },
    
    // Not eligible → Message
    {
      id: 'e5',
      source: 'condition_1',
      target: 'message_2',
      sourceHandle: 'false',
      type: 'default'
    },
    
    // Template → Switch
    {
      id: 'e6',
      source: 'template_1',
      target: 'switch_1',
      sourceHandle: 'negotiate',
      type: 'default'
    },
    
    // Switch → Start negotiation
    {
      id: 'e7',
      source: 'switch_1',
      target: 'flow_1',
      type: 'default',
      label: 'Negociar'
    },
    
    // Switch → PIX payment
    {
      id: 'e8',
      source: 'switch_1',
      target: 'api_2',
      type: 'default',
      label: 'PIX'
    },
    
    // Switch → Transfer agent
    {
      id: 'e9',
      source: 'switch_1',
      target: 'api_3',
      type: 'default',
      label: 'Atendente'
    },
    
    // Queue → Success message
    {
      id: 'e10',
      source: 'queue_1',
      target: 'message_1',
      sourceHandle: 'queued',
      type: 'default'
    }
  ] as Edge[],

  // Configurações do template
  config: {
    eligibility_criteria: {
      min_amount: 50.00,
      max_overdue_days: 180,
      min_customer_score: 300,
      blacklist_check: true
    },
    
    negotiation_options: {
      auto_discounts: [30, 20, 10],
      installment_options: [2, 3, 6],
      max_discount: 40,
      min_payment: 50.00
    },
    
    queue_settings: {
      default_priority: 'medium',
      auto_assign: true,
      max_queue_time_hours: 24,
      escalation_rules: {
        high_value: { amount: 1000, priority: 'high' },
        vip_customer: { score: 800, priority: 'urgent' }
      }
    },
    
    notifications: {
      queue_added: true,
      negotiation_started: true,
      payment_generated: true,
      agent_transferred: true
    }
  }
}

// Função para criar uma instância do template
export function createNegotiationTemplateInstance(customConfig?: any) {
  const template = { ...negotiationTemplateFlow }
  
  // Personalizar configurações se fornecidas
  if (customConfig) {
    template.config = { ...template.config, ...customConfig }
    template.name = customConfig.name || template.name
    template.id = customConfig.id || `negotiation_${Date.now()}`
  }
  
  return template
}

// Validação do template
export function validateNegotiationTemplate(template: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Verificar nodes obrigatórios
  const requiredNodes = ['trigger_template_button', 'msg_negotiation_template', 'api_negotiation_queue']
  requiredNodes.forEach(nodeType => {
    const hasNode = template.nodes.some((node: any) => node.type === nodeType)
    if (!hasNode) {
      errors.push(`Missing required node type: ${nodeType}`)
    }
  })
  
  // Verificar configurações
  if (!template.config?.eligibility_criteria) {
    errors.push('Missing eligibility criteria configuration')
  }
  
  if (!template.config?.negotiation_options) {
    errors.push('Missing negotiation options configuration')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Exportar metadados do template
export const negotiationTemplateMetadata = {
  id: 'negotiation_template',
  name: 'Template de Negociação',
  description: 'Template completo para automação de negociação de dívidas',
  category: 'cobranca',
  version: '1.0.0',
  author: 'PyTake',
  tags: ['negociacao', 'cobranca', 'whatsapp', 'template'],
  requirements: {
    nodes: ['msg_negotiation_template', 'api_negotiation_queue'],
    apis: ['/api/customers/eligibility', '/api/payments/generate-pix'],
    features: ['whatsapp_templates', 'payment_integration']
  },
  preview_image: '/templates/negotiation-preview.png',
  estimated_setup_time: '15 minutes'
}