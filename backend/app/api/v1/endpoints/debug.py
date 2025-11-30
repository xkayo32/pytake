"""Debug endpoints for local development (temporary)."""
from typing import Optional

from fastapi import APIRouter, Query

router = APIRouter()


@router.get(
    '/conversations/metrics-debug',
    summary="Debug de métricas",
    description="Endpoint de debug para verificar parâmetros de requisição (apenas desenvolvimento).",
    responses={
        200: {"description": "Parâmetros recebidos"}
    }
)
async def conversations_metrics_debug(
    department_id: Optional[str] = Query(None),
    queue_id: Optional[str] = Query(None),
    since: Optional[str] = Query(None),
):
    """Echo query params for debugging frontend requests to /conversations/metrics."""
    return {"department_id": department_id, "queue_id": queue_id, "since": since}
