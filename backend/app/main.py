"""
PyTake - WhatsApp Automation Platform
FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.database import close_db, init_db
from app.core.mongodb import mongodb_client
from app.core.redis import redis_client

# Import routers
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    print("🚀 Starting PyTake...")

    # Initialize database connections
    try:
        # PostgreSQL
        await init_db()
        print("✅ PostgreSQL connected")

        # Redis
        await redis_client.connect()
        print("✅ Redis connected")

        # MongoDB
        await mongodb_client.connect()
        print("✅ MongoDB connected")

        print(f"🎉 PyTake v{settings.APP_VERSION} started successfully!")
        print(f"📍 Environment: {settings.ENVIRONMENT}")
        print(f"🔧 Debug mode: {settings.DEBUG}")

    except Exception as e:
        print(f"❌ Error during startup: {e}")
        raise

    yield

    # Shutdown
    print("👋 Shutting down PyTake...")

    try:
        await close_db()
        print("✅ PostgreSQL disconnected")

        await redis_client.disconnect()
        print("✅ Redis disconnected")

        await mongodb_client.disconnect()
        print("✅ MongoDB disconnected")

        print("✅ PyTake shutdown complete")

    except Exception as e:
        print(f"❌ Error during shutdown: {e}")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="WhatsApp Automation Platform - Official API Documentation",
    lifespan=lifespan,
    docs_url=f"{settings.API_V1_PREFIX}/docs" if settings.DEBUG else None,
    redoc_url=f"{settings.API_V1_PREFIX}/redoc" if settings.DEBUG else None,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json" if settings.DEBUG else None,
)


# ============================================
# MIDDLEWARE CONFIGURATION
# ============================================

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page", "X-Per-Page"],
)

# GZip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Trusted Host (only in production)
if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.pytake.com", "pytake.com"],
    )


# ============================================
# CUSTOM MIDDLEWARE
# ============================================

from fastapi import Request
from time import time
from app.core.mongodb import log_api_request
import traceback


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all API requests to MongoDB"""
    start_time = time()

    # Process request
    response = await call_next(request)

    # Calculate response time
    response_time_ms = (time() - start_time) * 1000

    # Extract user info (will be set by auth middleware)
    organization_id = getattr(request.state, "organization_id", None)
    user_id = getattr(request.state, "user_id", None)

    # Log to MongoDB (fire and forget)
    try:
        await log_api_request(
            organization_id=organization_id,
            user_id=user_id,
            method=request.method,
            endpoint=str(request.url.path),
            status_code=response.status_code,
            response_time_ms=response_time_ms,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except Exception as e:
        # Don't fail request if logging fails
        print(f"Error logging request: {e}")

    return response


@app.middleware("http")
async def error_handler(request: Request, call_next):
    """Global error handler"""
    try:
        return await call_next(request)
    except Exception as e:
        from app.core.mongodb import log_error

        # Log error
        try:
            await log_error(
                organization_id=getattr(request.state, "organization_id", None),
                error_type=type(e).__name__,
                error_message=str(e),
                severity="error",
                stack_trace=traceback.format_exc(),
                context={
                    "method": request.method,
                    "endpoint": str(request.url.path),
                    "user_id": getattr(request.state, "user_id", None),
                },
            )
        except:
            pass

        # Re-raise to let FastAPI handle it
        raise


# ============================================
# ROUTES
# ============================================

@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "healthy",
        "docs": f"{settings.API_V1_PREFIX}/docs" if settings.DEBUG else None,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    from app.core.database import async_engine
    from sqlalchemy import text

    health_status = {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "services": {},
    }

    # Check PostgreSQL
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health_status["services"]["postgresql"] = "healthy"
    except Exception as e:
        health_status["services"]["postgresql"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # Check Redis
    try:
        await redis_client.client.ping()
        health_status["services"]["redis"] = "healthy"
    except Exception as e:
        health_status["services"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # Check MongoDB
    try:
        await mongodb_client.client.admin.command("ping")
        health_status["services"]["mongodb"] = "healthy"
    except Exception as e:
        health_status["services"]["mongodb"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    return health_status


@app.get(f"{settings.API_V1_PREFIX}/ping")
async def ping():
    """Simple ping endpoint"""
    return {"message": "pong"}


# ============================================
# API ROUTERS (will be added as we create endpoints)
# ============================================

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# ============================================
# EXCEPTION HANDLERS
# ============================================

from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "type": "http_error",
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": 422,
                "message": "Validation error",
                "type": "validation_error",
                "details": exc.errors(),
            }
        },
    )


@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": 422,
                "message": "Validation error",
                "type": "validation_error",
                "details": exc.errors(),
            }
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions"""
    # Log error
    print(f"Unhandled exception: {exc}")
    print(traceback.format_exc())

    # Don't expose internal errors in production
    if settings.is_production:
        message = "An internal error occurred"
    else:
        message = str(exc)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": 500,
                "message": message,
                "type": "internal_error",
            }
        },
    )


# ============================================
# STARTUP MESSAGE
# ============================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        workers=1 if settings.RELOAD else settings.WORKERS,
        log_level=settings.LOG_LEVEL.lower(),
    )
