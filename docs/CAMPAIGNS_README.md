# 📚 Campaign System Documentation Index

**Status**: ✅ Completo e Documentado  
**Data**: Dezembro 14, 2025  
**Versão**: 1.0

---

## 📖 Documentação Disponível

### **1. 🚀 [CAMPAIGN_EXECUTION_SYSTEM.md](CAMPAIGN_EXECUTION_SYSTEM.md)** 
*Documentação Técnica Completa*

**Conteúdo**:
- ✅ Visão geral do sistema
- ✅ Arquitetura completa
- ✅ Fluxo end-to-end detalhado (5 fases)
- ✅ Componentes principais (Service, Repository, Celery Tasks, Retry Manager, Rate Limiter)
- ✅ Retry logic com exponential backoff
- ✅ Rate limiting (Meta API vs Evolution API)
- ✅ Webhooks e atualização de status
- ✅ Estrutura de dados (Campaign model, message_statuses JSONB)
- ✅ Estados da campanha (state machine)
- ✅ Monitoramento e métricas
- ✅ Troubleshooting

**Para**: Desenvolvedores, Arquitetos, Code Review  
**Tamanho**: ~1800 linhas  
**Tempo de leitura**: 30-40 minutos

---

### **2. ⚡ [CAMPAIGN_QUICK_REFERENCE.md](CAMPAIGN_QUICK_REFERENCE.md)**
*Referência Rápida para Uso Prático*

**Conteúdo**:
- ✅ Resumo executivo (1 página)
- ✅ Quick start (4 endpoints principais)
- ✅ Fluxo visual simplificado
- ✅ Configuração padrão
- ✅ Timings esperados
- ✅ Debugging e troubleshooting
- ✅ Referências rápidas
- ✅ Checklist pré-disparo

**Para**: DevOps, QA, Suporte, Produto  
**Tamanho**: ~400 linhas  
**Tempo de leitura**: 5-10 minutos

---

### **3. 📊 [CAMPAIGN_VISUAL_DIAGRAMS.md](CAMPAIGN_VISUAL_DIAGRAMS.md)**
*Diagramas Visuais e Fluxogramas*

**Conteúdo**:
- ✅ Fluxo completo (high-level)
- ✅ Processo de batch (detalhado)
- ✅ Retry logic visual (cenário real)
- ✅ Rate limiting strategy
- ✅ Campaign state machine
- ✅ Message status lifecycle
- ✅ Webhook flow
- ✅ Error tracking structure
- ✅ Batch processing timeline

**Para**: Visualização, Apresentações, Entendimento Rápido  
**Tamanho**: ~500 linhas de ASCII art  
**Tempo de leitura**: 10-15 minutos

---

## 🎯 Como Usar Esta Documentação

### **Eu quero...**

#### 🚀 **Disparar uma campanha rapidamente**
→ Leia: [CAMPAIGN_QUICK_REFERENCE.md](CAMPAIGN_QUICK_REFERENCE.md) (seção "Quick Start")

#### 🔍 **Entender como o sistema funciona**
→ Leia: [CAMPAIGN_EXECUTION_SYSTEM.md](CAMPAIGN_EXECUTION_SYSTEM.md) (seção "Fluxo End-to-End")

#### 🐛 **Debugar um problema**
→ Leia: [CAMPAIGN_QUICK_REFERENCE.md](CAMPAIGN_QUICK_REFERENCE.md) (seção "Debugging")  
→ Depois: [CAMPAIGN_EXECUTION_SYSTEM.md](CAMPAIGN_EXECUTION_SYSTEM.md) (seção "Troubleshooting")

#### 📊 **Ver como os dados fluem**
→ Leia: [CAMPAIGN_VISUAL_DIAGRAMS.md](CAMPAIGN_VISUAL_DIAGRAMS.md) (todos os diagramas)

#### 💾 **Entender estrutura de dados**
→ Leia: [CAMPAIGN_EXECUTION_SYSTEM.md](CAMPAIGN_EXECUTION_SYSTEM.md) (seção "Estrutura de Dados")

