#!/bin/bash

# Get fresh token
TOKEN=$(curl -k -s https://localhost/api/v1/auth/login/ -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pytake.net","password":"nYVUJy9w5hYQGh52CSpM0g"}' | \
  python3 -c "import json, sys; d=json.load(sys.stdin); print(d['token']['access_token'])")

echo "Listing all numbers..."
curl -k -s https://localhost/api/v1/whatsapp-numbers/ \
  -H "Authorization: Bearer ${TOKEN}" \
  -X GET | python3 -m json.tool
