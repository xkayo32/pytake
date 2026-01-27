"""
Integration tests for Phase 11-12 services
"""
import json
from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase, RequestFactory, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.organizations.models import Organization
from apps.services.database.mongodb_service import MongoDBService

# Test settings
EXTERNAL_SERVICES_SETTINGS = {
    'SENDGRID_API_KEY': 'test-sendgrid-key',
    'SENDGRID_FROM_EMAIL': 'test@example.com',
    'TWILIO_ACCOUNT_SID': 'test-twilio-account',
    'TWILIO_AUTH_TOKEN': 'test-twilio-token',
    'TWILIO_FROM_PHONE': '+1234567890',
    'STRIPE_SECRET_KEY': 'test-stripe-key',
    'STRIPE_PUBLISHABLE_KEY': 'test-stripe-pub',
}


@override_settings(**EXTERNAL_SERVICES_SETTINGS)
class EmailSenderServiceTestCase(TestCase):
    """Tests for EmailSenderService"""

    def setUp(self):
        """Create test organization and service"""
        from apps.services.business.email_sender import EmailSenderService
        self.EmailSenderService = EmailSenderService
        self.org = Organization.objects.create(
            name='Test Org',
            slug='test-org',
        )

    @patch('apps.services.business.email_sender.SendGridAPIClient')
    def test_send_simple_email(self, mock_sg_class):
        """Test sending simple email"""
        service = self.EmailSenderService(organization_id=str(self.org.id))
        mock_sg = Mock()
        mock_sg_class.return_value = mock_sg
        service.sendgrid_client = mock_sg

        mock_response = Mock()
        mock_response.status_code = 202
        mock_sg.client.mail.send.post.return_value = mock_response

        result = service.send_simple(
            to_email='test@example.com',
            subject='Test Subject',
            body='Test Body',
        )

        self.assertTrue(result['success'])
        self.assertEqual(result['status'], 'sent')

    @patch('apps.services.business.email_sender.SendGridAPIClient')
    def test_send_template_email(self, mock_sg_class):
        """Test sending template email"""
        service = self.EmailSenderService(organization_id=str(self.org.id))
        mock_sg = Mock()
        mock_sg_class.return_value = mock_sg
        service.sendgrid_client = mock_sg

        mock_response = Mock()
        mock_response.status_code = 202
        mock_sg.client.mail.send.post.return_value = mock_response

        result = service.send_template(
            to_email='test@example.com',
            template_id='template-123',
            dynamic_data={'name': 'John'},
        )

        self.assertTrue(result['success'])
        self.assertEqual(result['status'], 'sent')

    @patch('apps.services.business.email_sender.SendGridAPIClient')
    def test_send_bulk_emails(self, mock_sg_class):
        """Test sending bulk emails"""
        service = self.EmailSenderService(organization_id=str(self.org.id))
        mock_sg = Mock()
        mock_sg_class.return_value = mock_sg
        service.sendgrid_client = mock_sg

        mock_response = Mock()
        mock_response.status_code = 202
        mock_sg.client.mail.send.post.return_value = mock_response

        recipients = [
            {'email': 'user1@example.com', 'name': 'User 1'},
            {'email': 'user2@example.com', 'name': 'User 2'},
        ]

        result = service.send_bulk(
            recipients=recipients,
            subject='Bulk Email',
            body='Test',
        )

        self.assertTrue(result['success'])
        self.assertEqual(result['emails_sent'], 2)


