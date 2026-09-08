import prisma from '../config/db.js';
import { canAccessAI } from '../utils/moduleAccess.js';
import { createNotification } from '../services/notificationService.js';

export async function enqueueAiJob({
  companyId,
  type,
  payload = {},
  leadId = null,
  callLogId = null,
  requestedBy = null,
  dedupePending = true,
}) {
  if (!companyId || !type) {
    throw Object.assign(new Error('companyId and type required'), { statusCode: 400 });
  }

  if (dedupePending && callLogId) {
    const existing = await prisma.aiJob.findFirst({
      where: {
        companyId,
        callLogId,
        type,
        status: { in: ['PENDING', 'RUNNING'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
  }

  if (dedupePending && leadId && type === 'PULSE_REASONING') {
    const existing = await prisma.aiJob.findFirst({
      where: {
        companyId,
        leadId,
        type,
        status: { in: ['PENDING', 'RUNNING'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
  }

  return prisma.aiJob.create({
    data: {
      companyId,
      type,
      payload,
      leadId,
      callLogId,
      requestedBy,
      status: 'PENDING',
    },
  });
}

export async function getAiJob(companyId, jobId) {
  return prisma.aiJob.findFirst({ where: { id: jobId, companyId } });
}

export async function listAiJobs(companyId, { limit = 20, type } = {}) {
  return prisma.aiJob.findMany({
    where: {
      companyId,
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit) || 20, 50),
  });
}

/** Load company with subscription for entitlement checks in background. */
export async function loadCompanyForAI(companyId) {
  return prisma.company.findUnique({
    where: { id: companyId },
    include: { subscription: true, ivrIntegration: true },
  });
}

export async function enqueueCallAnalysisIfEligible(companyId, callLog, { hadRecordingBefore }) {
  if (!callLog?.recordingUrl) return null;
  if (hadRecordingBefore) return null;
  const company = await loadCompanyForAI(companyId);
  if (!canAccessAI(company)) return null;
  return enqueueAiJob({
    companyId,
    type: 'CALL_ANALYSIS',
    callLogId: callLog.id,
    leadId: callLog.leadId || null,
    payload: { recordingUrl: callLog.recordingUrl },
  });
}

export async function enqueuePulseReasoningIfEligible(companyId, leadId) {
  if (!leadId) return null;
  const company = await loadCompanyForAI(companyId);
  if (!canAccessAI(company)) return null;
  return enqueueAiJob({
    companyId,
    type: 'PULSE_REASONING',
    leadId,
    payload: { leadId },
  });
}

export async function notifyJobDone(job, title, message) {
  if (!job.requestedBy) return;
  try {
    await createNotification({
      userId: job.requestedBy,
      type: 'AI_JOB_DONE',
      title,
      message,
      leadId: job.leadId || undefined,
      callId: job.callLogId || undefined,
    });
  } catch {
    try {
      await createNotification({
        userId: job.requestedBy,
        type: 'ADMIN_NOTICE',
        title,
        message,
        leadId: job.leadId || undefined,
        callId: job.callLogId || undefined,
      });
    } catch {
      /* ignore */
    }
  }
}
