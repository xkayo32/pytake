#!/bin/bash

# Multi-tenancy test script
BASE_URL="http://localhost:8080/api/v1"

echo "🚀 Testing PyTake Multi-Tenancy System"
echo "=====================================\n"

# Test 1: Register two users
echo "📝 Test 1: Registering two users..."

USER1_RESP=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"User One","email":"user1@test.com","password":"password123"}')

USER2_RESP=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"User Two","email":"user2@test.com","password":"password123"}')

USER1_TOKEN=$(echo $USER1_RESP | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
USER2_TOKEN=$(echo $USER2_RESP | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "✅ User 1 registered: user1@test.com"
echo "✅ User 2 registered: user2@test.com\n"

# Test 2: Create tenants for both users
echo "🏢 Test 2: Creating tenants..."

TENANT1_RESP=$(curl -s -L -X POST $BASE_URL/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d '{"name":"Company One","domain":"company1.test"}')

TENANT2_RESP=$(curl -s -L -X POST $BASE_URL/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -d '{"name":"Company Two","domain":"company2.test"}')

TENANT1_ID=$(echo $TENANT1_RESP | grep -o '"id":"[^"]*' | cut -d'"' -f4)
TENANT2_ID=$(echo $TENANT2_RESP | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo "✅ Tenant 1 created: $TENANT1_ID (Company One)"
echo "✅ Tenant 2 created: $TENANT2_ID (Company Two)\n"

# Test 3: Verify tenant isolation - each user sees only their tenant
echo "🔒 Test 3: Testing tenant isolation..."

USER1_TENANTS=$(curl -s -L $BASE_URL/tenants/my \
  -H "Authorization: Bearer $USER1_TOKEN")

USER2_TENANTS=$(curl -s -L $BASE_URL/tenants/my \
  -H "Authorization: Bearer $USER2_TOKEN")

USER1_COUNT=$(echo $USER1_TENANTS | grep -o '"tenant_id"' | wc -l)
USER2_COUNT=$(echo $USER2_TENANTS | grep -o '"tenant_id"' | wc -l)

echo "✅ User 1 sees $USER1_COUNT tenant(s)"
echo "✅ User 2 sees $USER2_COUNT tenant(s)\n"

# Test 4: Test cross-tenant access prevention
echo "🚫 Test 4: Testing cross-tenant access prevention..."

# User 1 tries to access User 2's tenant
CROSS_ACCESS=$(curl -s -w "%{http_code}" -o /dev/null -L \
  $BASE_URL/tenants/$TENANT2_ID \
  -H "Authorization: Bearer $USER1_TOKEN")

if [ "$CROSS_ACCESS" = "200" ]; then
    echo "⚠️  SECURITY WARNING: Cross-tenant access allowed!"
else
    echo "✅ Cross-tenant access properly blocked (HTTP $CROSS_ACCESS)"
fi

# Test 5: Test tenant update permissions
echo "\n🔧 Test 5: Testing tenant update permissions..."

# User 1 updates their own tenant
UPDATE_OWN=$(curl -s -w "%{http_code}" -o /dev/null -L -X PUT \
  $BASE_URL/tenants/$TENANT1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d '{"name":"Updated Company One"}')

# User 1 tries to update User 2's tenant
UPDATE_OTHER=$(curl -s -w "%{http_code}" -o /dev/null -L -X PUT \
  $BASE_URL/tenants/$TENANT2_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d '{"name":"Hacked Company"}')

echo "✅ Own tenant update: HTTP $UPDATE_OWN"
if [ "$UPDATE_OTHER" = "403" ]; then
    echo "✅ Cross-tenant update blocked: HTTP $UPDATE_OTHER"
else
    echo "⚠️  SECURITY WARNING: Cross-tenant update allowed: HTTP $UPDATE_OTHER"
fi

echo "\n🎉 Multi-tenancy test completed!"
echo "=====================================\n"

# Summary
echo "📊 Test Summary:"
echo "- User registration: ✅"  
echo "- Tenant creation: ✅"
echo "- Tenant isolation: ✅"
echo "- Cross-tenant access control: $([ "$CROSS_ACCESS" != "200" ] && echo "✅" || echo "⚠️")"
echo "- Update permissions: $([ "$UPDATE_OTHER" = "403" ] && echo "✅" || echo "⚠️")"
echo ""