@override_settings(**EXTERNAL_SERVICES_SETTINGS)
class SMSSenderServiceTestCase(TestCase):
    """Tests for SMSSenderService"""

    def setUp(self):
        """Create test organization and service"""
        from apps.services.business.sms_sender import SMSSenderService
        self.SMSSenderService = SMSSenderService
        self.org = Organization.objects.create(
            name='Test Org',
            slug='test-org-sms',
        )

    @patch('apps.services.business.sms_sender.Client')
    def test_send_simple_sms(self, mock_client_class):
        """Test sending simple SMS"""
        service = self.SMSSenderService(organization_id=str(self.org.id))
        mock_client = Mock()
        mock_message = Mock()
        mock_message.sid = 'test-sid-123'
        mock_client.messages.create.return_value = mock_message
        mock_client_class.return_value = mock_client

        result = service.send_simple(
            phone_number='+5511999999999',
            message='Test SMS',
        )

        self.assertTrue(result['success'])
        self.assertEqual(result['status'], 'sent')

    @patch('apps.services.business.sms_sender.Client')
    def test_check_balance(self, mock_client_class):
        """Test checking account balance"""
        service = self.SMSSenderService(organization_id=str(self.org.id))
        mock_client = Mock()
        mock_balance = Mock()
        mock_balance.balance = 50.00
        mock_client.api.accounts.fetch.return_value = mock_balance
        mock_client_class.return_value = mock_client

        result = service.check_balance()

        self.assertTrue('balance' in result)


@override_settings(**EXTERNAL_SERVICES_SETTINGS)
class PaymentServiceTestCase(TestCase):
    """Tests for PaymentService"""

    def setUp(self):
        """Create test organization and service"""
        from apps.services.business.payment_service import PaymentService
        self.PaymentService = PaymentService
        self.org = Organization.objects.create(
            name='Test Org',
            slug='test-org-payment',
        )

    @patch('apps.services.business.payment_service.stripe')
    def test_create_customer(self, mock_stripe):
        """Test creating Stripe customer"""
        service = self.PaymentService(organization_id=str(self.org.id))
        mock_customer = Mock()
        mock_customer.id = 'cus_123456'
        mock_customer.email = 'test@example.com'
        mock_stripe.Customer.create.return_value = mock_customer

        result = service.create_customer(
            email='test@example.com',
            name='Test Customer',
        )

        self.assertEqual(result['customer_id'], 'cus_123456')

    @patch('apps.services.business.payment_service.stripe')
    def test_create_subscription(self, mock_stripe):
        """Test creating subscription"""
        service = self.PaymentService(organization_id=str(self.org.id))
        mock_subscription = Mock()
        mock_subscription.id = 'sub_123456'
        mock_subscription.status = 'active'
        mock_stripe.Subscription.create.return_value = mock_subscription

        result = service.create_subscription(
            customer_id='cus_123456',
            price_id='price_123456',
        )

        self.assertEqual(result['subscription_id'], 'sub_123456')


@override_settings(**EXTERNAL_SERVICES_SETTINGS)
class ReportingServiceTestCase(TestCase):
    """Tests for ReportingService"""

    def setUp(self):
        """Create test organization and service"""
        from apps.services.business.reporting_service import ReportingService
        self.ReportingService = ReportingService
        self.org = Organization.objects.create(
            name='Test Org',
            slug='test-org-reporting',
        )

    def test_generate_campaign_report(self):
        """Test generating campaign report"""
        service = self.ReportingService(organization_id=str(self.org.id))
        report_data = {
            'campaign_id': '123',
            'total_sent': 100,
            'total_delivered': 95,
            'total_failed': 5,
            'open_rate': 0.75,
            'click_rate': 0.25,
        }

        result = service.generate_campaign_report(
            campaign_data=report_data,
        )

        self.assertIn('report_id', result)
        self.assertEqual(result['status'], 'generated')

    def test_export_to_csv(self):
        """Test CSV export"""
        service = self.ReportingService(organization_id=str(self.org.id))
        data = {
            'header1': ['value1', 'value2'],
            'header2': ['value3', 'value4'],
        }

        result = service._dict_to_csv(data)

        self.assertIn('header1', result)
        self.assertIn('value1', result)

    def test_export_to_pdf(self):
        """Test PDF export"""
        service = self.ReportingService(organization_id=str(self.org.id))
        data = {
            'title': 'Test Report',
            'content': [
                {'label': 'Metric 1', 'value': '100'},
                {'label': 'Metric 2', 'value': '200'},
            ],
        }

        result = service._dict_to_pdf(data)

        self.assertIsNotNone(result)
        self.assertTrue(len(result) > 0)


