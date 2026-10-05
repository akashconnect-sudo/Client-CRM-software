import prisma from '../config/db.js';
import { normalizePhone } from '../utils/phone.js';
import { logActivity } from './leadActivityService.js';
import { createNotification } from './notificationService.js';
import { enqueueCallAnalysisIfEligible } from '../ai/jobService.js';
import { enqueuePulseReasoningIfEligible } from '../ai/jobService.js';

const STATUS_MAP = {
  COMPLETED: 'ANSWERED',
  ANSWERED: 'ANSWERED',
  MISSED: 'MISSED',
  FAILED: 'FAILED',
  BUSY: 'BUSY',
  completed: 'ANSWERED',
  answered: 'ANSWERED',
  missed: 'MISSED',
  failed: 'FAILED',
  busy: 'BUSY',
};

export async function resolveEmployeeByAgentUsername(companyId, agentUsername) {
  if (!agentUsername) return null;
  const username = String(agentUsername).trim();
  if (!username) return null;

  const byIvr = await prisma.user.findFirst({
    where: { companyId, status: 'ACTIVE', ivrAgentId: username },
  });
  if (byIvr) return byIvr;

  const users = await prisma.user.findMany({
    where: { companyId, status: 'ACTIVE' },
    select: { id: true, name: true, email: true, ivrAgentId: true },
  });

  const lower = username.toLowerCase();
  const byEmail = users.find((u) => {
    const local = String(u.email || '').split('@')[0]?.toLowerCase();
    return local === lower;
  });
  if (byEmail) return prisma.user.findFirst({ where: { id: byEmail.id, companyId } });

  const byName = users.find((u) => String(u.name || '').trim().toLowerCase() === lower);
  if (byName) return prisma.user.findFirst({ where: { id: byName.id, companyId } });

  return null;
}

export async function resolveLeadByPhone(companyId, customerPhone) {
  const normalized = normalizePhone(customerPhone);
  if (!normalized) return null;

  const suffix = normalized.slice(-10);
  const candidates = await prisma.lead.findMany({
    where: { companyId, phone: { contains: suffix } },
    select: { id: true, phone: true, customerName: true, status: true },
    take: 10,
  });
  return candidates.find((l) => normalizePhone(l.phone) === normalized) || null;
}

/** Reject keys that do not belong to this tenant prefix. */
export function sanitizeRecordingKey(companyId, key) {
  if (key == null || key === '') return null;
  const value = String(key).trim().replace(/^\/+/, '');
  if (!value) return null;
  const prefix = `${companyId}/`;
  if (!value.startsWith(prefix)) return null;
  if (value.includes('..')) return null;
  return value;
}

/**
 * Shared CallLog upsert for native Connect, external IVR webhooks, and legacy IVR.
 *
 * Normalized input:
 * {
 *   externalCallId, customerPhone, agentUsername, agentExtension,
 *   direction: INBOUND|OUTBOUND, callType, durationSeconds, status,
 *   recordingUrl, recordingKey, startedAt, endedAt, notes, sourceMode, provider
 * }
 */
