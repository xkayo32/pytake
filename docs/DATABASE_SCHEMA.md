# 🗄️ Schema do Banco de Dados - PyTake

## 📋 Índice
- [Visão Geral](#visão-geral)
- [PostgreSQL - Dados Relacionais](#postgresql---dados-relacionais)
- [MongoDB - Logs e Documentos](#mongodb---logs-e-documentos)
- [Redis - Cache e Filas](#redis---cache-e-filas)
- [Relacionamentos](#relacionamentos)
- [Índices e Performance](#índices-e-performance)
- [Migrations](#migrations)

---

## 🎯 Visão Geral

O PyTake utiliza uma arquitetura **polyglot persistence**:

- **PostgreSQL**: Dados estruturados e transacionais
- **MongoDB**: Logs, histórico de mensagens, analytics
- **Redis**: Cache, sessões, filas de tarefas

---

## 🐘 PostgreSQL - Dados Relacionais

### Diagrama ER Simplificado

```
┌─────────────────┐       ┌──────────────────┐
│  Organizations  │───┬───│      Users       │
└─────────────────┘   │   └──────────────────┘
         │            │            │
         │            │            │
         ├────────────┼────────────┼───────────┐
         │            │            │           │
         ▼            ▼            ▼           ▼
┌──────────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐
│   Chatbots   │ │ Contacts │ │Campaigns│ │ Teams  │
└──────┬───────┘ └────┬─────┘ └────┬────┘ └────────┘
       │              │             │
       │              │             │
       ▼              ▼             ▼
┌──────────────┐ ┌──────────────────────┐
│    Flows     │ │   Conversations      │
└──────┬───────┘ └──────────┬───────────┘
       │                    │
       ▼                    ▼
┌──────────────┐ ┌──────────────────────┐
│    Nodes     │ │      Messages        │
└──────────────┘ └──────────────────────┘
```

---

### Tabelas Detalhadas

#### 1. `organizations` (Multi-tenancy)

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,

    -- WhatsApp Business Info (DEPRECATED - usar whatsapp_numbers table)
    whatsapp_business_id VARCHAR(255),
    whatsapp_webhook_verify_token VARCHAR(255),

    -- Subscription
    plan_type VARCHAR(50) DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'professional', 'enterprise')),
    plan_expires_at TIMESTAMP WITH TIME ZONE,

    -- Limits
    max_chatbots INTEGER DEFAULT 1,
    max_whatsapp_numbers INTEGER DEFAULT 1,
    max_contacts INTEGER DEFAULT 1000,
    max_agents INTEGER DEFAULT 3,
    max_departments INTEGER DEFAULT 3,
    monthly_message_limit INTEGER DEFAULT 1000,

    -- Metadata
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
```

#### 2. `users`

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,

    -- Profile
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone_number VARCHAR(20),

    -- Role & Permissions
    role VARCHAR(50) DEFAULT 'agent' CHECK (role IN ('super_admin', 'org_admin', 'agent', 'viewer')),
    permissions JSONB DEFAULT '[]',

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMP WITH TIME ZONE,

    -- Security
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,

    -- Metadata
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_role ON users(organization_id, role);
```

#### 3. `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

#### 4. `whatsapp_numbers` (Múltiplos Números WhatsApp)

```sql
CREATE TABLE whatsapp_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- WhatsApp Info
    phone_number VARCHAR(20) NOT NULL,
    phone_number_id VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),

    -- Meta/WhatsApp Business Account
    whatsapp_business_account_id VARCHAR(255),
    access_token_encrypted TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,

    -- Quality & Limits
    quality_rating VARCHAR(20) CHECK (quality_rating IN ('GREEN', 'YELLOW', 'RED', null)),
    messaging_limit_tier VARCHAR(50),

    -- Metadata
    settings JSONB DEFAULT '{}',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, phone_number)
);

CREATE INDEX idx_whatsapp_numbers_org ON whatsapp_numbers(organization_id);
CREATE INDEX idx_whatsapp_numbers_phone ON whatsapp_numbers(phone_number_id);
CREATE INDEX idx_whatsapp_numbers_active ON whatsapp_numbers(organization_id, is_active);
```

#### 5. `departments` (Setores/Equipes)

```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',

    -- WhatsApp Number (opcional - departamento específico por número)
    whatsapp_number_id UUID REFERENCES whatsapp_numbers(id) ON DELETE SET NULL,

    -- Queue Settings
    auto_assign_enabled BOOLEAN DEFAULT true,
    assignment_strategy VARCHAR(50) DEFAULT 'round_robin' CHECK (assignment_strategy IN ('round_robin', 'load_balance', 'priority')),
    max_queue_size INTEGER DEFAULT 100,

    -- Business Hours
    business_hours JSONB DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id, name)
);

CREATE INDEX idx_departments_org ON departments(organization_id);
CREATE INDEX idx_departments_active ON departments(organization_id, is_active);
```

#### 6. `user_departments` (Agentes ↔ Departamentos)

```sql
CREATE TABLE user_departments (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,

    -- Settings
    is_primary BOOLEAN DEFAULT false,
    can_pull_from_queue BOOLEAN DEFAULT true,
    max_concurrent_conversations INTEGER DEFAULT 5,
    priority_level INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (user_id, department_id)
);

CREATE INDEX idx_user_departments_user ON user_departments(user_id);
CREATE INDEX idx_user_departments_dept ON user_departments(department_id);
```

#### 7. `agent_greetings` (Saudações Personalizadas)

```sql
CREATE TABLE agent_greetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Message Template
    message_template TEXT NOT NULL,
    -- Variáveis disponíveis: {{agent_name}}, {{agent_department}}, {{contact_name}}, {{time}}, {{day}}

    -- Settings
    is_active BOOLEAN DEFAULT true,
    auto_send BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX idx_agent_greetings_user ON agent_greetings(user_id);
```

#### 8. `chatbots`

```sql
CREATE TABLE chatbots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_published BOOLEAN DEFAULT false,

    -- Behavior
    welcome_message TEXT,
    fallback_message TEXT DEFAULT 'Desculpe, não entendi. Pode reformular?',
    away_message TEXT,

    -- AI Configuration
    ai_enabled BOOLEAN DEFAULT false,
    ai_provider VARCHAR(50) CHECK (ai_provider IN ('openai', 'anthropic', 'google', null)),
    ai_model VARCHAR(100),
    ai_api_key_encrypted TEXT,
    ai_system_prompt TEXT,
    ai_temperature DECIMAL(3,2) DEFAULT 0.7,

    -- Handoff
    auto_handoff_enabled BOOLEAN DEFAULT true,
    handoff_keywords TEXT[] DEFAULT '{}',
    business_hours JSONB DEFAULT '{}',

    -- Metadata
    settings JSONB DEFAULT '{}',
    statistics JSONB DEFAULT '{"total_conversations": 0, "total_messages": 0}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_chatbots_organization ON chatbots(organization_id);
CREATE INDEX idx_chatbots_active ON chatbots(organization_id, is_active);
```

#### 9. `flows`

```sql
CREATE TABLE flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,

    -- WhatsApp Number Assignment
    whatsapp_number_id UUID REFERENCES whatsapp_numbers(id) ON DELETE SET NULL,
    -- Null = funciona em todos os números da organização
    -- UUID = funciona apenas neste número específico

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Flow Type
    type VARCHAR(50) DEFAULT 'main' CHECK (type IN ('main', 'sub', 'template')),

    -- Trigger
    trigger_type VARCHAR(50) DEFAULT 'keyword' CHECK (trigger_type IN ('keyword', 'event', 'schedule', 'webhook')),
    trigger_keywords TEXT[] DEFAULT '{}',
    trigger_conditions JSONB DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,

    -- Visual Editor Data (React Flow format)
    canvas_data JSONB DEFAULT '{"nodes": [], "edges": []}',

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flows_chatbot ON flows(chatbot_id);
CREATE INDEX idx_flows_type ON flows(chatbot_id, type);
CREATE INDEX idx_flows_whatsapp_number ON flows(whatsapp_number_id);
```

#### 6. `nodes`

```sql
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,

    -- Position (for visual editor)
    position_x DECIMAL(10,2),
    position_y DECIMAL(10,2),

    -- Node Type
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'start', 'message', 'question', 'condition', 'action',
        'api_call', 'ai_prompt', 'jump', 'end', 'handoff'
    )),

    -- Content
    label VARCHAR(255),
    content JSONB NOT NULL DEFAULT '{}',
    -- Exemplos de content por tipo:
    -- message: {"text": "Olá!", "media_url": "...", "buttons": [...]}
    -- question: {"text": "Qual seu nome?", "variable": "user_name", "validation": "text"}
    -- condition: {"variable": "age", "operator": ">", "value": 18}
    -- action: {"action": "add_tag", "params": {"tag": "lead"}}
    -- api_call: {"url": "...", "method": "POST", "headers": {...}, "body": {...}}

    -- Connections
    next_node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,

    -- Metadata
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_nodes_flow ON nodes(flow_id);
CREATE INDEX idx_nodes_type ON nodes(flow_id, type);
```

#### 7. `contacts`

```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- WhatsApp Info
    whatsapp_id VARCHAR(255) NOT NULL, -- Phone number in international format
    whatsapp_name VARCHAR(255),
    whatsapp_profile_pic_url TEXT,

    -- Contact Info
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),

    -- Segmentation
    tags TEXT[] DEFAULT '{}',

    -- Status
    is_blocked BOOLEAN DEFAULT false,
    opt_in BOOLEAN DEFAULT true,
    opt_in_date TIMESTAMP WITH TIME ZONE,
    opt_out_date TIMESTAMP WITH TIME ZONE,

    -- Attributes (custom fields)
    attributes JSONB DEFAULT '{}',
    -- Exemplo: {"age": 25, "city": "São Paulo", "interests": ["tech", "games"]}

    -- Engagement
    last_message_at TIMESTAMP WITH TIME ZONE,
    total_conversations INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, whatsapp_id)
);

CREATE INDEX idx_contacts_organization ON contacts(organization_id);
CREATE INDEX idx_contacts_whatsapp_id ON contacts(whatsapp_id);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_attributes ON contacts USING GIN(attributes);
CREATE INDEX idx_contacts_last_message ON contacts(last_message_at DESC);
```

#### 8. `tags`

```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
    description TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id, name)
);

CREATE INDEX idx_tags_organization ON tags(organization_id);
```

#### 9. `conversations`

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    chatbot_id UUID REFERENCES chatbots(id) ON DELETE SET NULL,

    -- WhatsApp Number (qual número está sendo usado nesta conversa)
    whatsapp_number_id UUID REFERENCES whatsapp_numbers(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('waiting_in_queue', 'open', 'pending', 'assigned', 'resolved', 'closed')),

    -- Department & Assignment
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,

    -- Queue Management
    entered_queue_at TIMESTAMP WITH TIME ZONE,
    pulled_from_queue_at TIMESTAMP WITH TIME ZONE,
    queue_position INTEGER,

    -- Bot or Human
    is_bot_active BOOLEAN DEFAULT true,
    handoff_at TIMESTAMP WITH TIME ZONE,
    handoff_reason TEXT,

    -- Flow Context
    current_flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
    current_node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
    flow_variables JSONB DEFAULT '{}',

    -- WhatsApp 24-Hour Window
    last_customer_message_at TIMESTAMP WITH TIME ZONE,
    twenty_four_hour_window_expires_at TIMESTAMP WITH TIME ZONE,
    can_send_free_form BOOLEAN DEFAULT false,

    -- Metrics
    first_message_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    response_time_avg INTEGER, -- seconds
    message_count INTEGER DEFAULT 0,

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_organization ON conversations(organization_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_status ON conversations(organization_id, status);
CREATE INDEX idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX idx_conversations_department ON conversations(department_id);
CREATE INDEX idx_conversations_whatsapp_number ON conversations(whatsapp_number_id);
CREATE INDEX idx_conversations_queue ON conversations(department_id, status) WHERE status = 'waiting_in_queue';
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_24h_window ON conversations(twenty_four_hour_window_expires_at) WHERE twenty_four_hour_window_expires_at IS NOT NULL;
```

#### 10. `messages`

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- Sender
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    sender_type VARCHAR(20) CHECK (sender_type IN ('contact', 'bot', 'agent')),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL, -- null if contact or bot

    -- WhatsApp Message Info
    whatsapp_message_id VARCHAR(255) UNIQUE,

    -- Content
    type VARCHAR(50) DEFAULT 'text' CHECK (type IN (
        'text', 'image', 'video', 'audio', 'document',
        'location', 'contacts', 'button', 'list', 'template'
    )),
    content JSONB NOT NULL,
    -- Exemplo text: {"text": "Olá!"}
    -- Exemplo image: {"caption": "Foto", "media_url": "...", "mime_type": "image/jpeg"}
    -- Exemplo button: {"text": "Escolha:", "buttons": [{"id": "1", "title": "Opção 1"}]}

    -- Status (para mensagens enviadas)
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'delivered', 'read', 'failed'
    )),
    error_message TEXT,

    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_whatsapp_id ON messages(whatsapp_message_id);
CREATE INDEX idx_messages_status ON messages(status) WHERE direction = 'outbound';
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Particionamento por data (para performance com alto volume)
-- CREATE TABLE messages_2025_01 PARTITION OF messages
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

#### 11. `campaigns`

```sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),

    -- Targeting
    target_type VARCHAR(50) CHECK (target_type IN ('all', 'tags', 'segment', 'custom')),
    target_filters JSONB DEFAULT '{}',
    -- Exemplo: {"tags": ["customer", "vip"], "attributes": {"city": "São Paulo"}}

    -- Message
    template_id UUID REFERENCES whatsapp_templates(id),
    message_type VARCHAR(50) DEFAULT 'template',
    message_content JSONB NOT NULL,

    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    send_rate_limit INTEGER DEFAULT 100, -- messages per minute

    -- Results
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,

    -- Execution
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_organization ON campaigns(organization_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON campaigns(scheduled_at) WHERE status = 'scheduled';
```

#### 12. `campaign_recipients`

```sql
CREATE TABLE campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),

    -- Message
    message_id UUID REFERENCES messages(id),
    whatsapp_message_id VARCHAR(255),

    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,

    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(campaign_id, contact_id)
);

CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(campaign_id, status);
```

#### 13. `whatsapp_templates`

```sql
CREATE TABLE whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- WhatsApp Number (qual número usa este template)
    whatsapp_number_id UUID REFERENCES whatsapp_numbers(id) ON DELETE CASCADE,

    -- WhatsApp Template Info (ID retornado pela Meta)
    meta_template_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    language VARCHAR(10) DEFAULT 'pt_BR',
    category VARCHAR(50) CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),

    -- Status Meta (aprovação)
    meta_status VARCHAR(50) DEFAULT 'PENDING' CHECK (meta_status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED')),

    -- Status Sistema (ativo/inativo no PyTake)
    is_active BOOLEAN DEFAULT true,
    is_enabled_in_flows BOOLEAN DEFAULT true,

    -- Content
    header_type VARCHAR(50) CHECK (header_type IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', null)),
    header_content TEXT,
    body_text TEXT NOT NULL,
    footer_text TEXT,
    buttons JSONB DEFAULT '[]',

    -- Template Variables
    variables JSONB DEFAULT '[]',
    -- Exemplo: [{"name": "1", "example": "João"}, {"name": "2", "example": "10"}]

    -- Sync com Meta
    sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,

    -- Metadata
    rejection_reason TEXT,
    quality_score JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id, whatsapp_number_id, name, language)
);

CREATE INDEX idx_templates_organization ON whatsapp_templates(organization_id);
CREATE INDEX idx_templates_whatsapp_number ON whatsapp_templates(whatsapp_number_id);
CREATE INDEX idx_templates_meta_status ON whatsapp_templates(meta_status);
CREATE INDEX idx_templates_active ON whatsapp_templates(is_active, is_enabled_in_flows);
CREATE INDEX idx_templates_sync ON whatsapp_templates(sync_status);
```

#### 14. `integrations`

```sql
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Integration Type
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'webhook', 'zapier', 'shopify', 'woocommerce',
        'hubspot', 'salesforce', 'google_sheets', 'custom_api'
    )),

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Configuration
    config JSONB NOT NULL DEFAULT '{}',
    -- Exemplo webhook: {"url": "...", "method": "POST", "headers": {...}, "events": ["message.received"]}

    -- Credentials (encrypted)
    credentials_encrypted TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_integrations_organization ON integrations(organization_id);
CREATE INDEX idx_integrations_type ON integrations(type);
```

#### 15. `webhooks`

```sql
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Webhook Config
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    secret VARCHAR(255), -- for signature validation

    -- Events
    events TEXT[] NOT NULL DEFAULT '{}',
    -- Exemplo: ['message.received', 'message.sent', 'conversation.assigned']

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Retry Config
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,

    -- Stats
    total_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    last_delivery_at TIMESTAMP WITH TIME ZONE,
    last_delivery_status VARCHAR(50),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhooks_organization ON webhooks(organization_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active);
```

#### 16. `webhook_deliveries`

```sql
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,

    -- Request
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,

    -- Response
    status_code INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,

    -- Retry
    attempt_number INTEGER DEFAULT 1,
    success BOOLEAN DEFAULT false,
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_success ON webhook_deliveries(success);

-- Limpar deliveries antigas (> 30 dias)
-- DELETE FROM webhook_deliveries WHERE created_at < NOW() - INTERVAL '30 days';
```

#### 17. `quick_replies`

```sql
CREATE TABLE quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Info
    shortcut VARCHAR(50) NOT NULL, -- Ex: /ola, /preco
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,

    -- Media (optional)
    media_url TEXT,
    media_type VARCHAR(50),

    -- Usage
    usage_count INTEGER DEFAULT 0,

    -- Access Control
    is_global BOOLEAN DEFAULT true, -- visible to all agents
    created_by UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id, shortcut)
);

