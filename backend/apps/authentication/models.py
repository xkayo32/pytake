"""
User and Authentication models
"""
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.contrib.postgres.fields import ArrayField
from apps.core.models import BaseModel, UUIDModel, TimestampModel
import uuid


class UserManager(BaseUserManager):
    """Custom user manager"""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'super_admin')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """
    Custom User model for PyTake
    Extends Django's AbstractBaseUser to support JWT auth and RBAC
    """
    # Override id to use UUID
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Foreign Keys
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='users',
        db_index=True,
        null=False  # Required - will be set during creation
    )
    role_obj = models.ForeignKey(
        'rbac.Role',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        db_index=True
    )
    
    # Authentication (email is username)
    email = models.EmailField(unique=True, db_index=True)
    email_verified = models.BooleanField(default=False)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    verification_token = models.CharField(max_length=255, null=True, blank=True)
    
    # Profile
    full_name = models.CharField(max_length=255)
    avatar_url = models.URLField(max_length=500, null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    
    # Role & Permissions (legacy string role + new role_obj FK)
    role = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    permissions = ArrayField(
        models.CharField(max_length=100),
        default=list,
        blank=True
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # For Django admin
    is_online = models.BooleanField(default=False)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    
    # Security
    last_login_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    reset_password_token = models.CharField(max_length=255, null=True, blank=True)
    reset_password_expires = models.DateTimeField(null=True, blank=True)
    
    # Agent-specific fields
    department_ids = ArrayField(
        models.UUIDField(),
        default=list,
        blank=True
    )
    agent_status = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=[
            ('available', 'Available'),
            ('busy', 'Busy'),
            ('away', 'Away'),
            ('offline', 'Offline'),
        ]
    )
    agent_greeting_message = models.TextField(null=True, blank=True)
    
    # Preferences
    preferences = models.JSONField(default=dict, blank=True)
    
    # Django auth requirements
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']
    
    objects = UserManager()
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['organization', 'role']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.full_name} ({self.email})"
    
    @property
    def is_locked(self):
        """Check if account is locked"""
        if self.locked_until:
            from django.utils import timezone
            return timezone.now() < self.locked_until
        return False
    
    @property
    def is_super_admin(self):
        return self.role == 'super_admin'
    
    @property
    def is_org_admin(self):
        return self.role == 'org_admin'
    
    @property
    def is_agent(self):
        return self.role == 'agent'
    
    def has_permission(self, permission):
        """Check if user has specific permission"""
        return permission in self.permissions or self.is_super_admin
    
    def record_login(self, ip_address=None):
        """Record successful login"""
        from django.utils import timezone
        self.last_login_at = timezone.now()
        self.last_login_ip = ip_address
        self.failed_login_attempts = 0
        self.locked_until = None
        self.save(update_fields=['last_login_at', 'last_login_ip', 'failed_login_attempts', 'locked_until'])
    
    def record_failed_login(self):
        """Record failed login attempt"""
        from django.utils import timezone
        from datetime import timedelta
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            self.locked_until = timezone.now() + timedelta(minutes=30)
        self.save(update_fields=['failed_login_attempts', 'locked_until'])


class RefreshToken(UUIDModel, TimestampModel):
    """JWT Refresh Token model"""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='refresh_tokens'
    )
    token_hash = models.CharField(max_length=255, unique=True, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_reason = models.CharField(max_length=255, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        db_table = 'refresh_tokens'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token_hash']),
            models.Index(fields=['user', 'revoked']),
        ]
    
    def __str__(self):
        return f"RefreshToken for {self.user.email}"
    
    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at
    
    @property
    def is_valid(self):
        return not self.is_expired and not self.revoked
    
    def revoke(self, reason=None):
        from django.utils import timezone
        self.revoked = True
        self.revoked_at = timezone.now()
        self.revoked_reason = reason
        self.save(update_fields=['revoked', 'revoked_at', 'revoked_reason'])


class MFA(UUIDModel, TimestampModel):
    """Multi-Factor Authentication"""
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='mfa'
    )
    
    is_enabled = models.BooleanField(default=False)
    secret = models.CharField(max_length=255)
    backup_codes = models.JSONField(default=list, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'mfa'


class Passkey(UUIDModel, TimestampModel):
    """WebAuthn Passkey"""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='passkeys'
    )
    
    name = models.CharField(max_length=255)
    credential_id = models.TextField(unique=True)
    public_key = models.TextField()
    counter = models.IntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'passkeys'
        ordering = ['-created_at']


class SocialIdentity(UUIDModel, TimestampModel):
    """Social login identity"""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='social_identities'
    )
    
    PROVIDER_CHOICES = [
        ('google', 'Google'),
        ('github', 'GitHub'),
        ('facebook', 'Facebook'),
    ]
    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES)
    provider_user_id = models.CharField(max_length=255)
    access_token = models.TextField(null=True, blank=True)
    refresh_token = models.TextField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'social_identities'
        unique_together = [['provider', 'provider_user_id']]


class OAuthSSO(UUIDModel, TimestampModel):
    """OAuth SSO configuration"""
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='oauth_configs'
    )
    
    name = models.CharField(max_length=255)
    provider = models.CharField(max_length=50)
    client_id = models.CharField(max_length=255)
    client_secret = models.TextField()
    is_active = models.BooleanField(default=True)
    config = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'oauth_sso'
