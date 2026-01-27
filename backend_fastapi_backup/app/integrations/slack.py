"""
Slack Integration Service
Async webhook-based notifications with Block Kit formatting
"""

import logging
import asyncio
import json
from typing import Dict, List, Optional
from enum import Enum
from dataclasses import dataclass, asdict

import aiohttp

from app.core.config import settings

logger = logging.getLogger(__name__)


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AlertEventType(str, Enum):
    """Alert event types"""
    ALERT_CREATED = "alert_created"
    ALERT_ESCALATED = "alert_escalated"
    ALERT_RESOLVED = "alert_resolved"
    STALE_ALERT = "stale_alert"


# Color mapping for severity (Slack Block Kit)
SEVERITY_COLORS = {
    AlertSeverity.CRITICAL: "#d32f2f",  # Red
    AlertSeverity.HIGH: "#ff9800",      # Orange
    AlertSeverity.MEDIUM: "#fbc02d",    # Yellow
    AlertSeverity.LOW: "#388e3c",       # Green
}

# Emoji mapping for severity
SEVERITY_EMOJI = {
    AlertSeverity.CRITICAL: "🔴",
    AlertSeverity.HIGH: "🟠",
    AlertSeverity.MEDIUM: "🟡",
    AlertSeverity.LOW: "🟢",
}


@dataclass
class SlackAlert:
    """Slack alert payload"""
    alert_id: str
    alert_title: str
    alert_description: str
    severity: AlertSeverity
    event_type: AlertEventType
    organization_name: str
    created_at: str
    updated_at: str
    dashboard_url: str
    metadata: Optional[Dict] = None

    def __post_init__(self):
        """Validate alert"""
        if not self.metadata:
            self.metadata = {}


