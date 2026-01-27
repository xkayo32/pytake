"""
Business Logic Services
Core business operations separated from API views
"""
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q, Count

from apps.campaigns.models import Campaign, CampaignMessage
from apps.conversations.models import Conversation, Message
from apps.contacts.models import Contact
from apps.chatbots.models import Chatbot
from apps.organizations.models import Organization


class CampaignService:
    """Business logic for campaigns"""

    def __init__(self, organization: Organization):
        self.organization = organization

    def get_active_campaigns(self):
        """Get all active campaigns for org"""
        return Campaign.objects.filter(
            organization=self.organization,
            status__in=['active', 'scheduled'],
            deleted_at__isnull=True,
        )

    def get_campaign_statistics(self, campaign_id: str):
        """Get detailed statistics for a campaign"""
        campaign = Campaign.objects.get(
            id=campaign_id,
            organization=self.organization,
            deleted_at__isnull=True,
        )

        messages = CampaignMessage.objects.filter(campaign=campaign)
        
        return {
            'total_messages': messages.count(),
            'sent': messages.filter(status='sent').count(),
            'failed': messages.filter(status='failed').count(),
            'pending': messages.filter(status='pending').count(),
            'opened': messages.filter(is_opened=True).count(),
            'clicked': messages.filter(is_clicked=True).count(),
            'success_rate': self._calculate_success_rate(messages),
            'engagement_rate': self._calculate_engagement_rate(messages),
        }

    def execute_campaign(self, campaign_id: str):
        """Execute campaign: send to all contacts"""
        from apps.integrations.tasks import send_whatsapp_message
        
        campaign = Campaign.objects.get(
            id=campaign_id,
            organization=self.organization,
            deleted_at__isnull=True,
        )

        contacts = Contact.objects.filter(
            organization=self.organization,
            is_blocked=False,
            deleted_at__isnull=True,
        )

        # Queue messages for all contacts
        for contact in contacts:
            message_obj = CampaignMessage.objects.create(
                campaign=campaign,
                contact=contact,
                status='pending',
            )

            # Queue async task
            send_whatsapp_message.delay(
                phone_number_id=campaign.whatsapp_number.phone_number_id,
                recipient_phone=contact.whatsapp_id or contact.phone,
                message_type='text',
                message_content={'body': campaign.message_body},
                organization_id=str(self.organization.id),
            )

        campaign.status = 'active'
        campaign.executed_at = timezone.now()
        campaign.save()

        return {
            'campaign_id': str(campaign.id),
            'messages_queued': contacts.count(),
            'status': 'executing',
        }

    def schedule_campaign(self, campaign_id: str, scheduled_for: timezone.datetime):
        """Schedule campaign for future execution"""
        campaign = Campaign.objects.get(
            id=campaign_id,
            organization=self.organization,
            deleted_at__isnull=True,
        )

        campaign.status = 'scheduled'
        campaign.scheduled_for = scheduled_for
        campaign.save()

        return {
            'campaign_id': str(campaign.id),
            'scheduled_for': scheduled_for,
        }

    def cancel_campaign(self, campaign_id: str):
        """Cancel a campaign"""
        campaign = Campaign.objects.get(
            id=campaign_id,
            organization=self.organization,
            deleted_at__isnull=True,
        )

        campaign.status = 'cancelled'
        campaign.save()

        # Cancel pending messages
        CampaignMessage.objects.filter(
            campaign=campaign,
            status='pending',
        ).update(status='cancelled')

        return {'campaign_id': str(campaign.id), 'status': 'cancelled'}

    @staticmethod
    def _calculate_success_rate(messages):
        """Calculate success rate percentage"""
        total = messages.count()
        if not total:
            return 0
        sent = messages.filter(status='sent').count()
        return round((sent / total) * 100, 2)

    @staticmethod
    def _calculate_engagement_rate(messages):
        """Calculate engagement rate percentage"""
        total = messages.count()
        if not total:
            return 0
        engaged = messages.filter(Q(is_opened=True) | Q(is_clicked=True)).count()
        return round((engaged / total) * 100, 2)


