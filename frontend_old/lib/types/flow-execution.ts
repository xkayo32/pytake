// Flow Execution Types
export interface FlowSession {
  id: string
  flowId: string
  contactId: string
  conversationId: string
  currentNodeId: string
  status: 'active' | 'waiting' | 'completed' | 'failed'
  context: Record<string, any>
  variables: Record<string, any>
  startedAt: Date
  lastActivity: Date
  expiresAt?: Date
}

export interface MenuOption {
  id: string
  label: string
  value: string
  description?: string
  icon?: string
  action?: 'flow' | 'message' | 'api' | 'transfer'
  targetId?: string // flowId, agentId, etc
}

export interface InteractiveMessage {
  type: 'buttons' | 'list' | 'reply_buttons'
  header?: {
    type: 'text' | 'image' | 'video' | 'document'
    content: string
  }
  body: string
  footer?: string
  options: MenuOption[]
}

// Example Flow Scenarios
export const FLOW_EXAMPLES = {
  // Scenario 1: Template redirects to flow
  templateToFlow: {
    trigger: 'template_sent',
    template: {
      name: 'welcome_offer',
      content: 'Olá! Temos uma oferta especial para você. Gostaria de saber mais?',
      buttons: [
        { id: '1', text: 'Ver Ofertas', action: 'start_flow', flowId: 'offer_flow' },
        { id: '2', text: 'Falar com Vendedor', action: 'transfer', agentId: 'sales' },
        { id: '3', text: 'Não tenho interesse', action: 'end' }
      ]
    },
    flow: {
      id: 'offer_flow',
      name: 'Fluxo de Ofertas',
      nodes: [
        {
          id: 'start',
          type: 'entry',
          next: 'show_categories'
        },
        {
          id: 'show_categories',
          type: 'interactive_list',
          content: {
            header: 'Nossas Categorias',
            body: 'Escolha uma categoria para ver as ofertas:',
            sections: [
              {
                title: 'Produtos',
                rows: [
                  { id: 'eletronicos', title: 'Eletrônicos', description: 'Até 40% OFF' },
                  { id: 'moda', title: 'Moda', description: 'Até 60% OFF' },
                  { id: 'casa', title: 'Casa e Decoração', description: 'Até 50% OFF' }
                ]
              }
            ]
          },
          next: 'process_category'
        },
        {
          id: 'process_category',
          type: 'switch',
          condition: '{{selected_option}}',
          cases: {
            'eletronicos': 'show_electronics',
            'moda': 'show_fashion',
            'casa': 'show_home',
            'default': 'show_all'
          }
        }
      ]
    }
  },

  // Scenario 2: User message triggers menu
  messageToMenu: {
    trigger: 'user_message',
    keywords: ['menu', 'opções', 'ajuda', 'oi', 'olá'],
    response: {
      type: 'interactive_buttons',
      content: {
        header: {
          type: 'text',
          content: '🤖 PyTake Assistant'
        },
        body: 'Olá! Sou o assistente virtual da PyTake. Como posso ajudar você hoje?',
        footer: 'Escolha uma opção abaixo',
        buttons: [
          {
            id: 'support',
            text: '🛠️ Suporte Técnico',
            action: 'flow',
            flowId: 'support_flow'
          },
          {
            id: 'sales',
            text: '💰 Vendas',
            action: 'flow',
            flowId: 'sales_flow'
          },
          {
            id: 'billing',
            text: '📄 Financeiro',
            action: 'flow',
            flowId: 'billing_flow'
          }
        ]
      }
    }
  },

  // Scenario 3: Dynamic menu based on context
  contextualMenu: {
    trigger: 'check_user_status',
    conditions: [
      {
        if: 'user.hasOpenTicket',
        show: {
          type: 'buttons',
          body: 'Você tem um chamado em aberto. O que deseja fazer?',
          buttons: [
            { text: 'Ver Status', action: 'api', endpoint: '/tickets/status' },
            { text: 'Adicionar Info', action: 'flow', flowId: 'add_info_flow' },
            { text: 'Falar com Agente', action: 'transfer' }
          ]
        }
      },
      {
        if: 'user.hasPendingPayment',
        show: {
          type: 'buttons',
          body: 'Você tem uma fatura pendente de R$ {{amount}}',
          buttons: [
            { text: 'Pagar Agora', action: 'payment', method: 'pix' },
            { text: 'Ver Detalhes', action: 'api', endpoint: '/billing/details' },
            { text: 'Negociar', action: 'flow', flowId: 'negotiation_flow' }
          ]
        }
      }
    ]
  },

  // Scenario 4: Multi-step form with validation
  formFlow: {
    id: 'registration_flow',
    name: 'Cadastro de Cliente',
    nodes: [
      {
        id: 'ask_name',
        type: 'input',
        message: 'Por favor, digite seu nome completo:',
        variable: 'name',
        validation: 'min:3,max:100',
        next: 'ask_cpf'
      },
      {
        id: 'ask_cpf',
        type: 'input',
        message: 'Agora, digite seu CPF (apenas números):',
        variable: 'cpf',
        validation: 'cpf',
        next: 'ask_email'
      },
      {
        id: 'ask_email',
        type: 'input',
        message: 'Digite seu melhor e-mail:',
        variable: 'email',
        validation: 'email',
        next: 'confirm_data'
      },
      {
        id: 'confirm_data',
        type: 'buttons',
        message: `Confirme seus dados:\n\n📝 Nome: {{name}}\n📄 CPF: {{cpf}}\n✉️ Email: {{email}}`,
        buttons: [
          { text: '✅ Confirmar', next: 'save_data' },
          { text: '✏️ Corrigir', next: 'ask_name' },
          { text: '❌ Cancelar', next: 'end' }
        ]
      },
      {
        id: 'save_data',
        type: 'api',
        endpoint: '/customers/create',
        method: 'POST',
        body: {
          name: '{{name}}',
          cpf: '{{cpf}}',
          email: '{{email}}'
        },
        next: 'success'
      }
    ]
  },

  // Scenario 5: AI-powered decision flow
  aiDecisionFlow: {
    id: 'smart_support',
    name: 'Suporte Inteligente',
    nodes: [
      {
        id: 'analyze_message',
        type: 'ai_classifier',
        model: 'gpt-4',
        prompt: 'Classifique a intenção do usuário: suporte_tecnico, vendas, financeiro, ou outros',
        input: '{{user_message}}',
        output: 'intent',
        next: 'route_by_intent'
      },
      {
        id: 'route_by_intent',
        type: 'switch',
        condition: '{{intent}}',
        cases: {
          'suporte_tecnico': 'technical_support',
          'vendas': 'sales_flow',
          'financeiro': 'billing_flow',
          'default': 'ask_clarification'
        }
      },
      {
        id: 'ask_clarification',
        type: 'ai_response',
        model: 'gpt-4',
        prompt: 'Responda educadamente pedindo mais detalhes sobre o que o usuário precisa',
        context: '{{conversation_history}}',
        next: 'show_menu'
      }
    ]
  }
}

