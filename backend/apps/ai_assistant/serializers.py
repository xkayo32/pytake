"""
AI Assistant serializers
"""
from rest_framework import serializers
from .models import AICustomModel, AISettings


# ==================== Flow Generation Serializers ====================

class ClarificationQuestionSerializer(serializers.Serializer):
    """Clarification question from AI"""
    question = serializers.CharField()
    field = serializers.CharField()
    options = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True
    )


class GenerateFlowRequestSerializer(serializers.Serializer):
    """Request to generate a flow from description"""
    description = serializers.CharField(
        min_length=10,
        max_length=2000,
        help_text="Natural language description of the desired flow"
    )
    industry = serializers.CharField(
        max_length=100,
        required=False,
        allow_null=True,
        help_text="Industry context (e.g., 'ecommerce', 'support', 'banking')"
    )
    language = serializers.CharField(
        default="pt-BR",
        required=False,
        help_text="Flow language (default: pt-BR)"
    )
    chatbot_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Chatbot UUID to associate the flow with"
    )
    save_to_database = serializers.BooleanField(
        default=False,
        required=False,
        help_text="If True, saves the generated flow to database"
    )
    flow_name = serializers.CharField(
        max_length=200,
        required=False,
        allow_null=True,
        help_text="Custom name for the flow (auto-generated if not provided)"
    )


class GenerateFlowResponseSerializer(serializers.Serializer):
    """Response from flow generation"""
    status = serializers.ChoiceField(
        choices=['success', 'needs_clarification', 'error'],
        help_text="Generation status"
    )
    flow_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Flow UUID if saved to database"
    )
    flow_name = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="Flow name if saved"
    )
    saved_to_database = serializers.BooleanField(
        default=False,
        help_text="Whether flow was saved to database"
    )
    flow_data = serializers.JSONField(
        required=False,
        allow_null=True,
        help_text="Generated flow data with nodes and edges"
    )
    clarification_questions = ClarificationQuestionSerializer(
        many=True,
        required=False,
        allow_null=True,
        help_text="Questions for clarification if status is 'needs_clarification'"
    )
    error_message = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="Error message if status is 'error'"
    )


# ==================== AI Settings Serializers ====================


class AISettingsSerializer(serializers.ModelSerializer):
    default_provider = serializers.CharField(source='provider')
    
    # Override API key fields to return masked values on read
    openai_api_key = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    anthropic_api_key = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    gemini_api_key = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = AISettings
        fields = [
            'enabled', 'default_provider', 'openai_api_key', 'anthropic_api_key',
            'gemini_api_key', 'model', 'max_tokens', 'temperature',
            'enable_flow_generation', 'enable_improvements',
            'created_at'
        ]
        read_only_fields = ['created_at']
    
    def to_representation(self, instance):
        """
        Serialize model to dict (READ operation)
        Mask API keys for security while indicating they exist
        """
        data = super().to_representation(instance)
        
        # Mask API keys (show only if they exist)
        if instance.openai_api_key:
            key = instance.openai_api_key
            data['openai_api_key'] = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "***"
        else:
            data['openai_api_key'] = None
            
        if instance.anthropic_api_key:
            key = instance.anthropic_api_key
            data['anthropic_api_key'] = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "***"
        else:
            data['anthropic_api_key'] = None
            
        if instance.gemini_api_key:
            key = instance.gemini_api_key
            data['gemini_api_key'] = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "***"
        else:
            data['gemini_api_key'] = None
        
        return data
    
    def update(self, instance, validated_data):
        """
        Update model from dict (WRITE operation)
        Only update API keys if new values are provided (not masked placeholders)
        """
        # Check if API keys are masked placeholders (don't update if they are)
        for key_field in ['openai_api_key', 'anthropic_api_key', 'gemini_api_key']:
            if key_field in validated_data:
                value = validated_data[key_field]
                # If value looks like a masked placeholder, remove it from update
                if value and ('...' in value or value == '***'):
                    validated_data.pop(key_field)
        
        return super().update(instance, validated_data)


class AICustomModelListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AICustomModel
        fields = [
            'id', 'name', 'provider', 'model_id', 'is_active',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AICustomModelDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = AICustomModel
        fields = [
            'id', 'organization', 'name', 'provider', 'model_id',
            'config', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
