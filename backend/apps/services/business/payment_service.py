"""
Payment & Billing Service
Handles Stripe integration for payments, subscriptions, invoices
"""
from typing import Dict, Optional, List
from django.conf import settings
from apps.services.database.mongodb_service import MongoDBService
import logging
from datetime import datetime, timedelta
import stripe

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class PaymentService:
    """
    Payment processing service with Stripe integration
    Handles payments, subscriptions, invoices, and billing
    """

    def __init__(self, organization_id: str = None):
        """
        Initialize payment service

        Args:
            organization_id: Organization UUID for multi-tenancy
        """
        self.organization_id = organization_id
        self.mongo_service = MongoDBService(organization_id=organization_id)

    def create_customer(
        self,
        email: str,
        name: str,
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Create a Stripe customer

        Args:
            email: Customer email
            name: Customer name
            metadata: Additional metadata

        Returns:
            Stripe customer ID
        """
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={
                    'organization_id': str(self.organization_id),
                    **(metadata or {}),
                },
            )

            logger.info(f"💳 Customer created: {customer.id}")

            if self.organization_id:
                self.mongo_service.log_action(
                    user_id='system',
                    action='create',
                    resource_type='payment_customer',
                    resource_id=customer.id,
                    changes={'email': email, 'name': name},
                )

            return customer.id

        except stripe.error.StripeError as e:
            logger.error(f"❌ Error creating customer: {e}")
            raise

    def create_payment_intent(
        self,
        amount: int,  # Amount in cents
        currency: str = 'usd',
        customer_id: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ) -> Dict:
        """
        Create a payment intent

        Args:
            amount: Amount in cents
            currency: Currency code (default: usd)
            customer_id: Stripe customer ID
            description: Payment description
            metadata: Additional metadata

        Returns:
            Dict with payment intent details
        """
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                customer=customer_id,
                description=description,
                metadata={
                    'organization_id': str(self.organization_id),
                    **(metadata or {}),
                },
            )

            logger.info(f"💰 Payment intent created: {intent.id}")

            if self.organization_id:
                self.mongo_service.log_metric(
                    metric_type='payment_intent_created',
                    value=amount / 100,  # Convert to dollars
                    tags={'currency': currency},
                )

            return {
                'id': intent.id,
                'client_secret': intent.client_secret,
                'amount': intent.amount,
                'currency': intent.currency,
                'status': intent.status,
            }

        except stripe.error.StripeError as e:
            logger.error(f"❌ Error creating payment intent: {e}")
            raise

    def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        metadata: Optional[Dict] = None,
    ) -> Dict:
        """
        Create a subscription for a customer

        Args:
            customer_id: Stripe customer ID
            price_id: Stripe price ID
            metadata: Additional metadata

        Returns:
            Dict with subscription details
        """
        try:
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{'price': price_id}],
                metadata={
                    'organization_id': str(self.organization_id),
                    **(metadata or {}),
                },
            )

            logger.info(f"📦 Subscription created: {subscription.id}")

            if self.organization_id:
                self.mongo_service.store_event(
                    event_type='SubscriptionCreated',
                    event_data={
                        'subscription_id': subscription.id,
                        'customer_id': customer_id,
                        'price_id': price_id,
                    },
                    aggregate_id=customer_id,
                    aggregate_type='customer',
                )

            return {
                'id': subscription.id,
                'customer_id': subscription.customer,
                'status': subscription.status,
                'current_period_start': subscription.current_period_start,
                'current_period_end': subscription.current_period_end,
                'items': [
                    {
                        'id': item.id,
                        'price_id': item.price.id,
                        'quantity': item.quantity,
                    }
                    for item in subscription.items.data
                ],
            }

        except stripe.error.StripeError as e:
            logger.error(f"❌ Error creating subscription: {e}")
            raise

    def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = False,
    ) -> Dict:
        """
        Cancel a subscription

        Args:
            subscription_id: Stripe subscription ID
            at_period_end: Cancel at end of current period (vs immediately)

        Returns:
            Dict with updated subscription
        """
        try:
            if at_period_end:
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True,
                )
            else:
                subscription = stripe.Subscription.delete(subscription_id)

            logger.info(f"❌ Subscription cancelled: {subscription_id}")

            if self.organization_id:
                self.mongo_service.store_event(
                    event_type='SubscriptionCancelled',
                    event_data={'subscription_id': subscription_id},
                    aggregate_id=subscription.customer,
                    aggregate_type='customer',
                )

            return {
                'id': subscription.id,
                'status': subscription.status,
                'canceled_at': subscription.canceled_at,
            }

        except stripe.error.StripeError as e:
            logger.error(f"❌ Error cancelling subscription: {e}")
            raise

    def get_invoice(self, invoice_id: str) -> Dict:
        """
        Get invoice details

        Args:
            invoice_id: Stripe invoice ID

        Returns:
            Dict with invoice details
        """
        try:
            invoice = stripe.Invoice.retrieve(invoice_id)

            return {
                'id': invoice.id,
                'customer_id': invoice.customer,
                'amount_due': invoice.amount_due,
                'amount_paid': invoice.amount_paid,
                'currency': invoice.currency,
                'status': invoice.status,
                'paid': invoice.paid,
                'date': invoice.date,
                'due_date': invoice.due_date,
                'pdf_url': invoice.pdf,
                'lines': [
                    {
                        'id': line.id,
                        'description': line.description,
                        'amount': line.amount,
                        'quantity': line.quantity,
                    }
                    for line in invoice.lines.data
                ],
            }

        except stripe.error.StripeError as e:
            logger.error(f"❌ Error retrieving invoice: {e}")
            raise

    def list_invoices(
        self,
        customer_id: str,
        limit: int = 20,
    ) -> List[Dict]:
        """
        List invoices for a customer

        Args:
            customer_id: Stripe customer ID
            limit: Max results

        Returns:
            List of invoice dicts
        """
        try:
            invoices = stripe.Invoice.list(
                customer=customer_id,
                limit=limit,
            )

            return [
                {
                    'id': invoice.id,
                    'amount_due': invoice.amount_due,
                    'amount_paid': invoice.amount_paid,
                    'status': invoice.status,
                    'paid': invoice.paid,
                    'date': invoice.date,
                    'pdf_url': invoice.pdf,
                }
                for invoice in invoices.data
            ]

        except stripe.error.StripeError as e:
            logger.error(f"❌ Error listing invoices: {e}")
            raise

    def get_usage(
        self,
        customer_id: str,
        subscription_id: str,
    ) -> Dict:
        """
        Get current usage and billing info for subscription

        Args:
            customer_id: Stripe customer ID
            subscription_id: Stripe subscription ID

        Returns:
            Dict with usage and billing info
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)

            # Get invoice for current period
            invoices = stripe.Invoice.list(
                customer=customer_id,
                subscription=subscription_id,
                status='draft',
                limit=1,
            )

            current_invoice = invoices.data[0] if invoices.data else None

            return {
                'subscription_id': subscription.id,
                'status': subscription.status,
                'current_period_start': subscription.current_period_start,
                'current_period_end': subscription.current_period_end,
                'items': [
                    {
                        'price_id': item.price.id,
                        'quantity': item.quantity,
                        'billing_cycle_anchor': item.billing_cycle_anchor,
                    }
                    for item in subscription.items.data
                ],
                'current_invoice': {
                    'amount_due': current_invoice.amount_due,
                    'amount_paid': current_invoice.amount_paid,
                }
                if current_invoice
                else None,
            }

        except stripe.error.StripeError as e:
            logger.error(f"❌ Error getting usage: {e}")
            raise

    def create_coupon(
        self,
        percent_off: Optional[int] = None,
        amount_off: Optional[int] = None,
        duration: str = 'once',
        duration_in_months: Optional[int] = None,
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Create a discount coupon

        Args:
            percent_off: Percentage discount (1-100)
            amount_off: Fixed amount discount in cents
            duration: 'once', 'repeating', or 'forever'
            duration_in_months: For repeating coupons
            metadata: Additional metadata

        Returns:
            Stripe coupon ID
        """
        try:
            coupon_params = {
                'duration': duration,
                'metadata': {
                    'organization_id': str(self.organization_id),
                    **(metadata or {}),
                },
            }

            if percent_off:
                coupon_params['percent_off'] = percent_off
            elif amount_off:
                coupon_params['amount_off'] = amount_off
                coupon_params['currency'] = 'usd'

            if duration == 'repeating' and duration_in_months:
                coupon_params['duration_in_months'] = duration_in_months

            coupon = stripe.Coupon.create(**coupon_params)

            logger.info(f"🎟️ Coupon created: {coupon.id}")

            return coupon.id

        except stripe.error.StripeError as e:
            logger.error(f"❌ Error creating coupon: {e}")
            raise

    def apply_coupon(
        self,
        customer_id: str,
        coupon_id: str,
    ) -> Dict:
        """
        Apply coupon to a customer

        Args:
            customer_id: Stripe customer ID
            coupon_id: Stripe coupon ID

        Returns:
            Updated customer dict
        """
        try:
            customer = stripe.Customer.modify(
                customer_id,
                coupon=coupon_id,
            )

            logger.info(f"✅ Coupon applied to customer")

            if self.organization_id:
                self.mongo_service.log_action(
                    user_id='system',
                    action='apply',
                    resource_type='coupon',
                    resource_id=coupon_id,
                    changes={'customer_id': customer_id},
                )

            return {
                'customer_id': customer.id,
                'discount': {
                    'coupon_id': customer.discount.coupon.id,
                    'percent_off': customer.discount.coupon.percent_off,
                }
                if customer.discount
                else None,
            }

        except stripe.error.StripeError as e:
            logger.error(f"❌ Error applying coupon: {e}")
            raise
