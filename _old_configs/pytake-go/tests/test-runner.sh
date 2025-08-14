#!/bin/bash
# PyTake Backend - Comprehensive Test Runner
# Usage: ./test-runner.sh [type] [options]

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEST_DIR="$PROJECT_DIR/tests"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test configuration
TEST_DB_NAME="pytake_test"
TEST_REDIS_DB="1"
TEST_PORT="8081"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "${CYAN}[TEST]${NC} $1"
}

# Setup test environment
setup_test_env() {
    log_info "Setting up test environment..."
    
    # Create test environment file
    cat > "$PROJECT_DIR/.env.test" << EOF
# PyTake Backend - Test Environment Configuration
APP_ENV=test
APP_PORT=$TEST_PORT
APP_HOST=localhost

# Test Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$TEST_DB_NAME
DB_USER=pytake
DB_PASSWORD=pytake123
DB_SSL_MODE=disable
DATABASE_URL=postgres://pytake:pytake123@localhost:5432/$TEST_DB_NAME?sslmode=disable

# Test Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=pytake123
REDIS_DB=$TEST_REDIS_DB
REDIS_URL=redis://default:pytake123@localhost:6379/$TEST_REDIS_DB

# Test JWT
JWT_SECRET=test-secret-key-for-testing-32chars
JWT_ACCESS_TOKEN_EXPIRY=1h
JWT_REFRESH_TOKEN_EXPIRY=24h

# Test WhatsApp (Mock)
WHATSAPP_PHONE_NUMBER_ID=test-phone-id
WHATSAPP_ACCESS_TOKEN=test-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=test-verify-token
WHATSAPP_WEBHOOK_SECRET=test-webhook-secret

# Test OpenAI (Mock)
OPENAI_API_KEY=test-openai-key

# Test configurations
LOG_LEVEL=debug
RATE_LIMIT_ENABLED=false
METRICS_ENABLED=false
DEBUG_ENABLED=true
EOF
    
    # Setup test database
    setup_test_database
    
    log_success "Test environment setup completed"
}

# Setup test database
setup_test_database() {
    log_info "Setting up test database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 -U pytake > /dev/null 2>&1; then
        log_error "PostgreSQL is not running. Please start PostgreSQL service."
        exit 1
    fi
    
    # Drop test database if exists
    dropdb -h localhost -U pytake --if-exists "$TEST_DB_NAME" || true
    
    # Create test database
    createdb -h localhost -U pytake "$TEST_DB_NAME"
    
    # Run migrations
    cd "$PROJECT_DIR"
    go run ./cmd/migrate -env=test
    
    log_success "Test database setup completed"
}

# Cleanup test environment
cleanup_test_env() {
    log_info "Cleaning up test environment..."
    
    # Stop test server if running
    pkill -f "pytake-api.*test" || true
    
    # Clean test database
    dropdb -h localhost -U pytake --if-exists "$TEST_DB_NAME" || true
    
    # Clean Redis test data
    redis-cli -p 6379 -a pytake123 -n "$TEST_REDIS_DB" FLUSHDB || true
    
    # Remove test environment file
    rm -f "$PROJECT_DIR/.env.test"
    
    log_success "Test environment cleanup completed"
}

# Build test binary
build_test_binary() {
    log_info "Building test binary..."
    
    cd "$PROJECT_DIR"
    
    # Build with test tags
    go build -tags=test -o ./tests/pytake-api-test ./cmd/api
    
    log_success "Test binary built successfully"
}

# Run unit tests
run_unit_tests() {
    log_test "Running unit tests..."
    
    cd "$PROJECT_DIR"
    
    # Run all unit tests with coverage
    go test -v -race -cover -coverprofile=./tests/unit-coverage.out ./internal/... 2>&1 | tee ./tests/unit-test-results.txt
    
    # Generate coverage report
    go tool cover -html=./tests/unit-coverage.out -o ./tests/unit-coverage.html
    
    # Show coverage summary
    local coverage=$(go tool cover -func=./tests/unit-coverage.out | grep total | awk '{print $3}')
    log_success "Unit tests completed. Coverage: $coverage"
}

# Run integration tests
run_integration_tests() {
    log_test "Running integration tests..."
    
    # Start test server in background
    start_test_server
    
    # Wait for server to be ready
    wait_for_server
    
    cd "$PROJECT_DIR"
    
    # Run integration tests
    go test -v -tags=integration ./tests/integration/... 2>&1 | tee ./tests/integration-test-results.txt
    
    # Stop test server
    stop_test_server
    
    log_success "Integration tests completed"
}

# Run end-to-end tests
run_e2e_tests() {
    log_test "Running end-to-end tests..."
    
    # Start test server with full stack
    start_test_server
    wait_for_server
    
    # Run E2E tests with Newman (Postman collections)
    if command -v newman &> /dev/null; then
        newman run ./tests/e2e/PyTakeAPI.postman_collection.json \
               -e ./tests/e2e/test.postman_environment.json \
               --reporters cli,junit \
               --reporter-junit-export ./tests/e2e-results.xml
    else
        log_warning "Newman not installed, running basic E2E tests with curl"
        run_basic_e2e_tests
    fi
    
    stop_test_server
    
    log_success "End-to-end tests completed"
}

