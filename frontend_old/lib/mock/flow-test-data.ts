/**
 * Sistema Mock Completo para Testes de Flow - PyTake
 * 
 * Dados mock para o flow "Boas-vindas Automáticas" com execução funcional
 * Permite desenvolvimento e teste offline sem dependência do backend
 */

export interface MockFlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    [key: string]: any
  }
}

export interface MockFlowEdge {
  id: string
  source: string
  target: string
  condition?: string
  data?: {
    condition?: string
    label?: string
  }
}

export interface MockFlow {
  id: string
  name: string
  description: string
  status: string
  nodes: MockFlowNode[]
  edges: MockFlowEdge[]
  variables?: Record<string, any>
  settings?: Record<string, any>
}

// Flow "Boas-vindas Automáticas" - Completamente funcional
export const MOCK_WELCOME_FLOW: MockFlow = {
  id: "a4ac6fc3-ad2d-4125-81fa-9685b88697fc",
  name: "Boas-vindas Automáticas",
  description: "Flow automático de boas-vindas para novos contatos com menu interativo",
  status: "active",
  nodes: [
    // === TRIGGER NODE ===
    {
      id: "trigger_001",
      type: "trigger_keyword",
      position: { x: 100, y: 100 },
      data: {
        label: "🎯 Trigger - Palavras-chave",
        keywords: ["oi", "olá", "hello", "start", "começar", "ajuda", "menu"],
        caseSensitive: false,
        triggerMessage: "Trigger ativado por palavra-chave"
      }
    },

    // === WELCOME MESSAGE ===
    {
      id: "welcome_001", 
      type: "message",
      position: { x: 350, y: 100 },
      data: {
        label: "👋 Mensagem de Boas-vindas",
        message: "👋 Olá {{contact.name}}! Bem-vindo ao *PyTake*!\n\n🤖 Sou o assistente virtual e estou aqui para ajudá-lo.\n\n⚡ Sistema de automação para WhatsApp mais avançado do Brasil!",
        delay: 1000
      }
    },

    // === MAIN MENU (BUTTONS) ===
    {
      id: "menu_001",
      type: "buttons", 
      position: { x: 600, y: 100 },
      data: {
        label: "🏠 Menu Principal",
        message: "🏠 *Menu Principal*\n\nEscolha uma das opções abaixo para continuar:",
        buttons: [
          {
            id: "info",
            text: "📋 Informações",
            description: "Saiba mais sobre o PyTake"
          },
          {
            id: "support",
            text: "🆘 Suporte", 
            description: "Precisa de ajuda?"
          },
          {
            id: "products",
            text: "🛍️ Produtos",
            description: "Conheça nossos planos"
          }
        ]
      }
    },

    // === INFORMATION BRANCH ===
    {
      id: "info_001",
      type: "message",
      position: { x: 400, y: 300 },
      data: {
        label: "📋 Informações da Empresa",
        message: "*📋 Sobre o PyTake:*\n\n✅ Sistema de automação para WhatsApp\n✅ Chatbots inteligentes com IA\n✅ Integração com APIs e ERPs\n✅ Dashboard completo e relatórios\n✅ Suporte 24/7\n\n🌐 *Visite:* https://pytake.com\n📧 *Contato:* contato@pytake.com",
        delay: 1500
      }
    },

    // === SUPPORT BRANCH ===
    {
      id: "support_001",
      type: "input",
      position: { x: 700, y: 300 },
      data: {
        label: "🆘 Coleta de Problema",
        message: "*🆘 Suporte Técnico*\n\nDescreva seu problema ou dúvida detalhadamente:\n\n_(Mínimo 10 caracteres)_",
        variable: "support_message",
        validation: {
          required: true,
          minLength: 10,
          maxLength: 500
        },
        placeholder: "Ex: Não consigo conectar meu WhatsApp..."
      }
    },

    {
      id: "support_002",
      type: "message",
      position: { x: 950, y: 300 },
      data: {
        label: "✅ Confirmação Suporte",
        message: "*✅ Mensagem recebida com sucesso!*\n\n📝 *Problema reportado:*\n_{{support_message}}_\n\n⏱️ Nossa equipe retornará em *até 2 horas*\n\n🎟️ *Protocolo:* #{{flow.execution_id}}\n\n📞 *Urgente?* WhatsApp: (11) 99999-9999",
        delay: 2000
      }
    },

    // === PRODUCTS BRANCH ===
    {
      id: "products_001",
      type: "interactive_list",
      position: { x: 300, y: 500 },
      data: {
        label: "🛍️ Lista de Produtos",
        content: {
          header: "🛍️ Nossos Planos",
          body: "Escolha o plano ideal para seu negócio:",
          footer: "PyTake - Automação Inteligente",
          button: "Ver Planos",
          sections: [
            {
              title: "💼 Planos Básicos",
              rows: [
                {
                  id: "plan_starter",
                  title: "🚀 Starter",
                  description: "Até 1.000 mensagens/mês • R$ 29/mês"
                },
                {
                  id: "plan_basic", 
                  title: "⚡ Basic",
                  description: "Até 5.000 mensagens/mês • R$ 79/mês"
                }
              ]
            },
            {
              title: "🏢 Planos Avançados",
              rows: [
                {
                  id: "plan_pro",
                  title: "💼 Professional", 
                  description: "Até 15.000 mensagens/mês • R$ 199/mês"
                },
                {
                  id: "plan_enterprise",
                  title: "🏢 Enterprise",
                  description: "Mensagens ilimitadas • R$ 499/mês"
                }
              ]
            }
          ]
        }
      }
    },

    // === SWITCH/CONDITION NODE ===
    {
      id: "product_details_001",
      type: "switch",
      position: { x: 600, y: 500 },
      data: {
        label: "🔀 Switch Produtos",
        variable: "selected_option",
        cases: {
          "plan_starter": "starter_details",
          "plan_basic": "basic_details", 
          "plan_pro": "pro_details",
          "plan_enterprise": "enterprise_details"
        },
        defaultCase: "menu_001"
      }
    },

    // === PRODUCT DETAILS ===
    {
      id: "starter_details",
      type: "message",
      position: { x: 200, y: 700 },
      data: {
        label: "🚀 Detalhes Starter",
        message: "*🚀 Plano Starter*\n\n📊 Até *1.000* mensagens/mês\n💬 *1* número WhatsApp\n🤖 Chatbots básicos\n📈 Relatórios simples\n\n💰 *R$ 29/mês*\n\n✅ Ideal para pequenos negócios iniciantes\n\n🎁 *7 dias grátis* para testar!"
      }
    },

    {
      id: "basic_details", 
      type: "message",
      position: { x: 400, y: 700 },
      data: {
        label: "⚡ Detalhes Basic",
        message: "*⚡ Plano Basic*\n\n📊 Até *5.000* mensagens/mês\n💬 *2* números WhatsApp\n🤖 Chatbots avançados\n📈 Relatórios detalhados\n🔗 Integrações básicas\n\n💰 *R$ 79/mês*\n\n⭐ *Mais escolhido* pelos nossos clientes!"
      }
    },

    {
      id: "pro_details",
      type: "message", 
      position: { x: 600, y: 700 },
      data: {
        label: "💼 Detalhes Professional",
        message: "*💼 Plano Professional*\n\n📊 Até *15.000* mensagens/mês\n💬 *5* números WhatsApp\n🤖 IA Avançada (ChatGPT)\n📈 Analytics completos\n🔗 Integrações ilimitadas\n👥 Múltiplos usuários\n\n💰 *R$ 199/mês*\n\n🏆 Para empresas em crescimento!"
      }
    },

    {
      id: "enterprise_details",
      type: "message",
      position: { x: 800, y: 700 },
      data: {
        label: "🏢 Detalhes Enterprise", 
        message: "*🏢 Plano Enterprise*\n\n📊 Mensagens *ilimitadas*\n💬 Números *ilimitados*\n🤖 IA Customizada\n📈 Dashboards personalizados\n🔗 API dedicada\n👥 Usuários *ilimitados*\n🔒 Segurança avançada\n👨‍💼 Account Manager\n\n💰 *R$ 499/mês*\n\n🚀 Solução corporativa completa!"
      }
    },

    // === BACK TO MENU OPTIONS ===
    {
      id: "back_menu_001",
      type: "buttons",
      position: { x: 500, y: 900 },
      data: {
        label: "🔄 Opções de Navegação",
        message: "📍 *O que deseja fazer agora?*",
        buttons: [
          {
            id: "menu",
            text: "🏠 Voltar ao Menu", 
            description: "Retornar ao menu principal"
          },
          {
            id: "contact_sales",
            text: "💬 Falar com Vendas",
            description: "Contato direto com nossa equipe"
          },
          {
            id: "end",
            text: "✋ Finalizar",
            description: "Encerrar conversa"
          }
        ]
      }
    },

    // === CONTACT SALES ===
    {
      id: "contact_sales_001",
      type: "message",
      position: { x: 300, y: 1100 },
      data: {
        label: "💬 Contato Vendas",
        message: "*💬 Fale com Nossa Equipe de Vendas*\n\n👨‍💼 *Consultor especializado* te aguarda!\n\n📞 *Telefone:* (11) 3333-4444\n📱 *WhatsApp:* (11) 99999-8888\n📧 *Email:* vendas@pytake.com\n\n🕐 *Horário:* Segunda à Sexta, 8h às 18h\n\n✨ *Solicite uma demonstração gratuita!*"
      }
    },

    // === END NODE ===
    {
      id: "end_001",
      type: "message",
      position: { x: 500, y: 1300 },
      data: {
        label: "✨ Finalização",
        message: "*✨ Obrigado por usar o PyTake!*\n\n🔄 Digite *'menu'* para voltar ao início\n📞 *Suporte 24h:* (11) 99999-9999\n🌐 *Site:* https://pytake.com\n📧 *Email:* contato@pytake.com\n\n*Até mais! 👋*"
      }
    }
  ],

  // === FLOW EDGES (CONNECTIONS) ===
  edges: [
    // Main flow path
    { id: "e1", source: "trigger_001", target: "welcome_001" },
    { id: "e2", source: "welcome_001", target: "menu_001" },
    
    // Menu branches
    { id: "e3", source: "menu_001", target: "info_001", condition: "info" },
    { id: "e4", source: "menu_001", target: "support_001", condition: "support" },
    { id: "e5", source: "menu_001", target: "products_001", condition: "products" },
    
    // Info branch
    { id: "e6", source: "info_001", target: "back_menu_001" },
    
    // Support branch
    { id: "e7", source: "support_001", target: "support_002" },
    { id: "e8", source: "support_002", target: "back_menu_001" },
    
    // Products branch
    { id: "e9", source: "products_001", target: "product_details_001" },
    
    // Product details branches
    { id: "e10", source: "product_details_001", target: "starter_details", condition: "plan_starter" },
    { id: "e11", source: "product_details_001", target: "basic_details", condition: "plan_basic" },
    { id: "e12", source: "product_details_001", target: "pro_details", condition: "plan_pro" },
    { id: "e13", source: "product_details_001", target: "enterprise_details", condition: "plan_enterprise" },
    
    // From product details to navigation
    { id: "e14", source: "starter_details", target: "back_menu_001" },
    { id: "e15", source: "basic_details", target: "back_menu_001" },
    { id: "e16", source: "pro_details", target: "back_menu_001" },
    { id: "e17", source: "enterprise_details", target: "back_menu_001" },
    
    // Navigation options
    { id: "e18", source: "back_menu_001", target: "menu_001", condition: "menu" },
    { id: "e19", source: "back_menu_001", target: "contact_sales_001", condition: "contact_sales" },
    { id: "e20", source: "back_menu_001", target: "end_001", condition: "end" },
    
    // From contact sales to end
    { id: "e21", source: "contact_sales_001", target: "end_001" }
  ],

  // === FLOW VARIABLES ===
  variables: {
    "contact.name": "Usuário Teste",
    "contact.phone": "+5511999999999",
    "flow.id": "a4ac6fc3-ad2d-4125-81fa-9685b88697fc",
    "flow.name": "Boas-vindas Automáticas",
    "flow.execution_id": "EXEC_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
    "support_message": "",
    "selected_option": "",
    "current_timestamp": new Date().toISOString()
  },

  // === FLOW SETTINGS ===
  settings: {
    timeout_minutes: 30,
    max_iterations: 50,
    fallback_node: "end_001",
    enable_debug: true,
    auto_save_variables: true
  }
}

// Lista de flows disponíveis para mock
export const MOCK_FLOWS_LIST = [
  {
    id: MOCK_WELCOME_FLOW.id,
    name: MOCK_WELCOME_FLOW.name,
    description: MOCK_WELCOME_FLOW.description,
    status: MOCK_WELCOME_FLOW.status,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-08-24T14:20:00Z",
    version: 1
  }
]

// Função helper para obter flow mock por ID
export function getMockFlowById(id: string): MockFlow | null {
  if (id === MOCK_WELCOME_FLOW.id) {
    return MOCK_WELCOME_FLOW
  }
  return null
}

// Função helper para verificar se um flow ID é mock
export function isMockFlow(id: string): boolean {
  return id === MOCK_WELCOME_FLOW.id
}

// Tipos de nós suportados no sistema mock
export const SUPPORTED_NODE_TYPES = [
  'trigger_keyword',
  'message',
  'buttons', 
  'input',
  'interactive_list',
  'switch',
  'condition'
]

// Função helper para validar se um nó é suportado
export function isNodeTypeSupported(nodeType: string): boolean {
  return SUPPORTED_NODE_TYPES.includes(nodeType)
}