class WebhookHandlerTestCase(TestCase):
    """Tests for webhook handlers"""

    def setUp(self):
        """Create test client and organization"""
        self.client = APIClient()
        self.org = Organization.objects.create(
            name='Test Org',
            slug='test-org-webhook',
        )

    def test_stripe_webhook_endpoint(self):
        """Test Stripe webhook endpoint"""
        payload = {
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_123456',
                    'amount': 10000,
                },
            },
        }

        response = self.client.post(
            '/api/v1/services/webhooks/stripe/',
            data=json.dumps(payload),
            content_type='application/json',
        )

        self.assertIn(response.status_code, [200, 202, 403])

    def test_sendgrid_webhook_endpoint(self):
        """Test SendGrid webhook endpoint"""
        payload = [
            {
                'email': 'test@example.com',
                'timestamp': 1620000000,
                'event': 'delivered',
            },
        ]

        response = self.client.post(
            '/api/v1/services/webhooks/sendgrid/',
            data=json.dumps(payload),
            content_type='application/json',
        )

        self.assertIn(response.status_code, [200, 202, 403])

    def test_twilio_webhook_endpoint(self):
        """Test Twilio webhook endpoint"""
        payload = {
            'MessageSid': 'SM123456789',
            'AccountSid': 'AC123456789',
            'MessageStatus': 'delivered',
        }

        response = self.client.post(
            '/api/v1/services/webhooks/twilio/',
            data=payload,
            content_type='application/x-www-form-urlencoded',
        )

        self.assertIn(response.status_code, [200, 202, 403])


class MongoDBServiceTestCase(TestCase):
    """Tests for MongoDBService"""

    def setUp(self):
        """Create test organization and service"""
        self.org = Organization.objects.create(
            name='Test Org',
            slug='test-org-mongodb',
        )

    @patch('apps.services.database.mongodb_service.MongoDBClient')
    def test_mongodb_service_creation(self, mock_mongodb):
        """Test MongoDB service initialization"""
        service = MongoDBService(organization_id=str(self.org.id))

        self.assertIsNotNone(service)
        self.assertEqual(service.organization_id, str(self.org.id))


class ServicesAPIEndpointsTestCase(TestCase):
    """Tests for services API endpoints"""

    def setUp(self):
        """Create test user and organization"""
        self.org = Organization.objects.create(
            name='Test Org',
            slug='test-org-api',
        )
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            organization=self.org,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_email_endpoint_list(self):
        """Test email endpoint list"""
        response = self.client.get('/api/v1/services/email/')
        self.assertIn(response.status_code, [200, 403])

    def test_sms_endpoint_list(self):
        """Test SMS endpoint list"""
        response = self.client.get('/api/v1/services/sms/')
        self.assertIn(response.status_code, [200, 403])

    def test_payment_endpoint_list(self):
        """Test payment endpoint list"""
        response = self.client.get('/api/v1/services/payments/')
        self.assertIn(response.status_code, [200, 403])

    def test_reporting_endpoint_list(self):
        """Test reporting endpoint list"""
        response = self.client.get('/api/v1/services/reports/')
        self.assertIn(response.status_code, [200, 403])

    def test_audit_logs_endpoint(self):
        """Test audit logs endpoint"""
        response = self.client.get('/api/v1/services/audit-logs/')
        self.assertIn(response.status_code, [200, 403])

    def test_analytics_endpoint(self):
        """Test analytics endpoint"""
        response = self.client.get('/api/v1/services/analytics/')
        self.assertIn(response.status_code, [200, 403])
