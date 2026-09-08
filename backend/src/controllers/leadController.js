import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildLeadWhere, findLeadByPhoneOrEmail } from '../services/leadService.js';
import { manualAssignLead } from '../services/assignmentService.js';
import { logActivity, getLeadTimeline } from '../services/leadActivityService.js';
import { isValidPhone } from '../utils/phone.js';

import { MAX_LIST_LEADS, MAX_BULK_DELETE } from '../constants/limits.js';
import { getNextLeadNumber } from '../services/leadNumberService.js';
import { checkLeadCapacity } from '../services/planEnforcementService.js';
import { planLimitMessage } from '../constants/planLimits.js';
import { enqueuePulseReasoningIfEligible } from '../ai/jobService.js';

const LIST_LEADS_MAX = MAX_LIST_LEADS;

function parseListLimit(raw) {
  if (raw === 'all' || raw === '0') return LIST_LEADS_MAX;
  const n = parseInt(raw || String(LIST_LEADS_MAX), 10);
  if (!Number.isFinite(n) || n < 1) return LIST_LEADS_MAX;
  return Math.min(n, LIST_LEADS_MAX);
}

export const listLeads = asyncHandler(async (req, res) => {
  const where = buildLeadWhere(req.companyId, req.query, req.employeeScopeId);
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = parseListLimit(req.query.limit);
  const skip = (page - 1) * limit;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  res.json({
    success: true,
    data: leads,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
      showing: leads.length,
    },
  });
});

export const getLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, phone: true } },
      notes: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      followUps: { orderBy: { scheduledAt: 'desc' }, take: 20 },
      callLogs: {
        include: { employee: { select: { id: true, name: true } } },
        orderBy: { callStartTime: 'desc' },
      },
    },
  });

  if (!lead || lead.companyId !== req.companyId) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }
  if (req.employeeScopeId && lead.assignedToId !== req.employeeScopeId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const timeline = await getLeadTimeline(id);
  const payload = { ...lead, timeline };
  if (req.employeeScopeId) {
    delete payload.callLogs;
  }
  res.json({ success: true, data: payload });
});

const SALES_EDITABLE_LEAD_FIELDS = [
  'customerName', 'phone', 'email', 'city', 'requirement', 'remarks',
  'status', 'followUpDate',
];

export const createLead = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!isValidPhone(body.phone)) {
    return res.status(400).json({ success: false, message: 'Valid phone number required' });
  }

  const existing = await findLeadByPhoneOrEmail(req.companyId, body.phone, body.email);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Lead with this phone already exists', data: existing });
  }

  const plan = req.user.company?.plan || 'STARTER';
  const leadCap = await checkLeadCapacity(req.companyId, plan, 1);
  if (!leadCap.ok) {
    return res.status(403).json({
      success: false,
      message: planLimitMessage(plan, 'leads') || 'Lead limit reached for your plan',
    });
  }

  const leadNumber = await getNextLeadNumber(req.companyId);

  const lead = await prisma.lead.create({
    data: {
      companyId: req.companyId,
      leadNumber,
      customerName: body.customerName,
      phone: body.phone,
      email: body.email,
      city: body.city,
      requirement: body.requirement,
      source: body.source || 'MANUAL',
      campaignName: body.campaignName,
      adSetName: body.adSetName,
      adName: body.adName,
      formName: body.formName,
      status: body.assignedToId ? 'ASSIGNED' : 'NEW',
      assignedToId: body.assignedToId || null,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
      remarks: body.remarks,
    },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  await logActivity(lead.id, 'LEAD_CREATED', 'Manual lead created');
  if (body.assignedToId) {
    await logActivity(lead.id, 'LEAD_ASSIGNED', 'Lead assigned on creation');
    const { notifyOnLeadAssignment } = await import('../services/notificationService.js');
    await notifyOnLeadAssignment({
      lead: { ...lead, companyId: req.companyId },
      assigneeId: body.assignedToId,
      assignedBy: { id: req.user.id, name: req.user.name, role: req.user.role },
    });
  } else if (req.body.autoAssign !== false) {
    try {
      const { autoAssignLead } = await import('../services/assignmentService.js');
      await autoAssignLead(lead.id, req.companyId);
    } catch (assignErr) {
      console.warn('[createLead] auto-assign skipped:', assignErr.message);
    }
  }

  const updated = await prisma.lead.findUnique({
    where: { id: lead.id },
    include: { assignedTo: { select: { id: true, name: true } } },
  });
  res.status(201).json({ success: true, data: updated });
});

