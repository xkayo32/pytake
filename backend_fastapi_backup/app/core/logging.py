"""Professional logging system with MongoDB backend and structured JSON output.

This module provides:
- Unified logging infrastructure (Python logging + MongoDB)
- Request tracing (Request ID + Correlation ID)
- Structured JSON output
- Context propagation (multi-tenant aware)
- Async MongoDB persistence
"""

import asyncio
import contextvars
import json
import logging
import sys
import traceback
import uuid
from datetime import datetime, timezone
from logging import LogRecord
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.mongodb import (
    log_error,
    log_api_request,
    log_audit,
)


# Context variables for request tracing (async-safe)
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default=""
)
correlation_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default=""
)
organization_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "organization_id", default=""
)
user_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "user_id", default=""
)
conversation_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "conversation_id", default=""
)


class JSONFormatter(logging.Formatter):
    """Format log records as structured JSON for easy parsing and indexing."""

    def format(self, record: LogRecord) -> str:
        """Convert LogRecord to JSON with structured context."""
        try:
            log_obj = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "logger_name": record.name,
                "function_name": record.funcName,
                "line_number": record.lineno,
                "message": record.getMessage(),
                "context": {
                    "request_id": request_id_var.get(""),
                    "correlation_id": correlation_id_var.get(""),
                    "organization_id": organization_id_var.get(""),
                    "user_id": user_id_var.get(""),
                    "conversation_id": conversation_id_var.get(""),
                },
            }

            # Add exception info if present
            if record.exc_info:
                log_obj["exception"] = {
                    "type": record.exc_info[0].__name__,
                    "message": str(record.exc_info[1]),
                    "stacktrace": traceback.format_exception(*record.exc_info),
                }

            # Add extra fields from record
            if hasattr(record, "extra_fields"):
                log_obj["extra"] = record.extra_fields

            return json.dumps(log_obj, default=str)
        except Exception as e:
            return json.dumps(
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "level": "ERROR",
                    "logger_name": "logging_system",
                    "message": f"Error formatting log: {str(e)}",
                    "fallback_message": record.getMessage(),
                }
            )


class ContextFilter(logging.Filter):
    """Inject request context into all log records."""

    def filter(self, record: LogRecord) -> bool:
        """Add context variables to log record."""
        # Store context in record for JSONFormatter to access
        if not hasattr(record, "extra_fields"):
            record.extra_fields = {}

        # Only add context if we have context values
        context = {
            k: v
            for k, v in {
                "request_id": request_id_var.get(""),
                "correlation_id": correlation_id_var.get(""),
                "organization_id": organization_id_var.get(""),
                "user_id": user_id_var.get(""),
                "conversation_id": conversation_id_var.get(""),
            }.items()
            if v
        }

        if context:
            record.extra_fields.update(context)

        return True


class MongoDBHandler(logging.Handler):
    """Async handler that writes logs to MongoDB (fire-and-forget)."""

    def __init__(self, level: int = logging.NOTSET):
        """Initialize MongoDB handler."""
        super().__init__(level)
        self.formatter = JSONFormatter()

    def emit(self, record: LogRecord) -> None:
        """Write log record to MongoDB asynchronously (non-blocking)."""
        try:
            # Format the log record
            formatted = self.format(record)

            # Don't log health checks to reduce noise
            if "/health" in str(record.getMessage()):
                return

            # Create task to write to MongoDB (fire-and-forget)
            # This prevents logging from blocking the request
            asyncio.create_task(self._async_emit(record, formatted))

        except Exception:
            # Don't let logging errors break the app
            self.handleError(record)

    @staticmethod
    async def _async_emit(record: LogRecord, formatted: str) -> None:
        """Asynchronously write log to MongoDB."""
        try:
            log_data = json.loads(formatted)

            # Route to appropriate collection based on log level
            if record.levelno >= logging.CRITICAL:
                await log_error(
                    error_type=record.name,
                    error_message=log_data.get("message", ""),
                    severity="critical",
                    organization_id=organization_id_var.get(),
                    extra=log_data.get("context", {}),
                )
            elif record.levelno >= logging.ERROR:
                await log_error(
                    error_type=record.name,
                    error_message=log_data.get("message", ""),
                    severity="error",
                    organization_id=organization_id_var.get(),
                    extra=log_data.get("context", {}),
                )
            elif record.levelno >= logging.WARNING:
                # Log warnings as info but marked as warning
                await log_api_request(
                    method="LOG",
                    endpoint=f"warning/{record.name}",
                    status_code=299,  # Unofficial "warning" code
                    user_id=user_id_var.get(),
                    organization_id=organization_id_var.get(),
                    response_time_ms=0,
                    ip_address="",
                )
            elif record.levelno >= logging.INFO:
                # Log info events
                if record.name.startswith("app.api"):
                    await log_api_request(
                        method="LOG",
                        endpoint=f"info/{record.name}",
                        status_code=200,
                        user_id=user_id_var.get(),
                        organization_id=organization_id_var.get(),
                        response_time_ms=0,
                        ip_address="",
                    )
            # DEBUG level logs don't go to MongoDB (too high volume)

        except Exception:
            # Silently fail on logging errors - we never want logging to break the app
            pass