class SlackService:
    """
    Slack service with webhook integration
    - Block Kit message formatting
    - Retry logic with exponential backoff
    - Error handling
    - Support for multiple webhooks per organization
    """

    def __init__(self):
        """Initialize Slack service"""
        self.webhook_url = settings.SLACK_WEBHOOK_URL
        self.enabled = settings.SLACK_ENABLED
        self.timeout = settings.SLACK_TIMEOUT_SECONDS
        self.max_retries = settings.SLACK_RETRY_COUNT
        self.mention_on_escalation = settings.SLACK_MENTION_ON_ESCALATION
        self.use_threads = settings.SLACK_THREAD_REPLIES
        self.retry_delay_base = 1  # seconds (exponential backoff)

    def is_configured(self) -> bool:
        """Check if Slack is properly configured"""
        return bool(self.enabled and self.webhook_url)

    def _get_webhook_url(self, organization_id: Optional[str] = None) -> Optional[str]:
        """
        Get webhook URL for organization
        Falls back to global webhook if org-specific not configured

        Args:
            organization_id: Organization UUID (for future multi-webhook support)

        Returns:
            Webhook URL or None if not configured
        """
        # TODO: Implement per-organization webhook lookup from database
        # For now, use global webhook
        return self.webhook_url

    def _build_alert_blocks(self, alert: SlackAlert) -> List[Dict]:
        """
        Build Block Kit message blocks for alert

        Args:
            alert: SlackAlert object

        Returns:
            List of Block Kit blocks
        """
        blocks = []

        # Header block with severity emoji and title
        emoji = SEVERITY_EMOJI.get(alert.severity, "⚠️")
        header_text = f"{emoji} {alert.alert_title}"

        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*{header_text}*"
            }
        })

        # Organization and metadata block
        org_text = f"Organization: {alert.organization_name}\n"
        severity_text = f"Severity: {alert.severity.value}"
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"{org_text}{severity_text}"
            }
        })

        # Description block
        if alert.alert_description:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"Description: {alert.alert_description}"
                }
            })

        # Details block
        details_text = f"Created: {alert.created_at}\nUpdated: {alert.updated_at}"
        if alert.metadata.get("category"):
            details_text += f"\nCategory: {alert.metadata.get('category')}"
        if alert.metadata.get("escalation_level"):
            details_text += f"\nEscalation Level: {alert.metadata.get('escalation_level')}"

        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": details_text
            }
        })

        # Action buttons
        action_elements = [
            {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "View Alert",
                    "emoji": True
                },
                "url": alert.dashboard_url,
                "style": "primary"
            },
            {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "Acknowledge",
                    "emoji": True
                },
                "action_id": f"acknowledge_{alert.alert_id}",
                "style": "primary"
            }
        ]

        if alert.event_type != AlertEventType.ALERT_RESOLVED:
            action_elements.append({
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "Resolve",
                    "emoji": True
                },
                "action_id": f"resolve_{alert.alert_id}",
                "style": "danger"
            })

        blocks.append({
            "type": "actions",
            "elements": action_elements
        })

        # Divider
        blocks.append({"type": "divider"})

        return blocks

    def _build_message_payload(self, alert: SlackAlert, thread_ts: Optional[str] = None) -> Dict:
        """
        Build complete Slack message payload

        Args:
            alert: SlackAlert object
            thread_ts: Thread timestamp for replies

        Returns:
            Slack message payload dict
        """
        payload = {
            "blocks": self._build_alert_blocks(alert),
            "metadata": {
                "event_type": alert.event_type.value,
                "event_payload": {
                    "alert_id": alert.alert_id,
                    "organization_id": alert.metadata.get("organization_id"),
                    "severity": alert.severity.value
                }
            }
        }

        # Add thread timestamp if provided
        if thread_ts and self.use_threads:
            payload["thread_ts"] = thread_ts

        # Add mention if escalation
        if (alert.event_type == AlertEventType.ALERT_ESCALATED and
            self.mention_on_escalation):
            payload["text"] = "<!channel> Alert Escalated"
        else:
            payload["text"] = f"Alert: {alert.alert_title}"

        return payload

    async def send_alert(
        self,
        alert: SlackAlert,
        webhook_url: Optional[str] = None,
        thread_ts: Optional[str] = None
    ) -> bool:
        """
        Send alert to Slack with retry logic

        Args:
            alert: SlackAlert object
            webhook_url: Optional override for webhook URL
            thread_ts: Optional thread timestamp for replies

        Returns:
            True if sent successfully, False otherwise
        """
        if not self.is_configured():
            logger.warning("Slack not configured - webhook URL missing")
            return False

        webhook = webhook_url or self._get_webhook_url(
            alert.metadata.get("organization_id")
        )
        if not webhook:
            logger.warning("No webhook URL available for Slack")
            return False

        payload = self._build_message_payload(alert, thread_ts)

        for attempt in range(self.max_retries):
            try:
                success = await self._send_webhook(webhook, payload)
                if success:
                    logger.info(
                        f"Slack alert sent successfully | "
                        f"Alert: {alert.alert_id} | "
                        f"Event: {alert.event_type.value}"
                    )
                    return True

            except asyncio.TimeoutError:
                logger.warning(
                    f"Slack webhook timeout (attempt {attempt + 1}/{self.max_retries})"
                )
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay_base ** (attempt + 1))

            except aiohttp.ClientError as e:
                logger.error(
                    f"Slack webhook error (attempt {attempt + 1}/{self.max_retries}): {str(e)}"
                )
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay_base ** (attempt + 1))

            except Exception as e:
                logger.error(f"Unexpected error sending Slack alert: {str(e)}")
                return False

        logger.error(
            f"Failed to send Slack alert {alert.alert_id} after {self.max_retries} attempts"
        )
        return False

    async def _send_webhook(self, webhook_url: str, payload: Dict) -> bool:
        """
        Internal method to send webhook POST request

        Args:
            webhook_url: Slack webhook URL
            payload: Message payload dict

        Returns:
            True if successful (HTTP 200), False otherwise

        Raises:
            aiohttp.ClientError: On network errors
            asyncio.TimeoutError: On timeout
        """
        timeout = aiohttp.ClientTimeout(total=self.timeout)

        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    return True
                else:
                    error_text = await response.text()
                    logger.warning(
                        f"Slack webhook returned {response.status}: {error_text}"
                    )
                    return False

    async def send_batch(
        self,
        alerts: List[SlackAlert],
        webhook_url: Optional[str] = None,
        delay_between_sends: float = 0.5
    ) -> Dict[str, bool]:
        """
        Send multiple alerts to Slack with delay between sends

        Args:
            alerts: List of SlackAlert objects
            webhook_url: Optional override for webhook URL
            delay_between_sends: Delay in seconds between sends

        Returns:
            Dict with alert_id -> success mapping
        """
        results = {}

        for alert in alerts:
            success = await self.send_alert(alert, webhook_url)
            results[alert.alert_id] = success

            if delay_between_sends > 0:
                await asyncio.sleep(delay_between_sends)

        return results

    async def verify_webhook(self, webhook_url: Optional[str] = None) -> bool:
        """
        Verify Slack webhook is working by sending test message

        Args:
            webhook_url: Optional override for webhook URL

        Returns:
            True if webhook works, False otherwise
        """
        webhook = webhook_url or self.webhook_url
        if not webhook:
            logger.warning("No webhook URL available")
            return False

        test_payload = {
            "text": "🧪 PyTake Slack Integration Test",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "✅ PyTake Slack webhook is working correctly!"
                    }
                }
            ]
        }

        try:
            success = await self._send_webhook(webhook, test_payload)
            if success:
                logger.info("✅ Slack webhook verification successful")
                return True
            else:
                logger.error("❌ Slack webhook verification failed")
                return False

        except Exception as e:
            logger.error(f"❌ Slack webhook verification error: {str(e)}")
            return False


# Global Slack service instance
_slack_service: Optional[SlackService] = None


def get_slack_service() -> SlackService:
    """Get or create Slack service instance"""
    global _slack_service
    if _slack_service is None:
        _slack_service = SlackService()
    return _slack_service