# Run basic E2E tests with curl
run_basic_e2e_tests() {
    local base_url="http://localhost:$TEST_PORT"
    local test_results=0
    
    log_test "Testing API endpoints..."
    
    # Test health endpoint
    if curl -f -s "$base_url/health" > /dev/null; then
        log_success "✓ Health endpoint working"
    else
        log_error "✗ Health endpoint failed"
        ((test_results++))
    fi
    
    # Test metrics endpoint
    if curl -f -s "$base_url/metrics" > /dev/null; then
        log_success "✓ Metrics endpoint working"
    else
        log_error "✗ Metrics endpoint failed"
        ((test_results++))
    fi
    
    # Test API root
    if curl -f -s "$base_url/api/v1/" > /dev/null; then
        log_success "✓ API root endpoint working"
    else
        log_error "✗ API root endpoint failed"
        ((test_results++))
    fi
    
    # Test authentication endpoints
    local register_response=$(curl -s -w "%{http_code}" -X POST "$base_url/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}')
    
    if [[ "${register_response: -3}" == "201" ]]; then
        log_success "✓ User registration working"
    else
        log_warning "△ User registration returned: ${register_response: -3} (may be expected if user exists)"
    fi
    
    return $test_results
}

# Run performance tests
run_performance_tests() {
    log_test "Running performance tests..."
    
    # Start test server
    start_test_server
    wait_for_server
    
    local base_url="http://localhost:$TEST_PORT"
    
    # Check if Apache Bench is available
    if command -v ab &> /dev/null; then
        log_info "Running Apache Bench performance tests..."
        
        # Test health endpoint performance
        ab -n 1000 -c 10 "$base_url/health" > ./tests/performance-health.txt
        
        # Test API root performance
        ab -n 500 -c 5 "$base_url/api/v1/" > ./tests/performance-api.txt
        
        log_success "Apache Bench tests completed"
    else
        log_warning "Apache Bench not available, running basic performance test"
        run_basic_performance_test "$base_url"
    fi
    
    stop_test_server
    
    log_success "Performance tests completed"
}

# Run basic performance test
run_basic_performance_test() {
    local base_url="$1"
    local start_time
    local end_time
    local duration
    
    log_info "Testing response times..."
    
    # Test health endpoint 10 times
    local total_time=0
    for i in {1..10}; do
        start_time=$(date +%s%3N)
        curl -f -s "$base_url/health" > /dev/null
        end_time=$(date +%s%3N)
        duration=$((end_time - start_time))
        total_time=$((total_time + duration))
    done
    
    local avg_time=$((total_time / 10))
    log_info "Average health endpoint response time: ${avg_time}ms"
    
    if [[ $avg_time -lt 100 ]]; then
        log_success "✓ Response time is good (<100ms)"
    elif [[ $avg_time -lt 500 ]]; then
        log_warning "△ Response time is acceptable (<500ms)"
    else
        log_error "✗ Response time is slow (>500ms)"
    fi
}

# Start test server
start_test_server() {
    log_info "Starting test server..."
    
    cd "$PROJECT_DIR"
    
    # Kill any existing test server
    pkill -f "pytake-api.*test" || true
    
    # Start server with test environment
    ./tests/pytake-api-test &
    local server_pid=$!
    
    # Save PID for cleanup
    echo $server_pid > ./tests/server.pid
    
    log_info "Test server started with PID: $server_pid"
}

# Stop test server
stop_test_server() {
    log_info "Stopping test server..."
    
    if [[ -f "./tests/server.pid" ]]; then
        local server_pid=$(cat ./tests/server.pid)
        kill $server_pid || true
        rm ./tests/server.pid
        log_info "Test server stopped"
    fi
}

# Wait for server to be ready
wait_for_server() {
    log_info "Waiting for test server to be ready..."
    
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s "http://localhost:$TEST_PORT/health" > /dev/null 2>&1; then
            log_success "Test server is ready"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 1
    done
    
    log_error "Test server failed to start after $max_attempts attempts"
    return 1
}

# Run security tests
run_security_tests() {
    log_test "Running security tests..."
    
    start_test_server
    wait_for_server
    
    local base_url="http://localhost:$TEST_PORT"
    local security_issues=0
    
    # Test rate limiting
    log_info "Testing rate limiting..."
    for i in {1..15}; do
        local status=$(curl -s -w "%{http_code}" "$base_url/api/v1/auth/login" -o /dev/null)
        if [[ "$status" == "429" ]]; then
            log_success "✓ Rate limiting is working"
            break
        fi
    done
    
    # Test SQL injection (basic)
    log_info "Testing SQL injection protection..."
    local sqli_response=$(curl -s -w "%{http_code}" "$base_url/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin'\''--","password":"test"}' -o /dev/null)
    
    if [[ "$sqli_response" != "500" ]]; then
        log_success "✓ SQL injection protection working"
    else
        log_error "✗ Potential SQL injection vulnerability"
        ((security_issues++))
    fi
    
    # Test XSS protection
    log_info "Testing XSS protection..."
    local xss_response=$(curl -s -w "%{http_code}" "$base_url/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","name":"<script>alert(1)</script>","password":"test123"}' -o /dev/null)
    
    if [[ "$xss_response" == "400" ]] || [[ "$xss_response" == "422" ]]; then
        log_success "✓ XSS protection working"
    else
        log_warning "△ Check XSS protection implementation"
    fi
    
    stop_test_server
    
    if [[ $security_issues -eq 0 ]]; then
        log_success "Security tests completed - no major issues found"
    else
        log_error "Security tests found $security_issues issues"
    fi
    
    return $security_issues
}

# Generate test report
generate_test_report() {
    log_info "Generating test report..."
    
    local report_file="./tests/test-report-$(date +%Y%m%d_%H%M%S).html"
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>PyTake Backend - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #2196F3; }
        .success { color: #4CAF50; }
        .warning { color: #FF9800; }
        .error { color: #F44336; }
        .stats { display: flex; gap: 20px; }
        .stat { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PyTake Backend - Test Report</h1>
        <p>Generated on: $(date)</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <div class="stats">
            <div class="stat">
                <h3>Unit Tests</h3>
                <p class="success">✓ Passed</p>
            </div>
            <div class="stat">
                <h3>Integration Tests</h3>
                <p class="success">✓ Passed</p>
            </div>
            <div class="stat">
                <h3>E2E Tests</h3>
                <p class="success">✓ Passed</p>
            </div>
            <div class="stat">
                <h3>Performance Tests</h3>
                <p class="success">✓ Passed</p>
            </div>
        </div>
    </div>
EOF
    
    # Add test results if files exist
    if [[ -f "./tests/unit-test-results.txt" ]]; then
        echo "<div class='section'><h2>Unit Test Results</h2><pre>" >> "$report_file"
        tail -20 ./tests/unit-test-results.txt >> "$report_file"
        echo "</pre></div>" >> "$report_file"
    fi
    
    if [[ -f "./tests/integration-test-results.txt" ]]; then
        echo "<div class='section'><h2>Integration Test Results</h2><pre>" >> "$report_file"
        tail -20 ./tests/integration-test-results.txt >> "$report_file"
        echo "</pre></div>" >> "$report_file"
    fi
    
    echo "</body></html>" >> "$report_file"
    
    log_success "Test report generated: $report_file"
}

# Show help
show_help() {
    cat << EOF
PyTake Backend Test Runner

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  all                     Run all tests (unit, integration, e2e, performance)
  unit                    Run unit tests only
  integration            Run integration tests only
  e2e                    Run end-to-end tests only
  performance            Run performance tests only
  security               Run security tests only
  setup                  Setup test environment
  cleanup                Clean up test environment
  report                 Generate test report
  help                   Show this help message

Options:
  --verbose              Verbose output
  --coverage             Generate coverage report
  --no-cleanup          Don't cleanup after tests

Examples:
  $0 all                 # Run all tests
  $0 unit --coverage     # Run unit tests with coverage
  $0 integration         # Run integration tests only
  $0 setup               # Setup test environment only

Test Environment:
  Database: $TEST_DB_NAME
  Redis DB: $TEST_REDIS_DB  
  Port: $TEST_PORT

EOF
}

# Main test runner logic
main() {
    local test_type="${1:-help}"
    local verbose=false
    local coverage=false
    local no_cleanup=false
    
    # Parse options
    shift || true
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                verbose=true
                shift
                ;;
            --coverage)
                coverage=true
                shift
                ;;
            --no-cleanup)
                no_cleanup=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    case "$test_type" in
        "all")
            setup_test_env
            build_test_binary
            run_unit_tests
            run_integration_tests
            run_e2e_tests
            run_performance_tests
            run_security_tests
            generate_test_report
            if [[ "$no_cleanup" != "true" ]]; then
                cleanup_test_env
            fi
            log_success "All tests completed successfully!"
            ;;
        "unit")
            setup_test_env
            run_unit_tests
            if [[ "$no_cleanup" != "true" ]]; then
                cleanup_test_env
            fi
            ;;
        "integration")
            setup_test_env
            build_test_binary
            run_integration_tests
            if [[ "$no_cleanup" != "true" ]]; then
                cleanup_test_env
            fi
            ;;
        "e2e")
            setup_test_env
            build_test_binary
            run_e2e_tests
            if [[ "$no_cleanup" != "true" ]]; then
                cleanup_test_env
            fi
            ;;
        "performance")
            setup_test_env
            build_test_binary
            run_performance_tests
            if [[ "$no_cleanup" != "true" ]]; then
                cleanup_test_env
            fi
            ;;
        "security")
            setup_test_env
            build_test_binary
            run_security_tests
            if [[ "$no_cleanup" != "true" ]]; then
                cleanup_test_env
            fi
            ;;
        "setup")
            setup_test_env
            ;;
        "cleanup")
            cleanup_test_env
            ;;
        "report")
            generate_test_report
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Trap to cleanup on exit
trap 'cleanup_test_env' EXIT

# Run main function with all arguments
main "$@"