def configure_logging(
    log_level: Optional[str] = None,
    json_output: bool = True,
) -> None:
    """Configure Python logging system on app startup.

    Args:
        log_level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
                  Defaults to LOG_LEVEL from settings
        json_output: If True, output as JSON; if False, human-readable

    Example:
        configure_logging(log_level="INFO")
    """
    log_level = log_level or getattr(settings, "LOG_LEVEL", "DEBUG")
    log_level_int = getattr(logging, log_level.upper(), logging.DEBUG)

    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level_int)

    # Remove existing handlers
    root_logger.handlers.clear()

    # Stream handler (stdout)
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(log_level_int)

    # Add formatter
    if json_output:
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s [%(name)s] %(levelname)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    stream_handler.setFormatter(formatter)

    # Add context filter
    stream_handler.addFilter(ContextFilter())

    root_logger.addHandler(stream_handler)

    # MongoDB handler (only for ERROR and above in production)
    if log_level_int <= logging.WARNING or getattr(settings, "ENVIRONMENT", "development") == "development":
        mongodb_handler = MongoDBHandler(logging.WARNING)
        mongodb_handler.addFilter(ContextFilter())
        root_logger.addHandler(mongodb_handler)

    # Suppress noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.CRITICAL)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("starlette").setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """Get a configured logger for a module.

    Args:
        name: Logger name, typically __name__

    Returns:
        Configured logger instance

    Example:
        logger = get_logger(__name__)
        logger.info("User logged in", extra={"user_id": "..."})
    """
    logger = logging.getLogger(name)
    logger.addFilter(ContextFilter())
    return logger


def set_request_context(
    request_id: str = "",
    correlation_id: str = "",
    organization_id: str = "",
    user_id: str = "",
    conversation_id: str = "",
) -> None:
    """Set request context variables for log tracing.

    These values are automatically injected into all log records
    in the current async context.

    Args:
        request_id: HTTP request ID (UUID)
        correlation_id: Correlation ID for cross-service tracing
        organization_id: Multi-tenant organization ID
        user_id: Authenticated user ID
        conversation_id: Active conversation ID

    Example:
        set_request_context(
            request_id=str(uuid.uuid4()),
            correlation_id=request.headers.get("X-Correlation-ID", str(uuid.uuid4())),
            organization_id=current_user.organization_id,
            user_id=current_user.id,
        )
    """
    if request_id:
        request_id_var.set(request_id)
    if correlation_id:
        correlation_id_var.set(correlation_id)
    if organization_id:
        organization_id_var.set(organization_id)
    if user_id:
        user_id_var.set(user_id)
    if conversation_id:
        conversation_id_var.set(conversation_id)


def clear_request_context() -> None:
    """Clear all request context variables.

    Call this at the end of each request to prevent context leakage.
    """
    request_id_var.set("")
    correlation_id_var.set("")
    organization_id_var.set("")
    user_id_var.set("")
    conversation_id_var.set("")


def get_request_context() -> Dict[str, str]:
    """Get current request context for debugging.

    Returns:
        Dictionary with current request context values
    """
    return {
        "request_id": request_id_var.get(""),
        "correlation_id": correlation_id_var.get(""),
        "organization_id": organization_id_var.get(""),
        "user_id": user_id_var.get(""),
        "conversation_id": conversation_id_var.get(""),
    }


class LogContext:
    """Context manager for tracking log events with metrics.

    Example:
        with LogContext("flow_execution") as ctx:
            await execute_flow(conversation)
            ctx.add_metric("nodes_executed", 5)
            ctx.add_metric("execution_time_ms", 234.5)
            # Logs on exit with metrics
    """

    def __init__(self, event_name: str, logger: Optional[logging.Logger] = None):
        """Initialize log context.

        Args:
            event_name: Name of the event being tracked
            logger: Logger to use (defaults to root logger)
        """
        self.event_name = event_name
        self.logger = logger or get_logger("app.core.logging")
        self.metrics: Dict[str, Any] = {}
        self.start_time = datetime.now(timezone.utc)

    def add_metric(self, key: str, value: Any) -> None:
        """Add a metric to log on exit.

        Args:
            key: Metric name
            value: Metric value
        """
        self.metrics[key] = value

    def __enter__(self) -> "LogContext":
        """Log event start."""
        self.logger.debug(f"{self.event_name}_started")
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Log event completion with metrics and duration."""
        duration_ms = (
            (datetime.now(timezone.utc) - self.start_time).total_seconds() * 1000
        )
        self.metrics["duration_ms"] = duration_ms

        if exc_type:
            self.logger.error(
                f"{self.event_name}_failed",
                exc_info=(exc_type, exc_val, exc_tb),
                extra={"metrics": self.metrics},
            )
        else:
            self.logger.debug(
                f"{self.event_name}_completed",
                extra={"metrics": self.metrics},
            )