export const bulkImportLeads = asyncHandler(async (req, res) => {
  const { leads, assignmentMode, assignToEmployeeId, assignedToId } = req.body;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ success: false, message: 'leads array required' });
  }

  if (leads.length > 5000) {
    return res.status(400).json({ success: false, message: 'Maximum 5000 rows per import' });
  }

  const mode =
    assignmentMode ||
    (assignToEmployeeId || assignedToId ? 'ASSIGN_TO' : null);

  if (!mode || !['ROUND_ROBIN', 'ASSIGN_TO'].includes(mode)) {
    return res.status(400).json({
      success: false,
      message: 'assignmentMode must be ROUND_ROBIN or ASSIGN_TO',
    });
  }

  const { importLeadsBulk } = await import('../services/leadImportService.js');
  const result = await importLeadsBulk({
    companyId: req.companyId,
    rows: leads,
    assignmentMode: mode,
    assignToEmployeeId: assignToEmployeeId || assignedToId,
    assignedBy: { id: req.user.id, name: req.user.name, role: req.user.role },
  });

  res.status(201).json({ success: true, data: result });
});

export const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.lead.findFirst({ where: { id, companyId: req.companyId } });
  if (!existing) return res.status(404).json({ success: false, message: 'Lead not found' });
  if (req.employeeScopeId && existing.assignedToId !== req.employeeScopeId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const { status, followUpDate } = req.body;
  const data = {};
  if (req.employeeScopeId) {
    for (const key of SALES_EDITABLE_LEAD_FIELDS) {
      if (req.body[key] === undefined) continue;
      if (key === 'followUpDate') {
        data.followUpDate = req.body.followUpDate ? new Date(req.body.followUpDate) : null;
      } else {
        data[key] = req.body[key];
      }
    }
  } else {
    const { status: bodyStatus, followUpDate: bodyFollowUp, ...rest } = req.body;
    Object.assign(data, rest);
    if (bodyFollowUp !== undefined) data.followUpDate = bodyFollowUp ? new Date(bodyFollowUp) : null;
    if (bodyStatus) data.status = bodyStatus;
  }

  const lead = await prisma.lead.update({
    where: { id },
    data,
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  if (status && status !== existing.status) {
    await logActivity(id, 'STATUS_CHANGED', `Status changed from ${existing.status} to ${status}`);
  }

  enqueuePulseReasoningIfEligible(req.companyId, id).catch(() => {});

  res.json({ success: true, data: lead });
});

async function deleteLeadsByIds(companyId, ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return 0;

  await prisma.callLog.updateMany({
    where: { companyId, leadId: { in: uniqueIds } },
    data: { leadId: null, isLinked: false },
  });

  const result = await prisma.lead.deleteMany({ where: { companyId, id: { in: uniqueIds } } });
  return result.count;
}

export const deleteLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await deleteLeadsByIds(req.companyId, [id]);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }
  res.json({ success: true, message: 'Lead deleted' });
});

export const bulkDeleteLeads = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ success: false, message: 'ids array is required' });
  }
  if (ids.length > MAX_BULK_DELETE) {
    return res.status(400).json({
      success: false,
      message: `Delete at most ${MAX_BULK_DELETE} leads at a time`,
    });
  }
  const deletedCount = await deleteLeadsByIds(req.companyId, ids);
  res.json({
    success: true,
    message: `${deletedCount} lead(s) deleted`,
    data: { deletedCount },
  });
});

export const assignLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId required' });
  const lead = await manualAssignLead(id, employeeId, req.companyId, {
    assignedBy: { id: req.user.id, name: req.user.name, role: req.user.role },
  });
  res.json({ success: true, data: lead });
});

export const addNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content) return res.status(400).json({ success: false, message: 'Note content required' });

  const lead = await prisma.lead.findFirst({ where: { id, companyId: req.companyId } });
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  if (req.employeeScopeId && lead.assignedToId !== req.employeeScopeId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const note = await prisma.note.create({
    data: { leadId: id, authorId: req.user.id, content },
    include: { author: { select: { id: true, name: true } } },
  });
  await logActivity(id, 'NOTE_ADDED', `Note added by ${req.user.name}`);
  enqueuePulseReasoningIfEligible(req.companyId, id).catch(() => {});
  res.status(201).json({ success: true, data: note });
});

export const addFollowUp = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { scheduledAt, remarks, employeeId } = req.body;

  const lead = await prisma.lead.findFirst({ where: { id, companyId: req.companyId } });
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
  if (req.employeeScopeId && lead.assignedToId !== req.employeeScopeId) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const empId = req.employeeScopeId || employeeId || lead.assignedToId || req.user.id;
  const followUp = await prisma.followUp.create({
    data: {
      leadId: id,
      employeeId: empId,
      scheduledAt: new Date(scheduledAt),
      remarks,
    },
    include: { employee: { select: { id: true, name: true } }, lead: { select: { id: true, customerName: true } } },
  });

  await prisma.lead.update({
    where: { id },
    data: { followUpDate: new Date(scheduledAt), status: 'FOLLOW_UP' },
  });
  await logActivity(id, 'FOLLOW_UP_SET', `Follow-up scheduled for ${scheduledAt}`);
  res.status(201).json({ success: true, data: followUp });
});
