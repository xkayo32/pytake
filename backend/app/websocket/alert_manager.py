"""
Alert Manager - Real-time WebSocket communication for alerts
Handles alert events: creation, updates, acknowledgments, escalations, resolutions
"""

from typing import Optional, Dict, List
from uuid import UUID
import logging
from datetime import datetime

from app.websocket.manager import sio

logger = logging.getLogger(__name__)


class AlertManager:
    """Manager for real-time alert notifications via WebSocket"""

    # Alert rooms structure:
    # - alerts:org:{org_id} - organization-wide alerts
    # - alerts:user:{user_id} - user-specific alerts
    # - alerts:template:{template_id} - template-specific alerts
    # - alerts:escalated - escalated alerts for admins

    @staticmethod
    async def emit_alert_created(
        organization_id: UUID,
        alert_id: UUID,
        alert_data: dict,
        template_id: Optional[UUID] = None,
    ):
        """
        Broadcast alert created event to organization

        Args:
            organization_id: Organization ID
            alert_id: Alert ID
            alert_data: Complete alert data (title, description, severity, etc)
            template_id: Optional template ID for template-specific room
        """
        event_payload = {
            "event_type": "alert_created",
            "alert_id": str(alert_id),
            "timestamp": datetime.utcnow().isoformat(),
            **alert_data,
        }

        # Broadcast to organization room
        org_room = f"alerts:org:{organization_id}"
        await sio.emit("alert:created", event_payload, room=org_room)
        logger.info(f"✅ alert:created emitted to {org_room}")

        # Also broadcast to template-specific room if provided
        if template_id:
            template_room = f"alerts:template:{template_id}"
            await sio.emit("alert:created", event_payload, room=template_room)
            logger.info(f"✅ alert:created emitted to {template_room}")

    @staticmethod
    async def emit_alert_acknowledged(
        organization_id: UUID,
        alert_id: UUID,
        user_id: UUID,
        notes: Optional[str] = None,
    ):
        """
        Broadcast alert acknowledged event

        Args:
            organization_id: Organization ID
            alert_id: Alert ID
            user_id: User who acknowledged
            notes: Optional acknowledgment notes
        """
        event_payload = {
            "event_type": "alert_acknowledged",
            "alert_id": str(alert_id),
            "acknowledged_by": str(user_id),
            "acknowledged_at": datetime.utcnow().isoformat(),
            "notes": notes,
        }

        org_room = f"alerts:org:{organization_id}"
        await sio.emit("alert:acknowledged", event_payload, room=org_room)
        logger.info(f"✅ alert:acknowledged emitted to {org_room}")

    @staticmethod
    async def emit_alert_escalated(
        organization_id: UUID,
        alert_id: UUID,
        escalation_level: int,
        escalated_by: Optional[UUID] = None,
        reason: Optional[str] = None,
    ):
        """
        Broadcast alert escalated event

        Args:
            organization_id: Organization ID
            alert_id: Alert ID
            escalation_level: New escalation level
            escalated_by: User who escalated
            reason: Escalation reason
        """
        event_payload = {
            "event_type": "alert_escalated",
            "alert_id": str(alert_id),
            "escalation_level": escalation_level,
            "escalated_by": str(escalated_by) if escalated_by else None,
            "escalated_at": datetime.utcnow().isoformat(),
            "reason": reason,
        }

        org_room = f"alerts:org:{organization_id}"
        await sio.emit("alert:escalated", event_payload, room=org_room)
        logger.info(f"✅ alert:escalated emitted to {org_room}")

        # Escalated alerts go to admin room
        admin_room = "alerts:escalated"
        await sio.emit("alert:escalated", event_payload, room=admin_room)
        logger.info(f"✅ alert:escalated emitted to {admin_room}")

    @staticmethod
    async def emit_alert_resolved(
        organization_id: UUID,
        alert_id: UUID,
        resolved_by: Optional[UUID] = None,
        reason: Optional[str] = None,
    ):
        """
        Broadcast alert resolved event

        Args:
            organization_id: Organization ID
            alert_id: Alert ID
            resolved_by: User who resolved
            reason: Resolution reason
        """
        event_payload = {
            "event_type": "alert_resolved",
            "alert_id": str(alert_id),
            "resolved_by": str(resolved_by) if resolved_by else None,
            "resolved_at": datetime.utcnow().isoformat(),
            "reason": reason,
        }

        org_room = f"alerts:org:{organization_id}"
        await sio.emit("alert:resolved", event_payload, room=org_room)
        logger.info(f"✅ alert:resolved emitted to {org_room}")

    @staticmethod
    async def emit_alert_updated(
        organization_id: UUID,
        alert_id: UUID,
        updated_fields: dict,
    ):
        """
        Broadcast alert updated event (metadata changes, status changes, etc)

        Args:
            organization_id: Organization ID
            alert_id: Alert ID
            updated_fields: Dict of updated fields
        """
        event_payload = {
            "event_type": "alert_updated",
            "alert_id": str(alert_id),
            "updated_at": datetime.utcnow().isoformat(),
            "changes": updated_fields,
        }

        org_room = f"alerts:org:{organization_id}"
        await sio.emit("alert:updated", event_payload, room=org_room)
        logger.info(f"✅ alert:updated emitted to {org_room}")

    @staticmethod
    async def emit_alert_count_update(
        organization_id: UUID,
        alert_counts: dict,
    ):
        """
        Broadcast alert count update (for dashboard badges)

        Args:
            organization_id: Organization ID
            alert_counts: Dict with counts by severity/status
                Example: {
                    "total": 5,
                    "by_severity": {"critical": 2, "warning": 3},
                    "by_status": {"open": 4, "resolved": 1}
                }
        """
        event_payload = {
            "event_type": "alert_count_update",
            "counts": alert_counts,
            "timestamp": datetime.utcnow().isoformat(),
        }

        org_room = f"alerts:org:{organization_id}"
        await sio.emit("alerts:count_update", event_payload, room=org_room)
        logger.info(f"✅ alerts:count_update emitted to {org_room}")

    @staticmethod
    async def emit_alert_batch_update(
        organization_id: UUID,
        alerts: List[dict],
    ):
        """
        Broadcast batch alert updates (e.g., multiple alerts acknowledged)

        Args:
            organization_id: Organization ID
            alerts: List of alert dicts with changes
        """
        event_payload = {
            "event_type": "alert_batch_update",
            "alerts": [
                {
                    "alert_id": str(alert.get("id")),
                    "status": alert.get("status"),
                    "updated_at": datetime.utcnow().isoformat(),
                }
                for alert in alerts
            ],
        }

        org_room = f"alerts:org:{organization_id}"
        await sio.emit("alerts:batch_update", event_payload, room=org_room)
        logger.info(f"✅ alerts:batch_update emitted to {org_room} with {len(alerts)} alerts")

    @staticmethod
    async def join_organization_alerts(sid: str, organization_id: UUID):
        """
        Add client to organization alerts room

        Args:
            sid: Socket ID
            organization_id: Organization ID
        """
        room = f"alerts:org:{organization_id}"
        await sio.enter_room(sid, room)
        logger.info(f"Socket {sid} joined {room}")

    @staticmethod
    async def join_template_alerts(sid: str, template_id: UUID):
        """
        Add client to template-specific alerts room

        Args:
            sid: Socket ID
            template_id: Template ID
        """
        room = f"alerts:template:{template_id}"
        await sio.enter_room(sid, room)
        logger.info(f"Socket {sid} joined {room}")

    @staticmethod
    async def join_escalated_alerts(sid: str):
        """
        Add admin client to escalated alerts room

        Args:
            sid: Socket ID
        """
        room = "alerts:escalated"
        await sio.enter_room(sid, room)
        logger.info(f"Socket {sid} joined {room}")

    @staticmethod
    async def leave_organization_alerts(sid: str, organization_id: UUID):
        """
        Remove client from organization alerts room

        Args:
            sid: Socket ID
            organization_id: Organization ID
        """
        room = f"alerts:org:{organization_id}"
        await sio.leave_room(sid, room)
        logger.info(f"Socket {sid} left {room}")

    @staticmethod
    async def leave_template_alerts(sid: str, template_id: UUID):
        """
        Remove client from template-specific alerts room

        Args:
            sid: Socket ID
            template_id: Template ID
        """
        room = f"alerts:template:{template_id}"
        await sio.leave_room(sid, room)
        logger.info(f"Socket {sid} left {room}")

    @staticmethod
    async def leave_escalated_alerts(sid: str):
        """
        Remove client from escalated alerts room

        Args:
            sid: Socket ID
        """
        room = "alerts:escalated"
        await sio.leave_room(sid, room)
        logger.info(f"Socket {sid} left {room}")

    @staticmethod
    async def broadcast_alert_summary(
        organization_id: UUID,
        summary_data: dict,
    ):
        """
        Broadcast alert summary for dashboard

        Args:
            organization_id: Organization ID
            summary_data: Summary statistics (total, by severity, by status, etc)
        """
        event_payload = {
            "event_type": "alert_summary",
            "summary": summary_data,
            "timestamp": datetime.utcnow().isoformat(),
        }

        org_room = f"alerts:org:{organization_id}"
        await sio.emit("alerts:summary", event_payload, room=org_room)
        logger.info(f"✅ alerts:summary emitted to {org_room}")


# Get singleton instance
alert_manager = AlertManager()
