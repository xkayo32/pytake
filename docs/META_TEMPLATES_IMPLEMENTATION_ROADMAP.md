# 📋 Roadmap de Implementação - Meta WhatsApp Templates

**Autor:** Kayo Carvalho Fernandes  
**Data:** 14 de Dezembro de 2025  
**Status:** Planejamento  
**Versão:** 1.0

---

## 🎯 Objetivo

Adequar o sistema PyTake às especificações atualizadas da Meta Cloud API para templates do WhatsApp, garantindo conformidade, evitando bloqueios e otimizando custos.

---

## 🔴 FASE 1 - CRÍTICO (Semana 1-2)

**Prazo:** Implementar IMEDIATAMENTE  
**Risco se não implementar:** BAN do número WhatsApp, falhas em produção

### 1.1 Named Parameters Support ⚠️

**Impacto:** Templates modernos falharão ao enviar

**Tarefas:**

#### Backend
- [ ] **Migration**: `add_template_parameter_format.py`
  ```sql
  ALTER TABLE whatsapp_templates 
  ADD COLUMN parameter_format VARCHAR(20) DEFAULT 'POSITIONAL' CHECK (parameter_format IN ('POSITIONAL', 'NAMED'));
  
  ALTER TABLE whatsapp_templates
  ADD COLUMN named_variables JSONB DEFAULT '[]'::jsonb;
  ```
  **Estimativa:** 2h

- [ ] **Model**: Atualizar `WhatsAppTemplate`
  ```python
  # backend/app/models/whatsapp_number.py
  parameter_format = Column(String(20), default="POSITIONAL")
  named_variables = Column(JSONB, default=[], server_default=text("'[]'::jsonb"))
  ```
  **Estimativa:** 1h

- [ ] **Service**: Atualizar `TemplateService.create_template()`
  - Detectar formato de variáveis ({{1}} vs {{nome}})
  - Armazenar `parameter_format` e `named_variables`
  **Estimativa:** 3h

- [ ] **MetaAPI**: Atualizar `send_template_message()`
  ```python
  # backend/app/integrations/meta_api.py
  async def send_template_message(self, ..., parameter_format="POSITIONAL"):
      if parameter_format == "NAMED":
          # Construir payload com parameter_name
          parameters = [{
              "type": "text",
              "parameter_name": var_name,
              "text": var_value
          }]
      else:
          # Formato POSITIONAL (atual)
          parameters = [{"type": "text", "text": value}]
  ```
  **Estimativa:** 4h

- [ ] **Schemas**: Validação de consistência
  ```python
  # backend/app/schemas/template.py
  class TemplateComponentSchema(BaseModel):
      parameter_format: Literal["POSITIONAL", "NAMED"] = "POSITIONAL"
      
      @validator("text")
      def validate_variables(cls, v, values):
          # Validar que formato corresponde às variáveis usadas
  ```
  **Estimativa:** 2h

#### Testes
- [ ] Teste unitário: criação template NAMED
- [ ] Teste unitário: envio com NAMED parameters
- [ ] Teste integração: Meta API aceita payload
  **Estimativa:** 4h

**Total Fase 1.1:** 16h (2 dias)

---

### 1.2 Template Status Webhook Processing 🚨

**Impacto:** RISCO DE BAN - sistema continua usando templates pausados

**Tarefas:**

#### Backend
- [ ] **Migration**: `add_template_status_tracking.py`
  ```sql
  ALTER TABLE whatsapp_templates
  ADD COLUMN quality_score VARCHAR(20) CHECK (quality_score IN ('UNKNOWN', 'GREEN', 'YELLOW', 'RED')),
  ADD COLUMN paused_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN disabled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN disabled_reason TEXT,
  ADD COLUMN last_status_update TIMESTAMP WITH TIME ZONE;
  
  CREATE INDEX idx_templates_quality ON whatsapp_templates(quality_score) WHERE deleted_at IS NULL;
  CREATE INDEX idx_templates_status ON whatsapp_templates(status) WHERE deleted_at IS NULL;
  ```
  **Estimativa:** 2h

- [ ] **Model**: Atualizar `WhatsAppTemplate`
  ```python
  quality_score = Column(String(20), nullable=True)
  paused_at = Column(DateTime(timezone=True), nullable=True)
  disabled_at = Column(DateTime(timezone=True), nullable=True)
  disabled_reason = Column(Text, nullable=True)
  last_status_update = Column(DateTime(timezone=True), nullable=True)
  ```
  **Estimativa:** 1h

