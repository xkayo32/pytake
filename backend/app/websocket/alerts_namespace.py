"""
Socket.IO Alerts Namespace - Real-time alert updates
Handles client connections, room management, and event subscriptions
"""

import logging
from uuid import UUID

from app.websocket.manager import sio
from app.websocket.alert_manager import alert_manager

logger = logging.getLogger(__name__)

# Create namespace for alerts
alerts_namespace = "/alerts"


@sio.event(namespace=alerts_namespace)
async def connect(sid, environ, auth):
    """
    Handle client connection to alerts namespace

    Auth payload should contain:
    - token: JWT token
    - organization_id: Organization UUID
    """
    logger.info(f"✅ Client connecting to {alerts_namespace}: {sid}")

    # Verify token (already done by main manager, but we can do it again)
    if not auth or "token" not in auth:
        logger.warning(f"❌ Client {sid} rejected: No token")
        return False

    # Get organization from session or auth
    organization_id = auth.get("organization_id")
    if not organization_id:
        logger.warning(f"❌ Client {sid} rejected: No organization_id")
        return False

    # Store organization in session for this namespace
    async with sio.session(sid, namespace=alerts_namespace) as session:
        session["organization_id"] = organization_id
        session["user_id"] = auth.get("user_id")

    logger.info(f"✅ Client {sid} connected to alerts namespace for org {organization_id}")

    # Emit welcome message
    await sio.emit(
        "connected",
        {"message": "Connected to alert updates", "namespace": alerts_namespace},
        room=sid,
        namespace=alerts_namespace,
    )

    return True


@sio.event(namespace=alerts_namespace)
async def disconnect(sid):
    """Handle client disconnect from alerts namespace"""
    logger.info(f"✅ Client disconnected from {alerts_namespace}: {sid}")

    # Leave all rooms in this namespace
    rooms = sio.rooms(sid, namespace=alerts_namespace)
    for room in rooms:
        if room != sid:
            await sio.leave_room(sid, room, namespace=alerts_namespace)
            logger.info(f"  Left room: {room}")


@sio.event(namespace=alerts_namespace)
async def subscribe_organization_alerts(sid, data):
    """
    Subscribe to organization-wide alert updates

    Expected data:
    {
        "organization_id": "uuid"
    }
    """
    try:
        organization_id = data.get("organization_id")
        if not organization_id:
            await sio.emit(
                "error",
                {"message": "Missing organization_id"},
                room=sid,
                namespace=alerts_namespace,
            )
            return

        # Verify user's organization
        async with sio.session(sid, namespace=alerts_namespace) as session:
            user_org = session.get("organization_id")
            if user_org != organization_id:
                await sio.emit(
                    "error",
                    {"message": "Not authorized for this organization"},
                    room=sid,
                    namespace=alerts_namespace,
                )
                return

        # Add to organization alerts room
        await alert_manager.join_organization_alerts(sid, UUID(organization_id))

        # Confirm subscription
        await sio.emit(
            "subscription_confirmed",
            {
                "type": "organization_alerts",
                "organization_id": organization_id,
                "message": f"Subscribed to organization alerts",
            },
            room=sid,
            namespace=alerts_namespace,
        )

        logger.info(f"✅ Client {sid} subscribed to org alerts: {organization_id}")

    except Exception as e:
        logger.error(f"❌ Error subscribing to organization alerts: {str(e)}", exc_info=True)
        await sio.emit(
            "error",
            {"message": f"Subscription error: {str(e)}"},
            room=sid,
            namespace=alerts_namespace,
        )


@sio.event(namespace=alerts_namespace)
async def unsubscribe_organization_alerts(sid, data):
    """
    Unsubscribe from organization-wide alert updates

    Expected data:
    {
        "organization_id": "uuid"
    }
    """
    try:
        organization_id = data.get("organization_id")
        if not organization_id:
            return

        await alert_manager.leave_organization_alerts(sid, UUID(organization_id))

        await sio.emit(
            "unsubscribed",
            {
                "type": "organization_alerts",
                "organization_id": organization_id,
            },
            room=sid,
            namespace=alerts_namespace,
        )

        logger.info(f"✅ Client {sid} unsubscribed from org alerts: {organization_id}")

    except Exception as e:
        logger.error(f"❌ Error unsubscribing from organization alerts: {str(e)}")


