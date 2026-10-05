

import { ConnectClient, DescribeContactCommand } from '@aws-sdk/client-connect';
import {
  CopyObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const connect = new ConnectClient({});
const s3 = new S3Client({});

function parseCompanyMap() {
  const raw = process.env.COMPANY_MAP || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('COMPANY_MAP must be valid JSON');
  }
}

function resolveTenant(instanceId) {
  const map = parseCompanyMap();
  const entry = map[instanceId] || map['*'];
  if (!entry?.companyId || !entry?.secret) {
    throw new Error('No COMPANY_MAP entry for this Connect instance');
  }
  return entry;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postWithRetry(url, headers, body, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (res.ok) return res;
      const text = await res.text().catch(() => '');
      lastErr = new Error(`CRM webhook HTTP ${res.status}: ${text.slice(0, 200)}`);
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw lastErr;
      }
    } catch (err) {
      lastErr = err;
    }
    await sleep(500 * 2 ** i);
  }
  throw lastErr || new Error('CRM webhook failed');
}

function mapDirection(initiationMethod, agentConnected) {
  if (!agentConnected) return { call_type: 'MISSED', call_status: 'MISSED' };
  const method = String(initiationMethod || '').toUpperCase();
  if (method === 'OUTBOUND' || method === 'CALLBACK') {
    return { call_type: 'OUTGOING', call_status: 'ANSWERED' };
  }
  return { call_type: 'INCOMING', call_status: 'ANSWERED' };
}

/**
 * Parse Connect recording location into { bucket, key }.
 * Supports s3://bucket/key, { Bucket, Key }, or bare key (+ CONNECT_RECORDINGS_BUCKET).
 */
function extractRecordingLocation(contact) {
  const loc =
    contact?.Recordings?.[0]?.Location ||
    contact?.Recording?.Location ||
    contact?.AgentInfo?.Recording?.Location ||
    contact?.Recordings?.[0] ||
    null;

  if (!loc) return null;

  if (typeof loc === 'string') {
    const s3Match = loc.match(/^s3:\/\/([^/]+)\/(.+)$/i);
    if (s3Match) {
      return { bucket: s3Match[1], key: s3Match[2] };
    }
    const key = loc.replace(/^\/+/, '');
    const bucket = process.env.CONNECT_RECORDINGS_BUCKET || process.env.RECORDINGS_BUCKET;
    if (!bucket || !key) return null;
    return { bucket, key };
  }

  const bucket =
    loc.Bucket ||
    loc.bucket ||
    process.env.CONNECT_RECORDINGS_BUCKET ||
    process.env.RECORDINGS_BUCKET ||
    null;
  const key = (loc.Key || loc.key || '').replace(/^\/+/, '');
  if (!bucket || !key) return null;
  return { bucket, key };
}

function tenantRecordingKey(companyId, contactId, when = new Date()) {
  const yyyy = String(when.getUTCFullYear());
  const mm = String(when.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(when.getUTCDate()).padStart(2, '0');
  return `${companyId}/${yyyy}/${mm}/${dd}/${contactId}.wav`;
}

/**
 * Wait until the Connect recording object exists (often 1–2 minutes after disconnect),
 * then CopyObject into RECORDINGS_BUCKET under the tenant prefix.
 * Never deletes the source object.
 */
async function ensureTenantRecordingKey(companyId, contactId, source, when) {
  if (!source?.bucket || !source?.key) return null;

  const destBucket = process.env.RECORDINGS_BUCKET;
  if (!destBucket) {
    throw new Error('RECORDINGS_BUCKET is required to store call recordings');
  }

  // Already in the correct tenant layout — use as-is (must live in RECORDINGS_BUCKET for CRM playback)
  if (source.key.startsWith(`${companyId}/`)) {
    if (source.bucket !== destBucket) {
      // Same key shape but different bucket: copy into destination without renaming
      await waitAndCopy({
        sourceBucket: source.bucket,
        sourceKey: source.key,
        destBucket,
        destKey: source.key,
      });
    }
    return source.key;
  }

  const destKey = tenantRecordingKey(companyId, contactId, when);
  await waitAndCopy({
    sourceBucket: source.bucket,
    sourceKey: source.key,
    destBucket,
    destKey,
  });
  return destKey;
}

function s3CopySource(bucket, key) {
  // CopySource = "bucket/key" with each key segment URL-encoded; keep '/' separators.
  return `${bucket}/${String(key).split('/').map(encodeURIComponent).join('/')}`;
}

async function waitAndCopy({
  sourceBucket,
  sourceKey,
  destBucket,
  destKey,
  attempts = 12,
  baseDelayMs = 10_000,
}) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await s3.send(
        new HeadObjectCommand({
          Bucket: sourceBucket,
          Key: sourceKey,
        })
      );

      await s3.send(
        new CopyObjectCommand({
          Bucket: destBucket,
          Key: destKey,
          CopySource: s3CopySource(sourceBucket, sourceKey),
          MetadataDirective: 'COPY',
        })
      );
      // Source is intentionally left untouched — never delete.
      return;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await sleep(baseDelayMs * Math.min(1.5 ** i, 4));
      }
    }
  }
  throw lastErr || new Error(`Recording not available: s3://${sourceBucket}/${sourceKey}`);
}

