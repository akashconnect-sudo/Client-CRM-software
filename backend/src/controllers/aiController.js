import { asyncHandler } from '../utils/asyncHandler.js';
import {
  enqueueAiJob,
  getAiJob,
  listAiJobs,
} from '../ai/jobService.js';
import { canAccessAI } from '../utils/moduleAccess.js';
import { isAiInferenceReady } from '../ai/inferenceClient.js';

export const getAiStatus = asyncHandler(async (req, res) => {
  const company = req.user.company;
  res.json({
    success: true,
    data: {
      enabled: canAccessAI(company),
      inferenceConfigured: isAiInferenceReady(),
      modules: company?.subscription?.modules || req.user.modules,
      billingCycleMonths:
        company?.subscription?.billingCycleMonths || req.user.billingCycleMonths || 3,
      requirements: {
        modules: ['LEADS', 'IVR'],
        billingCycleMonths: [6, 12],
      },
    },
  });
});

export const askAdvisor = asyncHandler(async (req, res) => {
  const { question, history } = req.body;
  if (!question?.trim()) {
    return res.status(400).json({ success: false, message: 'question is required' });
  }
  const job = await enqueueAiJob({
    companyId: req.companyId,
    type: 'ADVISOR_CHAT',
    payload: {
      question: String(question).slice(0, 4000),
      history: Array.isArray(history) ? history.slice(-8) : [],
    },
    requestedBy: req.user.id,
    dedupePending: false,
  });
  res.status(202).json({ success: true, data: { jobId: job.id, status: job.status } });
});

export const suggestFollowUp = asyncHandler(async (req, res) => {
  const leadId = req.params.leadId || req.body.leadId;
  if (!leadId) {
    return res.status(400).json({ success: false, message: 'leadId is required' });
  }
  const job = await enqueueAiJob({
    companyId: req.companyId,
    type: 'FOLLOWUP_DRAFT',
    leadId,
    payload: { leadId },
    requestedBy: req.user.id,
    dedupePending: false,
  });
  res.status(202).json({ success: true, data: { jobId: job.id, status: job.status } });
});

export const requestPulseReasoning = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const job = await enqueueAiJob({
    companyId: req.companyId,
    type: 'PULSE_REASONING',
    leadId,
    payload: { leadId },
    requestedBy: req.user.id,
  });
  res.status(202).json({ success: true, data: { jobId: job.id, status: job.status } });
});

export const getJob = asyncHandler(async (req, res) => {
  const job = await getAiJob(req.companyId, req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found' });
  }
  res.json({ success: true, data: job });
});

export const listJobs = asyncHandler(async (req, res) => {
  const jobs = await listAiJobs(req.companyId, {
    limit: req.query.limit,
    type: req.query.type,
  });
  res.json({ success: true, data: jobs });
});
