import { upsertNormalizedCall } from './callUpsertService.js';

const CALL_TYPE_MAP = {
  incoming: 'INCOMING',
  outgoing: 'OUTGOING',
  missed: 'MISSED',
  INCOMING: 'INCOMING',
  OUTGOING: 'OUTGOING',
  MISSED: 'MISSED',
};

const CALL_STATUS_MAP = {
  answered: 'ANSWERED',
  missed: 'MISSED',
  failed: 'FAILED',
  busy: 'BUSY',
  ANSWERED: 'ANSWERED',
  MISSED: 'MISSED',
  FAILED: 'FAILED',
  BUSY: 'BUSY',
};

/**
 * Process IVR / Amazon Connect call-completed webhook.
 * Idempotent on companyId + call_id (externalCallId).
 * Returns { callLog, created }.
 */
export async function processIvrCallCompleted(payload, companyId) {
  const externalCallId = payload.call_id || payload.ivr_provider_call_id;
  if (!externalCallId) {
    throw Object.assign(new Error('call_id is required'), { statusCode: 400 });
  }

  const callType = CALL_TYPE_MAP[payload.call_type] || 'OUTGOING';
  const callStatus = CALL_STATUS_MAP[payload.call_status] || 'ANSWERED';

  let direction = 'INBOUND';
  if (callType === 'OUTGOING') direction = 'OUTBOUND';
  if (callType === 'MISSED') direction = 'INBOUND';

  const providerRaw = payload.provider ? String(payload.provider).toUpperCase() : null;
  const sourceMode =
    providerRaw === 'AMAZON_CONNECT'
      ? 'NATIVE_IVR'
      : payload.source_mode || (providerRaw ? 'EXTERNAL_IVR' : 'NATIVE_IVR');

  const { callLog, created } = await upsertNormalizedCall(companyId, {
    externalCallId: String(externalCallId),
    customerPhone: payload.customer_phone,
    agentUsername: payload.ivr_agent_id,
    direction,
    callType,
    status: callStatus,
    durationSeconds: payload.call_duration,
    recordingUrl: payload.recording_url || null,
    recordingKey: payload.recording_key || null,
    startedAt: payload.call_start_time,
    endedAt: payload.call_end_time,
    notes: payload.notes || null,
    sourceMode,
    provider: providerRaw,
    leadId: payload.lead_id || null,
    employeeId: payload.employee_id || null,
  });

  return { callLog, created };
}
