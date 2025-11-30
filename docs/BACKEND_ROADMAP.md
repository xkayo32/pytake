# 📋 PyTake Backend - Roadmap de Implementação

**Autor:** Kayo Carvalho Fernandes  
**Data:** 30/11/2025  
**Versão:** 1.0

---

## 📊 Visão Geral

| Métrica | Valor |
|---------|-------|
| Total de Rotas | 190 |
| Rotas Documentadas | 6 (3.2%) |
| TODOs Críticos | 15 |
| Arquivos de Teste | 1 |
| Stubs Não Implementados | 2 |

---

## 🔴 SPRINT 1 - Crítico (Semana 1-2)

### 1.1 Handler de Mensagens Recebidas WhatsApp
**Prioridade:** 🔴 CRÍTICA  
**Arquivo:** `backend/app/api/webhooks/meta.py:169`  
**Esforço:** 8h

```
Status Atual: Mensagens recebidas via webhook são logadas mas não processadas
Impacto: Usuários não recebem mensagens no sistema
```

**Tarefas:**
- [ ] Criar `IncomingMessageHandler` no webhook
- [ ] Salvar mensagem no modelo `Message`
- [ ] Criar/atualizar `Conversation` associada
- [ ] Emitir evento WebSocket para agentes online
- [ ] Atualizar contagem de mensagens no `Contact`

**Dependências:** Modelo `Message` ✅ (já existe em `conversation.py`)

---

### 1.2 Endpoint de Notificações
**Prioridade:** 🔴 CRÍTICA  
**Arquivo:** Criar `backend/app/api/v1/endpoints/notifications.py`  
**Esforço:** 6h

```
Status Atual: Modelo e Repository existem, mas NÃO há endpoint
Impacto: Feature de notificações inutilizável pelo frontend
```

**Tarefas:**
- [ ] Criar endpoint `GET /notifications` - listar notificações do usuário
- [ ] Criar endpoint `GET /notifications/preferences` - obter preferências
- [ ] Criar endpoint `PUT /notifications/preferences` - atualizar preferências
- [ ] Criar endpoint `POST /notifications/{id}/read` - marcar como lida
- [ ] Criar endpoint `POST /notifications/read-all` - marcar todas como lidas
- [ ] Criar `NotificationService`
- [ ] Registrar router em `router.py`

**Dependências:** 
- `NotificationPreference` ✅
- `NotificationLog` ✅
- `NotificationPreferenceRepository` ✅
- `NotificationLogRepository` ✅

---

### 1.3 Validação JWT no WebSocket
**Prioridade:** 🔴 CRÍTICA  
**Arquivo:** `backend/app/api/v1/endpoints/websocket.py:68`  
**Esforço:** 4h

```
Status Atual: Aceita qualquer token (inseguro)
Impacto: Qualquer pessoa pode conectar ao WebSocket
```

**Tarefas:**
- [ ] Importar `decode_token` de `core/security.py`
- [ ] Validar JWT e extrair `user_id` e `org_id`
- [ ] Rejeitar conexões com token inválido/expirado
- [ ] Adicionar rate limiting por IP
- [ ] Logging de conexões rejeitadas

---

## 🟠 SPRINT 2 - Alta Prioridade (Semana 3-4)

### 2.1 Swagger/OpenAPI Documentation
**Prioridade:** 🟠 ALTA  
**Esforço:** 16h

| Arquivo | Rotas | Esforço |
|---------|-------|---------|
| `chatbots.py` | 21 | 3h |
| `whatsapp.py` | 20 | 3h |
| `contacts.py` | 19 | 2.5h |
| `flow_automations.py` | 14 | 2h |
| `campaigns.py` | 14 | 2h |
| `conversations.py` | 13 | 2h |
| `ai_assistant.py` | 13 | 1.5h |

**Template a seguir:** `backend/SWAGGER_TEMPLATE.py`

**Tarefas por endpoint:**
- [ ] Adicionar `tags=["NomeModulo"]` no router
- [ ] Adicionar `summary` e `description` em cada rota
- [ ] Adicionar `response_model` e `responses` com exemplos
- [ ] Importar e usar `swagger_examples.py`

---

