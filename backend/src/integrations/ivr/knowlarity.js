/** Normalize Knowlarity / similar Indian CPaaS webhook */
export function normalizeKnowlarity(body = {}) {
  const direction = String(body.call_type || body.direction || 'inbound').toLowerCase().includes('out')
    ? 'OUTBOUND'
    : 'INBOUND';
  const customerPhone = body.customer_number || body.caller_id || body.from || body.phone;
  const statusRaw = body.call_status || body.status || 'COMPLETED';
  let status = 'COMPLETED';
  if (/miss|no.?answer/i.test(statusRaw)) status = 'MISSED';
  else if (/fail/i.test(statusRaw)) status = 'FAILED';
  else if (/busy/i.test(statusRaw)) status = 'BUSY';

  return {
    externalCallId: String(body.call_uuid || body.uuid || body.call_id || body.id || ''),
    customerPhone,
    agentUsername: body.agent_number || body.agent_id || body.extension || null,
    agentExtension: body.extension || null,
    direction,
    durationSeconds: parseInt(body.duration || body.call_duration || 0, 10),
    status,
    recordingUrl: body.resource_url || body.recording_url || body.RecordingUrl || null,
    startedAt: body.start_time || body.started_at || null,
    endedAt: body.end_time || body.ended_at || null,
    notes: `Knowlarity · ${statusRaw}`,
    sourceMode: 'EXTERNAL_IVR',
    provider: 'KNOWLARITY',
  };
}
