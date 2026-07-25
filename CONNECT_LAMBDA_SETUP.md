# Amazon Connect → Sales Lead CRM setup

Amazon Connect contacts (voice + chat) can be saved automatically into the CRM `CallLog` table via a small AWS Lambda that POSTs to your backend after each contact ends.

## What the CRM expects

**Endpoint**

```
POST /api/connect/contact-event?companyId=<YOUR_COMPANY_UUID>
```

**Headers**

| Header | Value |
|--------|--------|
| `Content-Type` | `application/json` |
| `x-webhook-secret` | Same value as `CONNECT_WEBHOOK_SECRET` on the server |

**JSON body**

```json
{
  "contactId": "abc-123",
  "customerPhoneNumber": "+919876543210",
  "agentUsername": "akash",
  "queueName": "SalesQueue",
  "channel": "VOICE",
  "initiationTimestamp": "2026-07-25T10:00:00.000Z",
  "disconnectTimestamp": "2026-07-25T10:04:12.000Z",
  "durationSeconds": 252,
  "status": "COMPLETED",
  "recordingUrl": "https://example.com/recording.wav"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `contactId` | Yes | Stored as `ivrProviderCallId` (dedupes Lambda retries) |
| `customerPhoneNumber` | Yes | Matched to Lead `phone` (last 10 digits) |
| `agentUsername` | No | Matched to User `ivrAgentId`, then email local-part, then `name` |
| `queueName` | No | Saved into `notes` |
| `channel` | No | `VOICE` or `CHAT` — saved into `notes` |
| `initiationTimestamp` | No | → `callStartTime` |
| `disconnectTimestamp` | No | → `callEndTime` |
| `durationSeconds` | No | Computed from timestamps if missing |
| `status` | No | `COMPLETED`→`ANSWERED`, `MISSED`, `FAILED`, `BUSY` |
| `recordingUrl` | No | → `recordingUrl` |

If `agentUsername` does not match a user, `employeeId` is left `null` (no error). Same for unmatched phones and `leadId`.

### Agent matching tip

In CRM → Team Grid, set each agent's **IVR Agent ID** to their Amazon Connect login username (e.g. `akash`). That is the most reliable match.

### How to find `companyId`

After login, open browser DevTools → Network → any `/api/...` call, or check Control Room / company profile. It is the workspace UUID (e.g. from `/api/auth/me` → `companyId`).

---

## Environment variables

### Local (`backend/.env`)

```env
CONNECT_WEBHOOK_SECRET=connect-webhook-secret-change-me
```

Use a long random string in real use. Restart `npm run dev` after changing `.env`.

### Production (Vercel)

1. Vercel → Project → Settings → Environment Variables  
2. Add `CONNECT_WEBHOOK_SECRET` = same secret you will put in Lambda  
3. Redeploy the API  

### Lambda (AWS)

| Name | Example |
|------|---------|
| `CRM_API_URL` | `https://your-api.vercel.app` (no trailing slash) |
| `CRM_COMPANY_ID` | workspace UUID |
| `CONNECT_WEBHOOK_SECRET` | same as backend |

For local testing from Lambda you need a public tunnel (ngrok, Cloudflare Tunnel) pointing at `http://localhost:5000`, then set `CRM_API_URL` to that HTTPS URL.

---

## Ready-to-deploy Lambda (`index.js`)

Create a **Node.js 20.x** Lambda (no extra npm packages required — uses built-in `fetch`).

1. Amazon Connect contact flow → add block **Invoke AWS Lambda function** near contact end (after disconnect / after recording attributes are set).  
2. Pass contact attributes into the Lambda (Connect Event payload already includes most fields; adjust attribute names if your flow uses custom ones).  
3. Paste this as the Lambda handler file:

