#!/bin/bash

# Get fresh token
echo "Getting authentication token..."
AUTH_RESPONSE=$(curl -k -s https://localhost/api/v1/auth/login/ -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pytake.net","password":"nYVUJy9w5hYQGh52CSpM0g"}')

TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import json, sys; d=json.load(sys.stdin); print(d['token']['access_token'])")
USER_ID=$(echo "$AUTH_RESPONSE" | python3 -c "import json, sys; d=json.load(sys.stdin); print(d['user']['id'])")
ORG_ID=$(echo "$AUTH_RESPONSE" | python3 -c "import json, sys; d=json.load(sys.stdin); print(d['user']['organization'])")

echo "Token: ${TOKEN:0:50}..."
echo "User ID: $USER_ID"
echo "Org ID: $ORG_ID"
echo ""

# Try to GET the specific number
NUMBER_ID="c5bfc576-1115-4d15-9645-1cf1ae507dbb"
echo "Attempting GET /api/v1/whatsapp-numbers/$NUMBER_ID"
GET_RESPONSE=$(curl -k -s -w "\nHTTP_STATUS:%{http_code}" \
  https://localhost/api/v1/whatsapp-numbers/$NUMBER_ID/ \
  -H "Authorization: Bearer ${TOKEN}" \
  -X GET)

HTTP_STATUS=$(echo "$GET_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$GET_RESPONSE" | sed '$d')

echo "Status: $HTTP_STATUS"
echo "Body: $BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ GET successful"
  echo ""
  echo "Attempting DELETE..."
  DELETE_RESPONSE=$(curl -k -s -w "\nHTTP_STATUS:%{http_code}" \
    https://localhost/api/v1/whatsapp-numbers/$NUMBER_ID/ \
    -H "Authorization: Bearer ${TOKEN}" \
    -X DELETE)
  
  HTTP_DELETE=$(echo "$DELETE_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
  echo "Delete Status: $HTTP_DELETE"
else
  echo "❌ GET failed with status: $HTTP_STATUS"
fi
