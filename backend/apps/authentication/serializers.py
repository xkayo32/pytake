"""
Authentication serializers
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, RefreshToken, MFA, Passkey, SocialIdentity, OAuthSSO
from apps.rbac.models import Role
from apps.core.validators import CPFValidator, PhoneValidator


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = [
            'id', 'organization', 'name', 'slug', 'description',
            'permissions', 'is_system_role', 'is_default', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserListSerializer(serializers.ModelSerializer):
    role_obj_name = serializers.CharField(source='role_obj.name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'avatar_url', 'role', 'role_obj_name',
            'organization', 'organization_name', 'is_active', 'is_online',
            'last_seen_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserDetailSerializer(serializers.ModelSerializer):
    role_obj_data = RoleSerializer(source='role_obj', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'avatar_url', 'phone_number', 'bio',
            'organization', 'role', 'role_obj_data', 'permissions',
            'is_active', 'is_online', 'is_locked', 'last_seen_at',
            'last_login_at', 'last_login_ip', 'failed_login_attempts',
            'department_ids', 'agent_status', 'agent_greeting_message',
            'preferences', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_locked', 'last_login_at', 'failed_login_attempts',
            'created_at', 'updated_at'
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(required=False, validators=[PhoneValidator()])
    
    class Meta:
        model = User
        fields = [
            'email', 'full_name', 'password', 'password2',
            'phone_number', 'organization', 'role'
        ]
    
    def validate(self, data):
        if data['password'] != data.pop('password2'):
            raise serializers.ValidationError({"password": "Passwords don't match"})
        return data
    
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(required=False, validators=[PhoneValidator()])
    
    class Meta:
        model = User
        fields = [
            'full_name', 'avatar_url', 'phone_number', 'bio',
            'preferences', 'agent_greeting_message'
        ]


class RefreshTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefreshToken
        fields = [
            'id', 'user', 'token_hash', 'expires_at', 'revoked',
            'revoked_at', 'is_valid', 'is_expired', 'created_at'
        ]
        read_only_fields = [
            'id', 'token_hash', 'is_valid', 'is_expired', 'created_at'
        ]


class MFASerializer(serializers.ModelSerializer):
    class Meta:
        model = MFA
        fields = [
            'id', 'user', 'is_enabled', 'secret', 'backup_codes',
            'last_used_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'secret', 'created_at', 'updated_at']


class PasskeySerializer(serializers.ModelSerializer):
    class Meta:
        model = Passkey
        fields = [
            'id', 'user', 'name', 'credential_id', 'last_used_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'credential_id', 'created_at', 'updated_at'
        ]


class SocialIdentitySerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialIdentity
        fields = [
            'id', 'user', 'provider', 'provider_user_id',
            'expires_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'access_token', 'refresh_token', 'created_at'
        ]


class OAuthSSOSerializer(serializers.ModelSerializer):
    class Meta:
        model = OAuthSSO
        fields = [
            'id', 'organization', 'name', 'provider',
            'client_id', 'client_secret', 'is_active', 'config', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'client_secret': {'write_only': True}
        }