- [ ] **Service**: Criar `TemplateStatusService`
  ```python
  # backend/app/services/template_status_service.py
  async def process_template_status_update(self, webhook_data: Dict):
      """
      Processa webhook de status de template:
      - Atualiza quality_score
      - Marca paused_at/disabled_at
      - Pausa campanhas ativas usando este template
      - Envia alerta crítico para admins
      """
  ```
  **Estimativa:** 6h

- [ ] **Webhook**: Implementar handler em `webhooks/meta.py`
  ```python
  elif field == "message_template_status_update":
      template_status_service = TemplateStatusService(db)
      await template_status_service.process_template_status_update(value)
  ```
  **Estimativa:** 3h

- [ ] **Alert System**: Integrar com sistema de alertas
  - Alerta CRITICAL quando template vai para PAUSED
  - Alerta WARNING quando quality_score = RED
  - Email + WebSocket para admins
  **Estimativa:** 4h

- [ ] **Campaign Service**: Auto-pause campaigns
  ```python
  # backend/app/services/campaign_service.py
  async def pause_campaigns_using_template(self, template_id: UUID):
      """Pausa todas campanhas ativas usando template pausado/disabled"""
  ```
  **Estimativa:** 3h

#### Frontend (se houver tempo)
- [ ] Badge visual de quality_score (🟢 GREEN, 🟡 YELLOW, 🔴 RED)
- [ ] Alerta ao tentar usar template PAUSED
  **Estimativa:** 4h (opcional)

#### Testes
- [ ] Mock webhook `message_template_status_update`
- [ ] Verificar auto-pause de campanhas
- [ ] Testar alertas enviados
  **Estimativa:** 4h

**Total Fase 1.2:** 23h (3 dias)

---

### 1.3 Janela de 24h Validation ⏰

**Impacto:** Mensagens falham, custos inesperados

**Tarefas:**

#### Backend
- [ ] **Migration**: `add_conversation_window_tracking.py`
  ```sql
  ALTER TABLE conversations
  ADD COLUMN window_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN last_user_message_at TIMESTAMP WITH TIME ZONE;
  
  CREATE INDEX idx_conversations_window_expires ON conversations(window_expires_at) 
  WHERE status = 'open' AND deleted_at IS NULL;
  ```
  **Estimativa:** 2h

- [ ] **Model**: Atualizar `Conversation`
  ```python
  window_expires_at = Column(DateTime(timezone=True), nullable=True)
  last_user_message_at = Column(DateTime(timezone=True), nullable=True)
  
  @property
  def is_window_open(self) -> bool:
      if not self.window_expires_at:
          return False
      return datetime.utcnow() < self.window_expires_at
  ```
  **Estimativa:** 1h

- [ ] **Service**: Atualizar `ConversationService`
  ```python
  async def update_window_on_user_message(self, conversation_id: UUID):
      """
      Atualiza janela de 24h quando usuário envia mensagem:
      - last_user_message_at = now()
      - window_expires_at = now() + 24h
      """
      
  async def validate_message_sending(self, conversation_id: UUID, is_template: bool):
      """
      Valida se mensagem pode ser enviada:
      - Se janela expirada E não é template → raise exception
      - Retorna: (can_send: bool, reason: str)
      """
  ```
  **Estimativa:** 4h

- [ ] **Webhook**: Atualizar `webhooks/meta.py` ao receber mensagem
  ```python
  # Ao receber mensagem de usuário
  await conversation_service.update_window_on_user_message(conversation_id)
  ```
  **Estimativa:** 2h

- [ ] **Message Service**: Validação antes de enviar
  ```python
  # backend/app/services/message_service.py
  async def send_message(self, ...):
      can_send, reason = await conversation_service.validate_message_sending(
          conversation_id, is_template=False
      )
      if not can_send:
          raise BadRequestException(f"Cannot send free message: {reason}. Use template.")
  ```
  **Estimativa:** 3h

#### API Endpoints
- [ ] GET `/conversations/{id}/window-status`
  ```json
  {
    "is_open": true,
    "expires_at": "2025-12-15T18:30:00Z",
    "remaining_minutes": 1380,
    "can_send_free_message": true
  }
  ```
  **Estimativa:** 2h

