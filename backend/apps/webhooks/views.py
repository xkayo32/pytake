"""
Webhook receiver and management views
"""
import hashlib
import hmac
import json
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse

from .models import WebhookEvent, WebhookEndpoint
from .serializers import WebhookEventSerializer, WebhookEndpointSerializer
from apps.authentication.permissions import IsOrganizerUser


@csrf_exempt
@require_http_methods(["GET", "POST"])
def whatsapp_webhook_receiver(request, wa_number_id):
    """
    WhatsApp webhook endpoint - handles both verification and message receiving
    
    GET /api/v1/webhooks/whatsapp/{webhook_token}/
      - Verification request from Meta
      - Query params: hub.mode, hub.challenge, hub.verify_token
      - Returns: hub.challenge (plain text integer)
    
    POST /api/v1/webhooks/whatsapp/{webhook_token}/
      - Incoming webhook events from Meta
      - Handles: messages, status updates, contact info changes, template quality
      - Returns: {'status': 'received'}
      
    Note: wa_number_id parameter is actually the webhook_token (UUID)
    """
    try:
        from apps.whatsapp.models import WhatsAppNumber
        
        # Try to find WhatsApp number by webhook_token
        # wa_number_id is actually webhook_token passed in URL
        wa_number = WhatsAppNumber.objects.get(webhook_token=wa_number_id)
        
        # GET request: Verification handshake with Meta
        if request.method == 'GET':
            mode = request.GET.get('hub.mode')
            challenge = request.GET.get('hub.challenge')
            token = request.GET.get('hub.verify_token')
            
            print(f"[Webhook] ✅ Verification request for webhook_token={wa_number_id}")
            print(f"  hub.mode: {mode}")
            print(f"  hub.challenge: {challenge}")
            print(f"  hub.verify_token: {token}")
            print(f"  Expected token: {wa_number.webhook_verify_token}")
            print(f"  WhatsApp Number: {wa_number.phone_number}")
            
            # Verify token matches webhook_verify_token
            if mode == 'subscribe' and token == wa_number.webhook_verify_token:
                print(f"[Webhook] ✅✅ Verification SUCCESSFUL, returning challenge")
                return JsonResponse(int(challenge), safe=False)
            
            print(f"[Webhook] ❌ Verification failed - token mismatch")
            print(f"  Received: {token}")
            print(f"  Expected: {wa_number.webhook_verify_token}")
            return JsonResponse(
                {'error': 'Invalid verify token'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # POST request: Incoming webhook event
        if request.method == 'POST':
            # Parse webhook payload
            payload = json.loads(request.body) if request.body else {}
            
            # Verify webhook signature (if required)
            if not verify_webhook_signature(request, wa_number):
                return JsonResponse(
                    {'error': 'Invalid signature'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Create webhook event for processing
            event_type = extract_event_type(payload)
            
            webhook_event = WebhookEvent.objects.create(
                organization=wa_number.organization,
                event_type=event_type,
                source='whatsapp',
                event_data=payload,
                external_id=payload.get('entry', [{}])[0].get('id')
            )
            
            # Process event asynchronously
            from .tasks import process_webhook_event
            process_webhook_event.delay(webhook_event.id)
            
            # Return 200 OK to acknowledge receipt (required by WhatsApp)
            return JsonResponse({'status': 'received'}, status=status.HTTP_200_OK)
        
    except WhatsAppNumber.DoesNotExist:
        print(f"[Webhook] ❌ WhatsApp number not found with webhook_token={wa_number_id}")
        return JsonResponse(
            {'error': 'WhatsApp number not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print(f"[Webhook] ❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@csrf_exempt
@require_http_methods(["GET"])
def whatsapp_webhook_verify(request, wa_number_id):
    """
    DEPRECATED: Use whatsapp_webhook_receiver with GET method instead.
    This function is kept for backwards compatibility.
    
    GET /api/v1/webhooks/whatsapp/{webhook_id}/verify/
    """
    # Redirect to new unified endpoint
    return whatsapp_webhook_receiver(request, wa_number_id)




class WebhookEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for Webhook Events
    GET /api/v1/webhook-events/ - List events
    GET /api/v1/webhook-events/{id}/ - Get event details
    POST /api/v1/webhook-events/{id}/retry/ - Retry failed event
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    serializer_class = WebhookEventSerializer
    
    def get_queryset(self):
        """Return only user's organization events"""
        return WebhookEvent.objects.filter(
            organization=self.request.user.organization
        )
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry processing failed webhook event"""
        event = self.get_object()
        
        if event.status == 'completed':
            return Response(
                {'error': 'Cannot retry completed event'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if event.retry_count >= event.max_retries:
            return Response(
                {'error': 'Max retries exceeded'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset status and retry
        event.status = 'retry'
        event.retry_count += 1
        event.save()
        
        from .tasks import process_webhook_event
        process_webhook_event.delay(event.id)
        
        return Response(WebhookEventSerializer(event).data)


class WebhookEndpointViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Webhook Endpoints (Management)
    GET /api/v1/webhook-endpoints/ - List endpoints
    POST /api/v1/webhook-endpoints/ - Create endpoint
    GET /api/v1/webhook-endpoints/{id}/ - Get endpoint details
    PUT /api/v1/webhook-endpoints/{id}/ - Update endpoint
    DELETE /api/v1/webhook-endpoints/{id}/ - Delete endpoint
    POST /api/v1/webhook-endpoints/{id}/test/ - Test endpoint
    """
    permission_classes = [IsAuthenticated, IsOrganizerUser]
    serializer_class = WebhookEndpointSerializer
    
    def get_queryset(self):
        """Return only user's organization endpoints"""
        return WebhookEndpoint.objects.filter(
            organization=self.request.user.organization
        )
    
    def perform_create(self, serializer):
        """Generate secret key and set organization"""
        secret_key = generate_secret_key()
        serializer.save(
            organization=self.request.user.organization,
            secret_key=secret_key
        )
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test webhook endpoint"""
        endpoint = self.get_object()
        
        # Send test event
        test_payload = {
            'event_type': 'test',
            'message': 'This is a test webhook'
        }
        
        try:
            # TODO: Call webhook delivery task
            return Response({
                'status': 'test_sent',
                'endpoint_url': endpoint.url,
                'message': 'Test webhook sent'
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# Utility functions
def verify_webhook_signature(request, wa_number):
    """Verify Meta webhook signature"""
    signature = request.META.get('HTTP_X_HUB_SIGNATURE_256', '')
    
    if not signature:
        return True  # Allow unsigned webhooks in development
    
    # Expected format: sha256=...
    if not signature.startswith('sha256='):
        return False
    
    # Verify signature
    expected_signature = 'sha256=' + hmac.new(
        wa_number.app_secret.encode(),
        request.body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)


def extract_event_type(payload):
    """Extract event type from Meta webhook payload"""
    try:
        entries = payload.get('entry', [])
        if entries:
            changes = entries[0].get('changes', [])
            if changes:
                field = changes[0].get('field')
                value = changes[0].get('value', {})
                
                if field == 'messages':
                    if value.get('messages'):
                        return 'message_received'
                    elif value.get('statuses'):
                        return 'message_status_update'
                
                elif field == 'contacts':
                    return 'contact_changed'
                
                elif field == 'message_template_status_update':
                    return 'template_status_update'
        
        return 'unknown'
    except:
        return 'unknown'


def generate_secret_key():
    """Generate random secret key"""
    import secrets
    return secrets.token_urlsafe(32)
