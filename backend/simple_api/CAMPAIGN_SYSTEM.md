# Sistema de Campanhas - PyTake Backend

Este documento descreve o sistema completo de campanhas para envio em massa implementado no PyTake Backend.

## Visão Geral

O sistema de campanhas permite criar, gerenciar e executar campanhas de marketing via WhatsApp em grande escala, com recursos avançados de segmentação, análise e otimização.

## Funcionalidades Principais

### 1. Gestão de Campanhas

#### Criação de Campanhas
```http
POST /api/v1/campaigns
```

**Recursos:**
- Nome, descrição e objetivo da campanha
- Agendamento por data/hora específica
- Campanhas recorrentes (diário, semanal, mensal)
- Configuração de throttling para evitar spam
- Segmentação avançada de contatos
- Templates de mensagens reutilizáveis
- A/B testing com múltiplas variações

**Exemplo de Payload:**
```json
{
  "name": "Campanha Black Friday",
  "description": "Promoção especial para clientes VIP",
  "objective": "promotional",
  "scheduled_at": "2024-11-29T09:00:00Z",
  "recurrence": {
    "frequency": "daily",
    "interval": 1,
    "end_type": "after",
    "max_occurrences": 5,
    "hour": 9,
    "minute": 0
  },
  "throttle_config": {
    "messages_per_minute": 10,
    "messages_per_hour": 600,
    "messages_per_day": 10000,
    "delay_between_messages_ms": 1000,
    "respect_business_hours": true,
    "business_hours_start": 9,
    "business_hours_end": 18,
    "timezone_per_contact": true
  },
  "segmentation": {
    "include_all": false,
    "included_tags": ["vip", "black-friday"],
    "excluded_tags": ["unsubscribed"],
    "custom_filters": [
      {
        "field": "last_purchase",
        "operator": "greater_than",
        "value": "2024-01-01"
      }
    ]
  },
  "templates": [
    {
      "name": "Black Friday Offer",
      "content": "🔥 Olá {{name}}! Aproveite 50% OFF em todos os produtos até {{date}}!",
      "template_type": "text",
      "variables": ["name", "date"],
      "ab_variant": "A"
    }
  ],
  "ab_test_config": {
    "enabled": true,
    "test_percentage": 20.0,
    "variants": [
      {"name": "A", "percentage": 50.0, "template_id": "uuid-template-a"},
      {"name": "B", "percentage": 50.0, "template_id": "uuid-template-b"}
    ],
    "metric_to_optimize": "conversion_rate",
    "minimum_sample_size": 100,
    "significance_level": 0.95
  }
}
```

#### Controle de Campanhas
```http
POST /api/v1/campaigns/{id}/start  # Iniciar campanha
POST /api/v1/campaigns/{id}/pause  # Pausar campanha
GET /api/v1/campaigns              # Listar campanhas
```

**Filtros de Listagem:**
- Status (draft, running, paused, completed)
- Objetivo (engagement, conversions, retention)
- Período de criação
- Paginação e ordenação

### 2. Gestão de Contatos

#### Importação em Massa
```http
POST /api/v1/contacts/import
```

**Recursos:**
- Importação de CSV, JSON, Excel
- Estratégias de merge (skip, update, replace)
- Criação automática de grupos
- Validação de números de telefone
- Campos customizados flexíveis

**Exemplo de Importação:**
```json
{
  "source": "csv",
  "data": [
    {
      "phone_number": "+5561999999999",
      "name": "João Silva",
      "email": "joao@example.com",
      "custom_fields": {
        "cidade": "Brasília",
        "idade": "35",
        "categoria": "vip"
      },
      "timezone": "America/Sao_Paulo"
    }
  ],
  "group_name": "Clientes Black Friday",
  "tags": ["black-friday", "promocao"],
  "merge_strategy": "update"
}
```

#### Gerenciamento de Tags
```http
POST /api/v1/contacts/tags
```

Adicionar tags a múltiplos contatos por ID ou número de telefone.

### 3. Analytics e Relatórios

#### Analytics Detalhado
```http
GET /api/v1/campaigns/{id}/analytics
```

**Métricas Disponíveis:**
- Taxa de entrega e leitura
- Click-through rate (CTR)
- Taxa de conversão
- Engagement por horário/dia
- Performance por segmento
- ROI e custo por conversão
- Funil de conversão completo

**Exemplo de Response:**
```json
{
  "campaign_id": "uuid",
  "campaign_name": "Black Friday Campaign",
  "status": "completed",
  "metrics": {
    "total_recipients": 10000,
    "messages_sent": 9950,
    "messages_delivered": 9800,
    "messages_read": 7500,
    "clicks": 1200,
    "conversions": 350,
    "delivery_rate": 98.49,
    "open_rate": 76.53,
    "click_through_rate": 12.24,
    "conversion_rate": 3.57,
    "roi": 450.0
  },
  "ab_test_results": {
    "test_status": "completed",
    "winning_variant": "B",
    "confidence_level": 96.5,
    "variants_performance": {
      "A": {
        "conversion_rate": 3.2,
        "click_through_rate": 11.8,
        "sample_size": 500
      },
      "B": {
        "conversion_rate": 4.1,
        "click_through_rate": 13.2,
        "sample_size": 500
      }
    }
  },
  "conversion_funnel": {
    "sent": 9950,
    "delivered": 9800,
    "opened": 7500,
    "clicked": 1200,
    "converted": 350
  }
}
```