#### Frontend (se houver tempo)
- [ ] Badge "Janela Expirada" na conversation
- [ ] Auto-sugerir templates quando janela expira
- [ ] Timer visual mostrando tempo restante
  **Estimativa:** 6h (opcional)

#### Testes
- [ ] Testar cálculo de 24h
- [ ] Testar bloqueio de mensagem livre fora da janela
- [ ] Testar renovação da janela ao receber mensagem
  **Estimativa:** 3h

**Total Fase 1.3:** 17h (2 dias)

---

## 🟡 FASE 2 - IMPORTANTE (Semana 3-4)

**Prazo:** 2 semanas após Fase 1  
**Risco se não implementar:** Custos elevados, retrabalho

### 2.1 `allow_category_change` Flag

**Impacto:** Templates rejeitados desnecessariamente

**Tarefas:**

#### Backend
- [ ] **Migration**: `add_template_category_tracking.py`
  ```sql
  ALTER TABLE whatsapp_templates
  ADD COLUMN original_category VARCHAR(50),
  ADD COLUMN category_changed_by_meta BOOLEAN DEFAULT FALSE,
  ADD COLUMN category_change_date TIMESTAMP WITH TIME ZONE;
  ```
  **Estimativa:** 2h

- [ ] **Model**: Campos adicionais
  **Estimativa:** 1h

- [ ] **MetaAPI**: Adicionar flag em `create_template()`
  ```python
  payload = {
      "name": template_name,
      "category": category,
      "allow_category_change": True,  # ← NOVO
      "components": components
  }
  ```
  **Estimativa:** 2h

- [ ] **Webhook**: Detectar mudança de categoria
  ```python
  if template.original_category != new_category:
      template.category_changed_by_meta = True
      # Enviar alerta: "Meta mudou categoria de UTILITY para MARKETING"
  ```
  **Estimativa:** 3h

#### Testes
- [ ] Testar flag enviada para Meta
- [ ] Testar detecção de mudança de categoria
  **Estimativa:** 2h

**Total Fase 2.1:** 10h (1-2 dias)

---

### 2.2 Quality Score Monitoring

**Impacto:** Templates RED continuam em uso → ban

**Tarefas:**

#### Backend
- [ ] **Service**: `TemplateHealthService`
  ```python
  async def check_template_health(self, template_id: UUID):
      """
      Verifica saúde do template:
      - Quality score
      - Taxa de bloqueio
      - Taxa de denúncia
      Retorna: (is_healthy: bool, warnings: List[str])
      """
      
  async def block_red_templates(self, organization_id: UUID):
      """
      Auto-desabilita templates com quality_score = RED
      """
  ```
  **Estimativa:** 4h

- [ ] **Scheduler**: Job diário de health check
  ```python
  # backend/app/tasks/template_tasks.py
  @celery_app.task
  def daily_template_health_check():
      """Roda diariamente às 3am"""
  ```
  **Estimativa:** 2h

- [ ] **Dashboard Endpoint**: GET `/analytics/templates/health`
  ```json
  {
    "templates": [
      {
        "id": "uuid",
        "name": "template_boas_vindas",
        "quality_score": "YELLOW",
        "status": "APPROVED",
        "sent_count": 1000,
        "block_rate": 0.02,
        "report_rate": 0.005
      }
    ]
  }
  ```
  **Estimativa:** 4h

#### Frontend (se houver tempo)
- [ ] Dashboard de saúde dos templates
- [ ] Gráfico de evolução do quality_score
  **Estimativa:** 8h (opcional)

#### Testes
- [ ] Testar detecção de templates RED
- [ ] Testar auto-desabilitação
  **Estimativa:** 2h

**Total Fase 2.2:** 12h (1-2 dias)

---

### 2.3 Template Versioning

**Impacto:** Editar template causa downtime

**Tarefas:**

#### Backend
- [ ] **Migration**: `add_template_versioning.py`
  ```sql
  ALTER TABLE whatsapp_templates
  ADD COLUMN version INTEGER DEFAULT 1,
  ADD COLUMN replaces_template_id UUID REFERENCES whatsapp_templates(id),
  ADD COLUMN is_latest_version BOOLEAN DEFAULT TRUE;
  
  CREATE INDEX idx_templates_latest_version ON whatsapp_templates(name, organization_id, is_latest_version)
  WHERE deleted_at IS NULL;
  ```
  **Estimativa:** 2h

