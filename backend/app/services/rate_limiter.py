"""Rate limiting for notifications"""

from typing import Tuple
from app.repositories.notification import NotificationLogRepository
from app.models.notification import NotificationChannel
import logging

logger = logging.getLogger(__name__)


async def check_rate_limit(
    repo: NotificationLogRepository,
    org_id: str,
    user_id: str,
    channel: NotificationChannel,
    max_per_hour: int
) -> Tuple[bool, str]:
    """Check if notification exceeds rate limit"""
    count = await repo.count_by_org_hour(org_id, user_id, channel)
    
    if count >= max_per_hour:
        logger.warning(f"Rate limit exceeded for {user_id}: {count}/{max_per_hour}")
        return False, f"Rate limit exceeded ({count}/{max_per_hour} per hour)"
    
    return True, f"OK ({count}/{max_per_hour})"