CREATE INDEX idx_quick_replies_organization ON quick_replies(organization_id);
CREATE INDEX idx_quick_replies_global ON quick_replies(organization_id, is_global);
```

#### 18. `audit_logs`

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Action
    action VARCHAR(100) NOT NULL, -- Ex: 'user.created', 'message.sent', 'chatbot.published'
    resource_type VARCHAR(50), -- Ex: 'user', 'chatbot', 'message'
    resource_id UUID,

    -- Details
    description TEXT,
    changes JSONB, -- before/after values
    metadata JSONB DEFAULT '{}',

    -- Context
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

---

## 🍃 MongoDB - Logs e Documentos

### Collections

#### 1. `message_logs`

Armazena histórico completo de mensagens para analytics e auditoria.

```javascript
{
  _id: ObjectId,
  organization_id: UUID,
  conversation_id: UUID,
  message_id: UUID,

  // Message data
  direction: "inbound" | "outbound",
  type: "text" | "image" | "video" | ...,
  content: {
    text: "Olá!",
    // ... outros campos
  },

  // WhatsApp metadata
  whatsapp_message_id: String,
  whatsapp_metadata: {
    timestamp: ISODate,
    from: String,
    to: String,
    context: Object // reply context
  },

  // Status timeline
  status_history: [
    { status: "sent", timestamp: ISODate },
    { status: "delivered", timestamp: ISODate },
    { status: "read", timestamp: ISODate }
  ],

  // Analytics
  sentiment: "positive" | "negative" | "neutral",
  intent: String,
  entities: Array,

  created_at: ISODate,
  indexed_at: ISODate
}

