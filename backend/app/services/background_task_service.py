"""
BackgroundTaskService - Manages async task processing for WhatsApp messages.

Uses APScheduler for scheduled jobs and background task processing.
Currently using APScheduler (simple, low-overhead).
Could be migrated to Celery + Redis in future for horizontal scaling.

Author: Kayo Carvalho Fernandes
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Callable, Any
from uuid import UUID
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class BackgroundTaskService:
    """Manages background and scheduled tasks for WhatsApp integration."""

    def __init__(self, db: AsyncSession):
        """Initialize background task service.
        
        Args:
            db: SQLAlchemy AsyncSession
        """
        self.db = db
        self.queue = asyncio.Queue()
        self.running = False

    async def enqueue_message_processing(
        self,
        organization_id: UUID,
        phone_number: str,
        flow_id: UUID,
        user_message: str,
        whatsapp_number_id: UUID,
        metadata: Optional[dict] = None,
    ) -> str:
        """Enqueue incoming message for async processing.
        
        Args:
            organization_id: Organization UUID
            phone_number: Customer WhatsApp phone
            flow_id: Flow to execute
            user_message: User's message text
            whatsapp_number_id: WhatsApp number UUID
            metadata: Additional context
            
        Returns:
            Task ID
        """
        task_id = f"{organization_id}_{phone_number}_{datetime.utcnow().timestamp()}"

        task_data = {
            "id": task_id,
            "type": "process_message",
            "organization_id": organization_id,
            "phone_number": phone_number,
            "flow_id": flow_id,
            "user_message": user_message,
            "whatsapp_number_id": whatsapp_number_id,
            "metadata": metadata or {},
            "created_at": datetime.utcnow(),
            "status": "pending",
        }

        await self.queue.put(task_data)
        logger.info(f"Task enqueued: {task_id}")

        return task_id

    async def enqueue_session_cleanup(
        self,
        organization_id: UUID,
    ) -> str:
        """Enqueue session cleanup job.
        
        Args:
            organization_id: Organization UUID
            
        Returns:
            Task ID
        """
        task_id = f"cleanup_{organization_id}_{datetime.utcnow().timestamp()}"

        task_data = {
            "id": task_id,
            "type": "cleanup_sessions",
            "organization_id": organization_id,
            "created_at": datetime.utcnow(),
            "status": "pending",
        }

        await self.queue.put(task_data)
        logger.info(f"Cleanup task enqueued: {task_id}")

        return task_id

    async def enqueue_analytics_update(
        self,
        organization_id: UUID,
        flow_id: UUID,
    ) -> str:
        """Enqueue analytics calculation job.
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID
            
        Returns:
            Task ID
        """
        task_id = f"analytics_{organization_id}_{flow_id}_{datetime.utcnow().timestamp()}"

        task_data = {
            "id": task_id,
            "type": "update_analytics",
            "organization_id": organization_id,
            "flow_id": flow_id,
            "created_at": datetime.utcnow(),
            "status": "pending",
        }

        await self.queue.put(task_data)
        logger.info(f"Analytics task enqueued: {task_id}")

        return task_id

    async def start_worker(self):
        """Start background task worker (run in separate process/thread).
        
        This should be started in a separate asyncio task or thread.
        Example:
            asyncio.create_task(bg_service.start_worker())
        """
        self.running = True
        logger.info("Background task worker started")

        while self.running:
            try:
                # Process tasks from queue (with timeout to prevent blocking)
                task = await asyncio.wait_for(
                    self.queue.get(),
                    timeout=5.0,
                )

                await self._process_task(task)
                self.queue.task_done()

            except asyncio.TimeoutError:
                # No tasks in queue, continue
                continue

            except Exception as e:
                logger.error(f"Error processing task: {e}")
                continue

    async def stop_worker(self):
        """Stop background task worker gracefully."""
        self.running = False
        logger.info("Background task worker stopping")

        # Wait for queue to empty
        await self.queue.join()
        logger.info("Background task worker stopped")

    async def _process_task(self, task: dict) -> None:
        """Process a single background task.
        
        Args:
            task: Task data dict
        """
        task_type = task.get("type")

        try:
            if task_type == "process_message":
                await self._handle_process_message(task)
            elif task_type == "cleanup_sessions":
                await self._handle_cleanup_sessions(task)
            elif task_type == "update_analytics":
                await self._handle_update_analytics(task)
            else:
                logger.warning(f"Unknown task type: {task_type}")

            task["status"] = "completed"

        except Exception as e:
            logger.error(f"Task failed: {task['id']} - {e}")
            task["status"] = "failed"
            task["error"] = str(e)

        logger.info(f"Task {task['id']} finished with status: {task['status']}")

    async def _handle_process_message(self, task: dict) -> None:
        """Handle message processing task.
        
        Args:
            task: Task data dict
        """
        from app.services.whatsapp_router_service import WhatsAppRouterService

        router = WhatsAppRouterService(self.db)

        try:
            state, response = await router.route_message(
                organization_id=task["organization_id"],
                phone_number=task["phone_number"],
                flow_id=task["flow_id"],
                user_message=task["user_message"],
                metadata=task.get("metadata"),
            )

            logger.info(f"Message processed: {task['id']}")
            logger.debug(f"Response: {response}")

            # TODO: Send response back to user via WhatsApp

        except Exception as e:
            logger.error(f"Message processing error: {e}")
            raise

    async def _handle_cleanup_sessions(self, task: dict) -> None:
        """Handle session cleanup task.
        
        Args:
            task: Task data dict
        """
        from app.repositories.conversation_state_repository import ConversationStateRepository

        repo = ConversationStateRepository(self.db)

        try:
            count = await repo.cleanup_expired(task["organization_id"])
            await repo.commit()
            logger.info(f"Cleaned up {count} expired sessions for org {task['organization_id']}")

        except Exception as e:
            logger.error(f"Cleanup error: {e}")
            raise

    async def _handle_update_analytics(self, task: dict) -> None:
        """Handle analytics update task.
        
        Args:
            task: Task data dict
        """
        # TODO: Implement analytics calculation
        logger.info(f"Analytics updated for flow {task['flow_id']}")

    def get_queue_stats(self) -> dict:
        """Get background task queue statistics.
        
        Returns:
            Dict with queue stats
        """
        return {
            "queue_size": self.queue.qsize(),
            "worker_running": self.running,
            "timestamp": datetime.utcnow().isoformat(),
        }


class ScheduledTaskManager:
    """Manages scheduled tasks (runs periodically).
    
    For now, using simple periodic checks.
    Could use APScheduler for more sophisticated scheduling.
    """

    def __init__(self, db: AsyncSession):
        """Initialize scheduled task manager.
        
        Args:
            db: SQLAlchemy AsyncSession
        """
        self.db = db
        self.bg_service = BackgroundTaskService(db)

    async def schedule_periodic_cleanup(
        self,
        organization_id: UUID,
        interval_minutes: int = 30,
    ):
        """Schedule periodic session cleanup.
        
        Args:
            organization_id: Organization UUID
            interval_minutes: Cleanup interval in minutes
        """
        while True:
            try:
                await self.bg_service.enqueue_session_cleanup(organization_id)
                await asyncio.sleep(interval_minutes * 60)

            except Exception as e:
                logger.error(f"Scheduled cleanup error: {e}")
                await asyncio.sleep(60)  # Retry after 1 minute

    async def schedule_periodic_analytics(
        self,
        organization_id: UUID,
        flow_id: UUID,
        interval_minutes: int = 60,
    ):
        """Schedule periodic analytics updates.
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID
            interval_minutes: Update interval in minutes
        """
        while True:
            try:
                await self.bg_service.enqueue_analytics_update(organization_id, flow_id)
                await asyncio.sleep(interval_minutes * 60)

            except Exception as e:
                logger.error(f"Scheduled analytics error: {e}")
                await asyncio.sleep(60)