class ConversationService:
    """Business logic for conversations"""

    def __init__(self, organization: Organization):
        self.organization = organization

    def get_open_conversations(self):
        """Get all open conversations"""
        return Conversation.objects.filter(
            organization=self.organization,
            status='open',
            deleted_at__isnull=True,
        ).order_by('-updated_at')

    def get_conversation_statistics(self):
        """Get overall conversation statistics"""
        conversations = Conversation.objects.filter(
            organization=self.organization,
            deleted_at__isnull=True,
        )

        return {
            'total_conversations': conversations.count(),
            'open': conversations.filter(status='open').count(),
            'closed': conversations.filter(status='closed').count(),
            'avg_response_time': self._calculate_avg_response_time(),
            'avg_messages_per_conversation': self._calculate_avg_messages(),
            'busiest_hour': self._get_busiest_hour(),
        }

    def close_conversation(self, conversation_id: str):
        """Close a conversation"""
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=self.organization,
            deleted_at__isnull=True,
        )

        conversation.status = 'closed'
        conversation.closed_at = timezone.now()
        conversation.save()

        return {
            'conversation_id': str(conversation.id),
            'status': 'closed',
            'closed_at': conversation.closed_at,
        }

    def assign_agent(self, conversation_id: str, agent_id: str):
        """Assign agent to conversation"""
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=self.organization,
            deleted_at__isnull=True,
        )

        conversation.assigned_agent_id = agent_id
        conversation.save()

        return {
            'conversation_id': str(conversation.id),
            'assigned_agent_id': agent_id,
        }

    def _calculate_avg_response_time(self):
        """Calculate average response time in minutes"""
        # Simplified calculation
        messages = Message.objects.filter(
            conversation__organization=self.organization,
            conversation__deleted_at__isnull=True,
        ).order_by('created_at')
        
        return 0  # Placeholder

    def _calculate_avg_messages(self):
        """Calculate average messages per conversation"""
        conversations = Conversation.objects.filter(
            organization=self.organization,
            deleted_at__isnull=True,
        )
        total = conversations.count()
        if not total:
            return 0
        
        messages = Message.objects.filter(
            conversation__organization=self.organization,
            conversation__deleted_at__isnull=True,
        ).count()
        
        return round(messages / total, 2)

    def _get_busiest_hour(self):
        """Get busiest hour of day"""
        # Placeholder - would require time analysis
        return None


class ContactService:
    """Business logic for contacts"""

    def __init__(self, organization: Organization):
        self.organization = organization

    def get_segmented_contacts(self, segment: str):
        """Get contacts by segment"""
        contacts = Contact.objects.filter(
            organization=self.organization,
            deleted_at__isnull=True,
        )

        if segment == 'vip':
            return contacts.filter(is_vip=True)
        elif segment == 'inactive':
            cutoff = timezone.now() - timedelta(days=30)
            return contacts.filter(last_interaction__lt=cutoff)
        elif segment == 'new':
            cutoff = timezone.now() - timedelta(days=7)
            return contacts.filter(created_at__gte=cutoff)
        elif segment == 'blocked':
            return contacts.filter(is_blocked=True)
        
        return contacts

    def get_contact_summary(self):
        """Get contact summary statistics"""
        contacts = Contact.objects.filter(
            organization=self.organization,
            deleted_at__isnull=True,
        )

        return {
            'total_contacts': contacts.count(),
            'vip_contacts': contacts.filter(is_vip=True).count(),
            'blocked_contacts': contacts.filter(is_blocked=True).count(),
            'with_conversations': contacts.annotate(
                conv_count=Count('conversation')
            ).filter(conv_count__gt=0).count(),
        }

    def merge_contacts(self, main_contact_id: str, duplicate_ids: list):
        """Merge duplicate contacts"""
        main_contact = Contact.objects.get(
            id=main_contact_id,
            organization=self.organization,
            deleted_at__isnull=True,
        )

        # Move conversations to main contact
        Conversation.objects.filter(
            contact_id__in=duplicate_ids,
            deleted_at__isnull=True,
        ).update(contact=main_contact)

        # Mark duplicates as deleted
        Contact.objects.filter(
            id__in=duplicate_ids,
            deleted_at__isnull=True,
        ).update(deleted_at=timezone.now())

        return {
            'main_contact_id': str(main_contact.id),
            'merged_count': len(duplicate_ids),
        }


class ChatbotService:
    """Business logic for chatbots"""

    def __init__(self, organization: Organization):
        self.organization = organization

    def get_active_chatbots(self):
        """Get all published chatbots"""
        return Chatbot.objects.filter(
            organization=self.organization,
            is_published=True,
            deleted_at__isnull=True,
        )

    def publish_chatbot(self, chatbot_id: str):
        """Publish a chatbot"""
        chatbot = Chatbot.objects.get(
            id=chatbot_id,
            organization=self.organization,
            deleted_at__isnull=True,
        )

        chatbot.is_published = True
        chatbot.published_at = timezone.now()
        chatbot.save()

        return {
            'chatbot_id': str(chatbot.id),
            'is_published': True,
            'published_at': chatbot.published_at,
        }

    def unpublish_chatbot(self, chatbot_id: str):
        """Unpublish a chatbot"""
        chatbot = Chatbot.objects.get(
            id=chatbot_id,
            organization=self.organization,
            deleted_at__isnull=True,
        )

        chatbot.is_published = False
        chatbot.save()

        return {
            'chatbot_id': str(chatbot.id),
            'is_published': False,
        }