// Indexes
db.message_logs.createIndex({ organization_id: 1, created_at: -1 })
db.message_logs.createIndex({ conversation_id: 1, created_at: -1 })
db.message_logs.createIndex({ whatsapp_message_id: 1 })
db.message_logs.createIndex({ "content.text": "text" }) // Full-text search

// TTL index - remove logs > 1 year
db.message_logs.createIndex(
  { created_at: 1 },
  { expireAfterSeconds: 31536000 }
)
```

#### 2. `conversation_logs`

```javascript
{
  _id: ObjectId,
  organization_id: UUID,
  conversation_id: UUID,
  contact_id: UUID,

  // Session data
  session_start: ISODate,
  session_end: ISODate,
  duration_seconds: Number,

  // Metrics
  message_count: Number,
  bot_message_count: Number,
  human_message_count: Number,

  // Flow tracking
  flow_path: [
    { node_id: UUID, node_type: String, timestamp: ISODate }
  ],

  // AI interactions
  ai_prompts: [
    {
      prompt: String,
      response: String,
      model: String,
      tokens_used: Number,
      timestamp: ISODate
    }
  ],

  // Handoff
  handoff_occurred: Boolean,
  handoff_reason: String,
  handoff_timestamp: ISODate,
  agent_id: UUID,

  // Outcome
  resolved: Boolean,
  resolution_time_seconds: Number,
  satisfaction_rating: Number,

  created_at: ISODate
}

