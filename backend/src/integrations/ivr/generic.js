/** Generic / Other / Ozonetel / MyOperator — accept CRM-normalized or common aliases */
export function normalizeGeneric(body = {}, provider = 'OTHER') {
  const direction = String(body.direction || body.Direction || 'INBOUND').toUpperCase().includes('OUT')
    ? 'OUTBOUND'
    : 'INBOUND';
  const customerPhone =
    body.customerPhone ||
    body.customerPhoneNumber ||
    body.fromNumber ||
    body.toNumber ||
    body.phone ||
    body.From ||
    body.To;

  const statusRaw = body.status || body.callStatus || body.CallStatus || 'COMPLETED';
  let status = 'COMPLETED';
  if (/miss/i.test(statusRaw)) status = 'MISSED';
  else if (/fail/i.test(statusRaw)) status = 'FAILED';
  else if (/busy/i.test(statusRaw)) status = 'BUSY';
  else if (/answer|complete/i.test(statusRaw)) status = 'COMPLETED';

  return {
    externalCallId: String(
      body.externalCallId || body.contactId || body.callId || body.CallSid || body.id || ''
    ),
    customerPhone,
    agentUsername: body.agentUsername || body.agentExtension || body.agentId || null,
    agentExtension: body.agentExtension || null,
    direction: body.direction === 'OUTBOUND' || direction === 'OUTBOUND' ? 'OUTBOUND' : 'INBOUND',
    durationSeconds: parseInt(body.durationSeconds || body.duration || 0, 10),
    status,
    recordingUrl: body.recordingUrl || body.RecordingUrl || null,
    startedAt: body.startedAt || body.initiationTimestamp || body.startTime || null,
    endedAt: body.endedAt || body.disconnectTimestamp || body.endTime || null,
    notes: body.notes || `${provider} external IVR`,
    sourceMode: 'EXTERNAL_IVR',
    provider: String(provider || 'OTHER').toUpperCase(),
  };
}