#### ⏱️ **Saber timings e performance**
→ Leia: [CAMPAIGN_QUICK_REFERENCE.md](CAMPAIGN_QUICK_REFERENCE.md) (seção "Timings Esperados")

#### 🔐 **Implementar controle de acesso**
→ Leia: [CAMPAIGN_QUICK_REFERENCE.md](CAMPAIGN_QUICK_REFERENCE.md) (seção "Permissões Requeridas")

#### 📚 **Code review de PR relacionada**
→ Leia: [CAMPAIGN_EXECUTION_SYSTEM.md](CAMPAIGN_EXECUTION_SYSTEM.md) (seção "Componentes Principais")

---

## 🗂️ Estrutura de Arquivos do Projeto

```
backend/
├── app/
│   ├── services/
│   │   └── campaign_service.py          # Lógica de negócio
│   ├── repositories/
│   │   └── campaign.py                  # Acesso a dados
│   ├── models/
│   │   └── campaign.py                  # ORM model
│   ├── schemas/
│   │   └── campaign.py                  # Validação Pydantic
│   ├── api/v1/endpoints/
│   │   └── campaigns.py                 # REST endpoints
│   ├── tasks/
│   │   ├── campaign_tasks.py            # Celery tasks
│   │   └── campaign_retry.py            # Retry logic
│   ├── core/
│   │   └── whatsapp_rate_limit.py       # Rate limiting
│   ├── graphql/
│   │   ├── queries/
│   │   │   └── campaign.py
│   │   ├── mutations/
│   │   │   └── campaign.py
│   │   └── types/
│   │       └── campaign.py
│   └── integrations/
│       ├── meta_api.py                  # Meta Cloud API
│       └── evolution_api.py             # Evolution API (QR Code)
│
docs/
├── CAMPAIGN_EXECUTION_SYSTEM.md         # 📖 Documentação técnica completa
├── CAMPAIGN_QUICK_REFERENCE.md          # ⚡ Referência rápida
├── CAMPAIGN_VISUAL_DIAGRAMS.md          # 📊 Diagramas e fluxogramas
└── CAMPAIGNS_README.md                  # 📚 Este arquivo
```

---

## 🔑 Conceitos Principais

### **Celery Tasks (Execução Assíncrona)**

```python
# 1. ORCHESTRATOR (executa 1x)
execute_campaign(campaign_id)
  └─ Fetch contacts, divide em batches, cria chord

# 2. BATCH PROCESSORS (executa N vezes em paralelo)
process_batch(campaign_id, contact_ids, batch_index)
  └─ Para cada contato: send + retry + rate limit

# 3. FINALIZER (callback - executa 1x ao final)
finalize_campaign(campaign_id, results)
  └─ Agrega stats, calcula rates, marca como completed
```

### **Rate Limiting**

| API | Limite | Estratégia |
|-----|--------|-----------|
| Meta Cloud API | 500/dia, 100/hora, 20/min | Hard (pausa se atingir) |
| Evolution API | 1000/hora (soft) | Graceful (espera 500ms) |

### **Retry Strategy**

```
Max attempts: 3
Base delay: 60 segundos
Max delay: 3600 segundos

Delays: 60s → 120s → 240s
Total: ~6 minutos (se falhar 3x)
```

### **Status Flow**

```
Message: pending → sent → delivered → read
Campaign: draft → running → completed
          └─→ scheduled
          └─→ paused (reversível)
          └─→ cancelled (irreversível)
```

---

## 📊 Dados em Tempo Real

### **Endpoints de Status**

```bash
# Progresso da campanha
GET /api/v1/campaigns/{id}/progress
→ CampaignProgress {progress_percentage, remaining_time, ...}

# Estatísticas
GET /api/v1/campaigns/{id}/stats
→ CampaignStats {sent, delivered, read, failed, rates, ...}

# Detalhes de retry
GET /api/v1/campaigns/{id}/retry-stats
→ RetryStatistics {total_contacts, successful_on_first, error_breakdown, ...}
```

