"""
WhatsApp Analytics Endpoints - Expose analytics via REST API.

Provides endpoints to retrieve flow metrics, conversation transcripts, and reports.

Author: Kayo Carvalho Fernandes
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.whatsapp_analytics_service import WhatsAppAnalyticsService

router = APIRouter()


@router.get("/flows/{flow_id}/report")
async def get_flow_report(
    flow_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive flow report for WhatsApp conversations.
    
    **Path Parameters:**
    - flow_id (str, UUID): Flow UUID
    
    **Query Parameters:**
    - days (int): Report period in days (1-365, default: 30)
    
    **Returns:** Flow report with:
    - Conversation metrics (total, completed, completion rate)
    - Message metrics (total, user, bot, average turns)
    - Duration analytics (average, min, max)
    - User engagement
    
    **Permissions:**
    - Requires: Authenticated user (any role)
    - Scoped to: Organization
    - Note: Can only view flows from their organization
    
    **Error Codes:**
    - 401: Unauthorized
    - 403: Not in organization
    - 404: Flow not found
    """
    analytics = WhatsAppAnalyticsService(db)
    
    try:
        report = await analytics.get_flow_report(
            organization_id=current_user.organization_id,
            flow_id=flow_id,
            days=days,
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{phone_number}/transcript")
async def get_conversation_transcript(
    phone_number: str,
    flow_id: UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get conversation transcript (message history).
    
    **Path Parameters:**
    - phone_number (str): Customer WhatsApp phone number
    
    **Query Parameters:**
    - flow_id (str, UUID): Flow UUID (required)
    
    **Returns:** Transcript with:
    - All messages (user and bot)
    - Timestamps
    - Node context
    - Message count
    
    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization
    
    **Error Codes:**
    - 401: Unauthorized
    - 404: Conversation not found
    """
    analytics = WhatsAppAnalyticsService(db)
    
    try:
        transcript = await analytics.get_conversation_transcript(
            organization_id=current_user.organization_id,
            phone_number=phone_number,
            flow_id=flow_id,
        )
        return transcript
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/flows/{flow_id}/nodes-heatmap")
async def get_node_heatmap(
    flow_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get node visit heatmap - which nodes are most visited.
    
    **Path Parameters:**
    - flow_id (str, UUID): Flow UUID
    
    **Query Parameters:**
    - days (int): Analysis period
    
    **Returns:** Node heatmap with:
    - Node IDs and visit counts
    - Percentage of total visits
    - Sorted by popularity
    
    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization
    """
    analytics = WhatsAppAnalyticsService(db)
    
    try:
        heatmap = await analytics.get_node_heatmap(
            organization_id=current_user.organization_id,
            flow_id=flow_id,
            days=days,
        )
        return heatmap
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/flows/{flow_id}/daily-activity")
async def get_daily_activity(
    flow_id: UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get daily activity breakdown.
    
    **Path Parameters:**
    - flow_id (str, UUID): Flow UUID
    
    **Query Parameters:**
    - days (int): Analysis period
    
    **Returns:** Daily activity with:
    - Messages per day
    - Unique users per day
    - Trends over time
    
    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization
    """
    analytics = WhatsAppAnalyticsService(db)
    
    try:
        activity = await analytics.get_daily_activity(
            organization_id=current_user.organization_id,
            flow_id=flow_id,
            days=days,
        )
        return activity
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/flows/{flow_id}/user-segments")
async def get_user_segments(
    flow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user segmentation by engagement level.
    
    **Path Parameters:**
    - flow_id (str, UUID): Flow UUID
    
    **Returns:** User segments with:
    - Power users (20+ messages)
    - Active users (5-19 messages)
    - Inactive users (1-4 messages)
    - Counts and percentages
    
    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization
    """
    analytics = WhatsAppAnalyticsService(db)
    
    try:
        segments = await analytics.get_user_segments(
            organization_id=current_user.organization_id,
            flow_id=flow_id,
        )
        return segments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