- [ ] **Service**: `create_template_version()`
  ```python
  async def create_template_version(self, base_template_id: UUID, changes: Dict):
      """
      Cria nova versão do template:
      1. Copia template original
      2. Aplica mudanças
      3. Incrementa version (v2, v3...)
      4. Marca anterior como is_latest_version=False
      5. Submete nova versão para Meta
      """
  ```
  **Estimativa:** 6h

- [ ] **API Endpoint**: POST `/templates/{id}/create-version`
  **Estimativa:** 2h

- [ ] **Campaign Service**: Usar `is_latest_version=True` por padrão
  **Estimativa:** 2h

#### Frontend (se houver tempo)
- [ ] UI: "Criar Nova Versão" em vez de "Editar"
- [ ] Histórico de versões do template
  **Estimativa:** 6h (opcional)

#### Testes
- [ ] Testar criação de v2, v3
- [ ] Testar flag is_latest_version
  **Estimativa:** 3h

**Total Fase 2.3:** 15h (2 dias)

---

## 🟢 FASE 3 - MELHORIAS (Backlog / Semana 5+)

**Prazo:** Após Fase 2  
**Risco:** Baixo (melhorias operacionais)

### 3.1 Estimativa de Custos

**Tarefas:**
- [ ] **Service**: `TemplateCostEstimator`
  - Calcular custo estimado por categoria
  - Considerar country rates
  - Integrar com analytics
  **Estimativa:** 8h

- [ ] **Dashboard**: Exibir custo estimado antes de disparar campanha
  **Estimativa:** 4h

**Total Fase 3.1:** 12h

---

### 3.2 Template Analytics Dashboard

**Tarefas:**
- [ ] Métricas por template:
  - Sent, Delivered, Read, Failed
  - Conversion rate
  - Quality score history
  **Estimativa:** 12h

- [ ] Comparação entre templates
- [ ] Recomendações de otimização
  **Estimativa:** 8h

**Total Fase 3.2:** 20h

---

### 3.3 Auto-Sugestão de Templates

**Tarefas:**
- [ ] Quando janela expira, sugerir templates relevantes
- [ ] ML: recomendar template baseado em contexto da conversa
- [ ] Quick actions na UI
  **Estimativa:** 16h

**Total Fase 3.3:** 16h

---

## 📊 Resumo do Cronograma

| Fase | Tarefas | Horas Estimadas | Dias Úteis | Risco | Status |
|------|---------|-----------------|------------|-------|--------|
| **FASE 1.1** | Named Parameters | 16h | 2 dias | 🔴 CRÍTICO | 🔜 Pronto para iniciar |
| **FASE 1.2** | Template Status Webhook | 23h | 3 dias | 🔴 CRÍTICO | 🔜 Pronto para iniciar |
| **FASE 1.3** | Janela 24h Validation | 17h | 2 dias | 🔴 CRÍTICO | 🔜 Pronto para iniciar |
| **FASE 2.1** | allow_category_change | 10h | 1-2 dias | 🟡 IMPORTANTE | 📅 Agendado |
| **FASE 2.2** | Quality Score Monitoring | 12h | 1-2 dias | 🟡 IMPORTANTE | 📅 Agendado |
| **FASE 2.3** | Template Versioning | 15h | 2 dias | 🟡 IMPORTANTE | 📅 Agendado |
| **FASE 3** | Melhorias | 48h | 6 dias | 🟢 BAIXO | 📋 Backlog |
| **TOTAL CRÍTICO** | - | **56h** | **7 dias** | - | - |
| **TOTAL IMPORTANTE** | - | **37h** | **5 dias** | - | - |
| **TOTAL COMPLETO** | - | **141h** | **18 dias** | - | - |

---

## 🎯 Entregas Esperadas

### Semana 1-2 (FASE 1 - CRÍTICO)
✅ Sistema suporta Named Parameters  
✅ Webhook de status de template implementado  
✅ Validação de janela 24h ativa  
✅ Conformidade com Meta API 100%  
✅ Risco de ban eliminado  

### Semana 3-4 (FASE 2 - IMPORTANTE)
✅ Flag allow_category_change implementada  
✅ Quality Score monitorado  
✅ Versionamento de templates funcional  
✅ Redução de custos operacionais  
✅ Menos retrabalho na criação de templates  