export async function upsertNormalizedCall(companyId, input) {
  const externalCallId = input.externalCallId ? String(input.externalCallId).trim() : null;
  if (!externalCallId) {
    throw Object.assign(new Error('externalCallId / contactId is required'), { statusCode: 400 });
  }

  const rawPhone =
    input.customerPhone == null || input.customerPhone === ''
      ? null
      : String(input.customerPhone).trim();
  const phone = rawPhone || null;
  const agentKey = input.agentUsername || input.agentExtension || null;

  let employee = await resolveEmployeeByAgentUsername(companyId, agentKey);
  if (!employee && input.employeeId) {
    employee = await prisma.user.findFirst({
      where: { id: input.employeeId, companyId, status: 'ACTIVE' },
    });
  }

  let lead = null;
  if (input.leadId) {
    lead = await prisma.lead.findFirst({ where: { id: input.leadId, companyId } });
  }
  if (!lead && phone) {
    lead = await resolveLeadByPhone(companyId, phone);
  }

  const callStatus = STATUS_MAP[input.status] || 'ANSWERED';
  let callType = input.callType || null;
  if (!callType || !['INCOMING', 'OUTGOING', 'MISSED'].includes(callType)) {
    callType = 'INCOMING';
    if (callStatus === 'MISSED') callType = 'MISSED';
    else if (String(input.direction || '').toUpperCase() === 'OUTBOUND') callType = 'OUTGOING';
  }

  const start = input.startedAt ? new Date(input.startedAt) : new Date();
  const end = input.endedAt ? new Date(input.endedAt) : null;
  const duration =
    parseInt(input.durationSeconds, 10) ||
    (end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
      ? Math.max(0, Math.floor((end - start) / 1000))
      : 0);

  const sourceMode = input.sourceMode || 'NATIVE_IVR';
  const provider = input.provider || null;
  const notes = input.notes || null;
  const recordingKey = sanitizeRecordingKey(companyId, input.recordingKey);

  const include = {
    lead: { select: { id: true, customerName: true, source: true, leadNumber: true } },
    employee: { select: { id: true, name: true } },
  };

  const existing = await prisma.callLog.findFirst({
    where: {
      companyId,
      OR: [
        { externalCallId },
        { ivrProviderCallId: externalCallId },
      ],
    },
  });

  const hadRecordingBefore = Boolean(existing?.recordingUrl || existing?.recordingKey);

  const data = {
    leadId: lead?.id || existing?.leadId || null,
    employeeId: employee?.id || existing?.employeeId || null,
    customerPhone: phone ?? existing?.customerPhone ?? null,
    ivrAgentId: agentKey ? String(agentKey) : existing?.ivrAgentId || null,
    callType,
    callStatus,
    callStartTime: start,
    callEndTime: end,
    durationSeconds: duration,
    recordingUrl: input.recordingUrl || existing?.recordingUrl || null,
    recordingKey: recordingKey || existing?.recordingKey || null,
    ivrProviderCallId: externalCallId,
    externalCallId,
    sourceMode,
    provider,
    notes: notes || existing?.notes || null,
    isLinked: !!(lead && employee),
  };

  let callLog;
  let created = false;

  if (existing) {
    callLog = await prisma.callLog.update({
      where: { id: existing.id },
      data,
      include,
    });
  } else {
    callLog = await prisma.callLog.create({
      data: { companyId, ...data },
      include,
    });
    created = true;
  }

  if (created && lead) {
    await logActivity(
      lead.id,
      'CALL_MADE',
      `${provider || sourceMode} ${callStatus} - ${duration}s`,
      { callId: callLog.id, externalCallId, recordingUrl: input.recordingUrl }
    );
    if (lead.status === 'NEW' || lead.status === 'ASSIGNED') {
      await prisma.lead.update({ where: { id: lead.id }, data: { status: 'CONTACTED' } });
      await logActivity(lead.id, 'STATUS_CHANGED', 'Status updated to CONTACTED after call');
    }
  }

  const hasNewRecording = Boolean(input.recordingUrl || recordingKey);
  if (employee && hasNewRecording && !hadRecordingBefore) {
    await createNotification({
      userId: employee.id,
      type: 'CALL_RECORDING',
      title: 'Call recording saved',
      message: lead
        ? `Recording saved for lead ${lead.customerName}`
        : `Recording saved for ${phone || externalCallId}`,
      leadId: lead?.id,
      callId: callLog.id,
    });
  }

  // AI: enqueue transcript+summary+sentiment when a public recording URL first appears
  enqueueCallAnalysisIfEligible(companyId, callLog, { hadRecordingBefore }).catch(() => {});
  if (lead?.id && (created || hasNewRecording)) {
    enqueuePulseReasoningIfEligible(companyId, lead.id).catch(() => {});
  }

  return { callLog, created };
}