db.conversation_logs.createIndex({ organization_id: 1, session_start: -1 })
db.conversation_logs.createIndex({ contact_id: 1, session_start: -1 })
db.conversation_logs.createIndex({ conversation_id: 1 })
```

#### 3. `analytics_snapshots`

Snapshots agregados para analytics rápidos.

```javascript
{
  _id: ObjectId,
  organization_id: UUID,

  // Period
  period: "hour" | "day" | "week" | "month",
  date: ISODate,

  // Conversations
  conversations: {
    total: Number,
    new: Number,
    resolved: Number,
    open: Number,
    avg_resolution_time: Number
  },

  // Messages
  messages: {
    total: Number,
    inbound: Number,
    outbound: Number,
    by_type: {
      text: Number,
      image: Number,
      // ...
    }
  },

  // Contacts
  contacts: {
    total: Number,
    new: Number,
    active: Number
  },

  // Chatbots
  chatbots: {
    total_executions: Number,
    completion_rate: Number,
    avg_completion_time: Number,
    handoff_rate: Number
  },

  // Agents
  agents: {
    total: Number,
    active: Number,
    avg_response_time: Number,
    conversations_per_agent: Number
  },

  created_at: ISODate
}

db.analytics_snapshots.createIndex({ organization_id: 1, period: 1, date: -1 })
```

#### 4. `webhook_logs`

```javascript
{
  _id: ObjectId,
  organization_id: UUID,
  webhook_id: UUID,
  delivery_id: UUID,

  // Request
  event_type: String,
  url: String,
  method: String,
  headers: Object,
  payload: Object,

  // Response
  status_code: Number,
  response_headers: Object,
  response_body: String,
  response_time_ms: Number,

  // Result
  success: Boolean,
  error_message: String,
  attempt_number: Number,

  created_at: ISODate
}

