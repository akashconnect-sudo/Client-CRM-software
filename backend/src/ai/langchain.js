/**
 * LangChain.js bridge to self-hosted OpenAI-compatible endpoint (vLLM / Ollama).
 * Uses @langchain/openai ChatOpenAI. RAG uses raw pgvector SQL (see rag.js) so we
 * avoid @langchain/community peer conflicts; API shape stays OpenAI-compatible.
 */
import { env } from '../config/env.js';
import { isAiInferenceReady } from './inferenceClient.js';

let ChatOpenAICtor = null;

async function loadChatOpenAI() {
  if (ChatOpenAICtor) return ChatOpenAICtor;
  try {
    const mod = await import('@langchain/openai');
    ChatOpenAICtor = mod.ChatOpenAI;
    return ChatOpenAICtor;
  } catch (err) {
    const e = new Error(
      'LangChain OpenAI package missing — run npm install @langchain/openai @langchain/core @langchain/community'
    );
    e.cause = err;
    e.code = 'LANGCHAIN_MISSING';
    throw e;
  }
}

export function langchainConfigured() {
  return isAiInferenceReady();
}

export async function getChatModel({ temperature = 0.2, maxTokens = 800 } = {}) {
  if (!langchainConfigured()) {
    const err = new Error('AI inference not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }
  const ChatOpenAI = await loadChatOpenAI();
  return new ChatOpenAI({
    model: env.aiChatModel,
    temperature,
    maxTokens,
    apiKey: env.aiInternalSecret || 'not-needed',
    configuration: {
      baseURL: `${env.aiInferenceUrl.replace(/\/$/, '')}/v1`,
      defaultHeaders: {
        'X-Internal-Secret': env.aiInternalSecret,
      },
    },
  });
}

/** Extract JSON object from model text (fenced or raw). */
export function parseJsonFromText(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(candidate.slice(start, end + 1));
  }
  return JSON.parse(candidate);
}
