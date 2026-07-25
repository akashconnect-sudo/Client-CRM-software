import prisma from '../config/db.js';
import { normalizePhone } from '../utils/phone.js';
import { logActivity } from './leadActivityService.js';
import { createNotification } from './notificationService.js';

const CONNECT_STATUS_MAP = {
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

/**
 * Match Connect agent login to a CRM user within the workspace.
 * Prefer ivrAgentId (map Connect username there in Team Grid), then email local-part, then name.
 */
async function resolveEmployeeByAgentUsername(companyId, agentUsername) {
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
  if (byEmail) {
    return prisma.user.findFirst({ where: { id: byEmail.id, companyId } });
  }

  const byName = users.find((u) => String(u.name || '').trim().toLowerCase() === lower);
  if (byName) {
    return prisma.user.findFirst({ where: { id: byName.id, companyId } });
  }

  return null;
}

async function resolveLeadByPhone(companyId, customerPhone) {
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

/**
 * Persist an Amazon Connect contact event into CallLog (same shape as IVR completions).
 */
export async function processConnectContactEvent(payload, companyId) {
  const {
    contactId,
    customerPhoneNumber,
    agentUsername,
    queueName,
    channel,
    initiationTimestamp,
    disconnectTimestamp,
    durationSeconds,
    status: statusRaw,
    recordingUrl,
  } = payload;

  if (!contactId || !String(contactId).trim()) {
    throw Object.assign(new Error('contactId is required'), { statusCode: 400 });
  }
  if (!customerPhoneNumber || !String(customerPhoneNumber).trim()) {
    throw Object.assign(new Error('customerPhoneNumber is required'), { statusCode: 400 });
  }

  const phone = String(customerPhoneNumber).trim();
  const employee = await resolveEmployeeByAgentUsername(companyId, agentUsername);
  const lead = await resolveLeadByPhone(companyId, phone);

  const callStatus = CONNECT_STATUS_MAP[statusRaw] || 'ANSWERED';
  const callType = callStatus === 'MISSED' ? 'MISSED' : 'INCOMING';
  const start = initiationTimestamp ? new Date(initiationTimestamp) : new Date();
  const end = disconnectTimestamp ? new Date(disconnectTimestamp) : null;
  const duration =
    parseInt(durationSeconds, 10) ||
    (end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
      ? Math.max(0, Math.floor((end - start) / 1000))
      : 0);

  const channelLabel = channel ? String(channel).toUpperCase() : 'VOICE';
  const noteParts = [
    `Amazon Connect (${channelLabel})`,
    queueName ? `queue: ${queueName}` : null,
    agentUsername ? `agent: ${agentUsername}` : null,
    statusRaw ? `status: ${statusRaw}` : null,
  ].filter(Boolean);

  // Idempotent on Connect contactId retries
  const existing = await prisma.callLog.findFirst({
    where: { companyId, ivrProviderCallId: String(contactId) },
  });
  if (existing) {
    const updated = await prisma.callLog.update({
      where: { id: existing.id },
      data: {
        leadId: lead?.id || existing.leadId,
        employeeId: employee?.id || existing.employeeId,
        customerPhone: phone,
        ivrAgentId: agentUsername ? String(agentUsername) : existing.ivrAgentId,
        callType,
        callStatus,
        callStartTime: start,
        callEndTime: end,
        durationSeconds: duration,
        recordingUrl: recordingUrl || existing.recordingUrl,
        notes: noteParts.join(' · '),
        isLinked: !!(lead && employee),
      },
      include: {
        lead: { select: { id: true, customerName: true, source: true, leadNumber: true } },
        employee: { select: { id: true, name: true } },
      },
    });
    return { callLog: updated, created: false };
  }

  const callLog = await prisma.callLog.create({
    data: {
      companyId,
      leadId: lead?.id || null,
      employeeId: employee?.id || null,
      customerPhone: phone,
      ivrAgentId: agentUsername ? String(agentUsername) : null,
      callType,
      callStatus,
      callStartTime: start,
      callEndTime: end,
      durationSeconds: duration,
      recordingUrl: recordingUrl || null,
      ivrProviderCallId: String(contactId),
      notes: noteParts.join(' · '),
      isLinked: !!(lead && employee),
    },
    include: {
      lead: { select: { id: true, customerName: true, source: true, leadNumber: true } },
      employee: { select: { id: true, name: true } },
    },
  });

  if (lead) {
    await logActivity(lead.id, 'CALL_MADE', `Amazon Connect ${channelLabel} ${callStatus} - ${duration}s`, {
      callId: callLog.id,
      contactId,
      recordingUrl,
    });
    if (lead.status === 'NEW' || lead.status === 'ASSIGNED') {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'CONTACTED' },
      });
      await logActivity(lead.id, 'STATUS_CHANGED', 'Status updated to CONTACTED after Amazon Connect contact');
    }
  }

  if (employee && recordingUrl) {
    await createNotification({
      userId: employee.id,
      type: 'CALL_RECORDING',
      title: 'Call recording saved',
      message: lead
        ? `Amazon Connect recording saved for lead ${lead.customerName}`
        : `Amazon Connect recording saved for ${phone}`,
      leadId: lead?.id,
      callId: callLog.id,
    });
  }

  return { callLog, created: true };
}
