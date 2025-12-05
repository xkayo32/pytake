"""
PyTake - WhatsApp Automation Platform
FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.database import close_db, init_db
from app.core.mongodb import mongodb_client
from app.core.redis import redis_client
from app.core.rate_limit import limiter, rate_limit_exceeded_handler

# Import routers
from app.api.v1.router import api_router


def run_migrations():
    """
    Run Alembic migrations automatically on startup
    """
    import os
    import sys
    
    try:
        # Get the backend directory
        app_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(app_dir)
        
        print("🔄 Running Alembic migrations...", flush=True)
        sys.stdout.flush()
        
        # Change to backend directory so alembic.ini can be found
        original_cwd = os.getcwd()
        os.chdir(backend_dir)
        
        try:
            from alembic.config import Config
            from alembic import command
            
            # Create alembic config - it will find alembic.ini in current directory
            alembic_cfg = Config("alembic.ini")
            
            # Run migrations
            command.upgrade(alembic_cfg, "head")
            print("✅ Alembic migrations completed successfully", flush=True)
            
        finally:
            os.chdir(original_cwd)
            
    except Exception as e:
        print(f"⚠️ Could not run migrations: {type(e).__name__}: {e}", flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    print("🚀 Starting PyTake...")

    # Initialize database connections
    try:
        # Run migrations first
        run_migrations()
        
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
    description="""
# PyTake - WhatsApp Automation Platform

Plataforma completa de automação de WhatsApp Business com múltiplas APIs:

## 🔌 APIs Disponíveis

### REST API (OpenAPI 3.0)
- **Swagger UI**: `/api/v1/docs`
- **ReDoc**: `/api/v1/redoc`
- **OpenAPI JSON**: `/api/v1/openapi.json`
- **Total de Endpoints**: 217 endpoints REST

### GraphQL API
- **Endpoint**: `/graphql`
- **GraphiQL IDE**: `/graphql` (desenvolvimento)
- **Total de Módulos**: 15 módulos completos
- **Documentação**: Ver [GRAPHQL_API.md](/.github/docs/GRAPHQL_API.md)

### WebSocket API (Socket.IO)
- **Endpoint**: `/socket.io`
- **Real-time**: Conversas, mensagens, status de agentes

## 📚 Recursos Principais

- **Multi-tenancy**: Isolamento completo por organização
- **Autenticação**: JWT (Bearer token)
- **Permissões**: Role-based access control (RBAC)
- **Rate Limiting**: Proteção contra abuso
- **Logs**: MongoDB para auditoria completa
- **Cache**: Redis para performance

## 🏗️ Arquitetura

- **Backend**: FastAPI + Python 3.11+
- **Banco de Dados**: PostgreSQL 15 (principal), Redis 7 (cache), MongoDB 7 (logs)
- **Real-time**: Socket.IO + WebSocket
- **APIs**: REST (OpenAPI) + GraphQL (Strawberry)

## 🔐 Autenticação

Todas as APIs (exceto endpoints públicos) requerem autenticação via JWT token:

```
Authorization: Bearer <your_jwt_token>
```

Obtenha seu token via:
- **REST**: `POST /api/v1/auth/login`
- **GraphQL**: `mutation { login(email: "...", password: "...") { access_token } }`

## 📖 Começando

1. Autentique-se para obter um token JWT
2. Use o token no header `Authorization` de todas as requisições
3. Explore os endpoints via Swagger UI ou GraphiQL
4. Consulte a documentação completa em `/docs`

## 🆘 Suporte

