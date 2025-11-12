"""
AI Custom Models ORM Model
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, BigInteger, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin


class AICustomModel(Base, TimestampMixin):
    """
    Custom AI models added by organizations.

    Allows organizations to add their own fine-tuned models,
    new models not in predefined list, or models from other providers.
    """
    __tablename__ = "ai_custom_models"

    id = Column(UUID, primary_key=True, server_default="gen_random_uuid()")
    organization_id = Column(UUID, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    # Model identification
    model_id = Column(String(255), nullable=False, index=True)
    provider = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Model capabilities
    context_window = Column(Integer, nullable=False)
    max_output_tokens = Column(Integer, nullable=False)
    supports_vision = Column(Boolean, default=False, nullable=False)
    supports_tools = Column(Boolean, default=True, nullable=False)

    # Pricing (USD per million tokens)
    input_cost_per_million = Column(Float, nullable=False)
    output_cost_per_million = Column(Float, nullable=False)

    # Metadata
    release_date = Column(String(10), nullable=True)  # YYYY-MM-DD
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False)
    total_input_tokens = Column(BigInteger, default=0, nullable=False)
    total_output_tokens = Column(BigInteger, default=0, nullable=False)
    total_cost = Column(Float, default=0.0, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="custom_ai_models")

    def __repr__(self):
        return f"<AICustomModel {self.name} ({self.provider}:{self.model_id})>"

    @property
    def estimated_cost_per_request(self) -> float:
        """
        Estimate cost for typical request (1000 input, 500 output tokens)
        """
        input_cost = (1000 / 1_000_000) * self.input_cost_per_million
        output_cost = (500 / 1_000_000) * self.output_cost_per_million
        return input_cost + output_cost

    def increment_usage(self, input_tokens: int, output_tokens: int) -> None:
        """
        Track usage and calculate cost
        """
        self.usage_count += 1
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens

        # Calculate cost
        input_cost = (input_tokens / 1_000_000) * self.input_cost_per_million
        output_cost = (output_tokens / 1_000_000) * self.output_cost_per_million
        self.total_cost += (input_cost + output_cost)