### 2.2 AI Assistant - Custom Models
**Prioridade:** 🟠 ALTA  
**Arquivo:** `backend/app/api/v1/endpoints/ai_assistant.py:90, :140`  
**Esforço:** 6h

```
Status Atual: Modelos customizados não são salvos no banco
Impacto: Organizações não podem adicionar modelos próprios
```

**Tarefas:**
- [ ] Migração já existe: `20251016_add_ai_custom_models_table.py`
- [ ] Criar `AICustomModelRepository`
- [ ] Criar `AICustomModelService`
- [ ] Endpoint `POST /ai/models` - criar modelo customizado
- [ ] Endpoint `GET /ai/models` - listar modelos (base + customizados)
- [ ] Endpoint `DELETE /ai/models/{id}` - remover modelo

---

### 2.3 Analytics - Correções
**Prioridade:** 🟠 ALTA  
**Arquivo:** `backend/app/services/analytics_service.py`  
**Esforço:** 4h

| Linha | TODO | Ação |
|-------|------|------|
| `:86` | Message model | Usar modelo existente para queries |
| `:181` | Away status | Implementar status "away" em User |
| `:331` | Time series | Implementar agregação temporal |

**Tarefas:**
- [ ] Criar query para `messages_sent_today` usando modelo `Message`
- [ ] Criar query para `messages_received_today` usando modelo `Message`
- [ ] Adicionar campo `status` em `User` (online/away/offline)
- [ ] Implementar `_get_time_series_data()` com GROUP BY temporal

---

## 🟡 SPRINT 3 - Média Prioridade (Semana 5-6)

### 3.1 Queue Service - Métricas
**Prioridade:** 🟡 MÉDIA  
**Arquivo:** `backend/app/services/queue_service.py`  
**Esforço:** 4h

| Linha | Métrica | Implementação |
|-------|---------|---------------|
| `:423` | Median wait time | Usar `percentile_cont(0.5)` PostgreSQL |
| `:427` | CSAT Score | Criar modelo `ConversationRating` |

**Tarefas:**
- [ ] Implementar cálculo de mediana com window function
- [ ] Criar migração para tabela `conversation_ratings`
- [ ] Criar endpoint para submeter avaliação
- [ ] Calcular média CSAT por fila

---

### 3.2 Campaign - Segment Filtering
**Prioridade:** 🟡 MÉDIA  
**Arquivo:** `backend/app/services/campaign_service.py:578`  
**Esforço:** 6h

```
Status Atual: segment_filters não são aplicados
Impacto: Campanhas não podem segmentar audiência
```

**Tarefas:**
- [ ] Parsear `segment_filters` JSON
- [ ] Implementar filtros: tags, created_after, created_before
- [ ] Implementar filtros: last_message_after, is_vip
- [ ] Implementar filtros: custom_fields (JSONB query)
- [ ] Testes unitários para cada filtro

---

### 3.3 Flow Automation - Background Tasks
**Prioridade:** 🟡 MÉDIA  
**Arquivo:** `backend/app/services/flow_automation_service.py:302`  
**Esforço:** 3h

**Tarefas:**
- [ ] Usar Celery task `execute_flow_automation`
- [ ] Enfileirar execução ao invés de executar síncrono
- [ ] Adicionar retry com backoff exponencial
- [ ] Logging de execuções assíncronas

---

### 3.4 Schedule - Holiday API
**Prioridade:** 🟡 MÉDIA  
**Arquivo:** `backend/app/services/flow_automation_schedule_service.py:540-543`  
**Esforço:** 4h

**Opções de implementação:**
1. API externa: `https://date.nager.at/api/v3/publicholidays/{year}/BR`
2. Tabela local: `holidays` com org_id para feriados customizados

**Tarefas:**
- [ ] Criar modelo `Holiday` (date, name, org_id nullable)
- [ ] Popular feriados nacionais BR via seed
- [ ] Endpoint para adicionar feriados customizados
- [ ] Verificar feriado antes de agendar

---

## 🔵 SPRINT 4 - Baixa Prioridade (Semana 7-8)

### 4.1 Testes Unitários
**Prioridade:** 🔵 BAIXA  
**Esforço:** 20h

```
Status Atual: Apenas 1 arquivo de teste (test_domain_routing.py)
Meta: Cobertura mínima de 60% nos services
```

