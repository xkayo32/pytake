#!/bin/bash
# Test login flow

set -e

EMAIL="admin@pytake.net"
PASSWORD="nYVUJy9w5hYQGh52CSpM0g"
BASE_URL="http://localhost:8002"

echo "🧪 Testing PyTake login flow..."
echo

# 1. Get login page and CSRF token
echo "1️⃣  Fetching login page..."
page=$(curl -s -c /tmp/pytake_cookies.txt "$BASE_URL/entrar/")
csrf=$(echo "$page" | grep -oP 'name="csrfmiddlewaretoken" value="\K[^"]+')

if [ -z "$csrf" ]; then
    echo "❌ CSRF token not found. HTML body:"
    echo "$page" | grep -A5 "csrfmiddlewaretoken" || echo "No CSRF field in HTML"
    exit 1
fi
echo "✓ CSRF token obtained: ${csrf:0:20}..."

# 2. Try to login
echo
echo "2️⃣  Submitting login form..."
response=$(curl -s -b /tmp/pytake_cookies.txt -c /tmp/pytake_cookies.txt \
    -X POST "$BASE_URL/entrar/" \
    -d "csrfmiddlewaretoken=$csrf&email=$EMAIL&password=$PASSWORD&remember_me=on" \
    -w "\n%{http_code}")

status_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$status_code" = "302" ]; then
    echo "✓ Login successful (302 redirect)"
else
    echo "⚠️  Unexpected status: $status_code"
    echo "Response: $body" | head -20
fi

# 3. Test authenticated access
echo
echo "3️⃣  Testing dashboard access..."
dashboard=$(curl -s -b /tmp/pytake_cookies.txt "$BASE_URL/app/" -w "\n%{http_code}")
dash_status=$(echo "$dashboard" | tail -1)
dash_body=$(echo "$dashboard" | head -1)

if [ "$dash_status" = "200" ]; then
    if echo "$dash_body" | grep -q "dashboard\|conversas\|agentes"; then
        echo "✓ Dashboard loaded successfully"
    else
        echo "⚠️  Dashboard returned 200 but maybe not rendered correctly"
    fi
else
    echo "❌ Dashboard returned $dash_status"
fi

# 4. Test static files
echo
echo "4️⃣  Testing static files..."
favicon=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/static/img/favicon.svg")
css=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/static/css/tailwind.css")

[ "$favicon" = "200" ] && echo "✓ Favicon: 200" || echo "❌ Favicon: $favicon"
[ "$css" = "200" ] && echo "✓ Tailwind CSS: 200" || echo "❌ Tailwind CSS: $css"

echo
echo "✅ Login flow test complete!"
