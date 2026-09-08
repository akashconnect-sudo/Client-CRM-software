import crypto from 'crypto';
import prisma from '../config/db.js';
import { encryptSecret, decryptSecret } from '../utils/cryptoSecrets.js';
import { EXTERNAL_IVR_PROVIDERS } from '../integrations/ivr/index.js';
import { apiPublicUrl } from '../config/env.js';
import { env } from '../config/env.js';

export function listIvrProviders() {
  return EXTERNAL_IVR_PROVIDERS;
}

function publicWebhookUrl(req, provider, companyId, webhookSecret) {
  const base = apiPublicUrl(req) || env.apiBaseUrl || 'http://localhost:5000';
  return `${base.replace(/\/$/, '')}/api/ivr/external/${String(provider).toLowerCase()}/${companyId}?token=${webhookSecret}`;
}

export async function getIvrIntegration(companyId, req) {
  const row = await prisma.iVRIntegration.findUnique({ where: { companyId } });
  if (!row) return null;
  return {
    id: row.id,
    mode: row.mode,
    provider: row.provider,
    instanceId: row.instanceId,
    status: row.status,
    lastSyncedAt: row.lastSyncedAt,
    lastError: row.lastError,
    hasApiKey: Boolean(row.apiKey),
    hasApiSecret: Boolean(row.apiSecret),
    webhookUrl:
      row.mode === 'EXTERNAL' && row.provider
        ? publicWebhookUrl(req, row.provider, companyId, row.webhookSecret)
        : null,
    webhookSecret: row.mode === 'EXTERNAL' ? row.webhookSecret : undefined,
  };
}

export async function saveExternalIvrIntegration(companyId, body, req) {
  const provider = String(body.provider || 'OTHER').toUpperCase();
  if (!EXTERNAL_IVR_PROVIDERS.includes(provider)) {
    throw Object.assign(new Error('Unsupported IVR provider'), { statusCode: 400 });
  }

  const existing = await prisma.iVRIntegration.findUnique({ where: { companyId } });
  if (existing?.mode === 'NATIVE' && existing.status === 'CONNECTED') {
    // Allow EXTERNAL overwrite only if company wants BYO — NATIVE module buyers keep native
    const sub = await prisma.workspaceSubscription.findUnique({ where: { companyId } });
    if (sub?.modules?.includes('IVR') && body.force !== true) {
      throw Object.assign(
        new Error('This workspace uses native IVR. External BYO is for Leads-only workspaces.'),
        { statusCode: 400, code: 'NATIVE_IVR_ACTIVE' }
      );
    }
  }

  const webhookSecret = existing?.webhookSecret || crypto.randomUUID();
  const data = {
    mode: 'EXTERNAL',
    provider,
    instanceId: body.instanceId ? String(body.instanceId).trim() : null,
    webhookSecret,
    status: 'PENDING_VERIFICATION',
    lastError: null,
  };
  if (body.apiKey != null && String(body.apiKey).trim()) {
    data.apiKey = encryptSecret(String(body.apiKey).trim());
  }
  if (body.apiSecret != null && String(body.apiSecret).trim()) {
    data.apiSecret = encryptSecret(String(body.apiSecret).trim());
  }

  const row = await prisma.iVRIntegration.upsert({
    where: { companyId },
    create: { companyId, ...data, apiKey: data.apiKey || null, apiSecret: data.apiSecret || null },
    update: data,
  });

  return getIvrIntegration(companyId, req);
}

export async function testExternalIvrConnection(companyId) {
  const row = await prisma.iVRIntegration.findUnique({ where: { companyId } });
  if (!row || row.mode !== 'EXTERNAL') {
    throw Object.assign(new Error('No external IVR integration configured'), { statusCode: 404 });
  }
  if (!row.apiKey && !row.instanceId) {
    throw Object.assign(new Error('Add API key or instance id before testing'), { statusCode: 400 });
  }

  try {
    // Lightweight credential presence check — vendor-specific live probes can be added later
    if (row.apiKey) decryptSecret(row.apiKey);
    if (row.apiSecret) decryptSecret(row.apiSecret);

    const updated = await prisma.iVRIntegration.update({
      where: { companyId },
      data: { status: 'CONNECTED', lastSyncedAt: new Date(), lastError: null },
    });
    return { ok: true, status: updated.status };
  } catch (err) {
    await prisma.iVRIntegration.update({
      where: { companyId },
      data: { status: 'ERROR', lastError: err.message },
    });
    throw Object.assign(new Error(`Connection test failed: ${err.message}`), { statusCode: 400 });
  }
}

export async function findIntegrationByWebhook(companyId, token) {
  const row = await prisma.iVRIntegration.findUnique({ where: { companyId } });
  if (!row || row.mode !== 'EXTERNAL') return null;
  if (token !== row.webhookSecret) return null;
  return row;
}
