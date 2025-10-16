"""
Pre-defined AI Models Database
Updated: October 2025
"""

from typing import List, Dict, Any

# OpenAI Models (October 2025)
OPENAI_MODELS = [
    {
        "model_id": "gpt-5",
        "provider": "openai",
        "name": "GPT-5",
        "description": "OpenAI's most advanced model (Released August 2025)",
        "context_window": 128000,
        "max_output_tokens": 16384,
        "input_cost_per_million": 30.0,
        "output_cost_per_million": 90.0,
        "supports_vision": True,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2025-08-07"
    },
    {
        "model_id": "gpt-4o",
        "provider": "openai",
        "name": "GPT-4o (Omni)",
        "description": "Flagship multimodal model - processes text and images simultaneously",
        "context_window": 128000,
        "max_output_tokens": 16384,
        "input_cost_per_million": 2.5,
        "output_cost_per_million": 10.0,
        "supports_vision": True,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2024-05-13"
    },
    {
        "model_id": "gpt-4o-mini",
        "provider": "openai",
        "name": "GPT-4o mini",
        "description": "Smaller, faster, cheaper version of GPT-4o - 60% cheaper than GPT-3.5",
        "context_window": 128000,
        "max_output_tokens": 16384,
        "input_cost_per_million": 0.15,
        "output_cost_per_million": 0.6,
        "supports_vision": True,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2024-07-18"
    },
    {
        "model_id": "o4-mini",
        "provider": "openai",
        "name": "o4-mini",
        "description": "Latest reasoning model with enhanced quality and performance",
        "context_window": 128000,
        "max_output_tokens": 16384,
        "input_cost_per_million": 5.0,
        "output_cost_per_million": 15.0,
        "supports_vision": False,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2025-01-01"
    },
    {
        "model_id": "o3",
        "provider": "openai",
        "name": "o3",
        "description": "Advanced reasoning model from OpenAI",
        "context_window": 128000,
        "max_output_tokens": 16384,
        "input_cost_per_million": 7.5,
        "output_cost_per_million": 20.0,
        "supports_vision": False,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2025-01-01"
    },
    {
        "model_id": "gpt-4-turbo",
        "provider": "openai",
        "name": "GPT-4 Turbo",
        "description": "Faster, more cost-efficient variant of GPT-4 with 128K context",
        "context_window": 128000,
        "max_output_tokens": 4096,
        "input_cost_per_million": 10.0,
        "output_cost_per_million": 30.0,
        "supports_vision": True,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2023-11-06"
    },
    {
        "model_id": "gpt-4",
        "provider": "openai",
        "name": "GPT-4",
        "description": "Original GPT-4 model - highly capable for complex tasks",
        "context_window": 8192,
        "max_output_tokens": 4096,
        "input_cost_per_million": 30.0,
        "output_cost_per_million": 60.0,
        "supports_vision": False,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2023-03-14"
    },
    {
        "model_id": "gpt-3.5-turbo",
        "provider": "openai",
        "name": "GPT-3.5 Turbo",
        "description": "Fast and economical model for simple tasks",
        "context_window": 16385,
        "max_output_tokens": 4096,
        "input_cost_per_million": 0.5,
        "output_cost_per_million": 1.5,
        "supports_vision": False,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2023-03-01"
    },
]

