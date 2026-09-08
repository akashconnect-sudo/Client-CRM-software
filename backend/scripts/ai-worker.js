/**
 * AI job worker — run on the GPU box / worker VM (NOT inside Vercel serverless).
 * Polls Postgres AIJob rows and executes LangChain / Whisper work.
 *
 *   node scripts/ai-worker.js
 *   npm run ai:worker
 */
import '../src/config/env.js';
import { processNextPendingJob } from '../src/ai/jobProcessor.js';

const POLL_MS = parseInt(process.env.AI_WORKER_POLL_MS || '2500', 10) || 2500;

async function tick() {
  try {
    const done = await processNextPendingJob();
    if (done) {
      console.log(`[ai-worker] ${done.type} ${done.id} → ${done.status}`);
    }
  } catch (err) {
    console.error('[ai-worker] job failed:', err.message || err);
  }
}

console.log(`[ai-worker] polling every ${POLL_MS}ms`);
setInterval(tick, POLL_MS);
tick();
