#!/bin/bash

echo "🧪 Testing PyChat Authentication API"
echo "===================================="

# Test root endpoint
echo -e "\n1️⃣ Testing root endpoint..."
curl -s http://localhost:8080/ | jq . || echo "❌ Failed"

# Test login with database auth
echo -e "\n2️⃣ Testing login with pre-created admin user..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth-db/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pytake.com",
    "password": "admin123"
  }')

echo "$LOGIN_RESPONSE" | jq . || echo "❌ Failed"

# Extract token if login successful
if [ ! -z "$LOGIN_RESPONSE" ]; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token // empty')
  
  if [ ! -z "$TOKEN" ]; then
    echo -e "\n✅ Login successful! Token: ${TOKEN:0:20}..."
    
    # Test /me endpoint
    echo -e "\n3️⃣ Testing /me endpoint..."
    curl -s http://localhost:8080/api/v1/auth-db/me \
      -H "Authorization: Bearer $TOKEN" | jq . || echo "❌ Failed"
  else
    echo "❌ No token in response"
  fi
fi

# Test registration of new user
echo -e "\n4️⃣ Testing registration of new user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth-db/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent@pychat.com",
    "password": "agent123456",
    "name": "Agent User"
  }')

echo "$REGISTER_RESPONSE" | jq . || echo "❌ Failed"

echo -e "\n✅ Tests completed!"