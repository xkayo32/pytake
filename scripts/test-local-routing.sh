#!/bin/bash

################################################################################
# 🔗 Local Development Routing Tests
# 
# Testa rotas no environment local de desenvolvimento
# Ideal para testar antes de fazer push
#
# Uso: bash scripts/test-local-routing.sh
# 
# Autor: Kayo Carvalho Fernandes
# Data: 2025-11-18
# Versão: 1.0
################################################################################

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Contadores
TOTAL=0
PASSED=0
FAILED=0

# Locais de teste
FRONTEND_URL="http://localhost:3000"
API_URL="http://localhost:8000"
TIMEOUT=5

################################################################################
# Functions
################################################################################

test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_code="$3"
  
  TOTAL=$((TOTAL + 1))
  printf "  %-45s " "► $name..."
  
  local actual_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  
  if [[ "$actual_code" == "$expected_code" ]]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $actual_code)"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (expected $expected_code, got $actual_code)"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

test_contains() {
  local name="$1"
  local url="$2"
  local search="$3"
  
  TOTAL=$((TOTAL + 1))
  printf "  %-45s " "► $name..."
  
  if curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null | grep -q "$search"; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (contains check failed)"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

################################################################################
# Pre-flight Checks
################################################################################

echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔗 Local Development Routing Tests${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}━━ Pre-flight Checks ━━${NC}"
printf "  %-45s " "► Frontend running on :3000..."
if curl -s --max-time 2 "$FRONTEND_URL" &>/dev/null; then
  echo -e "${GREEN}✓ OK${NC}"
else
  echo -e "${RED}✗ FAIL${NC} - Frontend not running"
  exit 1
fi

printf "  %-45s " "► API running on :8000..."
if curl -s --max-time 2 "$API_URL/api/v1/health" &>/dev/null; then
  echo -e "${GREEN}✓ OK${NC}"
else
  echo -e "${RED}✗ FAIL${NC} - API not running"
  exit 1
fi

################################################################################
# Frontend Tests
################################################################################

echo -e "\n${BLUE}━━ Frontend Routes ━━${NC}"

test_endpoint "Login page" "$FRONTEND_URL/login" "200"
test_endpoint "Register page" "$FRONTEND_URL/register" "200"
test_endpoint "Homepage" "$FRONTEND_URL" "200"
test_endpoint "Admin panel" "$FRONTEND_URL/admin" "200" || true  # Pode ser 401 ou redirecionado
test_endpoint "Agent panel" "$FRONTEND_URL/agent" "200" || true

################################################################################
# API Tests
################################################################################

echo -e "\n${BLUE}━━ API Routes ━━${NC}"

test_endpoint "Health check" "$API_URL/api/v1/health" "200"
test_contains "Health response contains 'ok'" "$API_URL/api/v1/health" '"status":"ok"'
test_endpoint "Swagger docs" "$API_URL/api/v1/docs" "200"
test_endpoint "OpenAPI schema" "$API_URL/api/v1/openapi.json" "200"
test_endpoint "Login endpoint (no auth)" "$API_URL/api/v1/auth/login" "422"
test_endpoint "404 handling" "$API_URL/api/v1/nonexistent" "404"

################################################################################
# Performance Tests
################################################################################

echo -e "\n${BLUE}━━ Performance Checks ━━${NC}"

printf "  %-45s " "► Frontend response time < 500ms..."
START=$(date +%s%N)
curl -s --max-time "$TIMEOUT" "$FRONTEND_URL" > /dev/null
END=$(date +%s%N)
MS=$(( (END - START) / 1000000 ))

if [ $MS -lt 500 ]; then
  echo -e "${GREEN}✓ PASS${NC} (${MS}ms)"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠ WARNING${NC} (${MS}ms - acceptable)"
fi
TOTAL=$((TOTAL + 1))

printf "  %-45s " "► API health response time < 100ms..."
START=$(date +%s%N)
curl -s --max-time "$TIMEOUT" "$API_URL/api/v1/health" > /dev/null
END=$(date +%s%N)
MS=$(( (END - START) / 1000000 ))

if [ $MS -lt 100 ]; then
  echo -e "${GREEN}✓ PASS${NC} (${MS}ms)"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠ WARNING${NC} (${MS}ms - acceptable)"
fi
TOTAL=$((TOTAL + 1))

################################################################################
# Summary
################################################################################

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Total Tests:  ${BLUE}$TOTAL${NC}"
echo -e "  Passed:       ${GREEN}$PASSED${NC}"
echo -e "  Failed:       ${RED}$FAILED${NC}"

if [ $TOTAL -gt 0 ]; then
  RATE=$((PASSED * 100 / TOTAL))
  echo -e "  Pass Rate:    ${BLUE}${RATE}%${NC}"
fi

echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed! Ready to develop.${NC}\n"
  exit 0
else
  echo -e "${RED}❌ Some tests failed! Check your setup.${NC}\n"
  
  echo -e "${YELLOW}Troubleshooting:${NC}"
  echo "  Frontend not running? → npm run dev (in frontend/)"
  echo "  API not running?      → uvicorn app.main:app --reload (in backend/)"
  echo "  Docker? → podman compose up -d"
  echo ""
  
  exit 1
fi
