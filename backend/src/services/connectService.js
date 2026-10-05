import { upsertNormalizedCall } from './callUpsertService.js';

/**
 * Persist an Amazon Connect contact event into CallLog.
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
    recordingKey,
  } = payload;

  if (!contactId || !String(contactId).trim()) {
    throw Object.assign(new Error('contactId is required'), { statusCode: 400 });
  }

  const channelLabel = channel ? String(channel).toUpperCase() : 'VOICE';
  const noteParts = [
    `Amazon Connect (${channelLabel})`,
    queueName ? `queue: ${queueName}` : null,
    agentUsername ? `agent: ${agentUsername}` : null,
    statusRaw ? `status: ${statusRaw}` : null,
  ].filter(Boolean);

  return upsertNormalizedCall(companyId, {
    externalCallId: String(contactId),
    customerPhone: customerPhoneNumber,
    agentUsername,
    direction: 'INBOUND',
    durationSeconds,
    status: statusRaw,
    recordingUrl,
    recordingKey,
    startedAt: initiationTimestamp,
    endedAt: disconnectTimestamp,
    notes: noteParts.join(' · '),
    sourceMode: 'NATIVE_IVR',
    provider: 'AMAZON_CONNECT',
  });
}
