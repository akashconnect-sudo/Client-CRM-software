import { env } from '../config/env.js';
import prisma from '../config/db.js';
import { getSetting } from '../services/settingsService.js';
import { secretsEqual } from '../utils/secretsEqual.js';

export const verifyGoogleWebhook = async (req, res, next) => {
  const secret =
    (await getSetting(req.companyId, 'google_webhook_secret')) || env.googleWebhookSecret;
  const provided = req.headers['x-webhook-secret'] || req.body?.secret;
  if (secret && provided !== secret) {
    return res.status(401).json({ success: false, message: 'Invalid Google webhook secret' });
  }
  next();
};

export const verifyMetaWebhook = async (req, res, next) => {
  if (req.method === 'GET') return next();
  const secret = (await getSetting(req.companyId, 'meta_webhook_secret')) || env.metaWebhookSecret;
  const provided = req.headers['x-hub-signature-256'] || req.headers['x-webhook-secret'];
  if (secret && provided && provided !== secret) {
    return res.status(401).json({ success: false, message: 'Invalid Meta webhook secret' });
  }
  next();
};

/**
 * Fail-closed IVR / Amazon Connect webhook auth.
 * Secret from IVRIntegration.webhookSecret, else settings ivr_webhook_secret.
 * Header only: x-webhook-secret. No global env fallback.
 */
export const verifyIvrWebhook = async (req, res, next) => {
  try {
    if (!req.companyId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const provided = req.headers['x-webhook-secret'];
    if (typeof provided !== 'string' || !provided) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const integration = await prisma.iVRIntegration.findUnique({
      where: { companyId: req.companyId },
      select: { webhookSecret: true },
    });
    const fromIntegration = integration?.webhookSecret ? String(integration.webhookSecret) : '';
    const fromSetting = String((await getSetting(req.companyId, 'ivr_webhook_secret')) || '');
    const expected = fromIntegration || fromSetting;

    if (!expected || !secretsEqual(provided, expected)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

export const verifyConnectWebhook = async (req, res, next) => {
  const secret = env.connectWebhookSecret;
  if (!secret) {
    return res.status(503).json({
      success: false,
      message: 'CONNECT_WEBHOOK_SECRET is not configured on the server',
    });
  }
  const provided = req.headers['x-webhook-secret'];
  if (typeof provided !== 'string' || !secretsEqual(provided, secret)) {
    return res.status(401).json({ success: false, message: 'Invalid Amazon Connect webhook secret' });
  }
  next();
};
