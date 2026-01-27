"""
REST API Views for Email, SMS, Payment, and Reporting services
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.authentication.permissions import HasRBACPermission
from apps.services.business.email_sender import EmailSenderService
from apps.services.business.sms_sender import SMSSenderService
from apps.services.business.payment_service import PaymentService
from apps.services.business.reporting_service import ReportingService
import logging

logger = logging.getLogger(__name__)


class EmailViewSet(viewsets.ViewSet):
    """
    REST API for email operations
    
    POST /api/v1/email/send-simple/
    POST /api/v1/email/send-template/
    POST /api/v1/email/send-bulk/
    """

    permission_classes = [IsAuthenticated, HasRBACPermission]

    def get_service(self, request):
        return EmailSenderService(organization_id=str(request.user.organization_id))

    @action(detail=False, methods=['post'])
    def send_simple(self, request):
        """Send a simple email"""
        try:
            to_email = request.data.get('to_email')
            subject = request.data.get('subject')
            content = request.data.get('content')
            is_html = request.data.get('is_html', False)
            cc = request.data.get('cc', [])
            bcc = request.data.get('bcc', [])

            if not all([to_email, subject, content]):
                return Response(
                    {'success': False, 'message': 'Missing required fields'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            service = self.get_service(request)
            result = service.send_simple(
                to_email=to_email,
                subject=subject,
                content=content,
                is_html=is_html,
                cc=cc,
                bcc=bcc,
                metadata={'user_id': str(request.user.id)},
            )

            return Response({
                'success': True,
                'message': 'Email sent successfully',
                'data': {'status_code': result},
            })

        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['post'])
    def send_template(self, request):
        """Send email from template"""
        try:
            to_email = request.data.get('to_email')
            template_id = request.data.get('template_id')
            template_data = request.data.get('template_data', {})
            cc = request.data.get('cc', [])
            bcc = request.data.get('bcc', [])

            if not all([to_email, template_id]):
                return Response(
                    {'success': False, 'message': 'Missing required fields'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            service = self.get_service(request)
            result = service.send_template(
                to_email=to_email,
                template_id=template_id,
                template_data=template_data,
                cc=cc,
                bcc=bcc,
            )

            return Response({
                'success': True,
                'message': 'Template email sent',
                'data': {'status_code': result},
            })

        except Exception as e:
            logger.error(f"Error sending template email: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['post'])
    def send_bulk(self, request):
        """Send bulk emails"""
        try:
            recipients = request.data.get('recipients', [])
            subject = request.data.get('subject')
            content = request.data.get('content')
            is_html = request.data.get('is_html', False)

            if not all([recipients, subject, content]):
                return Response(
                    {'success': False, 'message': 'Missing required fields'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            service = self.get_service(request)
            result = service.send_bulk(
                recipients=recipients,
                subject=subject,
                content=content,
                is_html=is_html,
            )

            return Response({
                'success': result['success'],
                'data': result,
            })

        except Exception as e:
            logger.error(f"Error sending bulk emails: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SMSViewSet(viewsets.ViewSet):
    """
    REST API for SMS operations
    
    POST /api/v1/sms/send-simple/
    POST /api/v1/sms/send-template/
    POST /api/v1/sms/send-bulk/
    GET /api/v1/sms/check-balance/
    """

    permission_classes = [IsAuthenticated, HasRBACPermission]

    def get_service(self, request):
        return SMSSenderService(organization_id=str(request.user.organization_id))

    @action(detail=False, methods=['post'])
    def send_simple(self, request):
        """Send a simple SMS"""
        try:
            to_number = request.data.get('to_number')
            message = request.data.get('message')

            if not all([to_number, message]):
                return Response(
                    {'success': False, 'message': 'Missing required fields'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            service = self.get_service(request)
            result = service.send_simple(
                to_number=to_number,
                message=message,
                metadata={'user_id': str(request.user.id)},
            )

            return Response({
                'success': True,
                'message': 'SMS sent successfully',
                'data': {'message_sid': result},
            })

        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['post'])
    def send_template(self, request):
        """Send SMS from template"""
        try:
            to_number = request.data.get('to_number')
            template_id = request.data.get('template_id')
            template_data = request.data.get('template_data', {})

            if not all([to_number, template_id]):
                return Response(
                    {'success': False, 'message': 'Missing required fields'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            service = self.get_service(request)
            result = service.send_template(
                to_number=to_number,
                template_id=template_id,
                template_data=template_data,
            )

            return Response({
                'success': True,
                'data': {'message_sid': result},
            })

        except Exception as e:
            logger.error(f"Error sending template SMS: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['post'])
    def send_bulk(self, request):
        """Send bulk SMS"""
        try:
            recipients = request.data.get('recipients', [])
            message = request.data.get('message')

            if not all([recipients, message]):
                return Response(
                    {'success': False, 'message': 'Missing required fields'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            service = self.get_service(request)
            result = service.send_bulk(
                recipients=recipients,
                message=message,
            )

            return Response({
                'success': result['success'],
                'data': result,
            })

        except Exception as e:
            logger.error(f"Error sending bulk SMS: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'])
    def check_balance(self, request):
        """Check Twilio account balance"""
        try:
            service = self.get_service(request)
            result = service.check_balance()

            return Response({
                'success': True,
                'data': result,
            })

        except Exception as e:
            logger.error(f"Error checking SMS balance: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PaymentViewSet(viewsets.ViewSet):
    """
    REST API for payment operations
    
    POST /api/v1/payments/create-customer/
    POST /api/v1/payments/create-payment-intent/
    POST /api/v1/payments/create-subscription/
    GET /api/v1/payments/invoices/
    """

    permission_classes = [IsAuthenticated, HasRBACPermission]

    def get_service(self, request):
        return PaymentService(organization_id=str(request.user.organization_id))

    @action(detail=False, methods=['post'])
    def create_customer(self, request):
        """Create a Stripe customer"""
        try:
            email = request.data.get('email')
            name = request.data.get('name')

            if not all([email, name]):
                return Response(
                    {'success': False, 'message': 'Missing required fields'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            service = self.get_service(request)
            result = service.create_customer(email=email, name=name)

            return Response({
                'success': True,
                'data': {'customer_id': result},
            })

        except Exception as e:
            logger.error(f"Error creating customer: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['post'])
    def create_payment_intent(self, request):
        """Create a payment intent"""
        try:
            amount = request.data.get('amount')
            currency = request.data.get('currency', 'usd')
            customer_id = request.data.get('customer_id')
            description = request.data.get('description')

            if not amount:
                return Response(
                    {'success': False, 'message': 'Amount is required'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            service = self.get_service(request)
            result = service.create_payment_intent(
                amount=int(amount),
                currency=currency,
                customer_id=customer_id,
                description=description,
            )

            return Response({
                'success': True,
                'data': result,
            })

        except Exception as e:
            logger.error(f"Error creating payment intent: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['post'])
    def create_subscription(self, request):
        """Create a subscription"""
        try:
            customer_id = request.data.get('customer_id')
            price_id = request.data.get('price_id')

            if not all([customer_id, price_id]):
                return Response(
                    {'success': False, 'message': 'Missing required fields'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            service = self.get_service(request)
            result = service.create_subscription(
                customer_id=customer_id,
                price_id=price_id,
            )

            return Response({
                'success': True,
                'data': result,
            })

        except Exception as e:
            logger.error(f"Error creating subscription: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'])
    def invoices(self, request):
        """List invoices for customer"""
        try:
            customer_id = request.query_params.get('customer_id')

            if not customer_id:
                return Response(
                    {'success': False, 'message': 'customer_id is required'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            service = self.get_service(request)
            result = service.list_invoices(customer_id=customer_id)

            return Response({
                'success': True,
                'count': len(result),
                'data': result,
            })

        except Exception as e:
            logger.error(f"Error listing invoices: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ReportingViewSet(viewsets.ViewSet):
    """
    REST API for report generation
    
    GET /api/v1/reports/campaign/
    GET /api/v1/reports/conversation/
    GET /api/v1/reports/message/
    GET /api/v1/reports/audit/
    GET /api/v1/reports/summary/
    """

    permission_classes = [IsAuthenticated, HasRBACPermission]

    def get_service(self, request):
        return ReportingService(organization_id=str(request.user.organization_id))

    @action(detail=False, methods=['get'])
    def campaign(self, request):
        """Generate campaign report"""
        try:
            days = int(request.query_params.get('days', 30))
            format = request.query_params.get('format', 'dict')

            service = self.get_service(request)
            result = service.generate_campaign_report(days=days, format=format)

            if format in ['pdf', 'csv']:
                # Return file
                response = Response(result, content_type='application/octet-stream')
                response['Content-Disposition'] = f'attachment; filename="campaign_report.{format}"'
                return response

            return Response({'success': True, 'data': result})

        except Exception as e:
            logger.error(f"Error generating campaign report: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'])
    def conversation(self, request):
        """Generate conversation report"""
        try:
            days = int(request.query_params.get('days', 30))
            format = request.query_params.get('format', 'dict')

            service = self.get_service(request)
            result = service.generate_conversation_report(days=days, format=format)

            if format in ['pdf', 'csv']:
                response = Response(result, content_type='application/octet-stream')
                response['Content-Disposition'] = f'attachment; filename="conversation_report.{format}"'
                return response

            return Response({'success': True, 'data': result})

        except Exception as e:
            logger.error(f"Error generating conversation report: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'])
    def message(self, request):
        """Generate message report"""
        try:
            days = int(request.query_params.get('days', 30))
            format = request.query_params.get('format', 'dict')

            service = self.get_service(request)
            result = service.generate_message_report(days=days, format=format)

            if format in ['pdf', 'csv']:
                response = Response(result, content_type='application/octet-stream')
                response['Content-Disposition'] = f'attachment; filename="message_report.{format}"'
                return response

            return Response({'success': True, 'data': result})

        except Exception as e:
            logger.error(f"Error generating message report: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'])
    def audit(self, request):
        """Generate audit report"""
        try:
            days = int(request.query_params.get('days', 30))
            action_filter = request.query_params.get('action')
            format = request.query_params.get('format', 'dict')

            service = self.get_service(request)
            result = service.generate_audit_report(
                days=days,
                action_filter=action_filter,
                format=format,
            )

            if format in ['pdf', 'csv']:
                response = Response(result, content_type='application/octet-stream')
                response['Content-Disposition'] = f'attachment; filename="audit_report.{format}"'
                return response

            return Response({'success': True, 'data': result})

        except Exception as e:
            logger.error(f"Error generating audit report: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Generate executive summary"""
        try:
            days = int(request.query_params.get('days', 30))
            format = request.query_params.get('format', 'dict')

            service = self.get_service(request)
            result = service.generate_summary_report(days=days, format=format)

            if format in ['pdf', 'csv']:
                response = Response(result, content_type='application/octet-stream')
                response['Content-Disposition'] = f'attachment; filename="summary_report.{format}"'
                return response

            return Response({'success': True, 'data': result})

        except Exception as e:
            logger.error(f"Error generating summary report: {e}")
            return Response(
                {'success': False, 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
