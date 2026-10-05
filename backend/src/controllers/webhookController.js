import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { upsertLeadFromWebhook } from '../services/leadService.js';
import { processIvrCallCompleted } from '../services/ivrService.js';
import { createNotification } from '../services/notificationService.js';
import { env } from '../config/env.js';
import { getSetting } from '../services/settingsService.js';

async function logWebhook(companyId, provider, payload, status, message) {
  await prisma.webhookLog.create({
    data: { companyId, provider, payload, status, message },
  });
}

export const googleLeads = asyncHandler(async (req, res) => {
  const payload = req.body;
  await logWebhook(req.companyId, 'GOOGLE_ADS', payload, 'RECEIVED', null);

  try {
    const {
      full_name,
      customer_name,
      name,
      phone_number,
      phone,
      email,
      city,
      message,
      requirement,
      campaign_name,
      campaign,
      ad_set_name,
      ad_name,
      form_name,
    } = payload;

    const result = await upsertLeadFromWebhook({
      companyId: req.companyId,
      customerName: full_name || customer_name || name || 'Google Lead',
      phone: phone_number || phone,
      email,
      city,
      requirement: message || requirement,
      source: 'GOOGLE_ADS',
      campaignName: campaign_name || campaign,
      adSetName: ad_set_name,
      adName: ad_name,
      formName: form_name,
    });

    if (result.isDuplicate && result.lead.assignedToId) {
      await createNotification({
        userId: result.lead.assignedToId,
        type: 'DUPLICATE_LEAD',
        title: 'Duplicate lead activity',
        message: `Existing lead ${result.lead.customerName} received again from Google Ads`,
        leadId: result.lead.id,
      });
    }

    await logWebhook(req.companyId, 'GOOGLE_ADS', payload, 'SUCCESS', result.isDuplicate ? 'DUPLICATE' : 'CREATED');
    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      message: result.isDuplicate ? 'Duplicate lead - activity logged' : 'Lead created',
      data: result.lead,
      isDuplicate: result.isDuplicate,
    });
  } catch (err) {
    await logWebhook(req.companyId, 'GOOGLE_ADS', payload, 'ERROR', err.message);
    throw err;
  }
});

export const metaLeads = asyncHandler(async (req, res) => {
  // Meta webhook verification (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const verifyToken =
      (await getSetting(req.companyId, 'meta_webhook_token')) || env.metaWebhookVerifyToken;
    if (mode === 'subscribe' && token === verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  const payload = req.body;
  await logWebhook(req.companyId, 'META_ADS', payload, 'RECEIVED', null);

  try {
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const leadgen = change?.value;
    const fieldData = leadgen?.field_data || payload.field_data || [];

    const getField = (name) => {
      const f = fieldData.find((x) => x.name === name || x.name?.toLowerCase() === name);
      return f?.values?.[0] || '';
    };

    const result = await upsertLeadFromWebhook({
      companyId: req.companyId,
      customerName: getField('full_name') || getField('first_name') || payload.customer_name || 'Meta Lead',
      phone: getField('phone_number') || getField('phone') || payload.phone,
      email: getField('email') || payload.email,
      city: getField('city') || getField('location'),
      requirement: getField('message') || getField('requirement'),
      source: 'META_ADS',
      campaignName: leadgen?.campaign_name || payload.campaign_name,
      adSetName: leadgen?.adset_name || payload.ad_set_name,
      adName: leadgen?.ad_name || payload.ad_name,
      formName: leadgen?.form_name || payload.form_name,
    });

    if (result.isDuplicate && result.lead.assignedToId) {
      await createNotification({
        userId: result.lead.assignedToId,
        type: 'DUPLICATE_LEAD',
        title: 'Duplicate lead activity',
        message: `Existing lead received again from Meta Ads`,
        leadId: result.lead.id,
      });
    }

    await logWebhook(req.companyId, 'META_ADS', payload, 'SUCCESS', result.isDuplicate ? 'DUPLICATE' : 'CREATED');
    res.status(result.isDuplicate ? 200 : 201).json({
      success: true,
      message: result.isDuplicate ? 'Duplicate lead - activity logged' : 'Lead created',
      data: result.lead,
      isDuplicate: result.isDuplicate,
    });
  } catch (err) {
    await logWebhook(req.companyId, 'META_ADS', payload, 'ERROR', err.message);
    throw err;
  }
});

export const ivrCallCompleted = asyncHandler(async (req, res) => {
  const payload = req.body;
  await logWebhook(req.companyId, 'IVR', payload, 'RECEIVED', null);

  try {
    const { callLog, created } = await processIvrCallCompleted(payload, req.companyId);
    await logWebhook(req.companyId, 'IVR', payload, 'SUCCESS', callLog.id);
    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Call log saved' : 'Call log updated',
      data: callLog,
      created,
    });
  } catch (err) {
    await logWebhook(req.companyId, 'IVR', payload, 'ERROR', err.message);
    throw err;
  }
});
