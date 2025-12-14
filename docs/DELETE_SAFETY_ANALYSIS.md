# 🚨 Análise de Segurança: Delete de Registros no PyTake

**Data**: Dezembro 14, 2025  
**Versão**: 1.0  
**Status**: ⚠️ ANÁLISE CRÍTICA  
**Autor**: GitHub Copilot

---

## 📋 Índice

1. [Executive Summary](#executive-summary)
2. [Cenário Atual](#cenário-atual)
3. [Rotas DELETE Identificadas](#rotas-delete-identificadas)
4. [Perigos Identificados](#perigos-identificados)
5. [Riscos de Segurança](#riscos-de-segurança)
6. [Recomendações](#recomendações)
7. [Implementação Proposta](#implementação-proposta)
8. [Checklist de Implementação](#checklist-de-implementação)

---

## 🎯 Executive Summary

O PyTake possui **30+ rotas DELETE** que afetam dados críticos (usuários, contatos, campanhas, mensagens). Atualmente:

✅ **Bom**: Implementa `SoftDeleteMixin` em modelos  
⚠️ **Problema**: Falta **auditoria** de deletes  
❌ **Crítico**: Alguns serviços usam **hard delete** (dados perdidos permanentemente)  
❌ **Crítico**: Sem rastreamento de **quem deletou e por quê**

**Risco**: Perda permanente de dados, impossibilidade de recuperação, conformidade LGPD/GDPR comprometida.

---

## 📊 Cenário Atual

### Modelos com SoftDeleteMixin

```
✅ User (usuários)
✅ Contact (contatos CRM)
✅ Conversation (conversas)
✅ Message (mensagens)
✅ Campaign (campanhas)
✅ Department (departamentos)
✅ Organization (organizações)
✅ WhatsAppNumber (números WhatsApp)
✅ WhatsAppTemplate (templates)
✅ Flow (fluxos)
✅ ChatBot (chatbots)
✅ Queue (filas)
✅ Role (roles RBAC)
✅ Secret (segredos/API keys)
✅ Tag (tags de contatos)
```

### Implementação Atual de Delete

```python
# BaseRepository - Dois métodos conflitantes:

async def delete(self, id: UUID) -> bool:
    """HARD DELETE - dados perdidos permanentemente"""
    result = await self.db.execute(
        delete(self.model).where(self.model.id == id)
    )
    await self.db.commit()
    return result.rowcount > 0

async def soft_delete(self, id: UUID) -> Optional[ModelType]:
    """SOFT DELETE - marca deleted_at, dados preservados"""
    await self.db.execute(
        update(self.model)
        .where(self.model.id == id)
        .values(deleted_at=datetime.utcnow())
    )
    await self.db.commit()
    return await self.get(id)
```

**Problema**: Qual método cada serviço está usando?

---

## 🔍 Rotas DELETE Identificadas

### Por Categoria

| Categoria | Rotas | Status |
|-----------|-------|--------|
| **Usuários** | DELETE /users/{user_id} | ⚠️ Sem auditoria |
| **Contatos** | DELETE /contacts/{contact_id}, DELETE /contacts/tags/{tag_id} | ⚠️ Sem auditoria |
| **Campanhas** | DELETE /campaigns/{id} | ⚠️ Sem auditoria |
| **Fluxos** | DELETE /flows/{flow_id}, DELETE /chatbots/{id}/flows/{flow_id} | ⚠️ Sem auditoria |
| **Templates** | DELETE /whatsapp/{number_id}/templates/{template_id} | ⚠️ Sem auditoria |
| **Segredos** | DELETE /secrets/{secret_id} | ⚠️ Sem auditoria |
| **Organizações** | DELETE /organizations/{org_id} | ⚠️ Sem auditoria |
| **Queues** | DELETE /queues/{queue_id} | ⚠️ Sem auditoria |
| **Departamentos** | DELETE /departments/{id}, DELETE /departments/{id}/agents/{agent_id} | ⚠️ Sem auditoria |
| **RBAC** | DELETE /rbac/roles/{role_id} | ⚠️ Sem auditoria |
| **Números WhatsApp** | DELETE /whatsapp/{number_id} | ⚠️ Sem auditoria |
| **Chatbots** | DELETE /chatbots/{id}, DELETE /chatbots/{id}/nodes/{node_id} | ⚠️ Sem auditoria |
| **Agent Skills** | DELETE /users/{user_id}/skills/{skill_id} | ⚠️ Sem auditoria |
| **Automações** | DELETE /flow-automations/{id}, DELETE /flow-automations/{id}/schedule | ⚠️ Sem auditoria |

**Total**: 30+ endpoints DELETE

---

## 💥 Perigos Identificados

### 1. **Hard Delete vs Soft Delete Inconsistência**

```python
# ❌ ContactService.delete_contact():
async def delete_contact(self, contact_id: UUID, organization_id: UUID) -> bool:
    contact = await self.get_by_id(contact_id, organization_id)
    return await self.repo.delete(contact_id)  # ❌ HARD DELETE!

# O que deveria ser:
async def delete_contact(self, contact_id: UUID, organization_id: UUID) -> bool:
    contact = await self.get_by_id(contact_id, organization_id)
    return await self.repo.soft_delete(contact_id)  # ✅ SOFT DELETE
```

**Risco**: Dados críticos deletados permanentemente.

### 2. **Falta de Auditoria**

Não há registro de:
- **Quem** deletou (user_id)
- **Quando** deletou (timestamp)
- **Por quê** deletou (motivo/razão)
- **O quê** foi deletado (snapshot dos dados)

Exemplo de Impact:
```
2024-12-14 15:30:00
❌ Contato "João Silva" (phone: 5585988887777) deletado
   - Ninguém sabe quem deletou
   - Ninguém sabe o motivo
   - Não há como recuperar
   - Dados de conversas desse contato orphaned
```

### 3. **Sem Possibilidade de Recuperação**

```python
# BaseRepository tem restore():
async def restore(self, id: UUID) -> Optional[ModelType]:
    """Restaura soft-deleted record"""
    ...

# Mas não há ENDPOINT para restaurar!
# Usuário não pode recuperar dados deletados acidentalmente
```

**Risco**: Deletou acidentalmente? Tough luck, não tem volta.

### 4. **Violação de Conformidade (LGPD/GDPR)**

LGPD artigo 18: "direito do titular à exclusão"  
GDPR artigo 17: "right to be forgotten"

Mas também: Empresas têm direito de reter logs de atividade.

❌ Sem auditoria = sem prova do delete = problema legal.

### 5. **Dados Orphaned**

Quando um Contact é deletado:
- Conversas ainda referenciam o contact_id
- Mensagens ainda referenciam o contact_id
- Campanhas trazem deleted_at = NULL

**Risco**: Queries quebradas, relatórios inconsistentes.

### 6. **Sem RBAC para Delete**

```python
# UserService.delete_user():
async def delete_user(self, user_id: UUID, ...):
    if deleted_by.role not in ["super_admin", "org_admin"]:
        raise ForbiddenException("Only admins can delete users")
    # ✅ Bom - há validação

# Mas ContactService não valida quem pode deletar
async def delete_contact(self, contact_id: UUID, organization_id: UUID):
    # ❌ Nenhuma validação de RBAC
    return await self.repo.delete(contact_id)
```

**Risco**: Qualquer agente pode deletar qualquer contato?

### 7. **Sem Soft Delete em Operações em Cascata**

```python
# Quando delete um Flow:
async def delete_flow(self, flow_id: UUID, organization_id: UUID):
    # Deleta também:
    # - Todos os nós do flow
    # - Todas as conversas usando esse flow?
    # - Histórico de execução?
    
    # Sem auditoria de cascata
```

---

## ⚠️ Riscos de Segurança

### Risco 1: Perda de Dados Crítica

| Cenário | Impacto | Probabilidade |
|---------|---------|--------------|
| Admin deleta Contact errado | Conversas perdidas | Alta |
| Integração deleta Flows | Chatbots param de funcionar | Alta |
| Script deleta Campaigns | Histórico de campanhas perdido | Média |
| Hack deleta Organizations | Dados de cliente inteiro perdidos | Média |

**Score**: 🔴 **CRÍTICO**

### Risco 2: Conformidade Legal

| Lei | Requisito | Status |
|-----|-----------|--------|
| LGPD Art. 18 | Direito de saber quem deletou | ❌ Não |
| GDPR Art. 17 | Right to be forgotten | ⚠️ Parcial |
| GDPR Art. 12 | Provar cumprimento de deletes | ❌ Não |
| ISO 27001 | Auditoria de acesso a dados | ❌ Não |

**Score**: 🔴 **CRÍTICO**

### Risco 3: Investigação de Incidentes

Cenário: "Quem deletou a campanha de Black Friday?"

| Pergunta | Resposta Atual |
|----------|---|
| Quando foi deletado? | Procura em deleted_at |
| Quem deletou? | ❌ Sem informação |
| Por quê? | ❌ Sem informação |
| Pode recuperar? | ❌ Se foi hard delete |

**Score**: 🟡 **ALTO**

### Risco 4: Acidental Delete (UX)

```
Usuário clica em delete
  ↓
Sem confirmação? → Deletado!
  ↓
Sem undo? → Perdido para sempre!
```

**Score**: 🟠 **MÉDIO-ALTO**

---

## ✅ Recomendações

### Recomendação 1: **Implementar Audit Log Obrigatório**

Criar tabela `audit_logs` que registra TODOS os deletes:

```python
# audit_logs table
id: UUID
organization_id: UUID (multi-tenancy)
deleted_by_user_id: UUID (quem deletou)
deleted_at_timestamp: DateTime
model_type: String (Contact, Campaign, Flow, etc.)
record_id: UUID (ID do registro deletado)
deleted_reason: Text (por quê foi deletado)
deleted_data_snapshot: JSONB (snapshot dos dados antes de deletar)
ip_address: String (IP de quem deletou)
user_agent: String (device/browser de quem deletou)

Indexes:
- organization_id + deleted_at_timestamp (rápido buscar deletes de um org)
- record_id + model_type (descobrir histórico de deletions)
- deleted_by_user_id (auditoria de um usuário)
```

**Benefício**: Rastreabilidade completa.

### Recomendação 2: **Forçar Soft Delete em Todos os Casos**

```python
# ❌ Eliminar uso de hard delete
async def delete(self, id: UUID) -> bool:
    """Hard delete - NUNCA USAR"""
    ...

# ✅ Fazer soft_delete ser o padrão
async def delete(self, id: UUID, soft: bool = True) -> bool:
    """Delete (soft by default, hard only if explicitly required)"""
    if soft:
        return await self.soft_delete(id)
    else:
        raise Exception("Hard delete requires explicit approval")
```

**Benefício**: Dados nunca perdidos permanentemente (exceto se hard delete aprovado).

### Recomendação 3: **Adicionar Campos de Auditoria ao SoftDeleteMixin**

```python
class SoftDeleteMixin:
    """Enhanced soft delete with audit trail"""
    
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)
    deleted_by_user_id = Column(UUID(as_uuid=True), nullable=True)
    deleted_reason = Column(Text, nullable=True)
    deleted_data_snapshot = Column(JSONB, nullable=True)  # Backup dos dados
    
    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
    
    def soft_delete(self, deleted_by_id: UUID, reason: str = None) -> None:
        """Soft delete com auditoria"""
        self.deleted_at = datetime.utcnow()
        self.deleted_by_user_id = deleted_by_id
        self.deleted_reason = reason
        # Backup dos dados atuais
        self.deleted_data_snapshot = {
            k: v for k, v in self.__dict__.items()
            if not k.startswith('_')
        }
    
    def restore(self) -> None:
        """Restaurar dados deletados"""
        self.deleted_at = None
        self.deleted_by_user_id = None
        self.deleted_reason = None
```

**Benefício**: Auditoria integrada no modelo.

### Recomendação 4: **Implementar Restore Endpoint**

```python
# app/api/v1/endpoints/admin/restore.py

@router.post(
    "/restore/{model_type}/{record_id}",
    summary="Restaurar registro deletado",
    description="Apenas super_admin ou org_admin",
)
async def restore_record(
    model_type: str,  # contact, campaign, flow, etc.
    record_id: UUID,
    current_user: User = Depends(require_role(["super_admin", "org_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Restaurar registro deletado (soft delete)"""
    service = RestoreService(db)
    return await service.restore(model_type, record_id, current_user)
```

**Benefício**: Recuperação de dados deletados acidentalmente.

### Recomendação 5: **Implementar RBAC Consistente para Delete**

```python
# Em TODOS os endpoints DELETE, adicionar validação:

async def delete_contact(
    contact_id: UUID,
    current_user: User = Depends(require_role(["org_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Delete contact (requires org_admin or super_admin)"""
    service = ContactService(db)
    await service.delete_contact(
        contact_id=contact_id,
        organization_id=current_user.organization_id,
        deleted_by_id=current_user.id,  # Novo campo
        deleted_reason=None  # Opcional: reason no request?
    )
```

**Benefício**: Apenas admins podem deletar.

### Recomendação 6: **Implementar Soft Delete em Cascata**

```python
# ContactRepository.delete():
async def delete(self, contact_id: UUID, deleted_by_id: UUID = None):
    """Soft delete contact e tudo que referencia"""
    
    contact = await self.get(contact_id)
    contact.soft_delete(deleted_by_id=deleted_by_id)
    
    # Soft delete conversas relacionadas
    conversations = await self.get_related_conversations(contact_id)
    for conv in conversations:
        conv.soft_delete(deleted_by_id=deleted_by_id)
        # Soft delete mensagens da conversa
        for msg in conv.messages:
            msg.soft_delete(deleted_by_id=deleted_by_id)
    
    await self.db.commit()
```

**Benefício**: Integridade referencial sem perda de dados.

### Recomendação 7: **Criar Deletion Reason Enum**

```python
class DeletionReason(str, Enum):
    """Razões válidas para deletar registros"""
    USER_REQUEST = "user_request"  # Usuário pediu
    EXPIRED = "expired"  # Dados expirados
    DUPLICATE = "duplicate"  # Duplicado
    COMPLIANCE = "compliance"  # LGPD/GDPR
    ERROR = "error"  # Erro/acidental
    ABUSE = "abuse"  # Abuso/spam
    POLICY = "policy"  # Violação de política
    UNKNOWN = "unknown"  # Desconhecido
    
    @classmethod
    def validate(cls, reason: Optional[str]) -> bool:
        return reason is None or reason in [r.value for r in cls]
```

**Benefício**: Padronização de razões, facilita análise.

### Recomendação 8: **Blacklist para Hard Delete**

Se ABSOLUTAMENTE necessário fazer hard delete (ex: segurança/GDPR):

```python
class HardDeleteApproval:
    """Registry de hard deletes aprovados"""
    
    # Apenas esses modelos podem ter hard delete com aprovação:
    APPROVED_FOR_HARD_DELETE = {
        "RefreshToken",  # Tokens expirados
        "SessionLog",  # Logs de sessão expirados
        "TemporaryFile",  # Arquivos temporários
    }
    
    # Todas as outras tabelasNUNCA hard delete
    @staticmethod
    def can_hard_delete(model_type: str) -> bool:
        return model_type in HardDeleteApproval.APPROVED_FOR_HARD_DELETE
```

**Benefício**: Controle explícito sobre hard deletes.

---

## 🔧 Implementação Proposta

### Fase 1: Auditoria (Semana 1)

```bash
# 1. Criar tabela de audit_logs
docker exec pytake-backend alembic revision --autogenerate -m "add_audit_logs_table"
docker exec pytake-backend alembic upgrade head

# 2. Criar audit_log.py model
app/models/audit_log.py

# 3. Criar AuditLogRepository
app/repositories/audit_log.py

# 4. Criar AuditLogService
app/services/audit_log_service.py
```

### Fase 2: Enhanced SoftDeleteMixin (Semana 1-2)

```bash
# 1. Atualizar models/base.py com novos campos
# 2. Criar migration para adicionar colunas aos modelos existentes
docker exec pytake-backend alembic revision --autogenerate -m "enhance_soft_delete_mixin"

# 3. Testar se as queries antigas funcionam
pytest tests/test_soft_delete.py
```

### Fase 3: Update All Services (Semana 2-3)

```python
# Para cada service com delete:
# - ContactService.delete_contact()
# - CampaignService.delete_campaign()
# - FlowService.delete_flow()
# - ... etc

# Adicionar:
# - Validação de RBAC
# - Chamada a AuditLogService
# - Captura de deleted_reason
# - Snapshot de dados
```

### Fase 4: Restore Endpoints (Semana 3)

```python
# Criar:
# - GET /admin/deleted-records (listar deletados)
# - POST /admin/restore/{model}/{id} (restaurar)
# - Proteger com RBAC (super_admin, org_admin)
```

### Fase 5: Testes e Validação (Semana 3-4)

```bash
# 1. Testar cada delete endpoint
# 2. Verificar audit logs
# 3. Testar restore
# 4. Testar RBAC
pytest tests/test_delete_safety.py -v

# 5. Teste de carga (múltiplos deletes simultâneos)
pytest tests/test_delete_performance.py
```

---

## 📋 Checklist de Implementação

### Modelos

- [ ] Atualizar `SoftDeleteMixin` com novos campos (deleted_by_user_id, deleted_reason, deleted_data_snapshot)
- [ ] Criar modelo `AuditLog`
- [ ] Gerar migration

### Repositories

- [ ] Atualizar `BaseRepository.delete()` para usar soft_delete + audit
- [ ] Criar `AuditLogRepository`
- [ ] Atualizar todas as repositories com delete (ContactRepository, CampaignRepository, etc.)

### Services

- [ ] Atualizar `BaseService` com método delete padrão
- [ ] Atualizar **todos** os serviços:
  - [ ] UserService.delete_user()
  - [ ] ContactService.delete_contact()
  - [ ] CampaignService.delete_campaign()
  - [ ] FlowService.delete_flow()
  - [ ] ChatBotService.delete_chatbot()
  - [ ] DepartmentService.delete_department()
  - [ ] OrganizationService.delete()
  - [ ] TemplateService.delete_template()
  - [ ] QueueService.delete_queue()
  - [ ] SecretService.delete_secret()
  - [ ] ... e todos os outros
- [ ] Adicionar `deleted_by_id` e `deleted_reason` em cada método

### Endpoints

- [ ] Atualizar todas as rotas DELETE para capturar:
  - [ ] `current_user` (para deleted_by_id)
  - [ ] `deleted_reason` (opcional, do request body)
- [ ] Adicionar validação de RBAC consistente
- [ ] Criar endpoint para restauração:
  - [ ] `GET /admin/deleted-records?model_type={type}`
  - [ ] `POST /admin/restore/{model_type}/{record_id}`

### Documentação

- [ ] Atualizar API docs com novo comportamento
- [ ] Criar guia para developers: "Como implementar delete seguro"
- [ ] Atualizar ARCHITECTURE.md

### Testes

- [ ] Criar `tests/test_soft_delete_audit.py`
- [ ] Criar `tests/test_restore_functionality.py`
- [ ] Criar `tests/test_delete_rbac.py`
- [ ] Criar `tests/test_audit_log_integrity.py`
- [ ] Coverage: +80% dos métodos delete

### Compliance

- [ ] Validar LGPD Art. 18 compliance
- [ ] Validar GDPR Art. 17 compliance
- [ ] Documentar retenção de logs (por quanto tempo guardar?)
- [ ] Implementar limpeza automática de logs antigos (opcional)

---

## 📊 Roadmap de Implementação

```
Semana 1: Auditoria + SoftDeleteMixin Enhancements
├─ Migration + AuditLog model
├─ Enhanced SoftDeleteMixin
├─ AuditLogRepository e Service
└─ Testes unitários

Semana 2: Update Services
├─ Atualizar todos os delete nos serviços
├─ Adicionar RBAC consistente
└─ Integrar com AuditLogService

Semana 3: Endpoints + Restore
├─ Criar restore endpoints
├─ Atualizar DELETE endpoints com deleted_reason
└─ Teste de integração

Semana 4: QA + Deploy
├─ Teste de carga
├─ Teste de segurança
├─ Code review
└─ Deploy em staging
```

---

## 📝 Conclusão

### Status Atual: ⚠️ **ALTO RISCO**

Sem auditoria adequada de deletes, o PyTake está exposto a:

1. ❌ Perda permanente de dados
2. ❌ Impossibilidade de auditoria (LGPD/GDPR)
3. ❌ Sem rastreamento de quem deletou
4. ❌ Sem possibilidade de recuperação

### Com as Recomendações: ✅ **SEGURO**

1. ✅ Todos os deletes soft (dados recuperáveis)
2. ✅ Auditoria completa (quem, quando, por quê)
3. ✅ Recuperação de dados (restore endpoint)
4. ✅ RBAC consistente (apenas admins deletam)
5. ✅ Conformidade legal (LGPD/GDPR)

### Esforço Estimado

- **Horas**: ~80-100 horas
- **Equipe**: 1 backend developer + 1 QA
- **Timeline**: 4 semanas (1 semana por fase)
- **Risco de Deploy**: Baixo (mudanças retrocompatíveis)

---

**Recomendação Final**: Implementar IMEDIATAMENTE a Fase 1 (Auditoria). Sem isso, nenhum sistema de deleção é seguro.

