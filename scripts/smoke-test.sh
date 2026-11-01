#!/usr/bin/env bash
# Smoke test against a running gateway. Usage: scripts/smoke-test.sh [base_url]
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
RETRIES="${RETRIES:-30}"

echo "Waiting for gateway at ${BASE_URL} ..."
for i in $(seq 1 "$RETRIES"); do
  if curl -fsS "${BASE_URL}/healthz" >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq "$RETRIES" ]; then
    echo "Gateway did not become healthy" >&2
    exit 1
  fi
  sleep 2
done

echo "GET /api/products"
curl -fsS "${BASE_URL}/api/products" | grep -q '"Mechanical Keyboard"'

echo "POST /api/orders"
ORDER=$(curl -fsS -X POST "${BASE_URL}/api/orders" \
  -H 'content-type: application/json' \
  -d '{"productId":1,"quantity":2}')
echo "$ORDER" | grep -q '"status":"CREATED"'

echo "GET /api/orders"
curl -fsS "${BASE_URL}/api/orders" | grep -q '"productId":1'

echo "Smoke test passed."
