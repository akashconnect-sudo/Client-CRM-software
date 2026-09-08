/** Normalize Exotel call webhook → CRM shape */
export function normalizeExotel(body = {}) {
  const direction = String(body.Direction || body.direction || 'inbound').toLowerCase().includes('out')
    ? 'OUTBOUND'
    : 'INBOUND';
  const from = body.From || body.from || body.CallFrom;
  const to = body.To || body.to || body.CallTo;
  const customerPhone = direction === 'OUTBOUND' ? to : from;
  const statusRaw = body.Status || body.DialCallStatus || body.status || 'COMPLETED';
  let status = 'COMPLETED';
  if (/miss|no-answer|no_answer/i.test(statusRaw)) status = 'MISSED';
  else if (/fail|busy/i.test(statusRaw)) status = /busy/i.test(statusRaw) ? 'BUSY' : 'FAILED';

  return {
    externalCallId: String(body.CallSid || body.Sid || body.callSid || ''),
    customerPhone,
    agentUsername: body.DialWhomNumber || body.AgentId || body.agentId || null,
    agentExtension: body.DialWhomNumber || null,
    direction,
    durationSeconds: parseInt(body.ConversationDuration || body.DialCallDuration || body.Duration || 0, 10),
    status,
    recordingUrl: body.RecordingUrl || body.recordingUrl || null,
    startedAt: body.StartTime || body.startTime || null,
    endedAt: body.EndTime || body.endTime || null,
    notes: `Exotel · ${statusRaw}`,
    sourceMode: 'EXTERNAL_IVR',
    provider: 'EXOTEL',
  };
}
