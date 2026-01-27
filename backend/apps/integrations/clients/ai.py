"""
AI Provider Clients
Supports OpenAI, Anthropic (Claude), and Google Gemini
"""
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


class AIProviderBase(ABC):
    """Base class for AI providers"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()

    @abstractmethod
    def complete(
        self,
        prompt: str,
        max_tokens: int = 500,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Generate text completion"""
        pass

    @abstractmethod
    def chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Chat completion"""
        pass


class OpenAIClient(AIProviderBase):
    """OpenAI API Client (GPT-4, GPT-3.5)"""

    BASE_URL = "https://api.openai.com/v1"

    def __init__(self, api_key: str, model: str = "gpt-3.5-turbo"):
        super().__init__(api_key)
        self.model = model
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })

    def complete(
        self,
        prompt: str,
        max_tokens: int = 500,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Text completion"""
        try:
            response = self.session.post(
                f"{self.BASE_URL}/completions",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["text"].strip()
        except Exception as e:
            logger.error(f"OpenAI completion error: {str(e)}")
            raise

    def chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.7,
        system: Optional[str] = None,
        **kwargs
    ) -> str:
        """Chat completion"""
        if system:
            messages = [{"role": "system", "content": system}] + messages

        try:
            response = self.session.post(
                f"{self.BASE_URL}/chat/completions",
                json={
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"OpenAI chat error: {str(e)}")
            raise

    def moderate(self, text: str) -> Dict[str, Any]:
        """Check text for policy violations"""
        try:
            response = self.session.post(
                f"{self.BASE_URL}/moderations",
                json={"input": text},
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["results"][0]
        except Exception as e:
            logger.error(f"OpenAI moderation error: {str(e)}")
            raise


class AnthropicClient(AIProviderBase):
    """Anthropic Claude API Client"""

    BASE_URL = "https://api.anthropic.com/v1"

    def __init__(self, api_key: str, model: str = "claude-3-sonnet-20240229"):
        super().__init__(api_key)
        self.model = model
        self.session.headers.update({
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        })

    def complete(
        self,
        prompt: str,
        max_tokens: int = 500,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Text completion"""
        try:
            response = self.session.post(
                f"{self.BASE_URL}/messages",
                json={
                    "model": self.model,
                    "max_tokens": max_tokens,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temperature,
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["content"][0]["text"].strip()
        except Exception as e:
            logger.error(f"Anthropic completion error: {str(e)}")
            raise

    def chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.7,
        system: Optional[str] = None,
        **kwargs
    ) -> str:
        """Chat completion"""
        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": messages,
            "temperature": temperature,
        }

        if system:
            payload["system"] = system

        try:
            response = self.session.post(
                f"{self.BASE_URL}/messages",
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["content"][0]["text"].strip()
        except Exception as e:
            logger.error(f"Anthropic chat error: {str(e)}")
            raise


class GoogleGeminiClient(AIProviderBase):
    """Google Gemini API Client"""

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self, api_key: str, model: str = "gemini-pro"):
        super().__init__(api_key)
        self.model = model

    def complete(
        self,
        prompt: str,
        max_tokens: int = 500,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Text completion"""
        try:
            response = self.session.post(
                f"{self.BASE_URL}/{self.model}:generateContent",
                params={"key": self.api_key},
                json={
                    "contents": [
                        {
                            "parts": [{"text": prompt}],
                        }
                    ],
                    "generationConfig": {
                        "maxOutputTokens": max_tokens,
                        "temperature": temperature,
                    },
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            logger.error(f"Gemini completion error: {str(e)}")
            raise

    def chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.7,
        system: Optional[str] = None,
        **kwargs
    ) -> str:
        """Chat completion"""
        contents = []

        if system:
            contents.append({"role": "user", "parts": [{"text": system}]})
            contents.append({"role": "model", "parts": [{"text": "Entendido."}]})

        for msg in messages:
            contents.append({
                "role": msg["role"],
                "parts": [{"text": msg["content"]}],
            })

        try:
            response = self.session.post(
                f"{self.BASE_URL}/{self.model}:generateContent",
                params={"key": self.api_key},
                json={
                    "contents": contents,
                    "generationConfig": {
                        "maxOutputTokens": max_tokens,
                        "temperature": temperature,
                    },
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            logger.error(f"Gemini chat error: {str(e)}")
            raise


def get_ai_client(provider: str, api_key: str, model: Optional[str] = None):
    """Factory function to get AI client by provider"""
    providers = {
        "openai": OpenAIClient,
        "anthropic": AnthropicClient,
        "google": GoogleGeminiClient,
    }

    if provider not in providers:
        raise ValueError(f"Unsupported AI provider: {provider}")

    if model:
        return providers[provider](api_key, model)
    return providers[provider](api_key)
