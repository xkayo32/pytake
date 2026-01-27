"""Middleware for request tracking and correlation ID propagation."""

import uuid
from typing import Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.logging import (
    set_request_context,
    clear_request_context,
    get_logger,
)

logger = get_logger(__name__)


class CorrelationIDMiddleware(BaseHTTPMiddleware):
    """Middleware that generates and propagates Request ID and Correlation ID.

    - Generates unique Request ID for each HTTP request
    - Extracts or generates Correlation ID (for cross-service tracing)
    - Sets context variables for automatic injection into logs
    - Clears context after response to prevent leakage

    Request ID is unique per HTTP request.
    Correlation ID is propagated across service calls (via headers).
    """

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """Process request with correlation tracking.

        Args:
            request: HTTP request
            call_next: Next middleware/handler

        Returns:
            Response with correlation ID header
        """
        # Generate unique request ID
        request_id = str(uuid.uuid4())

        # Extract or generate correlation ID from header
        correlation_id = request.headers.get(
            "X-Correlation-ID",
            str(uuid.uuid4()),
        )

        # Extract organization and user from request state if available
        organization_id = ""
        user_id = ""
        conversation_id = ""

        # Set context for logging
        set_request_context(
            request_id=request_id,
            correlation_id=correlation_id,
            organization_id=organization_id,
            user_id=user_id,
            conversation_id=conversation_id,
        )

        try:
            # Process request
            response = await call_next(request)

            # Add correlation ID to response headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Correlation-ID"] = correlation_id

            return response

        finally:
            # Always clear context to prevent leakage
            clear_request_context()