```js
/**
 * Amazon Connect → Sales Lead CRM
 * Runtime: Node.js 20.x
 * Env:
 *   CRM_API_URL              e.g. https://your-api.vercel.app
 *   CRM_COMPANY_ID           workspace UUID
 *   CONNECT_WEBHOOK_SECRET   must match backend CONNECT_WEBHOOK_SECRET
 */

exports.handler = async (event) => {
  const apiBase = (process.env.CRM_API_URL || '').replace(/\/$/, '');
  const companyId = process.env.CRM_COMPANY_ID;
  const secret = process.env.CONNECT_WEBHOOK_SECRET;

  if (!apiBase || !companyId || !secret) {
    console.error('Missing CRM_API_URL, CRM_COMPANY_ID, or CONNECT_WEBHOOK_SECRET');
    return { statusCode: 500, body: 'Missing env' };
  }

  // Connect "Invoke Lambda" often wraps Details.ContactData
  const contact =
    event?.Details?.ContactData ||
    event?.ContactData ||
    event?.Details ||
    event ||
    {};

  const attrs = contact.Attributes || contact.attributes || {};

  const contactId =
    contact.ContactId ||
    contact.contactId ||
    attrs.ContactId ||
    null;

  const customerPhoneNumber =
    contact.CustomerEndpoint?.Address ||
    contact.CustomerNumber ||
    attrs.CustomerNumber ||
    attrs.customerPhoneNumber ||
    null;

  const agentUsername =
    contact.Agent?.Username ||
    contact.AgentUsername ||
    attrs.AgentUsername ||
    attrs.agentUsername ||
    null;

  const queueName =
    contact.Queue?.Name ||
    contact.QueueName ||
    attrs.QueueName ||
    null;

  const channelRaw =
    contact.Channel ||
    attrs.Channel ||
    'VOICE';
  const channel = String(channelRaw).toUpperCase() === 'CHAT' ? 'CHAT' : 'VOICE';

  const initiationTimestamp =
    contact.InitiationTimestamp ||
    attrs.InitiationTimestamp ||
    null;

  const disconnectTimestamp =
    contact.DisconnectTimestamp ||
    attrs.DisconnectTimestamp ||
    new Date().toISOString();

  let durationSeconds = Number(attrs.durationSeconds || attrs.DurationSeconds || 0);
  if (!durationSeconds && initiationTimestamp && disconnectTimestamp) {
    const start = Date.parse(initiationTimestamp);
    const end = Date.parse(disconnectTimestamp);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      durationSeconds = Math.floor((end - start) / 1000);
    }
  }

  // Optional: set these as contact attributes in your flow
  const status =
    attrs.CallStatus ||
    attrs.status ||
    (agentUsername ? 'COMPLETED' : 'MISSED');

  const recordingUrl =
    attrs.RecordingUrl ||
    attrs.recordingUrl ||
    null;

  const body = {
    contactId,
    customerPhoneNumber,
    agentUsername,
    queueName,
    channel,
    initiationTimestamp,
    disconnectTimestamp,
    durationSeconds,
    status,
    recordingUrl,
  };

  console.log('Posting Connect contact to CRM', {
    contactId,
    customerPhoneNumber,
    agentUsername,
    channel,
    status,
  });

  const url = `${apiBase}/api/connect/contact-event?companyId=${encodeURIComponent(companyId)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': secret,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log('CRM response', res.status, text);

  if (!res.ok) {
    // Throw so Connect / CloudWatch can show failure (optional: return soft success)
    throw new Error(`CRM API ${res.status}: ${text}`);
  }

  return {
    statusCode: 200,
    body: text,
  };
};
```

### Optional contact attributes to set in the Connect flow

Before invoking Lambda, use **Set contact attributes**:

| Attribute | Example |
|-----------|---------|
| `CallStatus` | `COMPLETED` / `MISSED` / `FAILED` |
| `RecordingUrl` | S3 / Connect recording URL |
| `DurationSeconds` | if you compute duration in the flow |

---

## Local smoke test (no Lambda)

With backend running on port 5000:

```bash
curl -X POST "http://localhost:5000/api/connect/contact-event?companyId=YOUR_COMPANY_UUID" ^
  -H "Content-Type: application/json" ^
  -H "x-webhook-secret: connect-webhook-secret-change-me" ^
  -d "{\"contactId\":\"test-001\",\"customerPhoneNumber\":\"9876543210\",\"agentUsername\":\"akash\",\"queueName\":\"Sales\",\"channel\":\"VOICE\",\"initiationTimestamp\":\"2026-07-25T10:00:00.000Z\",\"disconnectTimestamp\":\"2026-07-25T10:03:00.000Z\",\"durationSeconds\":180,\"status\":\"COMPLETED\",\"recordingUrl\":null}"
```

Expect `201` with `success: true` and a `data` CallLog object. Check CRM → Call Bridge for the new row.

---

## How fields map into CallLog

| Connect / API field | CallLog column |
|---------------------|----------------|
| `contactId` | `ivrProviderCallId` |
| `customerPhoneNumber` | `customerPhone` (+ Lead match → `leadId`) |
| `agentUsername` | `ivrAgentId` (+ User match → `employeeId`) |
| status `COMPLETED` | `callStatus` = `ANSWERED`, `callType` = `INCOMING` |
| status `MISSED` | `callStatus` = `MISSED`, `callType` = `MISSED` |
| `initiationTimestamp` | `callStartTime` |
| `disconnectTimestamp` | `callEndTime` |
| `durationSeconds` | `durationSeconds` |
| `recordingUrl` | `recordingUrl` |
| channel / queue / agent | `notes` |

This reuses the same CallLog model as the existing IVR webhook — no schema change required.
