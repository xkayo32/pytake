-- Insert test flow
INSERT INTO flows (
  tenant_id,
  name,
  description,
  status,
  trigger_type,
  trigger_config,
  flow_data,
  tags
) VALUES (
  '223e4567-e89b-12d3-a456-426614174003'::uuid,
  'Boas-vindas Novo Cliente',
  'Fluxo automático de boas-vindas para novos clientes que escrevem "oi" ou "olá"',
  'active',
  'keyword',
  '{"keywords": "oi,olá,ola,bom dia,boa tarde,boa noite"}'::jsonb,
  '{
    "nodes": [
      {
        "id": "start",
        "type": "trigger",
        "data": {"label": "Palavra-chave detectada"}
      },
      {
        "id": "welcome",
        "type": "message",
        "data": {"text": "Olá! Bem-vindo ao PyTake! Como posso ajudar?"}
      },
      {
        "id": "menu",
        "type": "message",
        "data": {"text": "1 - Suporte\n2 - Vendas\n3 - Financeiro"}
      }
    ],
    "edges": [
      {"source": "start", "target": "welcome"},
      {"source": "welcome", "target": "menu"}
    ]
  }'::jsonb,
  ARRAY['atendimento', 'automático']
);

-- Insert another test flow
INSERT INTO flows (
  tenant_id,
  name,
  description,
  status,
  trigger_type,
  trigger_config,
  flow_data,
  tags
) VALUES (
  '223e4567-e89b-12d3-a456-426614174003'::uuid,
  'Suporte Técnico',
  'Direciona clientes para suporte técnico e coleta informações do problema',
  'active',
  'keyword',
  '{"keywords": "problema,erro,bug,não funciona,ajuda,help"}'::jsonb,
  '{
    "nodes": [
      {
        "id": "start",
        "type": "trigger",
        "data": {"label": "Problema detectado"}
      },
      {
        "id": "support",
        "type": "message",
        "data": {"text": "Entendo que você está com problemas. Vou transferir você para o suporte técnico."}
      },
      {
        "id": "collect",
        "type": "message",
        "data": {"text": "Por favor, descreva seu problema detalhadamente."}
      }
    ],
    "edges": [
      {"source": "start", "target": "support"},
      {"source": "support", "target": "collect"}
    ]
  }'::jsonb,
  ARRAY['suporte', 'técnico']
);

-- Insert draft flow
INSERT INTO flows (
  tenant_id,
  name,
  description,
  status,
  trigger_type,
  trigger_config,
  flow_data,
  tags
) VALUES (
  '223e4567-e89b-12d3-a456-426614174003'::uuid,
  'Agendamento Consulta',
  'Permite agendar consultas através do WhatsApp com integração ao calendário',
  'draft',
  'keyword',
  '{"keywords": "agendar,consulta,horário,marcar"}'::jsonb,
  '{
    "nodes": [],
    "edges": []
  }'::jsonb,
  ARRAY['agendamento', 'calendário']
);