import { getChatModel, parseJsonFromText, langchainConfigured } from '../langchain.js';
import {
  chatCompletions,
  mockCallAnalysis,
  mockPulseReasoning,
  mockFollowUpDraft,
  isAiInferenceReady,
} from '../inferenceClient.js';

async function invokeText(messages, { temperature = 0.2, maxTokens = 700 } = {}) {
  if (langchainConfigured()) {
    try {
      const model = await getChatModel({ temperature, maxTokens });
      const res = await model.invoke(messages.map((m) => [m.role, m.content]));
      return typeof res?.content === 'string' ? res.content : String(res?.content ?? res);
    } catch {
      // fall through to raw OpenAI-compatible HTTP
    }
  }
  if (isAiInferenceReady()) {
    const data = await chatCompletions({ messages, temperature, maxTokens });
    return data?.choices?.[0]?.message?.content || '';
  }
  return null;
}

export async function runCallAnalysisChain({ transcript }) {
  if (!transcript && !isAiInferenceReady() && !langchainConfigured()) {
    return mockCallAnalysis('');
  }
  const messages = [
    {
      role: 'system',
      content:
        'Analyze the sales call transcript. Return ONLY JSON: {"summary":"string","sentimentLabel":"POSITIVE|NEUTRAL|NEGATIVE","sentimentScore":0-1 number}.',
    },
    { role: 'user', content: `Transcript:\n${transcript}` },
  ];
  const text = await invokeText(messages);
  if (!text) return mockCallAnalysis(transcript);
  try {
    const parsed = parseJsonFromText(text);
    const label = String(parsed.sentimentLabel || 'NEUTRAL').toUpperCase();
    return {
      summary: String(parsed.summary || '').slice(0, 2000),
      sentimentLabel: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(label) ? label : 'NEUTRAL',
      sentimentScore: Math.min(1, Math.max(0, Number(parsed.sentimentScore) || 0.5)),
    };
  } catch {
    return mockCallAnalysis(transcript);
  }
}

export async function runPulseReasoningChain({ leadContext }) {
  const messages = [
    {
      role: 'system',
      content:
        'Write one short Lead Pulse reasoning sentence for a sales CRM (max 28 words). Mention urgency and evidence from activity. No JSON — plain text only.',
    },
    { role: 'user', content: JSON.stringify(leadContext) },
  ];
  const text = await invokeText(messages, { temperature: 0.3, maxTokens: 120 });
  if (!text) {
    return mockPulseReasoning({
      status: leadContext?.status,
      scoreHint: leadContext?.pulseLabel,
    });
  }
  return String(text).replace(/^["']|["']$/g, '').trim().slice(0, 400);
}

export async function runFollowUpDraftChain({ leadContext }) {
  const messages = [
    {
      role: 'system',
      content:
        'Draft a short, professional follow-up message (2-4 sentences) for a human to review and send. No subject line. Do not invent discounts or legal claims. Plain text only.',
    },
    { role: 'user', content: JSON.stringify(leadContext) },
  ];
  const text = await invokeText(messages, { temperature: 0.4, maxTokens: 280 });
  if (!text) {
    return mockFollowUpDraft({
      customerName: leadContext?.customerName,
      status: leadContext?.status,
    });
  }
  return String(text).trim().slice(0, 2000);
}
