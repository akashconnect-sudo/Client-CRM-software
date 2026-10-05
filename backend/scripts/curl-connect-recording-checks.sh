#!/usr/bin/env bash
# Smoke checks for Amazon Connect webhook + recording access.
# Usage:
#   export API=https://your-api.example.com
#   export COMPANY_ID=...
#   export SECRET=...
#   export TOKEN=...          # admin JWT
#   export EMPLOYEE_TOKEN=... # sales employee JWT
#   export OTHER_CALL_ID=...  # call owned by someone else
#   bash scripts/curl-connect-recording-checks.sh

set -euo pipefail

echo "1) Wrong secret → expect 401"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$API/api/webhooks/ivr-call-completed" \
  -H "Content-Type: application/json" \
  -H "x-company-id: $COMPANY_ID" \
  -H "x-webhook-secret: wrong" \
  -d '{"call_id":"curl-t1","call_type":"INCOMING","call_status":"ANSWERED","call_start_time":"2026-10-05T06:00:00Z"}'

echo "2) Missing secret → expect 401"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$API/api/webhooks/ivr-call-completed" \
  -H "Content-Type: application/json" \
  -H "x-company-id: $COMPANY_ID" \
  -d '{"call_id":"curl-t1","call_type":"INCOMING","call_status":"ANSWERED","call_start_time":"2026-10-05T06:00:00Z"}'

CALL_ID="curl-dup-$(date +%s)"
BODY=$(cat <<EOF
{
  "call_id": "$CALL_ID",
  "ivr_provider_call_id": "$CALL_ID",
  "ivr_agent_id": "agent1",
  "customer_phone": "9876543210",
  "call_type": "INCOMING",
  "call_status": "ANSWERED",
  "call_start_time": "2026-10-05T06:00:00Z",
  "call_end_time": "2026-10-05T06:01:00Z",
  "call_duration": 60,
  "recording_key": "${COMPANY_ID}/connect/${CALL_ID}.wav",
  "provider": "AMAZON_CONNECT"
}
EOF
)

echo "3) Correct secret (create) → expect 201"
curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/api/webhooks/ivr-call-completed" \
  -H "Content-Type: application/json" \
  -H "x-company-id: $COMPANY_ID" \
  -H "x-webhook-secret: $SECRET" \
  -d "$BODY"

echo "4) Duplicate call_id (update) → expect 200"
curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/api/webhooks/ivr-call-completed" \
  -H "Content-Type: application/json" \
  -H "x-company-id: $COMPANY_ID" \
  -H "x-webhook-secret: $SECRET" \
  -d "$BODY"

if [[ -n "${EMPLOYEE_TOKEN:-}" && -n "${OTHER_CALL_ID:-}" ]]; then
  echo "5) Employee other recording → expect 403"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    "$API/api/calls/$OTHER_CALL_ID/recording"
fi

if [[ -n "${TOKEN:-}" && -n "${FOREIGN_CALL_ID:-}" ]]; then
  echo "6) Other company call id → expect 404"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    "$API/api/calls/$FOREIGN_CALL_ID/recording"
fi

echo "Done."
