/**
 * HTTP client for the private ai-inference service.
 * Never call this from the browser — backend / worker only.
 */
import { env } from '../config/env.js';

function inferenceConfigured() {
  return Boolean(env.aiInferenceUrl);
}

async function inferenceFetch(path, { method = 'GET', body, headers = {} } = {}) {
  if (!inferenceConfigured()) {
    const err = new Error('AI inference URL not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }
  const url = `${env.aiInferenceUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': env.aiInternalSecret,
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`ai-inference ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    err.statusCode = res.status;
    throw err;
  }
  return res.json();
}

export function isAiInferenceReady() {
  return inferenceConfigured();
}

/** OpenAI-compatible chat completions against vLLM/Ollama. */
export async function chatCompletions({ messages, temperature = 0.2, maxTokens = 800 }) {
  return inferenceFetch('/v1/chat/completions', {
    method: 'POST',
    body: {
      model: env.aiChatModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    },
  });
}

/** faster-whisper transcription — outside LangChain. */
export async function transcribeAudio({ audioUrl, language = 'en' }) {
  return inferenceFetch('/transcribe', {
    method: 'POST',
    body: { audioUrl, language },
  });
}

/** Embedding vector for RAG. */
export async function embedTexts(texts) {
  return inferenceFetch('/embed', {
    method: 'POST',
    body: { texts: Array.isArray(texts) ? texts : [texts] },
  });
}

/**
 * Dev / no-GPU fallbacks so the CRM UI can be exercised without a GPU box.
 */
export function mockCallAnalysis(transcriptHint = '') {
  const text = String(transcriptHint || '').toLowerCase();
  let sentimentLabel = 'NEUTRAL';
  let sentimentScore = 0.5;
  if (/thank|interest|yes|price|buy|great/.test(text)) {
    sentimentLabel = 'POSITIVE';
    sentimentScore = 0.82;
  } else if (/no|not interest|busy|later|angry|complaint/.test(text)) {
    sentimentLabel = 'NEGATIVE';
    sentimentScore = 0.25;
  }
  return {
    transcript: transcriptHint || '[Mock transcript — connect ai-inference + Whisper for real audio.]',
    summary: 'Short call covering interest level and next steps. (Mock summary — GPU worker offline.)',
    sentimentLabel,
    sentimentScore,
  };
}

export function mockPulseReasoning({ status, scoreHint } = {}) {
  const statusLabel = String(status || 'NEW').replace(/_/g, ' ');
  return `${scoreHint || 'Warm'} — recent ${statusLabel.toLowerCase()} activity; review notes and last call before chasing. (Mock reasoning.)`;
}

export function mockFollowUpDraft({ customerName, status } = {}) {
  const name = customerName || 'there';
  return `Hi ${name}, just following up on our conversation. Are you still exploring options for your ${String(status || 'requirement').toLowerCase()}? Happy to share a quick next step whenever you're free.`;
}

export function mockAdvisorReply(question = '') {
  return {
    reply: `I can help with leads, follow-ups, and reports once the self-hosted model is connected. You asked: "${String(question).slice(0, 120)}". Meanwhile, open Leads or Follow-up Radar for live numbers. (Mock advisor — set AI_INFERENCE_URL.)`,
    toolsUsed: [],
  };
}