| Service | Prioridade | Esforço |
|---------|------------|---------|
| `auth_service.py` | Alta | 3h |
| `whatsapp_service.py` | Alta | 4h |
| `campaign_service.py` | Alta | 3h |
| `conversation_service.py` | Média | 2h |
| `flow_automation_service.py` | Média | 3h |
| `contact_service.py` | Média | 2h |
| `analytics_service.py` | Baixa | 2h |
| `organization_service.py` | Baixa | 1h |

**Setup necessário:**
- [ ] Configurar pytest + pytest-asyncio
- [ ] Criar fixtures para database mock
- [ ] Criar factories para modelos (factory_boy)
- [ ] Configurar CI para rodar testes

---

### 4.2 AI Assistant - Features Avançadas
**Prioridade:** 🔵 BAIXA  
**Arquivo:** `backend/app/api/v1/endpoints/ai_assistant.py`  
**Esforço:** 8h

| Linha | Feature | Descrição |
|-------|---------|-----------|
| `:452` | Clarifications | Perguntas de esclarecimento do AI |
| `:638` | Variable Mapping | Mapear variáveis do flow para contexto |

**Tarefas:**
- [ ] Schema `ClarificationRequest` e `ClarificationResponse`
- [ ] Lógica para AI pedir esclarecimentos
- [ ] Parser de variáveis em nodes do flow
- [ ] Injeção de variáveis no prompt

---

### 4.3 Encryption Providers
**Prioridade:** 🔵 BAIXA (apenas se necessário)  
**Arquivos:** 
- `backend/app/core/encryption/aws_kms_provider.py`
- `backend/app/core/encryption/vault_provider.py`

```
Status Atual: Stubs que lançam NotImplementedError
Impacto: Baixo - Fernet provider funciona para maioria dos casos
```

**Implementar apenas se:**
- Requisito de compliance (SOC2, HIPAA)
- Multi-region key management
- Hardware Security Module (HSM) necessário

---

## 📈 Cronograma Visual

```
Novembro 2025          Dezembro 2025           Janeiro 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sem 1-2 │ SPRINT 1 🔴
        │ ├─ Webhook Handler
        │ ├─ Notifications Endpoint  
        │ └─ JWT WebSocket
        │
Sem 3-4 │              │ SPRINT 2 🟠
        │              │ ├─ Swagger Docs
        │              │ ├─ AI Custom Models
        │              │ └─ Analytics Fixes
        │              │
Sem 5-6 │              │              │ SPRINT 3 🟡
        │              │              │ ├─ Queue Metrics
        │              │              │ ├─ Campaign Segments
        │              │              │ └─ Holidays
        │              │              │
Sem 7-8 │              │              │              │ SPRINT 4 🔵
        │              │              │              │ ├─ Unit Tests
        │              │              │              │ └─ AI Advanced
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ Checklist de Entrega por Sprint

### Sprint 1 ✅
- [x] Mensagens WhatsApp chegam e são salvas
- [x] Usuários podem ver/gerenciar notificações
- [x] WebSocket rejeita tokens inválidos
- [ ] Testes manuais passando

### Sprint 2 ✅
- [ ] Swagger 100% documentado (190/190 rotas)
- [ ] Modelos AI customizados funcionando
- [ ] Analytics com dados reais de mensagens
- [ ] Away status implementado

### Sprint 3 ✅
- [ ] Métricas de fila completas
- [ ] Segmentação de campanhas funcional
- [ ] Feriados considerados em agendamentos
- [ ] Flow automations assíncronos

### Sprint 4 ✅
- [ ] Cobertura de testes ≥ 60%
- [ ] CI rodando testes automaticamente
- [ ] AI com clarifications
- [ ] Documentação técnica completa

---

## 🚨 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Webhook overload | Média | Alto | Rate limiting + queue |
| WebSocket memory leak | Baixa | Alto | Connection cleanup + monitoring |
| Celery task failure | Média | Médio | Dead letter queue + alerts |
| Migration conflict | Baixa | Médio | Sempre rodar em staging primeiro |

---

## 📞 Contatos

**Desenvolvedor Principal:** Kayo Carvalho Fernandes  
**Repositório:** github.com/xkayo32/pytake

---

*Documento gerado em 30/11/2025 - Atualizar conforme progresso*
