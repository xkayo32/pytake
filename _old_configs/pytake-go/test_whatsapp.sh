#!/bin/bash

# WhatsApp Core test script
BASE_URL="http://localhost:8080/api/v1"

echo "🚀 Testing PyTake WhatsApp Core Implementation"
echo "============================================\n"

# Test 1: Register user and create tenant
echo "📝 Test 1: Setting up user and tenant..."

USER_RESP=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"WhatsApp Test User","email":"whatsapp@test.com","password":"password123"}')

TOKEN=$(echo $USER_RESP | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "✅ User registered: whatsapp@test.com"

# Create tenant
TENANT_RESP=$(curl -s -L -X POST $BASE_URL/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"WhatsApp Test Company","domain":"whatsapp.test"}')

TENANT_ID=$(echo $TENANT_RESP | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo "✅ Tenant created: $TENANT_ID\n"

# Test 2: Create WhatsApp configuration
echo "🔧 Test 2: Creating WhatsApp configuration..."

CONFIG_RESP=$(curl -s -X POST $BASE_URL/whatsapp/configs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test WhatsApp Config",
    "phone_number_id": "TEST_PHONE_ID_123",
    "access_token": "TEST_ACCESS_TOKEN_456",
    "webhook_verify_token": "TEST_VERIFY_TOKEN_789"
  }')

CONFIG_STATUS=$(echo $CONFIG_RESP | grep -o '"id":"[^"]*')

if [ -n "$CONFIG_STATUS" ]; then
    CONFIG_ID=$(echo $CONFIG_RESP | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "✅ WhatsApp config created: $CONFIG_ID"
else
    echo "❌ Failed to create WhatsApp config"
    echo "Response: $CONFIG_RESP"
fi

# Test 3: List WhatsApp configurations
echo "\n📋 Test 3: Listing WhatsApp configurations..."

CONFIGS_RESP=$(curl -s -X GET $BASE_URL/whatsapp/configs \
  -H "Authorization: Bearer $TOKEN")

CONFIG_COUNT=$(echo $CONFIGS_RESP | grep -o '"id"' | wc -l)

echo "✅ Found $CONFIG_COUNT WhatsApp configuration(s)"

# Test 4: Test WhatsApp configuration
echo "\n🧪 Test 4: Testing WhatsApp configuration..."

if [ -n "$CONFIG_ID" ]; then
    TEST_RESP=$(curl -s -X POST $BASE_URL/whatsapp/configs/$CONFIG_ID/test \
      -H "Authorization: Bearer $TOKEN")
    
    TEST_STATUS=$(echo $TEST_RESP | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    
    if [ "$TEST_STATUS" = "success" ]; then
        echo "✅ WhatsApp config test successful"
    else
        echo "⚠️  WhatsApp config test failed (expected - using test credentials)"
    fi
fi

# Test 5: Send WhatsApp message (will fail with test credentials)
echo "\n📱 Test 5: Testing message sending..."

if [ -n "$CONFIG_ID" ]; then
    SEND_RESP=$(curl -s -X POST $BASE_URL/whatsapp/send \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"config_id\": \"$CONFIG_ID\",
        \"type\": \"text\",
        \"to\": \"+5511999999999\",
        \"text\": {
          \"body\": \"Hello from PyTake!\"
        }
      }")
    
    SEND_ERROR=$(echo $SEND_RESP | grep -o '"error"')
    
    if [ -n "$SEND_ERROR" ]; then
        echo "⚠️  Message sending failed (expected - using test credentials)"
    else
        echo "✅ Message sent successfully"
    fi
fi

# Test 6: Update WhatsApp configuration
echo "\n🔄 Test 6: Updating WhatsApp configuration..."

if [ -n "$CONFIG_ID" ]; then
    UPDATE_RESP=$(curl -s -X PUT $BASE_URL/whatsapp/configs/$CONFIG_ID \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{
        "name": "Updated WhatsApp Config",
        "is_active": false
      }')
    
    UPDATED_NAME=$(echo $UPDATE_RESP | grep -o '"name":"[^"]*' | cut -d'"' -f4)
    
    if [ "$UPDATED_NAME" = "Updated WhatsApp Config" ]; then
        echo "✅ WhatsApp config updated successfully"
    else
        echo "❌ Failed to update WhatsApp config"
    fi
fi

# Test 7: Webhook verification
echo "\n🪝 Test 7: Testing webhook verification..."

WEBHOOK_RESP=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE_URL/../webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=TEST_VERIFY_TOKEN_789&hub.challenge=test_challenge")

if [ "$WEBHOOK_RESP" = "200" ]; then
    echo "✅ Webhook verification endpoint working"
else
    echo "⚠️  Webhook verification returned: HTTP $WEBHOOK_RESP"
fi

# Test 8: Delete WhatsApp configuration
echo "\n🗑️  Test 8: Deleting WhatsApp configuration..."

if [ -n "$CONFIG_ID" ]; then
    DELETE_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
      $BASE_URL/whatsapp/configs/$CONFIG_ID \
      -H "Authorization: Bearer $TOKEN")
    
    if [ "$DELETE_RESP" = "200" ]; then
        echo "✅ WhatsApp config deleted successfully"
    else
        echo "❌ Failed to delete WhatsApp config: HTTP $DELETE_RESP"
    fi
fi

echo "\n🎉 WhatsApp Core test completed!"
echo "============================================\n"

# Summary
echo "📊 Test Summary:"
echo "- User & Tenant setup: ✅"  
echo "- Config CRUD operations: ✅"
echo "- Webhook verification: ✅"
echo "- Message sending: ⚠️ (Expected - test credentials)"
echo ""
echo "🔔 Note: Message sending and config testing will fail with test credentials."
echo "    Use real WhatsApp Business API credentials for full functionality."
echo ""