db.webhook_logs.createIndex({ organization_id: 1, created_at: -1 })
db.webhook_logs.createIndex({ webhook_id: 1, created_at: -1 })
db.webhook_logs.createIndex({ success: 1 })

// TTL - remove logs > 90 days
db.webhook_logs.createIndex(
  { created_at: 1 },
  { expireAfterSeconds: 7776000 }
)
```

#### 5. `api_request_logs`

```javascript
{
  _id: ObjectId,
  organization_id: UUID,
  user_id: UUID,

  // Request
  method: String,
  path: String,
  query_params: Object,
  headers: Object,
  body: Object, // sanitized

  // Response
  status_code: Number,
  response_time_ms: Number,

  // Client
  ip_address: String,
  user_agent: String,

  // Result
  success: Boolean,
  error_message: String,

  created_at: ISODate
}

db.api_request_logs.createIndex({ organization_id: 1, created_at: -1 })
db.api_request_logs.createIndex({ user_id: 1, created_at: -1 })
db.api_request_logs.createIndex({ path: 1, method: 1 })

// TTL - remove logs > 30 days
db.api_request_logs.createIndex(
  { created_at: 1 },
  { expireAfterSeconds: 2592000 }
)
```

---

## 🔴 Redis - Cache e Filas

### Estruturas de Dados

#### 1. Sessions (JWT Blacklist)

```
Key: session:blacklist:{token_hash}
Type: String
Value: "revoked"
TTL: Token expiration time
```

#### 2. User Sessions

```
Key: user:session:{user_id}
Type: Hash
Fields:
  - access_token: String
  - refresh_token: String
  - expires_at: Timestamp
  - device_info: JSON
