import prisma from '../config/db.js';
import {
  transcribeAudio,
  mockCallAnalysis,
  mockAdvisorReply,
  isAiInferenceReady,
  chatCompletions,
} from './inferenceClient.js';
import {
  runCallAnalysisChain,
  runPulseReasoningChain,
  runFollowUpDraftChain,
} from './chains/structuredChains.js';
import { runAdvisorWithTools } from './tools.js';
import { upsertEmbedding, similaritySearch } from './rag.js';
import { notifyJobDone } from './jobService.js';
import { langchainConfigured } from './langchain.js';

async function markRunning(jobId) {
  return prisma.aiJob.update({
    where: { id: jobId },
    data: { status: 'RUNNING', startedAt: new Date(), error: null },
  });
}

async function markDone(jobId, result) {
  return prisma.aiJob.update({
    where: { id: jobId },
    data: {
      status: 'DONE',
      result,
      completedAt: new Date(),
      error: null,
    },
  });
}

async function markFailed(jobId, error) {
  return prisma.aiJob.update({
    where: { id: jobId },
    data: {
      status: 'FAILED',
      error: String(error?.message || error).slice(0, 2000),
      completedAt: new Date(),
    },
  });
}

async function processCallAnalysis(job) {
  const call = await prisma.callLog.findFirst({
    where: { id: job.callLogId, companyId: job.companyId },
  });
  if (!call) throw new Error('CallLog not found');

  let transcript = call.transcript;
  const recordingUrl = job.payload?.recordingUrl || call.recordingUrl;

  if (!transcript && recordingUrl && isAiInferenceReady()) {
    const stt = await transcribeAudio({ audioUrl: recordingUrl });
    transcript = stt?.text || stt?.transcript || '';
  }
  if (!transcript) {
    const mock = mockCallAnalysis(`Call ${call.callType} ${call.callStatus} ${call.durationSeconds}s`);
    transcript = mock.transcript;
    await prisma.callLog.update({
      where: { id: call.id },
      data: {
        transcript: mock.transcript,
        summary: mock.summary,
        sentimentLabel: mock.sentimentLabel,
        sentimentScore: mock.sentimentScore,
      },
    });
    return mock;
  }

  const analysis = await runCallAnalysisChain({ transcript });
  await prisma.callLog.update({
    where: { id: call.id },
    data: {
      transcript,
      summary: analysis.summary,
      sentimentLabel: analysis.sentimentLabel,
      sentimentScore: analysis.sentimentScore,
    },
  });

  if (analysis.summary) {
    await upsertEmbedding({
      companyId: job.companyId,
      content: `Call summary: ${analysis.summary}`,
      metadata: { callLogId: call.id, leadId: call.leadId, kind: 'call_summary' },
    });
  }

  return { transcript, ...analysis };
}

async function processPulseReasoning(job) {
  const leadId = job.leadId || job.payload?.leadId;
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, companyId: job.companyId },
    include: {
      notes: { orderBy: { createdAt: 'desc' }, take: 5, select: { content: true, createdAt: true } },
      callLogs: {
        orderBy: { callStartTime: 'desc' },
        take: 3,
        select: { summary: true, sentimentLabel: true, callStatus: true, durationSeconds: true },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { type: true, description: true, createdAt: true },
      },
    },
  });
  if (!lead) throw new Error('Lead not found');

  const leadContext = {
    customerName: lead.customerName,
    status: lead.status,
    source: lead.source,
    followUpDate: lead.followUpDate,
    requirement: lead.requirement,
    notes: lead.notes,
    calls: lead.callLogs,
    activities: lead.activities,
  };
  const reasoning = await runPulseReasoningChain({ leadContext });
  await prisma.lead.update({
    where: { id: lead.id },
    data: { pulseReasoning: reasoning },
  });
  return { pulseReasoning: reasoning };
}

async function processFollowUpDraft(job) {
  const leadId = job.leadId || job.payload?.leadId;
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, companyId: job.companyId },
    include: {
      notes: { orderBy: { createdAt: 'desc' }, take: 3, select: { content: true } },
      callLogs: {
        orderBy: { callStartTime: 'desc' },
        take: 2,
        select: { summary: true, sentimentLabel: true },
      },
    },
  });
  if (!lead) throw new Error('Lead not found');

  const draft = await runFollowUpDraftChain({
    leadContext: {
      customerName: lead.customerName,
      status: lead.status,
      requirement: lead.requirement,
      lastNotes: lead.notes.map((n) => n.content),
      lastCallSummaries: lead.callLogs.map((c) => c.summary).filter(Boolean),
    },
  });
  return { draft, humanInTheLoop: true };
}

async function processAdvisorChat(job) {
  const question = job.payload?.question || '';
  const history = Array.isArray(job.payload?.history) ? job.payload.history : [];

  let ragBits = [];
  try {
    ragBits = await similaritySearch({
      companyId: job.companyId,
      query: question,
      limit: 4,
    });
  } catch {
    ragBits = [];
  }

  const chatFn = async (messages) => {
    if (ragBits.length) {
      messages = [
        messages[0],
        {
          role: 'system',
          content: `Retrieved notes/call context:\n${ragBits.map((r) => r.content).join('\n---\n')}`,
        },
        ...messages.slice(1),
      ];
    }
    if (langchainConfigured() || isAiInferenceReady()) {
      try {
        const data = await chatCompletions({ messages, temperature: 0.25, maxTokens: 700 });
        return data?.choices?.[0]?.message?.content || '';
      } catch {
        /* mock below */
      }
    }
    return mockAdvisorReply(question).reply;
  };

  const out = await runAdvisorWithTools({
    companyId: job.companyId,
    question,
    history,
    chatFn,
  });
  return out;
}

export async function processAiJob(job) {
  await markRunning(job.id);
  try {
    let result;
    switch (job.type) {
      case 'CALL_ANALYSIS':
        result = await processCallAnalysis(job);
        break;
      case 'PULSE_REASONING':
        result = await processPulseReasoning(job);
        break;
      case 'FOLLOWUP_DRAFT':
        result = await processFollowUpDraft(job);
        break;
      case 'ADVISOR_CHAT':
        result = await processAdvisorChat(job);
        break;
      case 'INDEX_DOC':
        await upsertEmbedding({
          companyId: job.companyId,
          content: job.payload?.content || '',
          metadata: job.payload?.metadata || {},
        });
        result = { indexed: true };
        break;
      default:
        throw new Error(`Unknown AI job type: ${job.type}`);
    }
    const done = await markDone(job.id, result);
    await notifyJobDone(
      done,
      'AI ready',
      job.type === 'ADVISOR_CHAT'
        ? 'Your AI Advisor reply is ready.'
        : job.type === 'FOLLOWUP_DRAFT'
          ? 'Follow-up draft is ready to review.'
          : 'AI processing finished.'
    );
    return done;
  } catch (err) {
    await markFailed(job.id, err);
    throw err;
  }
}

export async function claimNextPendingJob() {
  const pending = await prisma.aiJob.findFirst({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });
  if (!pending) return null;
  // Optimistic claim — worker should be single-threaded or use SKIP LOCKED in SQL for scale
  return pending;
}

export async function processNextPendingJob() {
  const job = await claimNextPendingJob();
  if (!job) return null;
  return processAiJob(job);
}