- **Documentação**: `/.github/docs/INDEX.md`
- **GitHub**: https://github.com/pytake/pytake
- **Email**: support@pytake.com
    """,
    lifespan=lifespan,
    docs_url=f"{settings.API_V1_PREFIX}/docs" if settings.DEBUG else None,
    redoc_url=f"{settings.API_V1_PREFIX}/redoc" if settings.DEBUG else None,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json" if settings.DEBUG else None,
    root_path=settings.API_ROOT_PATH,  # Support for reverse proxy paths like /prod, /staging
    redirect_slashes=False,  # Disable redirects to avoid CORS issues
    contact={
        "name": "PyTake Support",
        "email": "support@pytake.com",
        "url": "https://pytake.com/support"
    },
    license_info={
        "name": "Proprietary",
        "url": "https://pytake.com/license"
    },
    openapi_tags=[
        {"name": "Auth", "description": "Autenticação e autorização JWT"},
        {"name": "Organizations", "description": "Gerenciamento de organizações"},
        {"name": "Users", "description": "Gerenciamento de usuários e equipes"},
        {"name": "Departments", "description": "Departamentos organizacionais"},
        {"name": "Queues", "description": "Filas de atendimento"},
        {"name": "Contacts", "description": "Gerenciamento de contatos"},
        {"name": "Conversations", "description": "Conversas e mensagens"},
        {"name": "WhatsApp", "description": "Integração WhatsApp Business"},
        {"name": "Chatbots", "description": "Chatbots e flows de automação"},
        {"name": "Campaigns", "description": "Campanhas de mensagens em massa"},
        {"name": "Analytics", "description": "Métricas e relatórios"},
        {"name": "Flow Automations", "description": "Automações proativas de flows"},
        {"name": "Secrets", "description": "Armazenamento seguro de credenciais"},
        {"name": "AI Assistant", "description": "Assistente de AI para geração de flows"},
        {"name": "Notifications", "description": "Notificações e preferências"},
    ],
)

# ============================================
# RATE LIMITING CONFIGURATION
# ============================================

# Add rate limiter state to app
app.state.limiter = limiter
app.add_exception_handler(429, rate_limit_exceeded_handler)

# Configure limiter storage (using Redis)
try:
    from slowapi import _rate_limit_exceeded_handler
    limiter._storage_uri = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"
except Exception as e:
    print(f"⚠️ Warning: Could not configure rate limiter storage: {e}")


# ============================================
# MIDDLEWARE CONFIGURATION
# ============================================

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    # Allow specific origins (not wildcard when credentials=true)
    allow_origins=[
        # Local development
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        # Development environment
        "https://app-dev.pytake.net",
        "https://api-dev.pytake.net",
        # Staging environment
        "https://app-staging.pytake.net",
        "https://api-staging.pytake.net",
        # Production environment
        "https://app.pytake.net",
        "https://www.app.pytake.net",
        "https://api.pytake.net",
        "https://pytake.net",
        "https://www.pytake.net",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page", "X-Per-Page"],
)

# GZip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Custom CORS middleware to ensure headers are always present (including on errors)
@app.middleware("http")
async def cors_headers_middleware(request: Request, call_next):
    """Ensure CORS headers are present on all responses, including errors"""
    response = await call_next(request)
    
    # Add CORS headers if not already present
    if "access-control-allow-origin" not in response.headers:
        response.headers["access-control-allow-origin"] = "https://app-dev.pytake.net"
        response.headers["access-control-allow-credentials"] = "true"
        response.headers["access-control-allow-methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["access-control-allow-headers"] = "Authorization, Content-Type, X-Requested-With"
        response.headers["access-control-expose-headers"] = "X-Total-Count, X-Page, X-Per-Page"
    
    return response

# Trusted Host (only in production)
if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "*.pytake.com",
            "pytake.com",
            "*.pytake.net",
            "pytake.net",
            "localhost",
            "127.0.0.1",
            "backend",
        ],
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
# GRAPHQL
# ============================================

from strawberry.fastapi import GraphQLRouter
from app.graphql.schema import schema
from app.graphql.context import get_graphql_context

# Create GraphQL router
graphql_app = GraphQLRouter(
    schema,
    context_getter=get_graphql_context,
    graphiql=settings.DEBUG,  # Enable GraphiQL IDE in development
)

# Mount GraphQL endpoint
app.include_router(graphql_app, prefix="/graphql")

print(f"✅ GraphQL API mounted at /graphql")
if settings.DEBUG:
    print(f"📊 GraphiQL IDE available at /graphql")


# ============================================
# WEBSOCKET / SOCKET.IO
# ============================================

# Mount Socket.IO app
from app.websocket.manager import get_sio_app
import app.websocket.events as _  # Import to register event handlers (side effect only)

sio_asgi_app = get_sio_app()
app.mount("/socket.io", sio_asgi_app)

print("✅ WebSocket/Socket.IO mounted at /socket.io")


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
