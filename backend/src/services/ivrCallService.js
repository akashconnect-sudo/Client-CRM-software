import prisma from '../config/db.js';
import { getSetting } from './settingsService.js';
import { processIvrCallCompleted } from './ivrService.js';

/**
 * Initiate outbound call via IVR API.
 * When ivr_api_url is not set, runs demo mode and saves call + recording via webhook logic.
 */
export async function initiateOutboundCall({ employeeId, leadId, customerPhone }) {
  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    include: { company: { select: { id: true, gstin: true } } },
  });
  if (!employee) {
    throw Object.assign(new Error('Employee not found'), { statusCode: 404 });
  }
  if (!employee.ivrAgentId && !employee.ivrExtension) {
    throw Object.assign(
      new Error('Your profile has no IVR Agent ID. Ask Super Admin to set it in Employees.'),
      { statusCode: 400 }
    );
  }

  const ivrApiUrl = (await getSetting(employee.companyId, 'ivr_api_url'))?.replace(/\/$/, '');
  const ivrApiKey = await getSetting(employee.companyId, 'ivr_api_key');
  const apiBase = (await getSetting(employee.companyId, 'api_base_url')) || 'http://localhost:5000';

  const payload = {
    agent_id: employee.ivrAgentId,
    extension: employee.ivrExtension,
    customer_phone: customerPhone,
    lead_id: leadId,
    employee_id: employeeId,
    callback_url: `${apiBase}/api/webhooks/ivr-call-completed?gstin=${encodeURIComponent(employee.company?.gstin || '')}`,
  };

  if (ivrApiUrl && ivrApiKey) {
    const res = await fetch(`${ivrApiUrl}/calls/outbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ivrApiKey}`,
        'X-API-Key': ivrApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw Object.assign(new Error(`IVR API error: ${text || res.statusText}`), { statusCode: 502 });
    }

    const data = await res.json().catch(() => ({}));
    return { mode: 'ivr', message: 'Call initiated via IVR. Recording will save when call ends.', data };
  }

  const now = new Date();
  const end = new Date(now.getTime() + 8000);
  const { callLog } = await processIvrCallCompleted({
    call_id: `DEMO-${Date.now()}`,
    ivr_provider_call_id: `DEMO-${Date.now()}`,
    ivr_agent_id: employee.ivrAgentId,
    customer_phone: customerPhone,
    employee_id: employeeId,
    lead_id: leadId,
    call_type: 'OUTGOING',
    call_status: 'ANSWERED',
    call_start_time: now.toISOString(),
    call_end_time: end.toISOString(),
    call_duration: 8,
    recording_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    notes: 'Demo IVR call — set ivr_api_url in Settings for live IVR',
  }, employee.companyId);

  return { mode: 'demo', message: 'Demo call completed. Recording saved.', data: callLog };
}
