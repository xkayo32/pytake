"""
WhatsAppAnalyticsService - WhatsApp-specific analytics for conversations and flows.

Extends the general AnalyticsService with WhatsApp-specific metrics.

Author: Kayo Carvalho Fernandes
"""

import logging
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ConversationLog, ConversationState

logger = logging.getLogger(__name__)


class WhatsAppAnalyticsService:
    """WhatsApp-specific analytics for flows and conversations."""

    def __init__(self, db: AsyncSession):
        """Initialize WhatsApp analytics service.
        
        Args:
            db: SQLAlchemy AsyncSession
        """
        self.db = db

    async def get_flow_report(
        self,
        organization_id: UUID,
        flow_id: UUID,
        days: int = 30,
    ) -> Dict[str, Any]:
        """Get comprehensive flow report for WhatsApp conversations.
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID
            days: Report period in days
            
        Returns:
            Flow report with metrics and insights
        """
        since = datetime.utcnow() - timedelta(days=days)

        # Conversation states
        state_query = select(ConversationState).where(
            and_(
                ConversationState.organization_id == organization_id,
                ConversationState.flow_id == flow_id,
                ConversationState.created_at >= since,
            )
        )
        state_result = await self.db.execute(state_query)
        states = state_result.scalars().all()

        # Conversation logs
        log_query = select(ConversationLog).where(
            and_(
                ConversationLog.organization_id == organization_id,
                ConversationLog.flow_id == flow_id,
                ConversationLog.timestamp >= since,
            )
        )
        log_result = await self.db.execute(log_query)
        logs = log_result.scalars().all()

        # Basic counts
        total_convs = len(states)
        active_convs = sum(1 for s in states if s.is_active)
        completed_convs = total_convs - active_convs
        completion_rate = (completed_convs / total_convs * 100) if total_convs > 0 else 0

        # Message metrics
        total_messages = len(logs)
        user_messages = sum(1 for log in logs if log.user_message)
        bot_messages = len(logs) - user_messages
        avg_turns = (total_messages / total_convs) if total_convs > 0 else 0

        # Unique users
        unique_users = len(set(log.phone_number for log in logs))

        # Duration metrics
        durations = []
        for state in states:
            if state.created_at and state.updated_at:
                duration = (state.updated_at - state.created_at).total_seconds()
                durations.append(duration)

        avg_duration = (sum(durations) / len(durations)) if durations else 0
        max_duration = max(durations) if durations else 0
        min_duration = min(durations) if durations else 0

        return {
            "flow_id": str(flow_id),
            "period": {
                "days": days,
                "start": since.isoformat(),
                "end": datetime.utcnow().isoformat(),
            },
            "conversations": {
                "total": total_convs,
                "completed": completed_convs,
                "active": active_convs,
                "completion_rate": round(completion_rate, 2),
                "unique_users": unique_users,
            },
            "messages": {
                "total": total_messages,
                "from_user": user_messages,
                "from_bot": bot_messages,
                "average_per_conversation": round(avg_turns, 2),
            },
            "duration": {
                "average_seconds": round(avg_duration, 2),
                "max_seconds": round(max_duration, 2),
                "min_seconds": round(min_duration, 2),
            },
            "generated_at": datetime.utcnow().isoformat(),
        }

    async def get_conversation_transcript(
        self,
        organization_id: UUID,
        phone_number: str,
        flow_id: UUID,
    ) -> Dict[str, Any]:
        """Get conversation transcript with all messages.
        
        Args:
            organization_id: Organization UUID
            phone_number: Customer phone
            flow_id: Flow UUID
            
        Returns:
            Conversation transcript
        """
        logs_query = select(ConversationLog).where(
            and_(
                ConversationLog.organization_id == organization_id,
                ConversationLog.phone_number == phone_number,
                ConversationLog.flow_id == flow_id,
            )
        ).order_by(ConversationLog.timestamp)

        result = await self.db.execute(logs_query)
        logs = result.scalars().all()

        messages = []
        for log in logs:
            if log.user_message:
                messages.append({
                    "speaker": "user",
                    "text": log.user_message,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                    "node_id": log.node_id,
                })
            if log.bot_response:
                messages.append({
                    "speaker": "bot",
                    "text": log.bot_response,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                    "node_id": log.node_id,
                })

        return {
            "phone_number": phone_number,
            "flow_id": str(flow_id),
            "message_count": len(messages),
            "started_at": logs[0].timestamp.isoformat() if logs else None,
            "ended_at": logs[-1].timestamp.isoformat() if logs else None,
            "messages": messages,
        }

    async def get_node_heatmap(
        self,
        organization_id: UUID,
        flow_id: UUID,
        days: int = 30,
    ) -> Dict[str, Any]:
        """Get node visit heatmap - which nodes are visited most.
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID
            days: Analysis period
            
        Returns:
            Heatmap data
        """
        since = datetime.utcnow() - timedelta(days=days)

        logs_query = select(ConversationLog).where(
            and_(
                ConversationLog.organization_id == organization_id,
                ConversationLog.flow_id == flow_id,
                ConversationLog.timestamp >= since,
            )
        )
        result = await self.db.execute(logs_query)
        logs = result.scalars().all()

        # Count visits per node
        node_visits = {}
        for log in logs:
            if log.node_id:
                node_id = str(log.node_id)
                node_visits[node_id] = node_visits.get(node_id, 0) + 1

        # Sort by visits
        sorted_nodes = sorted(node_visits.items(), key=lambda x: x[1], reverse=True)

        return {
            "flow_id": str(flow_id),
            "period_days": days,
            "nodes": [
                {
                    "node_id": node_id,
                    "visits": visits,
                    "percentage": round(visits / len(logs) * 100, 2) if logs else 0,
                }
                for node_id, visits in sorted_nodes
            ],
            "total_visits": len(logs),
        }

    async def get_daily_activity(
        self,
        organization_id: UUID,
        flow_id: UUID,
        days: int = 30,
    ) -> Dict[str, Any]:
        """Get daily activity breakdown.
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID
            days: Number of days to analyze
            
        Returns:
            Daily activity data
        """
        since = datetime.utcnow() - timedelta(days=days)

        logs_query = select(ConversationLog).where(
            and_(
                ConversationLog.organization_id == organization_id,
                ConversationLog.flow_id == flow_id,
                ConversationLog.timestamp >= since,
            )
        )
        result = await self.db.execute(logs_query)
        logs = result.scalars().all()

        # Group by date
        daily_stats = {}
        for log in logs:
            if log.timestamp:
                date_key = log.timestamp.date().isoformat()
                if date_key not in daily_stats:
                    daily_stats[date_key] = {
                        "messages": 0,
                        "conversations": set(),
                    }
                daily_stats[date_key]["messages"] += 1
                daily_stats[date_key]["conversations"].add(log.phone_number)

        # Convert to list
        daily_activity = [
            {
                "date": date,
                "messages": stats["messages"],
                "unique_users": len(stats["conversations"]),
            }
            for date, stats in sorted(daily_stats.items())
        ]

        return {
            "flow_id": str(flow_id),
            "period_days": days,
            "daily_activity": daily_activity,
        }

    async def get_user_segments(
        self,
        organization_id: UUID,
        flow_id: UUID,
    ) -> Dict[str, Any]:
        """Segment users by engagement level.
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID
            
        Returns:
            User segments with metrics
        """
        logs_query = select(ConversationLog).where(
            and_(
                ConversationLog.organization_id == organization_id,
                ConversationLog.flow_id == flow_id,
            )
        )
        result = await self.db.execute(logs_query)
        logs = result.scalars().all()

        # Count messages per user
        user_activity = {}
        for log in logs:
            phone = log.phone_number
            user_activity[phone] = user_activity.get(phone, 0) + 1

        # Segment users
        power_users = []  # 20+ messages
        active_users = []  # 5-19 messages
        inactive_users = []  # 1-4 messages

        for phone, count in user_activity.items():
            if count >= 20:
                power_users.append(phone)
            elif count >= 5:
                active_users.append(phone)
            else:
                inactive_users.append(phone)

        return {
            "flow_id": str(flow_id),
            "total_users": len(user_activity),
            "segments": {
                "power_users": {
                    "count": len(power_users),
                    "percentage": round(len(power_users) / len(user_activity) * 100, 2),
                    "description": "20+ messages",
                },
                "active_users": {
                    "count": len(active_users),
                    "percentage": round(len(active_users) / len(user_activity) * 100, 2),
                    "description": "5-19 messages",
                },
                "inactive_users": {
                    "count": len(inactive_users),
                    "percentage": round(len(inactive_users) / len(user_activity) * 100, 2),
                    "description": "1-4 messages",
                },
            },
        }
