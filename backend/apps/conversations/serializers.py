"""
Conversation and Contact serializers
"""
from rest_framework import serializers
from .models import Contact, Conversation, ConversationWindow, ConversationLog, ConversationState
from apps.core.validators import PhoneValidator, WhatsAppIDValidator


class ContactListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            'id', 'name', 'whatsapp_id', 'email', 'phone_number',
            'is_vip', 'lifecycle_stage', 'last_message_at',
            'total_conversations', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ContactDetailSerializer(serializers.ModelSerializer):
    assigned_agent_name = serializers.CharField(source='assigned_agent.full_name', read_only=True)
    assigned_department_name = serializers.CharField(source='assigned_department.name', read_only=True)
    whatsapp_id = serializers.CharField(validators=[WhatsAppIDValidator()])
    phone_number = serializers.CharField(required=False, validators=[PhoneValidator()])
    
    class Meta:
        model = Contact
        fields = [
            'id', 'organization', 'whatsapp_id', 'whatsapp_name', 'name',
            'email', 'phone_number', 'avatar_url', 'company', 'job_title',
            'notes', 'address_street', 'address_city', 'address_state',
            'address_country', 'address_zipcode', 'attributes',
            'source', 'lead_score', 'lifecycle_stage', 'opt_in', 'opt_in_date',
            'opt_out_date', 'is_blocked', 'blocked_at', 'blocked_reason',
            'is_vip', 'last_message_at', 'last_message_received_at',
            'last_message_sent_at', 'total_messages_sent',
            'total_messages_received', 'total_conversations',
            'average_response_time_seconds', 'last_engagement_score',
            'assigned_agent', 'assigned_agent_name', 'assigned_department',
            'assigned_department_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ConversationListSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source='contact.display_name', read_only=True)
    agent_name = serializers.CharField(source='current_agent.full_name', read_only=True)
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'contact', 'contact_name', 'agent_name', 'status',
            'is_unread', 'is_priority', 'message_count', 'last_message_at',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ConversationDetailSerializer(serializers.ModelSerializer):
    contact_data = ContactListSerializer(source='contact', read_only=True)
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'organization', 'contact', 'contact_data', 'whatsapp_number',
            'current_agent', 'department', 'queue', 'active_chatbot',
            'status', 'last_message_at', 'last_customer_message_at',
            'last_agent_message_at', 'resolved_at', 'closed_at',
            'assigned_at', 'is_unread', 'is_priority', 'is_spam',
            'message_count', 'agent_message_count', 'customer_message_count',
            'tags', 'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'message_count', 'agent_message_count',
            'customer_message_count', 'created_at', 'updated_at'
        ]


class ConversationWindowSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationWindow
        fields = [
            'id', 'organization', 'conversation', 'whatsapp_number',
            'opened_at', 'expires_at', 'closed_at', 'is_active',
            'messages_sent', 'last_message_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ConversationLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = ConversationLog
        fields = [
            'id', 'conversation', 'user', 'user_email', 'event_type',
            'event_data', 'message', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ConversationStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationState
        fields = [
            'id', 'conversation', 'current_node_id', 'variables',
            'context', 'last_interaction_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
