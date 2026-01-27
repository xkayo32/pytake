"""
Services Layer Examples
How to use business logic services and utilities
"""

# Example 1: Using Campaign Service
from apps.services.business.campaign import CampaignService
from apps.organizations.models import Organization

org = Organization.objects.get(id='org-123')
campaign_service = CampaignService(org)

# Get campaign statistics
stats = campaign_service.get_campaign_statistics('campaign-id')
print(stats)  # {
#    'total_messages': 100,
#    'sent': 95,
#    'failed': 5,
#    'success_rate': 95.0,
#    'engagement_rate': 45.5,
# }

# Execute campaign
result = campaign_service.execute_campaign('campaign-id')
print(result)  # {'campaign_id': '...', 'messages_queued': 1000, 'status': 'executing'}

# Schedule campaign
from datetime import timedelta
from django.utils import timezone

scheduled_time = timezone.now() + timedelta(days=1)
campaign_service.schedule_campaign('campaign-id', scheduled_time)

# Cancel campaign
campaign_service.cancel_campaign('campaign-id')

---

# Example 2: Using Conversation Service
from apps.services.business.campaign import ConversationService

conv_service = ConversationService(org)

# Get statistics
stats = conv_service.get_conversation_statistics()
print(stats)  # {
#    'total_conversations': 500,
#    'open': 45,
#    'closed': 455,
#    'avg_response_time': ...,
#    'avg_messages_per_conversation': 12.5,
# }

# Close conversation
conv_service.close_conversation('conversation-id')

# Assign agent
conv_service.assign_agent('conversation-id', 'agent-id')

---

# Example 3: Using Contact Service
from apps.services.business.campaign import ContactService

contact_service = ContactService(org)

# Get segmented contacts
vip_contacts = contact_service.get_segmented_contacts('vip')
inactive_contacts = contact_service.get_segmented_contacts('inactive')
new_contacts = contact_service.get_segmented_contacts('new')

# Get summary
summary = contact_service.get_contact_summary()
print(summary)  # {
#    'total_contacts': 5000,
#    'vip_contacts': 250,
#    'blocked_contacts': 10,
#    'with_conversations': 800,
# }

# Merge duplicate contacts
result = contact_service.merge_contacts('main-id', ['dup-1', 'dup-2'])
print(result)  # {'main_contact_id': '...', 'merged_count': 2}

---

# Example 4: Using Chatbot Service
from apps.services.business.campaign import ChatbotService

chatbot_service = ChatbotService(org)

# Get active chatbots
active = chatbot_service.get_active_chatbots()

# Publish chatbot
chatbot_service.publish_chatbot('chatbot-id')

# Unpublish chatbot
chatbot_service.unpublish_chatbot('chatbot-id')

---

# Example 5: Using Template Service
from apps.services.templates.models import (
    EmailTemplate,
    SMSTemplate,
    TemplateService,
)

# Create email template
template = EmailTemplate.objects.create(
    organization=org,
    name='welcome-email',
    subject='Welcome {{name}}!',
    body='Hello {{name}}, welcome to PyTake!',
    variables=['name', 'email'],
)

# Render template
rendered = TemplateService.render_email(template, {
    'name': 'John',
    'email': 'john@example.com',
})
print(rendered)  # {'subject': 'Welcome John!', 'body': '...'}

# Get template by name
template = TemplateService.get_email_by_name(org.id, 'welcome-email')

# SMS template
sms_template = SMSTemplate.objects.create(
    organization=org,
    name='verification-code',
    body='Your code: {{code}}',
    variables=['code'],
)
sms_text = TemplateService.render_sms(sms_template, {'code': '123456'})

---

# Example 6: Using API Response Utilities
from apps.services.utils.api_helpers import APIResponse, APIError

# Success response
response = APIResponse.success(
    data={'campaign_id': '123', 'status': 'executing'},
    message='Campaign started successfully',
    status_code=200,
)
# Returns: {'success': True, 'message': '...', 'data': {...}}

# Error response
response = APIResponse.error(
    message='Campaign not found',
    status_code=404,
)
# Returns: {'success': False, 'message': '...'}

# Paginated response
page_data = APIResponse.paginated(
    data=[...],
    page=1,
    page_size=50,
    total=1000,
)
# Returns: {'success': True, 'data': [...], 'pagination': {...}}

# Custom errors
try:
    raise APIError.NotFound('Campaign', 'campaign-id')
except APIError.NotFound as e:
    response = APIResponse.error(e.message, status_code=404)

---

# Example 7: Using Search & Filter Helpers
from apps.services.utils.api_helpers import SearchHelper, PaginationHelper

# Multi-field search
from django.db.models import Q

search_query = SearchHelper.build_search_query(
    'john',
    ['name', 'email', 'phone']
)
contacts = Contact.objects.filter(search_query)

# Apply filters
filters = {'is_vip': True, 'is_blocked': False}
filter_fields = {'is_vip': 'is_vip', 'is_blocked': 'is_blocked'}
contacts = SearchHelper.apply_filters(contacts, filters, filter_fields)

# Apply ordering
contacts = SearchHelper.apply_ordering(
    contacts,
    order_by='-created_at',
    allowed_fields=['created_at', 'name', 'email'],
)

# Paginate
result = PaginationHelper.paginate(
    Contact.objects.all(),
    page=1,
    page_size=50,
)
print(result)  # {
#    'items': [...],
#    'page': 1,
#    'page_size': 50,
#    'total': 1000,
#    'offset': 0,
# }

---

# Example 8: Using Rate Limiting
from apps.services.utils.rate_limiting import RateLimitService

rate_limiter = RateLimitService()

user_id = 'user-123'
limit = 100  # 100 requests
window = 3600  # per hour

# Check if allowed
if rate_limiter.is_allowed(user_id, limit, window):
    print("Request allowed")
else:
    print("Rate limit exceeded")

# Get remaining requests
remaining = rate_limiter.get_remaining(user_id, limit)
print(f"Remaining requests: {remaining}")

# Reset rate limit
rate_limiter.reset(user_id)

---

# Example 9: Using Export Utilities
from apps.services.utils.api_helpers import ExcelExporter, CSVExporter

# Export contacts to Excel
contacts = Contact.objects.filter(organization=org)
filename = ExcelExporter.export_contacts(contacts, 'contacts.xlsx')

# Export conversations to CSV
conversations = Conversation.objects.filter(organization=org)
filename = CSVExporter.export_conversations(conversations, 'conversations.csv')

---

# Example 10: In ViewSet - Using Services
from rest_framework import viewsets
from apps.services.business.campaign import CampaignService

class CampaignViewSet(viewsets.ModelViewSet):
    def get_campaign_stats(self, request, pk=None):
        service = CampaignService(request.user.organization)
        stats = service.get_campaign_statistics(pk)
        
        return APIResponse.success(
            data=stats,
            message='Campaign statistics retrieved',
        )

    def perform_execute(self, request, pk=None):
        service = CampaignService(request.user.organization)
        result = service.execute_campaign(pk)
        
        return APIResponse.success(
            data=result,
            message='Campaign execution started',
        )