# Anthropic Models (October 2025)
ANTHROPIC_MODELS = [
    {
        "model_id": "claude-sonnet-4.5",
        "provider": "anthropic",
        "name": "Claude Sonnet 4.5",
        "description": "Best model for complex agents and coding with highest intelligence (September 2025)",
        "context_window": 200000,
        "max_output_tokens": 8192,
        "input_cost_per_million": 3.0,
        "output_cost_per_million": 15.0,
        "supports_vision": True,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2025-09-01"
    },
    {
        "model_id": "claude-opus-4.1",
        "provider": "anthropic",
        "name": "Claude Opus 4.1",
        "description": "Most powerful Claude model for specialized complex tasks (August 2025)",
        "context_window": 200000,
        "max_output_tokens": 8192,
        "input_cost_per_million": 15.0,
        "output_cost_per_million": 75.0,
        "supports_vision": True,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2025-08-05"
    },
    {
        "model_id": "claude-sonnet-4",
        "provider": "anthropic",
        "name": "Claude Sonnet 4",
        "description": "High-performance model with exceptional reasoning (May 2025)",
        "context_window": 200000,
        "max_output_tokens": 8192,
        "input_cost_per_million": 3.0,
        "output_cost_per_million": 15.0,
        "supports_vision": True,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2025-05-22"
    },
    {
        "model_id": "claude-haiku-4.5",
        "provider": "anthropic",
        "name": "Claude Haiku 4.5",
        "description": "Smallest, fastest, most cost-effective model (October 2025)",
        "context_window": 200000,
        "max_output_tokens": 8192,
        "input_cost_per_million": 0.8,
        "output_cost_per_million": 4.0,
        "supports_vision": True,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2025-10-15"
    },
    {
        "model_id": "claude-3.7-sonnet",
        "provider": "anthropic",
        "name": "Claude 3.7 Sonnet",
        "description": "Extended thinking capabilities model",
        "context_window": 200000,
        "max_output_tokens": 8192,
        "input_cost_per_million": 3.0,
        "output_cost_per_million": 15.0,
        "supports_vision": True,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2025-01-01"
    },
    {
        "model_id": "claude-3-5-sonnet-20241022",
        "provider": "anthropic",
        "name": "Claude 3.5 Sonnet",
        "description": "Excellent balance of intelligence and speed",
        "context_window": 200000,
        "max_output_tokens": 8192,
        "input_cost_per_million": 3.0,
        "output_cost_per_million": 15.0,
        "supports_vision": True,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2024-10-22"
    },
    {
        "model_id": "claude-3-5-haiku-20241022",
        "provider": "anthropic",
        "name": "Claude 3.5 Haiku",
        "description": "Cost-effective for high-volume tasks",
        "context_window": 200000,
        "max_output_tokens": 8192,
        "input_cost_per_million": 0.8,
        "output_cost_per_million": 4.0,
        "supports_vision": True,
        "supports_tools": True,
        "is_deprecated": False,
        "release_date": "2024-10-22"
    },
    {
        "model_id": "claude-3-opus-20240229",
        "provider": "anthropic",
        "name": "Claude 3 Opus",
        "description": "Most capable Claude 3 model (DEPRECATED - retiring January 2026)",
        "context_window": 200000,
        "max_output_tokens": 4096,
        "input_cost_per_million": 15.0,
        "output_cost_per_million": 75.0,
        "supports_vision": True,
        "supports_tools": True,
        "is_deprecated": True,
        "release_date": "2024-02-29"
    },
]

ALL_MODELS = OPENAI_MODELS + ANTHROPIC_MODELS


def get_all_models() -> List[Dict[str, Any]]:
    """Get all predefined models"""
    return ALL_MODELS.copy()


def get_models_by_provider(provider: str) -> List[Dict[str, Any]]:
    """Get models filtered by provider"""
    if provider == "openai":
        return OPENAI_MODELS.copy()
    elif provider == "anthropic":
        return ANTHROPIC_MODELS.copy()
    else:
        return []


def get_model_by_id(model_id: str) -> Dict[str, Any] | None:
    """Get specific model by ID"""
    for model in ALL_MODELS:
        if model["model_id"] == model_id:
            return model.copy()
    return None


def get_recommended_models() -> List[Dict[str, Any]]:
    """Get recommended models (non-deprecated, popular)"""
    recommended_ids = [
        "gpt-4o",
        "gpt-4o-mini",
        "claude-sonnet-4.5",
        "claude-haiku-4.5",
        "gpt-5",
        "claude-opus-4.1",
    ]
    return [m for m in ALL_MODELS if m["model_id"] in recommended_ids and not m["is_deprecated"]]
