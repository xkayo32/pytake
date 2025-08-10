# PyTake Testing Guide

This document provides comprehensive guidance on testing practices for the PyTake WhatsApp Business API platform.

## Table of Contents

1. [Overview](#overview)
2. [Testing Philosophy](#testing-philosophy)
3. [Test Categories](#test-categories)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Test Environment Setup](#test-environment-setup)
7. [Continuous Integration](#continuous-integration)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

PyTake uses a comprehensive testing strategy that includes:

- **Unit Tests**: Test individual components and functions in isolation
- **Integration Tests**: Test interactions between components and external services
- **End-to-End Tests**: Test complete user workflows
- **Performance Tests**: Ensure system performance under load
- **Security Tests**: Validate security measures and input validation

## Testing Philosophy

Our testing approach follows these principles:

1. **Test-Driven Development (TDD)**: Write tests before implementation when possible
2. **Fast Feedback**: Unit tests run quickly to provide immediate feedback
3. **Realistic Testing**: Integration tests use real or realistic test environments
4. **Comprehensive Coverage**: Aim for high test coverage on critical paths
5. **Maintainable Tests**: Tests are easy to understand and maintain
6. **Isolation**: Tests don't depend on external services unless necessary

## Test Categories

### 1. Unit Tests

Located in: `backend/simple_api/tests/`

**Purpose**: Test individual functions and components in isolation.

**Key Features**:
- Fast execution (< 1 second each)
- No external dependencies
- Use mocking for external services
- High coverage of business logic

**Test Files**:
- `auth_tests.rs` - Authentication and authorization logic
- `whatsapp_tests.rs` - WhatsApp message handling and webhooks
- `redis_tests.rs` - Redis caching functionality
- `rate_limiting_tests.rs` - Rate limiting algorithms
- `common.rs` - Test utilities and fixtures

### 2. Integration Tests

Located in: `backend/simple_api/tests/integration_tests.rs`

**Purpose**: Test component interactions and API endpoints.

**Key Features**:
- Test complete request/response cycles
- Use test databases and Redis instances
- Mock external APIs (WhatsApp, ERPs)
- Validate middleware and error handling

### 3. End-to-End Tests

**Purpose**: Test complete user journeys and workflows.

**Scenarios Tested**:
- User registration and authentication
- WhatsApp message sending and receiving
- Conversation management
- Agent workflows
- Administrative tasks

### 4. Performance Tests

**Purpose**: Ensure system performance under load.

**Test Types**:
- Load testing (normal usage patterns)
- Stress testing (peak load conditions)
- Spike testing (sudden load increases)
- Volume testing (large data sets)

## Running Tests

### Prerequisites

1. **Rust toolchain** (stable)
2. **Docker** and **Docker Compose**
3. **PostgreSQL 15+** (for integration tests)
4. **Redis 7+** (for caching tests)

### Environment Setup

```bash
# Copy environment configuration
cp .env.development .env.test

# Start test services
docker-compose -f docker-compose.test.yml up -d postgres redis

# Run database migrations
cd backend
sea-orm-cli migrate up --database-url postgresql://pytake:pytake_test@localhost:5432/pytake_test
```

### Running All Tests

```bash
cd backend

# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run tests in parallel
cargo test --jobs 4
```

### Running Specific Test Categories

```bash
# Unit tests only
cargo test --lib

# Integration tests only
cargo test --test integration_tests

# Specific test module
cargo test auth_tests

# Specific test function
cargo test test_login_with_valid_credentials

# Tests matching a pattern
cargo test whatsapp
```

### Running Tests by Environment

```bash
# Skip external API tests
SKIP_EXTERNAL_TESTS=1 cargo test

# Skip database tests
SKIP_DB_TESTS=1 cargo test

# Skip Redis tests
SKIP_REDIS_TESTS=1 cargo test

# Skip integration tests
SKIP_INTEGRATION_TESTS=1 cargo test

# Run only fast tests
cargo test --lib --bins
```

### Performance Tests

```bash
# Run performance tests
cargo test --release -- --ignored performance

# Run specific performance test
cargo test test_concurrent_requests --release
```

## Writing Tests

### Test Structure

Follow the AAA (Arrange-Act-Assert) pattern:

```rust
#[tokio::test]
async fn test_function_name() {
    // Arrange
    let test_data = setup_test_data();
    let service = create_test_service();
    
    // Act
    let result = service.perform_action(test_data).await;
    
    // Assert
    assert!(result.is_ok());
    assert_eq!(result.unwrap().status, "expected_status");
}
```

### Using Test Utilities

```rust
use crate::common::*;

#[tokio::test]
async fn test_with_utilities() {
    // Use test configuration
    let config = TestConfig::new();
    
    // Generate test data
    let email = TestDataGenerator::user_email();
    let phone = TestDataGenerator::phone_number();
    
    // Setup cleanup
    let _cleanup = TestCleanup::new();
    
    // Use mock services
    let mock_server = MockServer::new().await;
    mock_server.setup_whatsapp_mocks().await;
    
    // Your test logic here
}
```

### Testing with External Services

#### Mock Services (Unit Tests)

```rust
#[tokio::test]
async fn test_with_mock_whatsapp() {
    let mock_service = MockWhatsAppService::new();
    let message = TestDataGenerator::whatsapp_message();
    
    let result = mock_service.send_message(message).await;
    assert!(result.is_ok());
}
```

#### Real Services (Integration Tests)

```rust
#[tokio::test]
#[serial]
async fn test_with_real_database() {
    if should_skip_db_tests() {
        return;
    }
    
    let test_db = TestDatabase::connection().await;
    // Use real database connection
}
```

### Error Testing

```rust
#[tokio::test]
async fn test_error_handling() {
    let service = create_failing_service();
    
    let result = service.perform_action().await;
    
    assert!(result.is_err());
    match result.unwrap_err() {
        ServiceError::ValidationError(msg) => {
            assert_eq!(msg, "Expected error message");
        }
        _ => panic!("Unexpected error type"),
    }
}
```

### Performance Testing

```rust
#[tokio::test]
async fn test_performance() {
    let _perf_test = PerformanceTest::new("operation_name");
    
    // Perform operation
    let result = perform_operation().await;
    
    assert!(result.is_ok());
    _perf_test.assert_faster_than(Duration::from_millis(100));
}
```

## Test Environment Setup

### Environment Variables

Create `.env.test` file:

```env
# Test Database
TEST_DATABASE_URL=postgresql://pytake:pytake_test@localhost:5432/pytake_test
DATABASE_URL=postgresql://pytake:pytake_test@localhost:5432/pytake_test

# Test Redis
REDIS_URL=redis://localhost:6379

# Test Configuration
JWT_SECRET=test_jwt_secret_for_testing_only
TEST_WHATSAPP_PHONE_ID=test_phone_id
TEST_WHATSAPP_TOKEN=test_token
TEST_PHONE_NUMBER=+1234567890

# Test Control Flags
SKIP_EXTERNAL_TESTS=false
SKIP_DB_TESTS=false
SKIP_REDIS_TESTS=false
SKIP_INTEGRATION_TESTS=false
ENABLE_REAL_EXTERNAL_CALLS=false
```

### Test Database Setup

```bash
# Create test database
createdb pytake_test

# Run migrations
sea-orm-cli migrate up --database-url postgresql://pytake:pytake_test@localhost:5432/pytake_test

# Seed test data (if needed)
psql pytake_test < test_data.sql
```

### Docker Test Environment

Use `docker-compose.test.yml` for isolated test services:

```yaml
version: '3.8'
services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_DB: pytake_test
      POSTGRES_USER: pytake
      POSTGRES_PASSWORD: pytake_test
    ports:
      - "5433:5432"
    
  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
```

## Continuous Integration

### GitHub Actions Workflow

Our CI pipeline includes:

1. **Lint and Format Check**
   - `cargo fmt --check`
   - `cargo clippy --all-targets --all-features -- -D warnings`

2. **Security Audit**
   - `cargo audit`

3. **Test Suite**
   - Unit tests
   - Integration tests
   - Coverage reporting

4. **Docker Build**
   - Build and test Docker image

5. **Performance Tests**
   - Run on main branch pushes

### Coverage Reporting

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --verbose --all-features --workspace \
  --exclude-files "**/tests/*" \
  --exclude-files "target/*" \
  --timeout 120 \
  --out xml \
  --output-dir coverage/

# Generate HTML report
cargo tarpaulin --out html --output-dir coverage-html/
```

### Coverage Goals

- **Critical Paths**: 90%+ coverage
- **Business Logic**: 85%+ coverage
- **Overall Project**: 70%+ coverage
- **New Code**: 80%+ coverage

## Best Practices

### Test Naming

Use descriptive test names that explain:
- What is being tested
- Under what conditions
- What the expected outcome is

```rust
// Good
#[tokio::test]
async fn test_login_with_valid_credentials_returns_jwt_token() { }

// Bad
#[tokio::test]
async fn test_login() { }
```

### Test Organization

```rust
#[cfg(test)]
mod auth_service_tests {
    use super::*;

    mod login_tests {
        use super::*;
        
        #[tokio::test]
        async fn test_successful_login() { }
        
        #[tokio::test]
        async fn test_invalid_credentials() { }
    }
    
    mod token_tests {
        use super::*;
        
        #[tokio::test]
        async fn test_token_generation() { }
        
        #[tokio::test]
        async fn test_token_validation() { }
    }
}
```

### Data Management

1. **Use fixtures for complex test data**
2. **Generate dynamic test data to avoid conflicts**
3. **Clean up test data after tests**
4. **Use transactions for database tests when possible**

```rust
// Good: Dynamic test data
let user_email = TestDataGenerator::user_email();

// Bad: Static test data
let user_email = "test@example.com"; // May conflict with other tests
```

### Mocking Guidelines

1. **Mock external services in unit tests**
2. **Use real services in integration tests when possible**
3. **Mock expensive operations**
4. **Verify mock interactions**

```rust
// Mock external HTTP calls
let mock_server = MockServer::new().await;
mock_server.setup_whatsapp_mocks().await;

// Verify interactions
let sent_messages = mock_service.get_sent_messages();
assert_eq!(sent_messages.len(), 1);
```

### Async Testing

1. **Use `#[tokio::test]` for async tests**
2. **Use `serial_test::serial` for tests that can't run in parallel**
3. **Handle timeouts appropriately**

```rust
#[tokio::test]
#[serial]  // For tests that modify shared state
async fn test_async_operation() {
    // Test implementation
}
```

### Error Testing

1. **Test both success and failure cases**
2. **Test edge cases and boundary conditions**
3. **Verify error messages and types**

```rust
#[tokio::test]
async fn test_validation_errors() {
    let invalid_input = create_invalid_input();
    
    let result = service.validate_input(invalid_input).await;
    
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), ValidationError::InvalidFormat));
}
```

## Troubleshooting

### Common Issues

#### Test Database Connection Failed
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check database exists
psql -h localhost -p 5432 -l | grep pytake_test

# Create database if missing
createdb -h localhost -p 5432 pytake_test
```

#### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping

# Check Redis configuration
redis-cli config get "*"
```

#### Tests Failing Intermittently
1. Use `#[serial]` for tests that can't run in parallel
2. Clean up test data properly
3. Use unique test data for each test

#### Docker Test Services Not Starting
```bash
# Check Docker status
docker-compose -f docker-compose.test.yml ps

# View logs
docker-compose -f docker-compose.test.yml logs

# Restart services
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d
```

### Debugging Tests

#### Enable Debug Logging
```bash
RUST_LOG=debug cargo test -- --nocapture
```

#### Run Single Test with Output
```bash
cargo test test_specific_function -- --nocapture
```

#### Use Test Debugger
```rust
#[tokio::test]
async fn test_with_debugging() {
    dbg!(&test_data);  // Print debug info
    
    let result = service.operation(test_data).await;
    
    eprintln!("Result: {:?}", result);  // Print to stderr
    
    assert!(result.is_ok());
}
```

### Performance Debugging

#### Identify Slow Tests
```bash
# Run with timing
cargo test -- --report-time

# Run specific test with timing
cargo test slow_test -- --report-time
```

#### Profile Test Performance
```bash
# Run with profiling (requires cargo-flamegraph)
cargo flamegraph --test integration_tests -- test_name
```

### Coverage Issues

#### Exclude Generated Code
```rust
#[cfg(not(tarpaulin_include))]
mod generated {
    // Generated code that shouldn't be covered
}
```

#### Include Test-Only Code
```rust
#[cfg(test)]
pub mod test_utils {
    // Test utilities that need coverage
}
```

## Contributing to Tests

### Adding New Tests

1. **Identify test category** (unit, integration, e2e)
2. **Choose appropriate test file** or create new one
3. **Follow naming conventions**
4. **Use test utilities from `common.rs`**
5. **Add documentation for complex tests**

### Test Code Reviews

When reviewing test code, check for:

1. **Test completeness**: Are all scenarios covered?
2. **Test clarity**: Is it clear what the test does?
3. **Test reliability**: Will the test pass consistently?
4. **Test performance**: Does the test run efficiently?
5. **Test maintenance**: Is the test easy to update?

### Updating Test Documentation

When adding new test utilities or patterns:

1. **Update this documentation**
2. **Add examples to `common.rs`**
3. **Update CI configuration if needed**
4. **Notify team of new testing patterns**

## Resources

- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Actix Web Testing](https://actix.rs/docs/testing/)
- [tokio Testing](https://tokio.rs/tokio/topics/testing)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)

For questions or suggestions about testing practices, please create an issue or discuss in the team chat.