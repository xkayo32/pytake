-- Atualizar o fluxo universal com estrutura completa e funcional
UPDATE flows 
SET 
  nodes = '[
    {
      "id": "start-node",
      "type": "trigger_universal",
      "position": {"x": 250, "y": 50},
      "data": {
        "label": "Fluxo Universal",
        "icon": "Zap",
        "color": "green",
        "nodeType": "trigger_universal",
        "description": "Responde a todas as mensagens sem gatilho específico",
        "config": {
          "customName": "Trigger Universal",
          "priority": 0,
          "description": "Captura todas mensagens que não ativaram outros fluxos"
        }
      }
    },
    {
      "id": "check-window",
      "type": "logic_window_check",
      "position": {"x": 250, "y": 200},
      "data": {
        "label": "Verificar Janela 24h",
        "icon": "Clock",
        "color": "#0ea5e9",
        "nodeType": "logic_window_check",
        "description": "Verifica se existe janela de conversa ativa",
        "outputLabels": ["Com Janela", "Sem Janela"],
        "config": {
          "customName": "Verificar Janela WhatsApp",
          "fallback_template": "pytake_saudacao"
        }
      }
    },
    {
      "id": "send-welcome",
      "type": "msg_text",
      "position": {"x": 100, "y": 350},
      "data": {
        "label": "Enviar Mensagem",
        "icon": "MessageCircle",
        "color": "#10b981",
        "nodeType": "msg_text",
        "description": "Envia mensagem de boas-vindas",
        "config": {
          "customName": "Mensagem de Boas-Vindas",
          "message": "Olá! 👋\n\nObrigado por entrar em contato!\n\nComo posso ajudar você hoje?\n\nDigite:\n1️⃣ - Ver produtos\n2️⃣ - Falar com atendente\n3️⃣ - Ver horário de funcionamento\n4️⃣ - Localização",
          "typing_duration": 2
        }
      }
    },
    {
      "id": "send-template",
      "type": "msg_template",
      "position": {"x": 400, "y": 350},
      "data": {
        "label": "Enviar Template",
        "icon": "FileText",
        "color": "#f59e0b",
        "nodeType": "msg_template",
        "description": "Envia template aprovado quando não há janela",
        "config": {
          "customName": "Template de Reengajamento",
          "template": "pytake_saudacao",
          "language": "pt_BR"
        }
      }
    },
    {
      "id": "capture-response",
      "type": "msg_text",
      "position": {"x": 250, "y": 500},
      "data": {
        "label": "Processar Resposta",
        "icon": "MessageSquare",
        "color": "#8b5cf6",
        "nodeType": "msg_text",
        "description": "Aguarda e processa resposta do usuário",
        "config": {
          "customName": "Aguardar Resposta",
          "message": "Recebi sua mensagem: {{user_message}}\n\nEstou processando sua solicitação...",
          "capture_response": true,
          "response_timeout": 30
        }
      }
    },
    {
      "id": "check-option",
      "type": "logic_condition",
      "position": {"x": 250, "y": 650},
      "data": {
        "label": "Verificar Opção",
        "icon": "GitBranch",
        "color": "#a855f7",
        "nodeType": "logic_condition",
        "description": "Verifica qual opção foi escolhida",
        "outputLabels": ["Opção Válida", "Opção Inválida"],
        "config": {
          "customName": "Verificar Escolha do Menu",
          "variable": "user_message",
          "operator": "in",
          "value": "1,2,3,4"
        }
      }
    },
    {
      "id": "handle-option-1",
      "type": "msg_text",
      "position": {"x": 50, "y": 800},
      "data": {
        "label": "Produtos",
        "icon": "Package",
        "color": "#10b981",
        "nodeType": "msg_text",
        "description": "Mostra lista de produtos",
        "config": {
          "customName": "Listar Produtos",
          "message": "📦 *Nossos Produtos:*\n\n• Produto A - R$ 29,90\n• Produto B - R$ 49,90\n• Produto C - R$ 79,90\n\nPara mais detalhes, digite o nome do produto."
        }
      }
    },
    {
      "id": "handle-option-2",
      "type": "action_transfer",
      "position": {"x": 200, "y": 800},
      "data": {
        "label": "Transferir Atendente",
        "icon": "Users",
        "color": "#ef4444",
        "nodeType": "action_transfer",
        "description": "Transfere para atendimento humano",
        "config": {
          "customName": "Transferir para Humano",
          "department": "vendas",
          "message": "Vou transferir você para um de nossos atendentes. Um momento..."
        }
      }
    },
    {
      "id": "handle-option-3",
      "type": "msg_text",
      "position": {"x": 350, "y": 800},
      "data": {
        "label": "Horários",
        "icon": "Clock",
        "color": "#10b981",
        "nodeType": "msg_text",
        "description": "Informa horário de funcionamento",
        "config": {
          "customName": "Informar Horários",
          "message": "🕐 *Horário de Funcionamento:*\n\n• Segunda a Sexta: 8h às 18h\n• Sábado: 9h às 13h\n• Domingo: Fechado\n\n*Atendimento Online:* 24/7"
        }
      }
    },
    {
      "id": "handle-option-4",
      "type": "msg_location",
      "position": {"x": 500, "y": 800},
      "data": {
        "label": "Localização",
        "icon": "MapPin",
        "color": "#10b981",
        "nodeType": "msg_location",
        "description": "Envia localização da empresa",
        "config": {
          "customName": "Enviar Localização",
          "latitude": -23.550520,
          "longitude": -46.633308,
          "name": "Nossa Loja",
          "address": "Av. Paulista, 1000 - São Paulo, SP"
        }
      }
    },
    {
      "id": "invalid-option",
      "type": "msg_text",
      "position": {"x": 400, "y": 950},
      "data": {
        "label": "Opção Inválida",
        "icon": "AlertCircle",
        "color": "#f59e0b",
        "nodeType": "msg_text",
        "description": "Mensagem para opção inválida",
        "config": {
          "customName": "Resposta Inválida",
          "message": "❌ Opção inválida!\n\nPor favor, digite um número de 1 a 4 para escolher uma opção do menu."
        }
      }
    },
    {
      "id": "end-flow",
      "type": "flow_end",
      "position": {"x": 250, "y": 1100},
      "data": {
        "label": "Fim do Fluxo",
        "icon": "CheckCircle",
        "color": "#6b7280",
        "nodeType": "flow_end",
        "description": "Finaliza o fluxo",
        "config": {
          "customName": "Encerrar Atendimento",
          "message": "Obrigado pelo contato! 😊"
        }
      }
    }
  ]'::jsonb,
  edges = '[
    {
      "id": "edge-1",
      "source": "start-node",
      "target": "check-window",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "edge-2",
      "source": "check-window",
      "sourceHandle": "yes",
      "target": "send-welcome",
      "type": "smoothstep",
      "animated": true,
      "label": "Com Janela"
    },
    {
      "id": "edge-3",
      "source": "check-window",
      "sourceHandle": "no",
      "target": "send-template",
      "type": "smoothstep",
      "animated": true,
      "label": "Sem Janela"
    },
    {
      "id": "edge-4",
      "source": "send-welcome",
      "target": "capture-response",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "edge-5",
      "source": "send-template",
      "target": "capture-response",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "edge-6",
      "source": "capture-response",
      "target": "check-option",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "edge-7",
      "source": "check-option",
      "sourceHandle": "yes",
      "target": "handle-option-1",
      "type": "smoothstep",
      "animated": true,
      "label": "Opção 1",
      "style": {"stroke": "#10b981"}
    },
    {
      "id": "edge-8",
      "source": "check-option",
      "sourceHandle": "yes",
      "target": "handle-option-2",
      "type": "smoothstep",
      "animated": true,
      "label": "Opção 2",
      "style": {"stroke": "#ef4444"}
    },
    {
      "id": "edge-9",
      "source": "check-option",
      "sourceHandle": "yes",
      "target": "handle-option-3",
      "type": "smoothstep",
      "animated": true,
      "label": "Opção 3",
      "style": {"stroke": "#0ea5e9"}
    },
    {
      "id": "edge-10",
      "source": "check-option",
      "sourceHandle": "yes",
      "target": "handle-option-4",
      "type": "smoothstep",
      "animated": true,
      "label": "Opção 4",
      "style": {"stroke": "#8b5cf6"}
    },
    {
      "id": "edge-11",
      "source": "check-option",
      "sourceHandle": "no",
      "target": "invalid-option",
      "type": "smoothstep",
      "animated": true,
      "label": "Inválido",
      "style": {"stroke": "#f59e0b"}
    },
    {
      "id": "edge-12",
      "source": "handle-option-1",
      "target": "end-flow",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "edge-13",
      "source": "handle-option-2",
      "target": "end-flow",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "edge-14",
      "source": "handle-option-3",
      "target": "end-flow",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "edge-15",
      "source": "handle-option-4",
      "target": "end-flow",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "edge-16",
      "source": "invalid-option",
      "target": "capture-response",
      "type": "smoothstep",
      "animated": true,
      "style": {"stroke": "#f59e0b", "strokeDasharray": "5 5"}
    }
  ]'::jsonb,
  description = 'Fluxo universal inteligente que responde automaticamente a todas mensagens não capturadas por outros fluxos. Inclui menu interativo, verificação de janela 24h e múltiplas opções de resposta.',
  updated_at = NOW()
WHERE id = '0af45494-0ebf-48dd-9c36-56bb5be9c74f';