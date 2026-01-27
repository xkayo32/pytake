"""
Webhook Handlers for External Services
Payment, Email, and SMS webhooks
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from drf_spectacular.utils import extend_schema
from apps.services.database.mongodb_service import MongoDBService
import logging
import stripe
import json
from django.conf import settings

logger = logging.getLogger(__name__)


@extend_schema(exclude=True)
@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookViewSet(viewsets.ViewSet):
    """
    Handle Stripe webhook events
    
    POST /api/v1/webhooks/stripe/
    """

    permission_classes = [AllowAny]

    def create(self, request):
        """Handle Stripe webhook events"""
        try:
            payload = request.body
            sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload,
                sig_header,
                settings.STRIPE_WEBHOOK_SECRET,
            )

            # Handle different event types
            if event['type'] == 'payment_intent.succeeded':
                self._handle_payment_succeeded(event['data']['object'])

            elif event['type'] == 'payment_intent.payment_failed':
                self._handle_payment_failed(event['data']['object'])

            elif event['type'] == 'customer.subscription.created':
                self._handle_subscription_created(event['data']['object'])

            elif event['type'] == 'customer.subscription.updated':
                self._handle_subscription_updated(event['data']['object'])

            elif event['type'] == 'customer.subscription.deleted':
                self._handle_subscription_deleted(event['data']['object'])

            elif event['type'] == 'invoice.paid':
                self._handle_invoice_paid(event['data']['object'])

            elif event['type'] == 'invoice.payment_failed':
                self._handle_invoice_payment_failed(event['data']['object'])

            logger.info(f"✅ Stripe webhook processed: {event['type']}")

            return Response({'success': True, 'message': 'Webhook received'})

        except stripe.error.SignatureVerificationError as e:
            logger.error(f"❌ Invalid Stripe webhook signature: {e}")
            return Response(
                {'success': False, 'message': 'Invalid signature'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"❌ Error processing Stripe webhook: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _handle_payment_succeeded(self, payment_intent):
        """Handle successful payment"""
        customer_id = payment_intent.get('customer')
        amount = payment_intent.get('amount') / 100  # Convert to dollars

        logger.info(f"✅ Payment succeeded: ${amount} from {customer_id}")

        # Log event
        try:
            organization_id = payment_intent.get('metadata', {}).get('organization_id')
            if organization_id:
                mongo = MongoDBService(organization_id=organization_id)
                mongo.store_event(
                    event_type='PaymentSucceeded',
                    event_data={
                        'customer_id': customer_id,
                        'amount': amount,
                        'payment_intent_id': payment_intent.get('id'),
                    },
                    aggregate_id=customer_id,
                    aggregate_type='customer',
                )
        except Exception as e:
            logger.warning(f"Could not log payment event: {e}")

    def _handle_payment_failed(self, payment_intent):
        """Handle failed payment"""
        customer_id = payment_intent.get('customer')
        error_message = payment_intent.get('last_payment_error', {}).get('message')

        logger.error(f"❌ Payment failed from {customer_id}: {error_message}")

        try:
            organization_id = payment_intent.get('metadata', {}).get('organization_id')
            if organization_id:
                mongo = MongoDBService(organization_id=organization_id)
                mongo.store_event(
                    event_type='PaymentFailed',
                    event_data={
                        'customer_id': customer_id,
                        'error': error_message,
                    },
                    aggregate_id=customer_id,
                    aggregate_type='customer',
                )
        except Exception as e:
            logger.warning(f"Could not log payment failure: {e}")

    def _handle_subscription_created(self, subscription):
        """Handle new subscription"""
        customer_id = subscription.get('customer')
        subscription_id = subscription.get('id')

        logger.info(f"📦 Subscription created: {subscription_id}")

        try:
            organization_id = subscription.get('metadata', {}).get('organization_id')
            if organization_id:
                mongo = MongoDBService(organization_id=organization_id)
                mongo.store_event(
                    event_type='SubscriptionCreated',
                    event_data={
                        'subscription_id': subscription_id,
                        'customer_id': customer_id,
                    },
                    aggregate_id=customer_id,
                    aggregate_type='customer',
                )
        except Exception as e:
            logger.warning(f"Could not log subscription creation: {e}")

    def _handle_subscription_updated(self, subscription):
        """Handle subscription update"""
        subscription_id = subscription.get('id')
        logger.info(f"✏️ Subscription updated: {subscription_id}")

    def _handle_subscription_deleted(self, subscription):
        """Handle subscription cancellation"""
        customer_id = subscription.get('customer')
        subscription_id = subscription.get('id')

        logger.info(f"❌ Subscription cancelled: {subscription_id}")

        try:
            organization_id = subscription.get('metadata', {}).get('organization_id')
            if organization_id:
                mongo = MongoDBService(organization_id=organization_id)
                mongo.store_event(
                    event_type='SubscriptionCancelled',
                    event_data={'subscription_id': subscription_id},
                    aggregate_id=customer_id,
                    aggregate_type='customer',
                )
        except Exception as e:
            logger.warning(f"Could not log subscription cancellation: {e}")

    def _handle_invoice_paid(self, invoice):
        """Handle paid invoice"""
        invoice_id = invoice.get('id')
        customer_id = invoice.get('customer')
        amount = invoice.get('amount_paid') / 100

        logger.info(f"💰 Invoice paid: ${amount}")

    def _handle_invoice_payment_failed(self, invoice):
        """Handle failed invoice payment"""
        invoice_id = invoice.get('id')
        customer_id = invoice.get('customer')

        logger.error(f"❌ Invoice payment failed: {invoice_id}")


@extend_schema(exclude=True)
@method_decorator(csrf_exempt, name='dispatch')
class SendGridWebhookViewSet(viewsets.ViewSet):
    """
    Handle SendGrid email events
    
    POST /api/v1/webhooks/sendgrid/
    """

    permission_classes = [AllowAny]

    def create(self, request):
        """Handle SendGrid webhook events"""
        try:
            events = request.data if isinstance(request.data, list) else [request.data]

            for event in events:
                event_type = event.get('event')

                if event_type == 'delivered':
                    self._handle_email_delivered(event)
                elif event_type == 'open':
                    self._handle_email_opened(event)
                elif event_type == 'click':
                    self._handle_email_clicked(event)
                elif event_type == 'bounce':
                    self._handle_email_bounced(event)
                elif event_type == 'spamreport':
                    self._handle_email_spam(event)
                elif event_type == 'unsubscribe':
                    self._handle_email_unsubscribe(event)

                logger.info(f"✉️ SendGrid event processed: {event_type}")

            return Response({'success': True})

        except Exception as e:
            logger.error(f"❌ Error processing SendGrid webhook: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _handle_email_delivered(self, event):
        """Email delivered"""
        email = event.get('email')
        timestamp = event.get('timestamp')
        logger.info(f"✉️ Email delivered to {email}")

    def _handle_email_opened(self, event):
        """Email opened"""
        email = event.get('email')
        logger.info(f"👁️ Email opened by {email}")

    def _handle_email_clicked(self, event):
        """Email link clicked"""
        email = event.get('email')
        url = event.get('url')
        logger.info(f"🔗 Email link clicked by {email}")

    def _handle_email_bounced(self, event):
        """Email bounced"""
        email = event.get('email')
        reason = event.get('reason')
        logger.warning(f"⚠️ Email bounced from {email}: {reason}")

    def _handle_email_spam(self, event):
        """Email reported as spam"""
        email = event.get('email')
        logger.warning(f"🚫 Email reported as spam by {email}")

    def _handle_email_unsubscribe(self, event):
        """Email unsubscribe"""
        email = event.get('email')
        logger.info(f"📧 Email unsubscribe: {email}")


@extend_schema(exclude=True)
@method_decorator(csrf_exempt, name='dispatch')
class TwilioWebhookViewSet(viewsets.ViewSet):
    """
    Handle Twilio SMS events
    
    POST /api/v1/webhooks/twilio/
    """

    permission_classes = [AllowAny]

    def create(self, request):
        """Handle Twilio webhook events"""
        try:
            message_status = request.data.get('MessageStatus')
            phone_number = request.data.get('To')
            message_sid = request.data.get('MessageSid')

            if message_status == 'delivered':
                self._handle_sms_delivered(message_sid, phone_number)
            elif message_status == 'failed':
                self._handle_sms_failed(message_sid, phone_number)
            elif message_status == 'undelivered':
                self._handle_sms_undelivered(message_sid, phone_number)

            logger.info(f"📱 Twilio event processed: {message_status}")

            return Response({'success': True})

        except Exception as e:
            logger.error(f"❌ Error processing Twilio webhook: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _handle_sms_delivered(self, message_sid, phone_number):
        """SMS delivered"""
        logger.info(f"📱 SMS delivered to {phone_number} ({message_sid})")

    def _handle_sms_failed(self, message_sid, phone_number):
        """SMS delivery failed"""
        logger.error(f"❌ SMS failed to {phone_number} ({message_sid})")

    def _handle_sms_undelivered(self, message_sid, phone_number):
        """SMS undelivered"""
        logger.warning(f"⚠️ SMS undelivered to {phone_number} ({message_sid})")
