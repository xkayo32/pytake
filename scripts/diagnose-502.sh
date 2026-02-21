#!/bin/bash
# Diagnóstico de 502 Bad Gateway

echo "=== PyTake 502 Diagnosis ==="
echo

echo "1. Backend Status:"
docker ps --filter "name=pytake-backend" --format "{{.Names}}\t{{.Status}}"
echo

echo "2. Backend Health:"
curl -s http://localhost:8002/api/v1/health/ | head -20
echo

echo "3. Nginx Status:"
docker ps --filter "name=pytake-nginx" --format "{{.Names}}\t{{.Status}}"
echo

echo "4. Backend Logs (last 20):"
docker logs pytake-backend-dev --tail 20 2>&1 | grep -E "ERROR|error|502|Exception|Traceback" || echo "No errors found"
echo

echo "5. Nginx Logs (last 20):"
docker logs pytake-nginx-dev --tail 20 2>&1 | grep -E "upstream|502|error|host not found" || echo "No 502 errors in logs"
echo

echo "6. Nginx Config Test:"
docker exec pytake-nginx-dev nginx -t 2>&1
echo

echo "7. Docker Network DNS:"
docker exec pytake-backend-dev nslookup backend 127.0.0.11 2>&1 | head -10
echo

echo "=== If you still see 502, try: ==="
echo "docker restart pytake-nginx-dev  # Refresh nginx connection pool"
echo "docker restart pytake-backend-dev # Restart backend"
