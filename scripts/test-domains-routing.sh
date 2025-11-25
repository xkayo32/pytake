#!/bin/bash

################################################################################
# 🔗 Domain Routing Tests - Multi-Environment
# 
# Testa todas as rotas críticas em prod/staging/dev
# Pode ser executado localmente ou via CI/CD
#
# Autor: Kayo Carvalho Fernandes
# Data: 2025-11-18
# Versão: 1.0
################################################################################

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/domain-routing-tests-$(date +%s).log"
RESULTS_FILE="/tmp/domain-routing-results.json"
TIMEOUT=10

# Contadores
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Ambientes a testar
declare -A ENVIRONMENTS=(
  [prod]="app.pytake.net"
  [staging]="app-staging.pytake.net"
  [dev]="app-dev.pytake.net"
)

declare -A API_ENVIRONMENTS=(
  [prod]="api.pytake.net"
  [staging]="api-staging.pytake.net"
  [dev]="api-dev.pytake.net"
)

################################################################################
# Helper Functions
################################################################################

log() {
  local message="$1"
  local level="${2:-INFO}"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

test_http() {
  local url="$1"
  local expected_code="$2"
  local timeout="$3"
  
  local actual_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")
  
  if [[ "$actual_code" == "$expected_code" ]]; then
    return 0
  else
    return 1
  fi
}

test_response_contains() {
  local url="$1"
  local search_text="$2"
  local timeout="$3"
  
  local response=$(curl -s --max-time "$timeout" "$url" 2>/dev/null || echo "")
  
  if echo "$response" | grep -q "$search_text"; then
    return 0
  else
    return 1
  fi
}

run_test() {
  local test_name="$1"
  local env="$2"
  local url="$3"
  local test_type="$4"  # "http_code", "contains"
  local test_param="$5"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  printf "  %-50s " "► $test_name..."
  
  case "$test_type" in
    "http_code")
      if test_http "$url" "$test_param" "$TIMEOUT"; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $test_param)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "PASS: $test_name ($env)" "TEST"
        return 0
      else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log "FAIL: $test_name ($env) - URL: $url" "TEST"
        return 1
      fi
      ;;
    "contains")
      if test_response_contains "$url" "$test_param" "$TIMEOUT"; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log "PASS: $test_name ($env)" "TEST"
        return 0
      else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log "FAIL: $test_name ($env) - Looking for: $test_param" "TEST"
        return 1
      fi
      ;;
  esac
}

################################################################################
# Main Tests
################################################################################

test_frontend_routes() {
  local env="$1"
  local domain="${ENVIRONMENTS[$env]}"
  
  echo -e "\n${BLUE}━━ Frontend Routes ($env) ━━${NC}"
  
  # Teste 1: Login page
  run_test "Login page accessible" "$env" "https://$domain/login" "http_code" "200"
  
  # Teste 2: Public homepage
  run_test "Public homepage" "$env" "https://$domain" "http_code" "200" || true
  
  # Teste 3: Register page
  run_test "Register page" "$env" "https://$domain/register" "http_code" "200"
  
  # Teste 4: Dashboard (protected - should redirect or 401)
  run_test "Dashboard protection" "$env" "https://$domain/admin" "http_code" "301" || \
  run_test "Dashboard protection" "$env" "https://$domain/admin" "http_code" "302" || \
  run_test "Dashboard protection" "$env" "https://$domain/admin" "http_code" "401" || true
  
  # Teste 5: Agent panel (protected)
  run_test "Agent panel protection" "$env" "https://$domain/agent" "http_code" "301" || \
  run_test "Agent panel protection" "$env" "https://$domain/agent" "http_code" "302" || \
  run_test "Agent panel protection" "$env" "https://$domain/agent" "http_code" "401" || true
}

