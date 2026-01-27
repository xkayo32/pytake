"""
Background tasks for conversation window cleanup

Responsible for:
- Periodically checking and closing expired 24-hour windows
- Marking conversations as needing template messages
- Logging window expiration events

Author: Kayo Carvalho Fernandes
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.models.conversation import Conversation
from app.services.window_validation_service import WindowValidationService

logger = logging.getLogger(__name__)


async def close_expired_windows_for_organization(
    organization_id: str,
    db: Optional[AsyncSession] = None,
) -> int:
    """
    Check and close all expired windows for an organization
    
    This task:
    1. Finds all conversations with open windows
    2. Checks if window has expired (now > window_expires_at)
    3. Updates is_window_open = false
    4. Logs expiration events
    
    Should be called every 5-15 minutes via Celery beat
    
    Args:
        organization_id: Organization UUID as string
        db: Optional AsyncSession (will create if not provided)
        
    Returns:
        Number of windows closed
    """
    if not db:
        db = async_session()
    
    try:
        window_service = WindowValidationService(db)
        
        logger.info(f"🔍 Checking expired windows for org: {organization_id}")
        
        # Find all conversations with open windows
        stmt = select(Conversation).where(
            Conversation.organization_id == organization_id,
            Conversation.is_window_open == True,
        )
        result = await db.execute(stmt)
        conversations = result.scalars().all()
        
        if not conversations:
            logger.info(f"✅ No open windows found for org: {organization_id}")
            return 0
        
        logger.info(f"📋 Found {len(conversations)} open windows to check")
        
        now = datetime.now(timezone.utc)
        closed_count = 0
        
        for conversation in conversations:
            # Check if window has expired
            if conversation.window_expires_at and conversation.window_expires_at <= now:
                # Mark window as closed
                conversation.is_window_open = False
                conversation.window_status_last_checked_at = now
                
                await db.flush()
                closed_count += 1
                
                logger.info(
                    f"⏰ Window closed for conversation {conversation.id}: "
                    f"expired_at={conversation.window_expires_at}"
                )
                
                # Optional: Create an alert or notification for the user
                # that the conversation window has expired
        
        if closed_count > 0:
            await db.commit()
            logger.info(f"✅ Closed {closed_count} expired windows for org: {organization_id}")
        else:
            logger.info(f"✅ All open windows still valid for org: {organization_id}")
        
        return closed_count
        
    except Exception as e:
        logger.error(
            f"❌ Error closing expired windows for org {organization_id}: {e}",
            exc_info=True
        )
        if db:
            await db.rollback()
        raise
    finally:
        if db and not db.is_active:
            await db.close()


async def close_all_expired_windows(db: Optional[AsyncSession] = None) -> dict:
    """
    Check and close expired windows across ALL organizations
    
    This is a more comprehensive task that runs periodically to clean up
    the entire database. Should be called every 15-30 minutes.
    
    Args:
        db: Optional AsyncSession
        
    Returns:
        Dict with:
        - organizations_processed: int
        - total_windows_closed: int
        - errors: list
    """
    if not db:
        db = async_session()
    
    stats = {
        "organizations_processed": 0,
        "total_windows_closed": 0,
        "errors": [],
    }
    
    try:
        # Get all organizations with open windows
        stmt = select(Conversation.organization_id).where(
            Conversation.is_window_open == True,
        ).distinct()
        
        result = await db.execute(stmt)
        org_ids = result.scalars().all()
        
        logger.info(f"🌍 Processing windows across {len(org_ids)} organizations")
        
        for org_id in org_ids:
            try:
                closed = await close_expired_windows_for_organization(
                    str(org_id),
                    db
                )
                stats["total_windows_closed"] += closed
                stats["organizations_processed"] += 1
            except Exception as e:
                logger.error(f"Error processing org {org_id}: {e}")
                stats["errors"].append(str(e))
        
        logger.info(
            f"✅ Window cleanup complete: "
            f"{stats['organizations_processed']} orgs, "
            f"{stats['total_windows_closed']} windows closed"
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"❌ Error in close_all_expired_windows: {e}", exc_info=True)
        stats["errors"].append(str(e))
        return stats
    finally:
        if db and not db.is_active:
            await db.close()


# Celery task definitions (if Celery is configured)
try:
    from app.tasks.celery_app import app as celery_app
    
    @celery_app.task(
        name="close_expired_windows_org",
        bind=True,
        max_retries=3,
        default_retry_delay=300,  # 5 minutes
    )
    def close_expired_windows_task(self, organization_id: str) -> int:
        """
        Celery task: Close expired windows for specific organization
        
        Can be called with:
        close_expired_windows_task.delay(organization_id="org-uuid")
        
        Args:
            organization_id: Organization UUID
            
        Returns:
            Number of windows closed
        """
        import asyncio
        
        try:
            return asyncio.run(close_expired_windows_for_organization(organization_id))
        except Exception as exc:
            logger.error(f"Task failed for org {organization_id}: {exc}")
            # Retry with exponential backoff
            raise self.retry(exc=exc)
    
    @celery_app.task(
        name="close_all_expired_windows",
        bind=True,
        default_retry_delay=600,  # 10 minutes
    )
    def close_all_expired_windows_task(self) -> dict:
        """
        Celery task: Close expired windows across all organizations
        
        Can be scheduled with Celery beat every 15-30 minutes:
        'close_all_expired_windows': {
            'task': 'close_all_expired_windows',
            'schedule': crontab(minute='*/15'),  # Every 15 minutes
        }
        
        Returns:
            Dict with statistics
        """
        import asyncio
        
        try:
            return asyncio.run(close_all_expired_windows())
        except Exception as exc:
            logger.error(f"Global window cleanup failed: {exc}", exc_info=True)
            # Log but don't retry globally - use monitoring to alert
            return {
                "status": "error",
                "error": str(exc),
            }

except ImportError:
    logger.warning("Celery not configured - window cleanup tasks will not be available")
