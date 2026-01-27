"""
Celery Task: WhatsApp Template Synchronization

Syncs templates from Meta API to local database every hour
- Updates template status (PENDING → APPROVED/REJECTED)
- Creates templates that were created directly in Meta Business Manager
- Detects deleted templates
"""

from celery import shared_task
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import AsyncSessionLocal
from app.services.template_service import TemplateService
from app.models.whatsapp_number import WhatsAppNumber
import logging
import asyncio

logger = logging.getLogger(__name__)


@shared_task(name="sync_templates_from_meta", bind=True)
def sync_templates_task(self):
    """
    Sync templates from Meta API for all active Official API numbers

    Runs every 1 hour via Celery Beat
    """
    logger.info("🔄 Starting template synchronization task")

    try:
        # Run async function
        result = asyncio.run(_sync_all_numbers())
        logger.info(f"✅ Template sync completed: {result}")
        return result
    except Exception as e:
        logger.error(f"❌ Template sync failed: {e}", exc_info=True)
        raise


async def _sync_all_numbers() -> dict:
    """
    Sync templates for all active Official API numbers

    Returns:
        Dict with sync statistics
    """
    total_numbers = 0
    total_created = 0
    total_updated = 0
    errors = []

    async with AsyncSessionLocal() as db:
        # Get all active WhatsApp numbers with Official API
        query = select(WhatsAppNumber).where(
            and_(
                WhatsAppNumber.connection_type == "official",
                WhatsAppNumber.status == "active",
                WhatsAppNumber.deleted_at.is_(None)
            )
        )

        result = await db.execute(query)
        numbers = result.scalars().all()

        logger.info(f"📱 Found {len(numbers)} active Official API numbers")

        for number in numbers:
            try:
                logger.info(f"🔄 Syncing templates for {number.phone_number} (org: {number.organization_id})")

                # Validate required fields
                if not number.whatsapp_business_account_id:
                    logger.warning(f"⚠️  Skipping {number.phone_number}: Missing WABA ID")
                    continue

                if not number.access_token:
                    logger.warning(f"⚠️  Skipping {number.phone_number}: Missing access token")
                    continue

                # Sync templates
                service = TemplateService(db)
                stats = await service.sync_from_meta(
                    whatsapp_number_id=number.id,
                    organization_id=number.organization_id,
                    waba_id=number.whatsapp_business_account_id,
                    access_token=number.access_token
                )

                total_numbers += 1
                total_created += stats.get("created", 0)
                total_updated += stats.get("updated", 0)

                logger.info(
                    f"✅ {number.phone_number}: "
                    f"{stats.get('created', 0)} created, "
                    f"{stats.get('updated', 0)} updated"
                )

            except Exception as e:
                error_msg = f"{number.phone_number}: {str(e)}"
                errors.append(error_msg)
                logger.error(f"❌ Error syncing {number.phone_number}: {e}", exc_info=True)

    # Summary
    summary = {
        "numbers_synced": total_numbers,
        "templates_created": total_created,
        "templates_updated": total_updated,
        "errors": errors,
    }

    logger.info(
        f"📊 Sync Summary: {total_numbers} numbers, "
        f"{total_created} templates created, "
        f"{total_updated} templates updated, "
        f"{len(errors)} errors"
    )

    return summary


@shared_task(name="sync_single_number_templates", bind=True)
def sync_single_number_task(
    self,
    whatsapp_number_id: str,
    organization_id: str,
    waba_id: str,
    access_token: str
):
    """
    Sync templates for a single WhatsApp number

    Args:
        whatsapp_number_id: WhatsApp number UUID
        organization_id: Organization UUID
        waba_id: WhatsApp Business Account ID
        access_token: Meta API access token

    Returns:
        Sync statistics
    """
    from uuid import UUID

    logger.info(f"🔄 Starting single number sync: {whatsapp_number_id}")

    try:
        result = asyncio.run(_sync_single_number(
            UUID(whatsapp_number_id),
            UUID(organization_id),
            waba_id,
            access_token
        ))
        logger.info(f"✅ Single number sync completed: {result}")
        return result
    except Exception as e:
        logger.error(f"❌ Single number sync failed: {e}", exc_info=True)
        raise


async def _sync_single_number(
    whatsapp_number_id,
    organization_id,
    waba_id: str,
    access_token: str
) -> dict:
    """
    Sync templates for a specific number

    Used for on-demand sync (triggered by user action)
    """
    async with AsyncSessionLocal() as db:
        service = TemplateService(db)

        stats = await service.sync_from_meta(
            whatsapp_number_id=whatsapp_number_id,
            organization_id=organization_id,
            waba_id=waba_id,
            access_token=access_token
        )

        logger.info(
            f"✅ Sync complete: "
            f"{stats.get('created', 0)} created, "
            f"{stats.get('updated', 0)} updated"
        )

        return stats