function extractCustomerPhone(contact) {
  const ep =
    contact?.CustomerEndpoint?.Address ||
    contact?.SystemEndpoint?.Address ||
    contact?.Customer?.Endpoint?.Address ||
    null;
  return ep ? String(ep) : null;
}

function pickEventFields(event) {
  const detail = event?.detail || event;
  const contactId =
    detail?.contactId ||
    detail?.ContactId ||
    detail?.contact?.id ||
    null;
  const instanceId =
    detail?.instanceArn?.split('/').pop() ||
    detail?.instanceId ||
    detail?.InstanceId ||
    process.env.CONNECT_INSTANCE_ID ||
    null;
  const state = detail?.eventType || detail?.channel || detail?.currentEvent || '';
  return { contactId, instanceId, state, detail };
}

export async function handler(event) {
  const webhookUrl = process.env.CRM_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('CRM_WEBHOOK_URL is required');

  const { contactId, instanceId } = pickEventFields(event);
  if (!contactId || !instanceId) {
    throw new Error('contactId and instanceId are required on the event');
  }

  const tenant = resolveTenant(instanceId);

  const described = await connect.send(
    new DescribeContactCommand({
      InstanceId: instanceId,
      ContactId: contactId,
    })
  );

  const contact = described.Contact || {};
  const agentUsername =
    contact.AgentInfo?.Username ||
    contact.AgentInfo?.AgentResourceId ||
    null;
  const connectedAt = contact.AgentInfo?.ConnectedToAgentTimestamp
    ? new Date(contact.AgentInfo.ConnectedToAgentTimestamp)
    : null;
  const disconnectAt = contact.DisconnectTimestamp
    ? new Date(contact.DisconnectTimestamp)
    : new Date();
  const startAt = connectedAt || (contact.InitiationTimestamp
    ? new Date(contact.InitiationTimestamp)
    : disconnectAt);
  const duration = Math.max(0, Math.floor((disconnectAt - startAt) / 1000));
  const agentConnected = Boolean(connectedAt || contact.AgentInfo);
  const { call_type, call_status } = mapDirection(contact.InitiationMethod, agentConnected);

  const sourceLocation = extractRecordingLocation(contact);
  let recordingKey = null;
  if (sourceLocation) {
    recordingKey = await ensureTenantRecordingKey(
      tenant.companyId,
      contactId,
      sourceLocation,
      disconnectAt
    );
  }

  const payload = {
    call_id: contactId,
    ivr_provider_call_id: contactId,
    ivr_agent_id: agentUsername,
    customer_phone: extractCustomerPhone(contact),
    call_type,
    call_status,
    call_start_time: startAt.toISOString(),
    call_end_time: disconnectAt.toISOString(),
    call_duration: duration,
    recording_key: recordingKey,
    provider: 'AMAZON_CONNECT',
  };

  await postWithRetry(
    webhookUrl,
    {
      'Content-Type': 'application/json',
      'x-company-id': tenant.companyId,
      'x-webhook-secret': tenant.secret,
    },
    payload,
    3
  );

  return { ok: true, call_id: contactId, recording_key: recordingKey };
}