TTL: 7 days
```

#### 3. Rate Limiting

```
Key: ratelimit:{ip_address}:{endpoint}
Type: String (counter)
Value: request count
TTL: 60 seconds

Key: ratelimit:user:{user_id}
Type: String
Value: request count
TTL: 60 seconds
```

#### 4. Cache de Queries

```
Key: cache:conversations:{organization_id}:open
Type: String (JSON)
Value: [conversation objects]
TTL: 5 minutes

Key: cache:contacts:{organization_id}:{contact_id}
Type: Hash
Fields: contact data
TTL: 15 minutes
```

#### 5. WebSocket Connections

```
Key: ws:user:{user_id}
Type: Set
Members: [socket_id1, socket_id2, ...]
TTL: None (deleted on disconnect)
```

#### 6. Celery Queues

```
List: celery:high_priority
List: celery:default
List: celery:low_priority
List: celery:scheduled
```

#### 7. Real-time Typing Indicators

```
Key: typing:{conversation_id}:{user_id}
Type: String
Value: "typing"
TTL: 5 seconds
```

#### 8. Temporary Data

```
Key: temp:upload:{upload_id}
Type: Hash
Fields:
  - file_path: String
  - mime_type: String
  - size: Number
TTL: 1 hour
```

---

## 🔗 Relacionamentos

### Diagrama de Relacionamentos Principais

```
Organizations (1) ──────────── (N) Users
     │                              │
     │ (1)                          │ (N)
     │                              │
     └────── (N) Chatbots          Conversations (assigned_to)
                  │                     │
                  │ (1)                 │ (1)
                  │                     │
            (N) Flows            (N) Messages
                  │                     │
                  │ (1)                 │
                  │                     │
            (N) Nodes                   │
                                        │
