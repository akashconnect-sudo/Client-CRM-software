# Amazon Connect → CRM call logging & recordings

## Webhook contract (Lambda → CRM)

```
POST /api/webhooks/ivr-call-completed
```

### Headers

| Header | Required | Notes |
|--------|----------|--------|
| `x-company-id` | Yes | Workspace UUID |
| `x-webhook-secret` | Yes | Per-company secret from `POST /api/ivr/webhook-secret/rotate` |
| `Content-Type` | Yes | `application/json` |

Legacy: `?gstin=` still resolves the company if `x-company-id` is omitted. Prefer the header.

### Body

```json
{
  "call_id": "amazon-connect-contact-id",
  "ivr_provider_call_id": "amazon-connect-contact-id",
  "ivr_agent_id": "agent-username-matching-employee.ivrAgentId",
  "customer_phone": "+919876543210",
  "call_type": "INCOMING",
  "call_status": "ANSWERED",
  "call_start_time": "2026-10-05T06:00:00.000Z",
  "call_end_time": "2026-10-05T06:05:12.000Z",
  "call_duration": 312,
  "recording_key": "<companyId>/connect/2026/10/05/<contactId>.wav",
  "provider": "AMAZON_CONNECT"
}
```

| Field | Values |
|-------|--------|
| `call_type` | `INCOMING` \| `OUTGOING` \| `MISSED` |
| `call_status` | `ANSWERED` \| `MISSED` \| `FAILED` \| `BUSY` |
| `recording_key` | S3 **key only** (no bucket). Must start with `{companyId}/`. Wrong prefix is ignored. The Connect Lambda **copies** the object into `RECORDINGS_BUCKET` at `{companyId}/YYYY/MM/DD/{contactId}.wav` when the Connect key is not already tenant-prefixed — it does not string-prefix. |
| `provider` | Use `AMAZON_CONNECT` → CRM stores `provider=AMAZON_CONNECT`, `sourceMode=NATIVE_IVR` |

### Behaviour

- Auth is **fail-closed**: missing/wrong secret → `401`.
- Idempotent on `(companyId, call_id)`: second post updates the same `CallLog` (e.g. recording arrives later).
- Employee matched by `companyId` + `ivrAgentId` + `ACTIVE`.
- Lead matched by normalized phone within the same company.
- Nobody can delete call logs or recordings via the API.

### Admin APIs

```
GET  /api/ivr/webhook-info          → companyId + webhook URL (no secret)
POST /api/ivr/webhook-secret/rotate → new secret returned **once**
```

Both require `SUPER_ADMIN` + Bearer token.

### Playback

```
GET /api/calls/:id/recording
```

Returns `{ url, expiresIn: 300 }` (presigned S3 GET). Requires auth + IVR module. Sales employees only for their own calls.

## Curl checks

```bash
# Wrong secret → 401
curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/webhooks/ivr-call-completed" \
  -H "Content-Type: application/json" \
  -H "x-company-id: $COMPANY_ID" \
  -H "x-webhook-secret: wrong" \
  -d '{"call_id":"t1","call_type":"INCOMING","call_status":"ANSWERED","call_start_time":"2026-10-05T06:00:00Z"}'

# Missing secret → 401
curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/webhooks/ivr-call-completed" \
  -H "Content-Type: application/json" \
  -H "x-company-id: $COMPANY_ID" \
  -d '{"call_id":"t1","call_type":"INCOMING","call_status":"ANSWERED","call_start_time":"2026-10-05T06:00:00Z"}'

# Correct secret → 201 (first) / 200 (duplicate call_id)
curl -s -X POST "$API/api/webhooks/ivr-call-completed" \
  -H "Content-Type: application/json" \
  -H "x-company-id: $COMPANY_ID" \
  -H "x-webhook-secret: $SECRET" \
  -d "{\"call_id\":\"t-dup\",\"ivr_agent_id\":\"agent1\",\"customer_phone\":\"9876543210\",\"call_type\":\"INCOMING\",\"call_status\":\"ANSWERED\",\"call_start_time\":\"2026-10-05T06:00:00Z\",\"call_duration\":10,\"recording_key\":\"$COMPANY_ID/connect/t-dup.wav\",\"provider\":\"AMAZON_CONNECT\"}"

# Employee playing another employee's recording → 403
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  "$API/api/calls/$OTHER_CALL_ID/recording"

# Another company's call id → 404
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$API/api/calls/$FOREIGN_CALL_ID/recording"
```

## Server env

```
RECORDINGS_BUCKET=your-private-bucket
AWS_REGION=ap-south-1
```

EC2 instance role needs `s3:GetObject` on that bucket (no static AWS keys in `.env`).

See also: `/infra/lambda/connect-to-crm/README.md`.
