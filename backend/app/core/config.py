"""
Application Configuration
Using Pydantic Settings for environment variable management
"""

import os
from functools import lru_cache
from typing import Annotated, List, Optional, Union
from urllib.parse import quote

from pydantic import AnyHttpUrl, EmailStr, Field, PostgresDsn, RedisDsn, field_validator, BeforeValidator
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_cors(v: Union[str, List[str]]) -> List[str]:
    """Parse CORS origins from string or list"""
    if isinstance(v, str):
        return [i.strip() for i in v.split(",")]
    return v


class Settings(BaseSettings):
    """Application settings from environment variables"""

    # Application
    ENVIRONMENT: str = Field(default="development", description="Environment: development, staging, production")
    DEBUG: bool = Field(default=True)
    SECRET_KEY: str = Field(default="dev-secret-key-32chars-minimum-length-1234567890", min_length=32, description="Secret key for app")
    APP_NAME: str = Field(default="PyTake")
    APP_VERSION: str = Field(default="1.0.0")
    API_V1_PREFIX: str = Field(default="/api/v1")

    # Server
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)
    WORKERS: int = Field(default=4)
    RELOAD: bool = Field(default=True)

    # CORS - Use Union to handle both str and list
    CORS_ORIGINS: Union[str, List[str]] = Field(
        default="http://localhost:3000,http://localhost:3001"
    )
    CORS_CREDENTIALS: bool = Field(default=True)

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def parse_cors_after(cls, v):
        """Convert string to list after validation"""
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v

    # Database - PostgreSQL
    POSTGRES_SERVER: str = Field(default="localhost")
    POSTGRES_PORT: int = Field(default=5432)
    POSTGRES_USER: str = Field(default="pytake")
    POSTGRES_PASSWORD: str = Field(default="pytake_dev_password")
    POSTGRES_DB: str = Field(default="pytake_dev")
    DATABASE_URL: Optional[PostgresDsn] = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v, info):
        if isinstance(v, str):
            return v
        values = info.data
        # Build URL manually to avoid Pydantic URL issues
        user = values.get("POSTGRES_USER", "pytake")
        password = values.get("POSTGRES_PASSWORD", "pytake_dev_password")
        host = values.get("POSTGRES_SERVER", "localhost")
        port = values.get("POSTGRES_PORT", 5432)
        db = values.get("POSTGRES_DB", "pytake_dev")
        return f"postgresql://{user}:{password}@{host}:{port}/{db}"

    # Database - Redis
    REDIS_HOST: str = Field(default="localhost")
    REDIS_PORT: int = Field(default=6379)
    REDIS_DB: int = Field(default=0)
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL: Optional[RedisDsn] = None

    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def assemble_redis_connection(cls, v, info):
        if isinstance(v, str):
            return v
        values = info.data
        return RedisDsn.build(
            scheme="redis",
            host=values.get("REDIS_HOST"),
            port=values.get("REDIS_PORT"),
            path=f"/{values.get('REDIS_DB') or 0}",
        )

    # Database - MongoDB
    MONGODB_URL: str = Field(default="mongodb://localhost:27017")
    MONGODB_DB: str = Field(default="pytake_logs")

    # JWT & Security
    JWT_SECRET_KEY: str = Field(default="jwt-secret-key-32chars-minimum-length-1234567890-test", min_length=32)
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)

    # Password Hashing
    BCRYPT_ROUNDS: int = Field(default=12)

    # Encryption for Secrets (Fernet key for internal encryption)
    # Generate with: from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())
    ENCRYPTION_KEY: Optional[str] = Field(
        default=None,
        description="Fernet encryption key for secrets (32 URL-safe base64-encoded bytes)"
    )

    # Celery
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None

    @field_validator("CELERY_BROKER_URL", mode="before")
    @classmethod
    def assemble_celery_broker(cls, v, info):
        if isinstance(v, str):
            return v
        values = info.data
        host = values.get("REDIS_HOST", "localhost")
        port = values.get("REDIS_PORT", 6379)
        password = values.get("REDIS_PASSWORD")
        if password:
            # URL-encode the password to handle special characters
            encoded_password = quote(password, safe='')
            return f"redis://default:{encoded_password}@{host}:{port}/1"
        return f"redis://{host}:{port}/1"

    @field_validator("CELERY_RESULT_BACKEND", mode="before")
    @classmethod
    def assemble_celery_backend(cls, v, info):
        if isinstance(v, str):
            return v
        values = info.data
        host = values.get("REDIS_HOST", "localhost")
        port = values.get("REDIS_PORT", 6379)
        password = values.get("REDIS_PASSWORD")
        if password:
            # URL-encode the password to handle special characters
            encoded_password = quote(password, safe='')
            return f"redis://default:{encoded_password}@{host}:{port}/2"
        return f"redis://{host}:{port}/2"

    # WhatsApp Business API
    WHATSAPP_API_URL: str = Field(default="https://graph.facebook.com/v18.0")
    WHATSAPP_API_VERSION: str = Field(default="v18.0")
    
    # Meta Webhook Settings
    META_WEBHOOK_VERIFY_TOKEN: str = Field(
        default="pytake_webhook_verify_token_12345",
        description="Token for Meta webhook verification (set in Meta dashboard)"
    )
    META_WEBHOOK_SECRET: Optional[str] = Field(
        default=None,
        description="App secret from Meta dashboard for signature verification"
    )
    
    # Public API URLs (for webhooks and external references)
    PUBLIC_API_URL: str = Field(
        default="http://localhost:8000",
        description="Public API URL for webhooks (e.g., https://api.pytake.net for prod)"
    )
    WHATSAPP_WEBHOOK_URL: str = Field(
        default="http://localhost:8000/api/v1/whatsapp/webhook",
        description="Public WhatsApp webhook URL"
    )
    
    # FastAPI root_path (used when behind reverse proxy, e.g., /prod, /staging)
    API_ROOT_PATH: str = Field(
        default="",
        description="Root path for FastAPI when behind reverse proxy (e.g., /prod, /staging)"
    )

    # Email Configuration
    SMTP_HOST: Optional[str] = Field(default="smtp.gmail.com")
    SMTP_PORT: int = Field(default=587)
    SMTP_USERNAME: Optional[str] = Field(default=None, description="SMTP username/email")
    SMTP_PASSWORD: Optional[str] = Field(default=None, description="SMTP password or app password")
    SMTP_FROM_EMAIL: str = Field(default="noreply@pytake.com")
    SMTP_FROM_NAME: str = Field(default="PyTake")
    SMTP_USE_TLS: bool = Field(default=True)
    SMTP_TIMEOUT: int = Field(default=10)
    
    # Email Rate Limiting
    EMAIL_RATE_LIMIT_PER_HOUR: int = Field(default=100)
    EMAIL_BATCH_SIZE: int = Field(default=50)
    
    # Celery Configuration
    CELERY_BROKER_URL: str = Field(
        default="redis://default:redis_password@redis:6379/1",
        description="Redis broker URL for Celery"
    )
    CELERY_RESULT_BACKEND: str = Field(
        default="redis://default:redis_password@redis:6379/2",
        description="Redis backend for Celery results"
    )
    
    # Email Configuration (SMTP)
    SMTP_HOST: Optional[str] = Field(default=None, description="SMTP server hostname")
    SMTP_PORT: int = Field(default=587, description="SMTP server port (default 587 for TLS)")
    SMTP_USER: Optional[str] = Field(default=None, description="SMTP username")
    SMTP_PASSWORD: Optional[str] = Field(default=None, description="SMTP password")
    SMTP_FROM_EMAIL: EmailStr = Field(default="noreply@pytake.com", description="From email address")
    SMTP_FROM_NAME: str = Field(default="PyTake", description="From display name")
    SMTP_USE_TLS: bool = Field(default=True, description="Use TLS for SMTP connection")
    SMTP_USE_SSL: bool = Field(default=False, description="Use SSL for SMTP connection")
    SMTP_TIMEOUT_SECONDS: int = Field(default=10, description="SMTP connection timeout")
    EMAIL_ENABLED: bool = Field(default=True, description="Enable email notifications")

    # Slack Configuration (Webhooks)
    SLACK_WEBHOOK_URL: Optional[str] = Field(default=None, description="Slack webhook URL (global or default)")
    SLACK_ENABLED: bool = Field(default=True, description="Enable Slack notifications")
    SLACK_TIMEOUT_SECONDS: int = Field(default=10, description="Slack webhook timeout")
    SLACK_RETRY_COUNT: int = Field(default=3, description="Number of retry attempts for Slack")
    SLACK_MENTION_ON_ESCALATION: bool = Field(default=True, description="@mention on alert escalation")
    SLACK_THREAD_REPLIES: bool = Field(default=False, description="Send follow-ups as thread replies")
    SLACK_INCLUDE_THREAD_TS: bool = Field(default=False, description="Include thread timestamp in metadata")

    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: str = Field(default="pytake-media")
    AWS_REGION: str = Field(default="us-east-1")

    # Sentry
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: str = Field(default="development")

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = Field(default=100)
    RATE_LIMIT_PER_HOUR: int = Field(default=1000)

    # Logging
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FORMAT: str = Field(default="json")

    # Subscription Plans Limits
    FREE_PLAN_CHATBOTS: int = Field(default=1)
    FREE_PLAN_WHATSAPP_NUMBERS: int = Field(default=1)
    FREE_PLAN_CONTACTS: int = Field(default=1000)
    FREE_PLAN_AGENTS: int = Field(default=3)
    FREE_PLAN_DEPARTMENTS: int = Field(default=1)
    FREE_PLAN_MONTHLY_MESSAGES: int = Field(default=1000)

    STARTER_PLAN_CHATBOTS: int = Field(default=3)
    STARTER_PLAN_WHATSAPP_NUMBERS: int = Field(default=2)
    STARTER_PLAN_CONTACTS: int = Field(default=5000)
    STARTER_PLAN_AGENTS: int = Field(default=5)
    STARTER_PLAN_DEPARTMENTS: int = Field(default=3)
    STARTER_PLAN_MONTHLY_MESSAGES: int = Field(default=5000)

    # Webhook Settings
    WEBHOOK_TIMEOUT_SECONDS: int = Field(default=10)
    WEBHOOK_MAX_RETRIES: int = Field(default=3)
    WEBHOOK_RETRY_DELAY_SECONDS: int = Field(default=60)

    # Queue Settings
    QUEUE_MAX_SIZE: int = Field(default=100)
    QUEUE_TIMEOUT_MINUTES: int = Field(default=30)

    # Conversation Inactivity Settings
    CONVERSATION_INACTIVITY_TIMEOUT_MINUTES: int = Field(
        default=5,
        description="Default timeout for conversation inactivity in minutes (can be overridden per flow)"
    )
    CONVERSATION_INACTIVITY_CHECK_INTERVAL_SECONDS: int = Field(
        default=15,
        description="How often to check for inactive conversations (in seconds)"
    )
    CONVERSATION_INACTIVITY_DEFAULT_ACTION: str = Field(
        default="transfer",
        description="Default action on inactivity: transfer, close, send_reminder, fallback_flow"
    )

    # Template Sync
    TEMPLATE_SYNC_INTERVAL_HOURS: int = Field(default=24)

    # Testing
    TESTING: bool = Field(default=False)
    TEST_DATABASE_URL: Optional[PostgresDsn] = None

    model_config = SettingsConfigDict(
        env_file=".env" if os.path.exists(".env") else None,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
        env_parse_enums=False,
    )

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_staging(self) -> bool:
        return self.ENVIRONMENT == "staging"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()
