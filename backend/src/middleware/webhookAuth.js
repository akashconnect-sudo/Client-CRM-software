import { env } from '../config/env.js';
import { getSetting } from '../services/settingsService.js';

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

export const verifyIvrWebhook = async (req, res, next) => {
  const secret = (await getSetting(req.companyId, 'ivr_webhook_secret')) || env.ivrWebhookSecret;
  const provided = req.headers['x-webhook-secret'] || req.headers['x-ivr-secret'] || req.body?.secret;
  if (secret && provided !== secret) {
    return res.status(401).json({ success: false, message: 'Invalid IVR webhook secret' });
  }
  next();
};

export const verifyConnectWebhook = async (req, res, next) => {
  const secret = env.connectWebhookSecret;
  if (!secret) {
    return res.status(503).json({
      success: false,
      message: 'CONNECT_WEBHOOK_SECRET is not configured on the server',
    });
  }
  const provided = req.headers['x-webhook-secret'] || req.body?.secret;
  if (provided !== secret) {
    return res.status(401).json({ success: false, message: 'Invalid Amazon Connect webhook secret' });
  }
  next();
};