### **Atualização de Status**

Webhooks da Meta chegam continuamente e atualizam:
- `messages_delivered` (quando entrega confirmada)
- `messages_read` (quando usuário lê)
- `messages_failed` (quando há erro)

---

## 🧪 Testes

**Arquivos de teste recomendados**:
- `tests/test_campaign_*.py`
- `tests/test_campaign_service.py`
- `tests/test_campaign_tasks.py`
- `tests/test_campaign_retry.py`

**Cobertura esperada**:
- ✅ CRUD operations
- ✅ Audience targeting (all_contacts, tags, segment, custom_list)
- ✅ Retry logic
- ✅ Rate limiting
- ✅ Status transitions
- ✅ Multi-tenancy isolation
- ✅ Webhook handling

---

## 🚨 Erros Comuns

### **"Campaign not found"**
- Verifique `campaign_id` (UUID válido)
- Verifique `organization_id` (multi-tenancy)

### **"Cannot edit running campaign"**
```bash
# Solução:
POST /api/v1/campaigns/{id}/pause
# Edite
PUT /api/v1/campaigns/{id}
# Retome
POST /api/v1/campaigns/{id}/resume
```

### **"Rate limit exceeded"**
Campaign pausa automaticamente. Aguarde 24 horas ou:
```bash
POST /api/v1/campaigns/{id}/resume  # Depois do reset
```

### **Retry failures (Invalid phone, etc)**
Erro permanente após 3 tentativas. Solução:
```sql
-- Verificar dados
SELECT * FROM contacts WHERE id='...' AND organization_id='...'

-- Corrigir
UPDATE contacts SET whatsapp_id = NULL WHERE id='...'

-- Re-executar campanha
```

---

## 🔗 Relacionados

- **Flow Execution**: [FLOW_EXECUTION_ANALYSIS.md](./FLOW_EXECUTION_ANALYSIS.md)
- **Queue System**: [QUEUE_SYSTEM_INDEX.md](./QUEUE_SYSTEM_INDEX.md)
- **RBAC**: [RBAC_SYSTEM_COMPLETE.md](./RBAC_SYSTEM_COMPLETE.md)
- **API Docs**: [/api/v1/docs](http://localhost:8000/api/v1/docs) (Swagger)

---

## 📞 Suporte

**Dúvidas sobre**:
- 🚀 **Disparo de campanhas**: Veja [CAMPAIGN_QUICK_REFERENCE.md](CAMPAIGN_QUICK_REFERENCE.md)
- 🔧 **Implementação**: Veja [CAMPAIGN_EXECUTION_SYSTEM.md](CAMPAIGN_EXECUTION_SYSTEM.md)
- 🐛 **Debugging**: Veja ambos os anteriores + [CAMPAIGN_VISUAL_DIAGRAMS.md](CAMPAIGN_VISUAL_DIAGRAMS.md)

---

## ✅ Checklist de Leitura

- [ ] Li [CAMPAIGN_QUICK_REFERENCE.md](CAMPAIGN_QUICK_REFERENCE.md) (essencial)
- [ ] Li [CAMPAIGN_EXECUTION_SYSTEM.md](CAMPAIGN_EXECUTION_SYSTEM.md) (completo)
- [ ] Estudei [CAMPAIGN_VISUAL_DIAGRAMS.md](CAMPAIGN_VISUAL_DIAGRAMS.md) (visuais)
- [ ] Executei exemplo prático (Quick Start)
- [ ] Entendo o fluxo end-to-end
- [ ] Conheço componentes principais
- [ ] Entendo retry logic
- [ ] Sei usar endpoints de status
- [ ] Pronto para troubleshoot!

---

**Última atualização**: Dezembro 14, 2025  
**Versão**: 1.0 (Completa)  
**Status**: ✅ Documentado e Verificado  
**Autor**: Kayo Carvalho Fernandes
