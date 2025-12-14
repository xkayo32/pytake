# 🛠️ Guia Prático: Implementar Delete Seguro no PyTake

**Data**: Dezembro 14, 2025  
**Status**: 📋 Guia de Implementação  

---

## 📑 Índice

1. [Exemplo 1: Enhanced SoftDeleteMixin](#exemplo-1-enhanced-softdeletemixin)
2. [Exemplo 2: AuditLog Model](#exemplo-2-auditlog-model)
3. [Exemplo 3: Service com Delete Seguro](#exemplo-3-service-com-delete-seguro)
4. [Exemplo 4: Endpoint DELETE com Auditoria](#exemplo-4-endpoint-delete-com-auditoria)
5. [Exemplo 5: Restore Endpoint](#exemplo-5-restore-endpoint)
6. [Exemplo 6: Testes](#exemplo-6-testes)

---

## Exemplo 1: Enhanced SoftDeleteMixin

### Arquivo: `app/models/base.py`

```python
from datetime import datetime
from uuid import UUID
from sqlalchemy import Column, DateTime, func, JSON
from sqlalchemy.dialects.postgresql import JSONB, UUID as PostgresUUID


class SoftDeleteMixin:
    """Enhanced soft delete with audit trail"""

    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    
    # ✨ NOVOS CAMPOS:
    deleted_by_user_id = Column(
        PostgresUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    deleted_reason = Column(
        String(50),  # Enum: user_request, duplicate, expired, compliance, etc.
        nullable=True,
    )
    
    deleted_data_snapshot = Column(
        JSONB,  # Backup dos dados antes de deletar
        nullable=True,
    )
    
    @property
    def is_deleted(self) -> bool:
        """Check if record is soft deleted"""
        return self.deleted_at is not None
    
    def soft_delete(
        self,
        deleted_by_id: UUID,
        reason: str = "unknown",
        snapshot: Optional[dict] = None
    ) -> None:
        """
        Soft delete the record com auditoria.
        
        Args:
            deleted_by_id: UUID do usuário que deletou
            reason: Razão da deleção (enum string)
            snapshot: Optional dict com dados de backup
        """
        from datetime import datetime
        
        self.deleted_at = datetime.utcnow()
        self.deleted_by_user_id = deleted_by_id
        self.deleted_reason = reason
        
        # Se não passou snapshot, criar um automaticamente
        if snapshot is None:
            snapshot = self._create_snapshot()
        self.deleted_data_snapshot = snapshot
    
    def restore(self) -> None:
        """Restore soft deleted record"""
        self.deleted_at = None
        self.deleted_by_user_id = None
        self.deleted_reason = None
        self.deleted_data_snapshot = None
    
    def _create_snapshot(self) -> dict:
        """Create snapshot of current record data"""
        snapshot = {}
        for key, value in self.__dict__.items():
            if not key.startswith('_'):
                # Serialize complex types
                if isinstance(value, (datetime, UUID)):
                    snapshot[key] = str(value)
                else:
                    snapshot[key] = value
        return snapshot
```

---

## Exemplo 2: AuditLog Model

### Arquivo: `app/models/audit_log.py`

```python
"""
Audit Log Model - Registra todas as operações de deleção
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, DateTime, String, Text, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID as PostgresUUID, INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, TimestampMixin


class AuditLog(Base, TimestampMixin):
    """
    Audit log for all delete operations
    """
    
    __tablename__ = "audit_logs"
    
    # Primary Key
    id = Column(
        PostgresUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    
    # Multi-Tenancy
    organization_id = Column(
        PostgresUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Who deleted
    deleted_by_user_id = Column(
        PostgresUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # When deleted
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    
    # What was deleted
    model_type = Column(
        String(100),  # Contact, Campaign, Flow, etc.
        nullable=False,
        index=True,
    )
    record_id = Column(
        PostgresUUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    record_name = Column(
        String(255),  # Nome do contato, titulo da campanha, etc.
        nullable=True,
    )
    
    # Why deleted
    deletion_reason = Column(
        String(50),  # user_request, duplicate, expired, compliance, etc.
        nullable=True,
        index=True,
    )
    custom_reason = Column(
        Text,  # Descrição customizada do motivo
        nullable=True,
    )
    
    # Data snapshot (for recovery)
    deleted_data_snapshot = Column(
        JSONB,
        nullable=True,
    )
    
    # Context
    ip_address = Column(
        INET,
        nullable=True,
    )
    user_agent = Column(
        String(500),
        nullable=True,
    )
    
    # Additional context
    extra_data = Column(
        JSONB,
        nullable=True,
        comment="Any additional data relevant to the deletion",
    )
    
    # Soft delete for audit logs (rarely used)
    deleted_at_audit = Column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # Relationships
    deleted_by_user = relationship("User", foreign_keys=[deleted_by_user_id])
    organization = relationship("Organization", foreign_keys=[organization_id])
    
    def __repr__(self):
        return (
            f"<AuditLog(id={self.id}, "
            f"model_type={self.model_type}, "
            f"record_id={self.record_id}, "
            f"deleted_by={self.deleted_by_user_id})>"
        )
```

### Arquivo: `app/repositories/audit_log.py`

```python
"""
Audit Log Repository
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    """Repository for AuditLog operations"""
    
    def __init__(self, db: AsyncSession):
        super().__init__(AuditLog, db)
    
    async def log_delete(
        self,
        organization_id: UUID,
        deleted_by_user_id: Optional[UUID],
        model_type: str,
        record_id: UUID,
        record_name: Optional[str] = None,
        deletion_reason: Optional[str] = None,
        custom_reason: Optional[str] = None,
        deleted_data_snapshot: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_data: Optional[dict] = None,
    ) -> AuditLog:
        """Log a deletion operation"""
        
        log = AuditLog(
            organization_id=organization_id,
            deleted_by_user_id=deleted_by_user_id,
            model_type=model_type,
            record_id=record_id,
            record_name=record_name,
            deletion_reason=deletion_reason,
            custom_reason=custom_reason,
            deleted_data_snapshot=deleted_data_snapshot,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data,
        )
        
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        
        return log
    
    async def get_deletion_logs(
        self,
        organization_id: UUID,
        model_type: Optional[str] = None,
        record_id: Optional[UUID] = None,
        deleted_by_user_id: Optional[UUID] = None,
        since: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[AuditLog]:
        """Get deletion logs with filters"""
        
        stmt = select(AuditLog).where(
            AuditLog.organization_id == organization_id
        )
        
        if model_type:
            stmt = stmt.where(AuditLog.model_type == model_type)
        
        if record_id:
            stmt = stmt.where(AuditLog.record_id == record_id)
        
        if deleted_by_user_id:
            stmt = stmt.where(AuditLog.deleted_by_user_id == deleted_by_user_id)
        
        if since:
            stmt = stmt.where(AuditLog.deleted_at >= since)
        
        stmt = stmt.order_by(desc(AuditLog.deleted_at)).limit(limit)
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_record_deletion_history(
        self,
        organization_id: UUID,
        model_type: str,
        record_id: UUID,
    ) -> List[AuditLog]:
        """Get deletion history for a specific record"""
        
        stmt = (
            select(AuditLog)
            .where(
                and_(
                    AuditLog.organization_id == organization_id,
                    AuditLog.model_type == model_type,
                    AuditLog.record_id == record_id,
                )
            )
            .order_by(desc(AuditLog.deleted_at))
        )
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
```

---

## Exemplo 3: Service com Delete Seguro

### Arquivo: `app/services/contact_service.py` (Atualizado)

```python
"""
Contact Service - Exemplo de delete seguro
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.repositories.contact import ContactRepository
from app.repositories.audit_log import AuditLogRepository
from app.core.exceptions import NotFoundException, ForbiddenException


class ContactService:
    """Service for contact management"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ContactRepository(db)
        self.audit_repo = AuditLogRepository(db)
    
    async def delete_contact(
        self,
        contact_id: UUID,
        organization_id: UUID,
        deleted_by_user_id: UUID,
        deleted_reason: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> bool:
        """
        Soft delete a contact com auditoria
        
        Args:
            contact_id: Contact UUID
            organization_id: Organization UUID (multi-tenancy)
            deleted_by_user_id: User UUID que está deletando
            deleted_reason: Razão do delete (enum string)
            ip_address: IP do usuário
            user_agent: User agent do navegador
        
        Raises:
            NotFoundException: Se contato não encontrado
            ForbiddenException: Se user sem permissão
        """
        
        # 1. Validar que contato existe e pertence a esta org
        contact = await self.repo.get_by_id(contact_id, organization_id)
        if not contact:
            raise NotFoundException(f"Contact {contact_id} not found")
        
        # 2. Criar snapshot dos dados ANTES de deletar
        snapshot = {
            "id": str(contact.id),
            "name": contact.name,
            "email": contact.email,
            "whatsapp_id": contact.whatsapp_id,
            "phone_number": contact.phone_number,
            "company": contact.company,
            "is_blocked": contact.is_blocked,
            "conversation_count": len(contact.conversations) if contact.conversations else 0,
        }
        
        # 3. Executar soft delete
        contact.soft_delete(
            deleted_by_id=deleted_by_user_id,
            reason=deleted_reason or "unknown",
            snapshot=snapshot,
        )
        
        await self.db.commit()
        
        # 4. Registrar no audit log
        await self.audit_repo.log_delete(
            organization_id=organization_id,
            deleted_by_user_id=deleted_by_user_id,
            model_type="Contact",
            record_id=contact_id,
            record_name=contact.name,
            deletion_reason=deleted_reason or "unknown",
            deleted_data_snapshot=snapshot,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data={
                "conversations_count": len(contact.conversations) if contact.conversations else 0,
                "tags_count": len(contact.tags) if contact.tags else 0,
            }
        )
        
        return True
    
    async def restore_contact(
        self,
        contact_id: UUID,
        organization_id: UUID,
        restored_by_user_id: UUID,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Contact:
        """
        Restaurar um contato deletado
        
        Args:
            contact_id: Contact UUID
            organization_id: Organization UUID
            restored_by_user_id: User UUID que está restaurando
            ip_address: IP do usuário
            user_agent: User agent do navegador
        
        Returns:
            Contato restaurado
        
        Raises:
            NotFoundException: Se contato não encontrado ou não foi deletado
        """
        
        # Buscar contato deletado (ignorar filtro deleted_at)
        result = await self.db.execute(
            select(Contact).where(
                Contact.id == contact_id,
                Contact.organization_id == organization_id,
                Contact.deleted_at.isnot(None),  # Deve estar deletado
            )
        )
        contact = result.scalar_one_or_none()
        
        if not contact:
            raise NotFoundException(f"Deleted contact {contact_id} not found")
        
        # Restaurar
        contact.restore()
        await self.db.commit()
        
        # Log no audit (restauração como um tipo especial de operação)
        await self.audit_repo.log_delete(
            organization_id=organization_id,
            deleted_by_user_id=restored_by_user_id,
            model_type="Contact",
            record_id=contact_id,
            record_name=contact.name,
            deletion_reason="RESTORE",  # Marker especial
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        return contact
    
    async def get_deletion_logs(
        self,
        organization_id: UUID,
    ) -> List[dict]:
        """Get deletion logs para este contact"""
        
        logs = await self.audit_repo.get_deletion_logs(
            organization_id=organization_id,
            model_type="Contact",
            limit=1000,
        )
        
        return [
            {
                "id": str(log.id),
                "record_id": str(log.record_id),
                "record_name": log.record_name,
                "deleted_by": log.deleted_by_user.full_name if log.deleted_by_user else "Unknown",
                "deleted_at": log.deleted_at.isoformat(),
                "reason": log.deletion_reason,
                "custom_reason": log.custom_reason,
                "ip_address": str(log.ip_address) if log.ip_address else None,
            }
            for log in logs
        ]
```

---

## Exemplo 4: Endpoint DELETE com Auditoria

### Arquivo: `app/api/v1/endpoints/contacts.py` (Atualizado)

```python
"""
Contact endpoints - com delete seguro
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.models.user import User
from app.services.contact_service import ContactService
from app.schemas.contact import Contact


router = APIRouter()


@router.delete(
    "/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete contact",
    description="Soft delete a contact. Requires org_admin or super_admin.",
    responses={
        204: {"description": "Contact deleted successfully"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Contact not found"},
    }
)
async def delete_contact(
    contact_id: UUID,
    deleted_reason: Optional[str] = Query(None, description="Motivo da deleção"),
    current_user: User = Depends(require_role(["org_admin", "super_admin"])),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete contact (soft delete with audit trail)
    
    Requires: org_admin or super_admin role
    
    Query Parameters:
    - deleted_reason: Optional reason for deletion
    
    Audit Trail:
    - Registra quem deletou, quando e por quê
    - Dados podem ser recuperados
    - Acesso ao IP e User-Agent de quem deletou
    """
    
    service = ContactService(db)
    
    # Extrair informações da request para audit
    ip_address = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    
    await service.delete_contact(
        contact_id=contact_id,
        organization_id=current_user.organization_id,
        deleted_by_user_id=current_user.id,
        deleted_reason=deleted_reason,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    
    return None


@router.get(
    "/audit/deletion-logs",
    summary="Get deletion logs",
    description="Get audit logs of deleted contacts. Requires org_admin.",
)
async def get_deletion_logs(
    current_user: User = Depends(require_role(["org_admin", "super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Get deletion logs for contacts
    
    Shows:
    - Who deleted
    - When deleted
    - Why deleted
    - IP address
    """
    
    service = ContactService(db)
    logs = await service.get_deletion_logs(current_user.organization_id)
    
    return {
        "deletion_logs": logs,
        "total": len(logs),
    }
```

---

## Exemplo 5: Restore Endpoint

### Arquivo: `app/api/v1/endpoints/admin/restore.py` (Novo)

```python
"""
Admin endpoints para restaurar registros deletados
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.models.user import User
from app.services.contact_service import ContactService
from app.services.campaign_service import CampaignService
from app.services.flow_service import FlowService
# ... other services


router = APIRouter(prefix="/admin/restore", tags=["Admin - Restore"])


@router.post(
    "/contact/{contact_id}",
    status_code=status.HTTP_200_OK,
    summary="Restore deleted contact",
    description="Restaurar um contato deletado. Apenas super_admin ou org_admin.",
)
async def restore_contact(
    contact_id: UUID,
    current_user: User = Depends(require_role(["super_admin", "org_admin"])),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Restore a soft-deleted contact
    
    Requiresorganization_admin or super_admin
    """
    
    service = ContactService(db)
    
    ip_address = request.client.host if request else None
    user_agent = request.headers.get("user-agent") if request else None
    
    contact = await service.restore_contact(
        contact_id=contact_id,
        organization_id=current_user.organization_id,
        restored_by_user_id=current_user.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    
    return {
        "message": "Contact restored successfully",
        "contact_id": str(contact.id),
        "contact_name": contact.name,
        "restored_at": datetime.utcnow().isoformat(),
    }


@router.get(
    "/deleted-records",
    summary="List deleted records",
    description="Listar registros deletados para potencial restauração",
)
async def list_deleted_records(
    model_type: Optional[str] = Query(None, description="Contact, Campaign, Flow, etc."),
    limit: int = Query(100, le=1000),
    current_user: User = Depends(require_role(["super_admin", "org_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    List all deleted records in organization
    
    Can filter by model_type
    """
    
    audit_service = AuditLogService(db)
    
    logs = await audit_service.get_deletion_logs(
        organization_id=current_user.organization_id,
        model_type=model_type,
        limit=limit,
    )
    
    return {
        "deleted_records": [
            {
                "id": log.id,
                "model_type": log.model_type,
                "record_id": log.record_id,
                "record_name": log.record_name,
                "deleted_by": log.deleted_by_user.full_name if log.deleted_by_user else "Unknown",
                "deleted_at": log.deleted_at.isoformat(),
                "reason": log.deletion_reason,
                "can_restore": True,  # Todos podem ser restaurados
            }
            for log in logs
        ],
        "total": len(logs),
    }
```

---

## Exemplo 6: Testes

### Arquivo: `tests/test_delete_safety.py` (Novo)

```python
"""
Tests para delete safety e auditoria
"""

import pytest
from datetime import datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.models.audit_log import AuditLog
from app.repositories.contact import ContactRepository
from app.repositories.audit_log import AuditLogRepository
from app.services.contact_service import ContactService


@pytest.mark.asyncio
async def test_soft_delete_contact(db: AsyncSession):
    """Test que soft delete marca deleted_at"""
    
    # Setup
    org_id = uuid4()
    user_id = uuid4()
    contact_data = {
        "organization_id": org_id,
        "whatsapp_id": "5585988887777",
        "name": "João Silva",
    }
    
    repo = ContactRepository(db)
    contact = await repo.create(contact_data)
    
    # Soft delete
    await repo.soft_delete(contact.id)
    
    # Verify
    deleted_contact = await db.execute(
        select(Contact).where(Contact.id == contact.id)
    )
    contact = deleted_contact.scalar_one()
    
    assert contact.deleted_at is not None
    assert contact.is_deleted is True


@pytest.mark.asyncio
async def test_audit_log_on_delete(db: AsyncSession):
    """Test que delete é registrado no audit log"""
    
    # Setup
    org_id = uuid4()
    user_id = uuid4()
    
    service = ContactService(db)
    contact = await service.create({
        "organization_id": org_id,
        "whatsapp_id": "5585988887777",
        "name": "Maria",
    })
    
    # Delete
    await service.delete_contact(
        contact_id=contact.id,
        organization_id=org_id,
        deleted_by_user_id=user_id,
        deleted_reason="duplicate",
    )
    
    # Verify audit log
    audit_repo = AuditLogRepository(db)
    logs = await audit_repo.get_deletion_logs(
        organization_id=org_id,
        model_type="Contact",
    )
    
    assert len(logs) > 0
    log = logs[0]
    assert log.record_id == contact.id
    assert log.deleted_by_user_id == user_id
    assert log.deletion_reason == "duplicate"
    assert log.deleted_data_snapshot is not None


@pytest.mark.asyncio
async def test_restore_contact(db: AsyncSession):
    """Test que contato pode ser restaurado"""
    
    # Setup
    org_id = uuid4()
    user_id = uuid4()
    
    service = ContactService(db)
    contact = await service.create({
        "organization_id": org_id,
        "whatsapp_id": "5585988887777",
        "name": "Pedro",
    })
    
    # Delete
    await service.delete_contact(
        contact_id=contact.id,
        organization_id=org_id,
        deleted_by_user_id=user_id,
    )
    
    # Verify deleted
    assert contact.is_deleted is True
    
    # Restore
    restored = await service.restore_contact(
        contact_id=contact.id,
        organization_id=org_id,
        restored_by_user_id=user_id,
    )
    
    # Verify restored
    assert restored.deleted_at is None
    assert restored.is_deleted is False


@pytest.mark.asyncio
async def test_data_snapshot_on_delete(db: AsyncSession):
    """Test que dados são salvos em snapshot antes de deletar"""
    
    # Setup
    org_id = uuid4()
    user_id = uuid4()
    
    service = ContactService(db)
    contact = await service.create({
        "organization_id": org_id,
        "whatsapp_id": "5585988887777",
        "name": "Ana",
        "email": "ana@example.com",
    })
    
    # Delete
    await service.delete_contact(
        contact_id=contact.id,
        organization_id=org_id,
        deleted_by_user_id=user_id,
        deleted_reason="user_request",
    )
    
    # Verify snapshot
    audit_repo = AuditLogRepository(db)
    logs = await audit_repo.get_deletion_logs(
        organization_id=org_id,
        model_type="Contact",
    )
    
    assert len(logs) > 0
    log = logs[0]
    snapshot = log.deleted_data_snapshot
    
    assert snapshot["name"] == "Ana"
    assert snapshot["email"] == "ana@example.com"
    assert snapshot["whatsapp_id"] == "5585988887777"
```

---

## 📋 Checklist para Implementação

```
HARD DELETE → SOFT DELETE MIGRATION:

[ ] 1. Criar enhanced SoftDeleteMixin em models/base.py
    [ ] deleted_by_user_id
    [ ] deleted_reason
    [ ] deleted_data_snapshot
    [ ] soft_delete() method
    [ ] restore() method

[ ] 2. Criar AuditLog model
    [ ] app/models/audit_log.py
    [ ] app/repositories/audit_log.py
    [ ] Migration: alembic revision --autogenerate

[ ] 3. Criar AuditLogService
    [ ] app/services/audit_log_service.py
    [ ] log_delete()
    [ ] get_deletion_logs()
    [ ] get_record_history()

[ ] 4. Atualizar ALL Services com delete:
    [ ] ContactService
    [ ] CampaignService
    [ ] FlowService
    [ ] ChatBotService
    [ ] UserService
    [ ] DepartmentService
    [ ] OrganizationService
    [ ] TemplateService
    [ ] QueueService
    [ ] SecretService
    [ ] ... (todos)

[ ] 5. Atualizar ALL DELETE Endpoints:
    [ ] Capturar deleted_reason do request
    [ ] Capturar ip_address da request
    [ ] Capturar user_agent da request
    [ ] Passar para service.delete()
    [ ] Adicionar RBAC validation

[ ] 6. Criar Restore Endpoints:
    [ ] GET /admin/deleted-records
    [ ] POST /admin/restore/{model_type}/{id}

[ ] 7. Criar Testes:
    [ ] test_soft_delete_contact
    [ ] test_audit_log_on_delete
    [ ] test_restore_contact
    [ ] test_data_snapshot
    [ ] test_rbac_on_delete
    [ ] test_cascading_soft_delete

[ ] 8. Documentação:
    [ ] Atualizar API docs
    [ ] Criar developer guide: "How to implement safe delete"
    [ ] Update ARCHITECTURE.md

[ ] 9. QA & Deployment:
    [ ] Load testing
    [ ] Security review
    [ ] Staging deployment
    [ ] Production deployment
```

---

**Próximo Passo**: Começar pela Phase 1 (Enhanced SoftDeleteMixin + AuditLog).

