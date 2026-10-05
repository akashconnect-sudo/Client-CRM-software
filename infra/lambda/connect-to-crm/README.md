# Lambda: Amazon Connect → CRM

Posts call details (and a **tenant-scoped** S3 recording key) to the CRM webhook after a contact disconnects.

## Flow

1. EventBridge `DISCONNECTED` contact event
2. `DescribeContact` for agent, times, customer endpoint, recording location
3. If the recording key is **not** already under `{companyId}/…`:
   - Poll `HeadObject` on the **source** Connect recording (retry with backoff — objects often appear 1–2 minutes after disconnect)
   - `CopyObject` into `RECORDINGS_BUCKET` at `{companyId}/YYYY/MM/DD/{contactId}.wav`
   - **Never delete** the source object
4. POST CRM `/api/webhooks/ivr-call-completed` with `recording_key` = the **new** key

## Trigger

EventBridge rule on Amazon Connect **Contact Events** where contact state is **DISCONNECTED**.

Alternatively invoke from a Kinesis CTR consumer that forwards the same shape with `contactId` + `instanceId`.

## Environment

| Variable | Example |
|----------|---------|
| `CRM_WEBHOOK_URL` | `https://api.yourcrm.com/api/webhooks/ivr-call-completed` |
| `COMPANY_MAP` | `{"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee":{"companyId":"<uuid>","secret":"<hex>"}}` |
| `CONNECT_INSTANCE_ID` | Optional default instance id |
| `RECORDINGS_BUCKET` | Destination private bucket used by CRM playback |
| `CONNECT_RECORDINGS_BUCKET` | Source Connect recording bucket (required when DescribeContact returns a key only, no `s3://` URI) |

`COMPANY_MAP` keys are Connect **instance IDs**. Use `"*"` as a fallback entry for single-tenant installs.

**Never log** `secret` values.

## IAM (execution role)

- `connect:DescribeContact` on the instance ARN
- **Source recordings:** `s3:GetObject` (and `s3:HeadObject` / `s3:ListBucket` if your policy style requires it) on the **Connect recording bucket** (`CONNECT_RECORDINGS_BUCKET` / Connect’s storage location)
- **Destination:** `s3:PutObject` on `RECORDINGS_BUCKET` (prefix `{companyId}/*` recommended)
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
- Optional: `secretsmanager:GetSecretValue` if you later move `COMPANY_MAP` into Secrets Manager
- Outbound HTTPS to the CRM API (NAT or public)

Do **not** grant `s3:DeleteObject` on the source bucket — the Lambda must leave Connect originals in place.

CRM EC2 role (separate) needs `s3:GetObject` on `RECORDINGS_BUCKET` for presigned playback.

## Deploy (sketch)

Timeout should be **≥ 3 minutes** so recording wait/retry can finish.

```bash
cd infra/lambda/connect-to-crm
npm ci
zip -r function.zip index.js package.json node_modules
aws lambda create-function \
  --function-name connect-to-crm \
  --runtime nodejs20.x \
  --handler index.handler \
  --role arn:aws:iam::ACCOUNT:role/connect-to-crm-role \
  --zip-file fileb://function.zip \
  --timeout 180 \
  --environment "Variables={CRM_WEBHOOK_URL=https://...,COMPANY_MAP={...},RECORDINGS_BUCKET=crm-recordings,CONNECT_RECORDINGS_BUCKET=connect-recordings}"
```

Point EventBridge rule target at this function. Attach a DLQ for failed invocations.

## CRM setup

1. Sign in as Super Admin → Settings → IVR
2. `POST /api/ivr/webhook-secret/rotate` — copy secret once into `COMPANY_MAP`
3. Set Lambda `RECORDINGS_BUCKET` to the same bucket as CRM `RECORDINGS_BUCKET`
4. Set `CONNECT_RECORDINGS_BUCKET` to the bucket Connect writes into (if different)
