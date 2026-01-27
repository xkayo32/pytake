"""
Email, SMS, and Payment Gateway Clients
"""
import logging
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


class SendGridEmailClient:
    """SendGrid Email Service"""

    BASE_URL = "https://api.sendgrid.com/v3"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })

    def send(
        self,
        to: str,
        subject: str,
        html: str,
        from_email: str = "noreply@pytake.net",
        from_name: str = "PyTake",
        reply_to: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Send email via SendGrid"""
        payload = {
            "personalizations": [
                {
                    "to": [{"email": to}],
                    "subject": subject,
                }
            ],
            "from": {"email": from_email, "name": from_name},
            "content": [{"type": "text/html", "value": html}],
        }

        if reply_to:
            payload["reply_to"] = {"email": reply_to}

        if cc:
            payload["personalizations"][0]["cc"] = [{"email": e} for e in cc]

        if bcc:
            payload["personalizations"][0]["bcc"] = [{"email": e} for e in bcc]

        if attachments:
            payload["attachments"] = attachments

        try:
            response = self.session.post(
                f"{self.BASE_URL}/mail/send",
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            return {"status": "sent", "message_id": response.headers.get("X-Message-Id")}
        except Exception as e:
            logger.error(f"SendGrid error: {str(e)}")
            raise

    def send_batch(self, recipients: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Send batch emails"""
        personalizations = []
        for recipient in recipients:
            personalizations.append({
                "to": [{"email": recipient["email"]}],
                "subject": recipient.get("subject", ""),
            })

        payload = {
            "personalizations": personalizations,
            "from": {"email": "noreply@pytake.net", "name": "PyTake"},
            "subject": "Message from PyTake",
        }

        try:
            response = self.session.post(
                f"{self.BASE_URL}/mail/send",
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            return {"status": "sent"}
        except Exception as e:
            logger.error(f"SendGrid batch error: {str(e)}")
            raise


class TwilioSMSClient:
    """Twilio SMS Service"""

    BASE_URL = "https://api.twilio.com/2010-04-01"

    def __init__(self, account_sid: str, auth_token: str):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.session = requests.Session()
        self.session.auth = (account_sid, auth_token)

    def send(
        self,
        to: str,
        message: str,
        from_number: str,
    ) -> Dict[str, Any]:
        """Send SMS"""
        try:
            response = self.session.post(
                f"{self.BASE_URL}/Accounts/{self.account_sid}/Messages.json",
                data={
                    "From": from_number,
                    "To": to,
                    "Body": message,
                },
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()
            return {
                "status": "sent",
                "message_id": result["sid"],
            }
        except Exception as e:
            logger.error(f"Twilio error: {str(e)}")
            raise

    def get_message_status(self, message_id: str) -> Dict[str, Any]:
        """Get SMS delivery status"""
        try:
            response = self.session.get(
                f"{self.BASE_URL}/Accounts/{self.account_sid}/Messages/{message_id}.json",
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()
            return {
                "status": result["status"],
                "date_sent": result.get("date_sent"),
                "error_code": result.get("error_code"),
            }
        except Exception as e:
            logger.error(f"Twilio status error: {str(e)}")
            raise


class StripePaymentClient:
    """Stripe Payment Gateway"""

    BASE_URL = "https://api.stripe.com/v1"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.auth = (api_key, "")
        self.session.headers.update({
            "Content-Type": "application/x-www-form-urlencoded",
        })

    def create_payment_intent(
        self,
        amount: int,  # in cents
        currency: str = "usd",
        description: str = "",
        customer_email: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Create payment intent"""
        data = {
            "amount": amount,
            "currency": currency,
            "description": description,
        }

        if customer_email:
            data["receipt_email"] = customer_email

        if metadata:
            for key, value in metadata.items():
                data[f"metadata[{key}]"] = value

        try:
            response = self.session.post(
                f"{self.BASE_URL}/payment_intents",
                data=data,
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()
            return {
                "client_secret": result["client_secret"],
                "payment_intent_id": result["id"],
            }
        except Exception as e:
            logger.error(f"Stripe payment intent error: {str(e)}")
            raise

    def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Create subscription"""
        data = {
            "customer": customer_id,
            "items": [{"price": price_id}],
        }

        if metadata:
            for key, value in metadata.items():
                data[f"metadata[{key}]"] = value

        try:
            response = self.session.post(
                f"{self.BASE_URL}/subscriptions",
                data=data,
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()
            return {
                "subscription_id": result["id"],
                "status": result["status"],
                "current_period_start": result["current_period_start"],
                "current_period_end": result["current_period_end"],
            }
        except Exception as e:
            logger.error(f"Stripe subscription error: {str(e)}")
            raise

    def cancel_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Cancel subscription"""
        try:
            response = self.session.delete(
                f"{self.BASE_URL}/subscriptions/{subscription_id}",
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()
            return {
                "subscription_id": result["id"],
                "status": result["status"],
                "canceled_at": result["canceled_at"],
            }
        except Exception as e:
            logger.error(f"Stripe cancel subscription error: {str(e)}")
            raise

    def retrieve_payment_intent(self, payment_intent_id: str) -> Dict[str, Any]:
        """Retrieve payment intent status"""
        try:
            response = self.session.get(
                f"{self.BASE_URL}/payment_intents/{payment_intent_id}",
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()
            return {
                "payment_intent_id": result["id"],
                "status": result["status"],
                "amount": result["amount"],
                "currency": result["currency"],
            }
        except Exception as e:
            logger.error(f"Stripe retrieve error: {str(e)}")
            raise