Organizations (1) ──────────── (N) Contacts
     │                              │
     │                              │
     └────── (N) Campaigns          │
                  │                 │
                  │                 │
                  └─── (N) CampaignRecipients ──┘
```

---

## 📊 Índices e Performance

### Índices Críticos para Performance

1. **Conversas Abertas do Agente**
   ```sql
   CREATE INDEX idx_conversations_agent_open
   ON conversations(assigned_to, status)
   WHERE status IN ('open', 'pending', 'assigned');
   ```

2. **Mensagens Recentes**
   ```sql
   CREATE INDEX idx_messages_recent
   ON messages(conversation_id, created_at DESC)
   INCLUDE (type, content, direction);
   ```

3. **Busca de Contatos**
   ```sql
   CREATE INDEX idx_contacts_search
   ON contacts USING gin(to_tsvector('portuguese', name || ' ' || COALESCE(email, '')));
   ```

4. **Analytics por Período**
   ```sql
   CREATE INDEX idx_conversations_analytics
   ON conversations(organization_id, created_at, status);
   ```

### Particionamento

#### Messages (por data)

```sql
-- Tabela particionada por mês
CREATE TABLE messages (
    -- ... campos
) PARTITION BY RANGE (created_at);

-- Criar partições mensais
CREATE TABLE messages_2025_01 PARTITION OF messages
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE messages_2025_02 PARTITION OF messages
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Script automático para criar partições futuras
```

---

## 🔄 Migrations

### Estratégia de Migração

Utilizando **Alembic** (Python):

```bash
# Criar nova migration
alembic revision -m "create_users_table"

# Aplicar migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Migrations Iniciais

```
migrations/
├── versions/
│   ├── 001_create_organizations.py
│   ├── 002_create_users.py
│   ├── 003_create_chatbots.py
│   ├── 004_create_flows_and_nodes.py
│   ├── 005_create_contacts.py
│   ├── 006_create_conversations.py
│   ├── 007_create_messages.py
│   ├── 008_create_campaigns.py
│   ├── 009_create_templates.py
│   ├── 010_create_integrations.py
│   ├── 011_create_webhooks.py
│   └── 012_create_indexes.py
```

---

**Versão:** 1.0.0
**Última atualização:** 2025-10-03