test_api_routes() {
  local env="$1"
  local api_domain="${API_ENVIRONMENTS[$env]}"
  
  echo -e "\n${BLUE}━━ API Routes ($env) ━━${NC}"
  
  # Teste 1: Health check
  run_test "Health endpoint" "$env" "https://$api_domain/api/v1/health" "http_code" "200"
  
  # Teste 2: API docs
  run_test "Swagger documentation" "$env" "https://$api_domain/api/v1/docs" "http_code" "200"
  
  # Teste 3: OpenAPI schema
  run_test "OpenAPI schema" "$env" "https://$api_domain/api/v1/openapi.json" "http_code" "200"
  
  # Teste 4: Login endpoint (without credentials - should be 422)
  run_test "Auth endpoint responds" "$env" "https://$api_domain/api/v1/auth/login" "http_code" "422"
  
  # Teste 5: 404 endpoint
  run_test "404 error handling" "$env" "https://$api_domain/api/v1/nonexistent" "http_code" "404"
}

test_ssl_certificates() {
  local env="$1"
  local domain="${ENVIRONMENTS[$env]}"
  local api_domain="${API_ENVIRONMENTS[$env]}"
  
  echo -e "\n${BLUE}━━ SSL Certificates ($env) ━━${NC}"
  
  # Teste 1: Frontend HTTPS
  printf "  %-50s " "► Frontend SSL certificate..."
  if openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | grep -q "Verify return code"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  # Teste 2: API HTTPS
  printf "  %-50s " "► API SSL certificate..."
  if openssl s_client -connect "$api_domain:443" -servername "$api_domain" </dev/null 2>/dev/null | grep -q "Verify return code"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

test_response_headers() {
  local env="$1"
  local domain="${ENVIRONMENTS[$env]}"
  
  echo -e "\n${BLUE}━━ Response Headers ($env) ━━${NC}"
  
  # Teste 1: HSTS header
  printf "  %-50s " "► HSTS header present..."
  if curl -s -I "https://$domain" | grep -iq "strict-transport-security"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${YELLOW}⚠ WARNING${NC} (optional)"
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  # Teste 2: Content-Type header
  printf "  %-50s " "► Content-Type header..."
  if curl -s -I "https://$domain" | grep -iq "content-type"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}✗ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

################################################################################
# Main Execution
################################################################################

main() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  🔗 Domain Routing Tests - Multi-Environment                    ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  
  log "Starting domain routing tests" "START"
  
  # Verificar conectividade básica
  echo -e "\n${BLUE}━━ Pre-flight Checks ━━${NC}"
  printf "  %-50s " "► Checking internet connectivity..."
  if ping -c 1 8.8.8.8 &> /dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
  else
    echo -e "${RED}✗ FAIL${NC} - No internet connectivity"
    exit 1
  fi
  
  printf "  %-50s " "► Checking DNS resolution (app.pytake.net)..."
  if nslookup app.pytake.net &> /dev/null; then
    echo -e "${GREEN}✓ PASS${NC}"
  else
    echo -e "${RED}✗ FAIL${NC} - DNS not resolving"
    exit 1
  fi
  
  # Testes por ambiente
  for env in "${!ENVIRONMENTS[@]}"; do
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Environment: ${env^^} (${ENVIRONMENTS[$env]})${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    
    test_frontend_routes "$env"
    test_api_routes "$env"
    test_ssl_certificates "$env"
    test_response_headers "$env"
  done
  
  # Resumo final
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  📊 Test Summary${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  
  local pass_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  
  echo ""
  echo -e "  Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
  echo -e "  Passed: ${GREEN}$PASSED_TESTS${NC}"
  echo -e "  Failed: ${RED}$FAILED_TESTS${NC}"
  echo -e "  Pass Rate: ${BLUE}${pass_rate}%${NC}"
  
  echo ""
  echo -e "  Log file: ${BLUE}$LOG_FILE${NC}"
  
  if [[ $FAILED_TESTS -eq 0 ]]; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}\n"
    log "All tests passed" "SUCCESS"
    exit 0
  else
    echo -e "\n${RED}❌ Some tests failed!${NC}\n"
    log "$FAILED_TESTS tests failed" "FAILURE"
    exit 1
  fi
}

# Executar
main "$@"
