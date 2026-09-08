import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getIvrIntegration,
  saveExternalIvrIntegration,
  testExternalIvrConnection,
  listIvrProviders,
  findIntegrationByWebhook,
} from '../services/ivrIntegrationService.js';
import { normalizeExternalIvrPayload } from '../integrations/ivr/index.js';
import { upsertNormalizedCall } from '../services/callUpsertService.js';
import { canAccessLeads, getSubscriptionSnapshot } from '../utils/moduleAccess.js';
import prisma from '../config/db.js';

export const providers = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: listIvrProviders() });
});

export const getIntegration = asyncHandler(async (req, res) => {
  const data = await getIvrIntegration(req.companyId, req);
  const company = await prisma.company.findUnique({
    where: { id: req.companyId },
    include: { subscription: true, ivrIntegration: true },
  });
  const snap = getSubscriptionSnapshot(company);
  res.json({
    success: true,
    data: {
      integration: data,
      hasIvrModule: snap.modules.includes('IVR'),
      hasLeadsModule: snap.modules.includes('LEADS'),
      canConnectExternal: !snap.modules.includes('IVR') || canAccessLeads(company),
    },
  });
});

export const saveIntegration = asyncHandler(async (req, res) => {
  const data = await saveExternalIvrIntegration(req.companyId, req.body || {}, req);
  res.json({ success: true, message: 'IVR integration saved', data });
});

export const testIntegration = asyncHandler(async (req, res) => {
  const data = await testExternalIvrConnection(req.companyId);
  res.json({ success: true, message: 'Connection verified', data });
});

export const externalWebhook = asyncHandler(async (req, res) => {
  const provider = String(req.params.provider || 'other').toUpperCase();
  const companyId = req.params.companyId;
  const token = req.query.token || req.headers['x-webhook-secret'];

  const integration = await findIntegrationByWebhook(companyId, token);
  if (!integration) {
    return res.status(401).json({ success: false, message: 'Invalid webhook token' });
  }

  const normalized = normalizeExternalIvrPayload(provider, req.body || {});
  if (integration.provider && integration.provider !== 'OTHER') {
    normalized.provider = integration.provider;
  }

  const { callLog, created } = await upsertNormalizedCall(companyId, normalized);

  await prisma.iVRIntegration.update({
    where: { companyId },
    data: { lastSyncedAt: new Date(), status: 'CONNECTED', lastError: null },
  }).catch(() => {});

  res.status(created ? 201 : 200).json({
    success: true,
    message: created ? 'External call saved' : 'External call updated',
    data: callLog,
  });
});
