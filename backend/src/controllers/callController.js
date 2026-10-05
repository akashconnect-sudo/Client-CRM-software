import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { MAX_PAGE_SIZE } from '../constants/limits.js';
import { initiateOutboundCall } from '../services/ivrCallService.js';
import { createRecordingPresignedUrl } from '../services/recordingService.js';
import { logActivity } from '../services/leadActivityService.js';

function buildCallWhere(companyId, query, employeeScopeId) {
  const where = { companyId };
  if (employeeScopeId) where.employeeId = employeeScopeId;
  if (query.employeeId) where.employeeId = query.employeeId;
  if (query.leadId) where.leadId = query.leadId;
  if (query.callStatus) where.callStatus = query.callStatus;
  if (query.callType) where.callType = query.callType;
  if (query.fromDate || query.toDate) {
    where.callStartTime = {};
    if (query.fromDate) where.callStartTime.gte = new Date(query.fromDate);
    if (query.toDate) where.callStartTime.lte = new Date(query.toDate);
  }
  if (query.search) {
    where.customerPhone = { contains: query.search };
  }
  return where;
}

const callInclude = {
  lead: { select: { id: true, customerName: true, source: true, leadNumber: true } },
  employee: { select: { id: true, name: true, email: true } },
};

export const listCalls = asyncHandler(async (req, res) => {
  const where = buildCallWhere(req.companyId, req.query, req.employeeScopeId);

  if (req.query.source) {
    where.lead = { source: req.query.source };
  }

  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit || '20', 10) || 20), MAX_PAGE_SIZE);

  const [calls, total] = await Promise.all([
    prisma.callLog.findMany({
      where,
      include: callInclude,
      orderBy: { callStartTime: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.callLog.count({ where }),
  ]);

  res.json({ success: true, data: calls, pagination: { page, limit, total } });
});

export const getCall = asyncHandler(async (req, res) => {
  const call = await prisma.callLog.findFirst({
    where: { id: req.params.id, companyId: req.companyId },
    include: callInclude,
  });
  if (!call) return res.status(404).json({ success: false, message: 'Call not found' });
  if (req.employeeScopeId && call.employeeId !== req.employeeScopeId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  res.json({ success: true, data: call });
});

export const getCallsByEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  if (req.employeeScopeId && employeeId !== req.employeeScopeId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  const calls = await prisma.callLog.findMany({
    where: { companyId: req.companyId, employeeId },
    include: callInclude,
    orderBy: { callStartTime: 'desc' },
  });
  res.json({ success: true, data: calls });
});

export const getCallsByLead = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId: req.companyId } });
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  if (req.employeeScopeId && lead.assignedToId !== req.employeeScopeId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  const calls = await prisma.callLog.findMany({
    where: { companyId: req.companyId, leadId },
    include: callInclude,
    orderBy: { callStartTime: 'desc' },
  });
  res.json({ success: true, data: calls });
});

/**
 * GET /api/calls/:id/recording — presigned S3 URL (300s).
 * Tenant + role scoped. Key always from DB.
 */
export const getCallRecording = asyncHandler(async (req, res) => {
  const call = await prisma.callLog.findFirst({
    where: { id: req.params.id, companyId: req.companyId },
    select: {
      id: true,
      companyId: true,
      employeeId: true,
      leadId: true,
      recordingKey: true,
      recordingUrl: true,
    },
  });

  if (!call) {
    return res.status(404).json({ success: false, message: 'Call not found' });
  }

  const role = req.user.role;
  if (role === 'SALES_EMPLOYEE' && call.employeeId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  // MANAGER / SUPER_ADMIN: all calls in the company (no manager→team relation in schema)

  if (!call.recordingKey) {
    return res.status(404).json({ success: false, message: 'Recording not available yet' });
  }

  const { url, expiresIn } = await createRecordingPresignedUrl(call.recordingKey, 300);

  await prisma.callRecordingAccess.create({
    data: {
      companyId: req.companyId,
      callId: call.id,
      userId: req.user.id,
    },
  });

  if (call.leadId) {
    await logActivity(call.leadId, 'CALL_MADE', 'Call recording played', {
      callId: call.id,
      userId: req.user.id,
      action: 'RECORDING_PLAY',
    }).catch(() => {});
  }

  res.json({ success: true, data: { url, expiresIn } });
});

export const initiateCall = asyncHandler(async (req, res) => {
  const { leadId, customerPhone } = req.body;
  if (!customerPhone && !leadId) {
    return res.status(400).json({ success: false, message: 'leadId or customerPhone required' });
  }

  let lead = null;
  if (leadId) {
    lead = await prisma.lead.findFirst({ where: { id: leadId, companyId: req.companyId } });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (req.employeeScopeId && lead.assignedToId !== req.employeeScopeId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
  }

  const employeeId = req.employeeScopeId || req.body.employeeId || req.user.id;
  const phone = customerPhone || lead?.phone;

  const result = await initiateOutboundCall({
    employeeId,
    leadId: lead?.id || leadId,
    customerPhone: phone,
  });

  res.status(201).json({ success: true, ...result });
});