@sio.event(namespace=alerts_namespace)
async def subscribe_template_alerts(sid, data):
    """
    Subscribe to template-specific alert updates

    Expected data:
    {
        "template_id": "uuid"
    }
    """
    try:
        template_id = data.get("template_id")
        if not template_id:
            await sio.emit(
                "error",
                {"message": "Missing template_id"},
                room=sid,
                namespace=alerts_namespace,
            )
            return

        await alert_manager.join_template_alerts(sid, UUID(template_id))

        await sio.emit(
            "subscription_confirmed",
            {
                "type": "template_alerts",
                "template_id": template_id,
                "message": f"Subscribed to template alerts",
            },
            room=sid,
            namespace=alerts_namespace,
        )

        logger.info(f"✅ Client {sid} subscribed to template alerts: {template_id}")

    except Exception as e:
        logger.error(f"❌ Error subscribing to template alerts: {str(e)}")
        await sio.emit(
            "error",
            {"message": f"Subscription error: {str(e)}"},
            room=sid,
            namespace=alerts_namespace,
        )


@sio.event(namespace=alerts_namespace)
async def unsubscribe_template_alerts(sid, data):
    """
    Unsubscribe from template-specific alert updates

    Expected data:
    {
        "template_id": "uuid"
    }
    """
    try:
        template_id = data.get("template_id")
        if not template_id:
            return

        await alert_manager.leave_template_alerts(sid, UUID(template_id))

        await sio.emit(
            "unsubscribed",
            {
                "type": "template_alerts",
                "template_id": template_id,
            },
            room=sid,
            namespace=alerts_namespace,
        )

        logger.info(f"✅ Client {sid} unsubscribed from template alerts: {template_id}")

    except Exception as e:
        logger.error(f"❌ Error unsubscribing from template alerts: {str(e)}")


@sio.event(namespace=alerts_namespace)
async def subscribe_escalated_alerts(sid):
    """Subscribe to escalated alerts (admin only)"""
    try:
        # TODO: Verify admin role from session
        await alert_manager.join_escalated_alerts(sid)

        await sio.emit(
            "subscription_confirmed",
            {
                "type": "escalated_alerts",
                "message": "Subscribed to escalated alerts",
            },
            room=sid,
            namespace=alerts_namespace,
        )

        logger.info(f"✅ Client {sid} subscribed to escalated alerts")

    except Exception as e:
        logger.error(f"❌ Error subscribing to escalated alerts: {str(e)}")
        await sio.emit(
            "error",
            {"message": f"Subscription error: {str(e)}"},
            room=sid,
            namespace=alerts_namespace,
        )


@sio.event(namespace=alerts_namespace)
async def unsubscribe_escalated_alerts(sid):
    """Unsubscribe from escalated alerts"""
    try:
        await alert_manager.leave_escalated_alerts(sid)

        await sio.emit(
            "unsubscribed",
            {"type": "escalated_alerts"},
            room=sid,
            namespace=alerts_namespace,
        )

        logger.info(f"✅ Client {sid} unsubscribed from escalated alerts")

    except Exception as e:
        logger.error(f"❌ Error unsubscribing from escalated alerts: {str(e)}")


@sio.event(namespace=alerts_namespace)
async def ping(sid):
    """Ping to keep connection alive and verify responsiveness"""
    try:
        await sio.emit(
            "pong",
            {"timestamp": __import__("datetime").datetime.utcnow().isoformat()},
            room=sid,
            namespace=alerts_namespace,
        )
        logger.debug(f"  Pong sent to {sid}")
    except Exception as e:
        logger.error(f"❌ Error sending pong: {str(e)}")


@sio.event(namespace=alerts_namespace)
async def get_active_subscriptions(sid):
    """Get list of active subscriptions for this client"""
    try:
        rooms = sio.rooms(sid, namespace=alerts_namespace)
        # Filter out the SID itself and system rooms
        subscriptions = [r for r in rooms if r != sid]

        await sio.emit(
            "active_subscriptions",
            {"subscriptions": subscriptions},
            room=sid,
            namespace=alerts_namespace,
        )

        logger.debug(f"  Sent subscriptions to {sid}: {subscriptions}")

    except Exception as e:
        logger.error(f"❌ Error getting subscriptions: {str(e)}")