// Flow Engine Functions
export class FlowEngine {
  async executeNode(session: FlowSession, node: any): Promise<void> {
    switch (node.type) {
      case 'interactive_list':
        await this.sendInteractiveList(session, node)
        break
      case 'buttons':
        await this.sendButtons(session, node)
        break
      case 'input':
        await this.waitForInput(session, node)
        break
      case 'ai_classifier':
        await this.classifyWithAI(session, node)
        break
      case 'switch':
        await this.evaluateCondition(session, node)
        break
      case 'api':
        await this.callAPI(session, node)
        break
    }
  }

  async sendInteractiveList(session: FlowSession, node: any): Promise<void> {
    // Send WhatsApp interactive list message
    const message = {
      type: 'interactive',
      interactive: {
        type: 'list',
        header: node.content.header,
        body: this.replaceVariables(node.content.body, session.variables),
        footer: node.content.footer,
        action: {
          button: 'Ver Opções',
          sections: node.content.sections
        }
      }
    }
    // Send via WhatsApp API
  }

  async sendButtons(session: FlowSession, node: any): Promise<void> {
    // Send WhatsApp buttons message
    const message = {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: this.replaceVariables(node.message, session.variables)
        },
        action: {
          buttons: node.buttons.map((btn: any) => ({
            type: 'reply',
            reply: {
              id: btn.id || btn.next,
              title: btn.text
            }
          }))
        }
      }
    }
    // Send via WhatsApp API
  }

  async waitForInput(session: FlowSession, node: any): Promise<void> {
    // Send message and wait for user response
    await this.sendMessage(session.contactId, node.message)
    session.status = 'waiting'
    session.context.waitingFor = {
      nodeId: node.id,
      variable: node.variable,
      validation: node.validation
    }
  }

  replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match
    })
  }

  private async sendMessage(contactId: string, message: string): Promise<void> {
    // Implementation to send WhatsApp message
  }

  private async classifyWithAI(session: FlowSession, node: any): Promise<void> {
    // Call AI to classify message
  }

  private async evaluateCondition(session: FlowSession, node: any): Promise<void> {
    // Evaluate switch condition and route to next node
  }

  private async callAPI(session: FlowSession, node: any): Promise<void> {
    // Make API call with node configuration
  }
}