# PyTake API

The main REST API server for the PyTake application, built with Actix-web.

## Features

- **RESTful API**: JSON-based API endpoints following REST conventions
- **Health Checks**: Comprehensive health check endpoints for monitoring
- **Database Integration**: Seamless integration with pytake-db for data persistence
- **Error Handling**: Centralized error handling with structured error responses
- **CORS Support**: Configurable CORS for frontend integration
- **Request Tracking**: Unique request ID generation for debugging
- **Security Headers**: Production-ready security headers
- **Logging**: Structured logging with configurable formats and levels
- **Configuration**: Environment-based configuration with validation

## Quick Start

1. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Run the Server**:
   ```bash
   cargo run --bin pytake-api
   ```

3. **Test the API**:
   ```bash
   curl http://localhost:8080/health
   ```

## Configuration

The API server is configured through environment variables. See `.env.example` for all available options.

### Required Variables

- `DATABASE_URL`: Database connection string

### Optional Variables

- `SERVER_HOST`: Server bind address (default: 127.0.0.1)
- `SERVER_PORT`: Server port (default: 8080)
- `LOG_LEVEL`: Logging level (default: info)
- `ENVIRONMENT`: Environment name (default: development)

## API Endpoints

### Health Checks

- `GET /health` - Basic health check (for load balancers)
- `GET /health/detailed` - Detailed health check with system status
- `GET /health/ready` - Readiness check (for Kubernetes)
- `GET /health/live` - Liveness check (for Kubernetes)

### API Information

- `GET /` - Root endpoint with API information
- `GET /api/v1/status` - API status and version
- `GET /api/v1/info` - Detailed system information
- `GET /api/v1/version` - Version information

### Development Endpoints (Debug builds only)

- `GET /dev/ping` - Simple ping endpoint
- `POST /dev/echo` - Echo request body
- `GET /dev/error` - Test error handling

## Development

### Building

```bash
cargo build --package pytake-api
```

### Testing

```bash
cargo test --package pytake-api
```

### Running in Development

```bash
RUST_LOG=debug cargo run --bin pytake-api
```

### Docker

Build the Docker image:

```bash
docker build -f docker/backend.Dockerfile -t pytake-api .
```

Run with Docker:

```bash
docker run -p 8080:8080 --env-file .env pytake-api
```

## Architecture

The API server follows a layered architecture:

- **Handlers**: HTTP request handlers in `src/handlers/`
- **Routes**: Route configuration in `src/routes.rs`
- **Middleware**: Custom middleware in `src/middleware/`
- **State**: Application state management in `src/state.rs`
- **Config**: Configuration management in `src/config.rs`

## Error Handling

All endpoints return structured error responses:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "request_id": "uuid-v4",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Security Features

- CORS configuration
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Request ID tracking
- Input validation
- Error sanitization (no internal details exposed)

## Monitoring

### Health Check Endpoints

The API provides several health check endpoints suitable for different monitoring scenarios:

- `/health` - Quick health check for load balancers
- `/health/detailed` - Comprehensive health check for monitoring systems
- `/health/ready` - Kubernetes readiness probe
- `/health/live` - Kubernetes liveness probe

### Logging

Structured logging with request IDs for debugging:

```json
{
  "level": "info",
  "message": "Request completed",
  "request_id": "uuid-v4",
  "method": "GET",
  "path": "/api/v1/status",
  "status": 200,
  "duration_ms": 15
}
```

## Contributing

1. Follow the existing code style
2. Add tests for new functionality
3. Update documentation
4. Ensure all tests pass: `cargo test --package pytake-api`

## Dependencies

- **actix-web**: Web framework
- **sea-orm**: Database ORM (via pytake-db)
- **serde**: Serialization
- **tracing**: Structured logging
- **uuid**: Request ID generation
- **chrono**: Time handling