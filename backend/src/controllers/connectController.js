import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { processConnectContactEvent } from '../services/connectService.js';

async function logWebhook(companyId, provider, payload, status, message) {
  await prisma.webhookLog.create({
    data: { companyId, provider, payload, status, message },
  });
}

export const contactEvent = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  await logWebhook(req.companyId, 'AMAZON_CONNECT', payload, 'RECEIVED', null);

  try {
    const { callLog, created } = await processConnectContactEvent(payload, req.companyId);
    await logWebhook(req.companyId, 'AMAZON_CONNECT', payload, 'SUCCESS', callLog.id);
    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Amazon Connect contact saved' : 'Amazon Connect contact updated',
      data: callLog,
    });
  } catch (err) {
    await logWebhook(req.companyId, 'AMAZON_CONNECT', payload, 'ERROR', err.message);
    throw err;
  }
});
