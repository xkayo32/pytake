"""Debug endpoints for local development (temporary)."""
from typing import Optional

from fastapi import APIRouter, Query

router = APIRouter()


@router.get('/conversations/metrics-debug')
async def conversations_metrics_debug(
    department_id: Optional[str] = Query(None),
    queue_id: Optional[str] = Query(None),
    since: Optional[str] = Query(None),
):
    """Echo query params for debugging frontend requests to /conversations/metrics."""
    return {"department_id": department_id, "queue_id": queue_id, "since": since}