## Estrutura do Banco de Dados

### Tabelas Principais

#### campaigns
```sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    objective VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL,
    organization_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    recurrence_config JSONB,
    throttle_config JSONB NOT NULL,
    segmentation JSONB NOT NULL,
    ab_test_config JSONB,
    metrics JSONB DEFAULT '{}'::jsonb
);
```

#### campaign_contacts
```sql
CREATE TABLE campaign_contacts (
    id UUID PRIMARY KEY,
    phone_number VARCHAR NOT NULL,
    name VARCHAR,
    email VARCHAR,
    organization_id UUID NOT NULL,
    groups JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    timezone VARCHAR,
    is_opted_out BOOLEAN DEFAULT false,
    is_blacklisted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_interaction TIMESTAMP WITH TIME ZONE,
    UNIQUE(phone_number, organization_id)
);
```

#### message_templates
```sql
CREATE TABLE message_templates (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    name VARCHAR NOT NULL,
    content TEXT NOT NULL,
    template_type VARCHAR NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    media_url TEXT,
    media_type VARCHAR,
    buttons JSONB,
    ab_variant VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### campaign_messages
```sql
CREATE TABLE campaign_messages (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    contact_id UUID NOT NULL REFERENCES campaign_contacts(id),
    template_id UUID NOT NULL REFERENCES message_templates(id),
    phone_number VARCHAR NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'queued',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    converted_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    ab_variant VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Recursos Avançados

### 1. A/B Testing
- Divisão automática do público em variantes
- Análise estatística de significância
- Determinação automática do vencedor
- Otimização baseada em métricas escolhidas

### 2. Throttling Inteligente
- Controle de velocidade por minuto/hora/dia
- Respeito aos horários comerciais
- Consideração de fuso horário por contato
- Prevenção de spam e bloqueios

### 3. Segmentação Avançada
- Filtros customizados por qualquer campo
- Combinação de grupos e tags
- Inclusão/exclusão flexível
- Estimativa de público em tempo real

### 4. Agendamento e Recorrência
- Agendamento preciso com timezone
- Campanhas recorrentes flexíveis
- Controle de fim de recorrência
- Pausar/retomar funcionalidade

### 5. Analytics em Tempo Real
- Métricas atualizadas constantemente
- Análise por período (hora, dia, semana)
- Performance por segmento
- Funil de conversão detalhado

## Integração com WhatsApp

O sistema se integra com:
- **WhatsApp Business API Oficial**
- **Evolution API**
- Webhooks para status de mensagem
- Suporte a mídia (imagens, vídeos, documentos)
- Botões interativos

## Configuração de Ambiente

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/pytake

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=verify_token

# Redis (para cache e filas)
REDIS_URL=redis://localhost:6379

# Rate Limiting
MAX_MESSAGES_PER_MINUTE=10
MAX_MESSAGES_PER_HOUR=600
MAX_MESSAGES_PER_DAY=10000
```

## Uso em Produção

### Considerações de Performance
- Connection pooling para PostgreSQL
- Índices otimizados para consultas frequentes
- Processamento assíncrono de mensagens
- Cache em Redis para dados frequentes

### Monitoramento
- Logs estruturados com tracing
- Métricas de performance por endpoint
- Alertas para falhas de campanha
- Dashboard de saúde do sistema

### Segurança
- Validação de tokens JWT
- Rate limiting por usuário
- Sanitização de inputs
- Auditoria de operações

## Exemplos de Uso

### 1. Campanha Simples
```bash
curl -X POST http://localhost:8080/api/v1/campaigns \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Promoção de Fim de Ano",
    "description": "Ofertas especiais para clientes",
    "objective": "promotional",
    "throttle_config": {
      "messages_per_minute": 5,
      "messages_per_hour": 300,
      "messages_per_day": 5000
    },
    "segmentation": {
      "include_all": true
    },
    "templates": [{
      "name": "Oferta",
      "content": "🎉 Promoção especial! 30% OFF em tudo!",
      "template_type": "text"
    }]
  }'
```

### 2. Importar Contatos
```bash
curl -X POST http://localhost:8080/api/v1/contacts/import \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "json",
    "data": [
      {
        "phone_number": "+5561999999999",
        "name": "Cliente Teste",
        "custom_fields": {"cidade": "Brasília"}
      }
    ],
    "tags": ["teste"],
    "merge_strategy": "update"
  }'
```

### 3. Iniciar Campanha
```bash
curl -X POST http://localhost:8080/api/v1/campaigns/{campaign_id}/start \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 4. Ver Analytics
```bash
curl -X GET http://localhost:8080/api/v1/campaigns/{campaign_id}/analytics \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Roadmap Futuro

- [ ] Interface web para criação de campanhas
- [ ] Editor visual de templates
- [ ] Integração com CRM externos  
- [ ] Machine learning para otimização automática
- [ ] Suporte a múltiplos canais (SMS, Email)
- [ ] Templates de campanha pré-definidos
- [ ] Automação baseada em triggers
- [ ] API webhooks para eventos de campanha

## Suporte e Documentação

- **Swagger UI**: http://localhost:8080/docs
- **ReDoc**: http://localhost:8080/redoc  
- **OpenAPI JSON**: http://localhost:8080/api-docs/openapi.json

Para dúvidas ou sugestões, consulte a documentação completa da API ou entre em contato com a equipe de desenvolvimento.