### Semana 5+ (FASE 3 - MELHORIAS)
✅ Dashboard de analytics completo  
✅ Estimativa de custos por campanha  
✅ Auto-sugestão inteligente de templates  
✅ UX otimizada para agentes  

---

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Quebra de compatibilidade com templates existentes | MÉDIA | ALTO | Manter backward compatibility; migration gradual |
| Meta muda API durante implementação | BAIXA | ALTO | Monitorar changelog da Meta; testes de integração contínuos |
| Webhooks não chegam (falha de rede) | MÉDIA | MÉDIO | Implementar polling de fallback; retry logic |
| Performance degradada com muitos templates | BAIXA | MÉDIO | Indexes no banco; cache de templates ativos |
| Campanha dispara com template pausado (race condition) | MÉDIA | ALTO | Lock otimista; double-check antes de enviar |

---

## 🔧 Configurações Necessárias

### Variáveis de Ambiente (`.env`)
```bash
# Meta API
META_WEBHOOK_SECRET=your_webhook_secret_here
META_WEBHOOK_VERIFY_TOKEN=your_verify_token_here
WHATSAPP_ACCESS_TOKEN=your_access_token_here

# Template Settings
TEMPLATE_QUALITY_CHECK_ENABLED=true
TEMPLATE_AUTO_PAUSE_ON_RED=true
TEMPLATE_WINDOW_24H_VALIDATION=true

# Alerts
ALERT_EMAIL_TEMPLATE_PAUSED=admin@pytake.com
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### Webhooks na Meta
1. Acessar Meta Developer Dashboard
2. Configurar webhook URL: `https://api.pytake.com/webhooks/meta`
3. Subscrever eventos:
   - `messages` ✅
   - `message_status` ✅
   - `message_template_status_update` ✅ **NOVO**
   - `business_capability_update` ✅ **NOVO**
   - `phone_number_quality_update` ✅ **NOVO**

---

## 📚 Documentação de Referência

### Meta Official Docs
- [Template Guidelines](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Pricing Model](https://developers.facebook.com/docs/whatsapp/pricing)
- [Quality Rating](https://developers.facebook.com/docs/whatsapp/messaging-limits)

### PyTake Internal Docs
- `docs/ARCHITECTURE.md` - Arquitetura geral
- `docs/api-contracts.md` - Contratos de API
- `backend/app/models/whatsapp_number.py` - Model WhatsAppTemplate
- `backend/app/services/template_service.py` - Template Service
- `backend/app/integrations/meta_api.py` - Meta API Integration

---

## 👥 Equipe e Responsabilidades

| Papel | Responsável | Tarefas |
|-------|-------------|---------|
| **Backend Lead** | Kayo Carvalho Fernandes | Migrations, Services, MetaAPI |
| **Frontend Lead** | TBD | UI/UX templates, dashboards |
| **QA** | TBD | Testes integração, webhooks |
| **DevOps** | TBD | Deploy, monitoring, alerts |

---

## 📝 Checklist de Aprovação

Antes de marcar cada fase como concluída:

### FASE 1 - CRÍTICO
- [ ] Todos os testes unitários passando
- [ ] Testes de integração com Meta API OK
- [ ] Webhooks recebidos e processados corretamente
- [ ] Migrations aplicadas em staging SEM ERROS
- [ ] Code review aprovado
- [ ] Documentação atualizada
- [ ] Deploy em staging bem-sucedido
- [ ] Testes em staging por 48h sem erros
- [ ] Deploy em produção aprovado pelo cliente

### FASE 2 - IMPORTANTE
- [ ] Todos critérios da Fase 1 +
- [ ] Alertas de quality score testados
- [ ] Dashboard de saúde funcional
- [ ] Versionamento testado com templates reais

### FASE 3 - MELHORIAS
- [ ] Analytics dashboard completo
- [ ] Métricas coletadas por 7 dias
- [ ] Feedback positivo dos agentes

---

## 🚀 Próximos Passos

1. **Aprovação do Roadmap** - Revisar e aprovar com stakeholders
2. **Setup Ambiente de Dev** - Criar branch `feature/meta-templates-upgrade`
3. **Kick-off Fase 1.1** - Iniciar implementação Named Parameters
4. **Daily Standups** - 15min diários para acompanhamento
5. **Weekly Review** - Sexta-feira review do progresso

---

**Última Atualização:** 14/12/2025  
**Próxima Revisão:** 21/12/2025
