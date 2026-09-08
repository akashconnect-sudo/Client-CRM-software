/**
 * Lightweight RAG helpers over Neon pgvector (ai_embeddings table).
 * Always filter by company_id — never global search.
 */
import prisma from '../config/db.js';
import { embedTexts, isAiInferenceReady } from './inferenceClient.js';

export async function upsertEmbedding({ companyId, content, metadata = {}, collection = 'crm' }) {
  if (!companyId || !content?.trim()) return null;
  if (!isAiInferenceReady()) return null;

  const { embeddings } = await embedTexts([content]);
  const vector = embeddings?.[0];
  if (!vector?.length) return null;

  const vectorLiteral = `[${vector.join(',')}]`;
  const meta = { ...metadata, companyId };
  await prisma.$executeRawUnsafe(
    `INSERT INTO ai_embeddings (company_id, collection, content, metadata, embedding)
     VALUES ($1::uuid, $2, $3, $4::jsonb, $5::vector)`,
    companyId,
    collection,
    content,
    JSON.stringify(meta),
    vectorLiteral
  );
  return true;
}

export async function similaritySearch({ companyId, query, limit = 5, collection = 'crm' }) {
  if (!companyId || !query?.trim()) return [];
  if (!isAiInferenceReady()) return [];

  const { embeddings } = await embedTexts([query]);
  const vector = embeddings?.[0];
  if (!vector?.length) return [];
  const vectorLiteral = `[${vector.join(',')}]`;

  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, content, metadata,
            1 - (embedding <=> $1::vector) AS score
     FROM ai_embeddings
     WHERE company_id = $2::uuid AND collection = $3
     ORDER BY embedding <=> $1::vector
     LIMIT $4`,
    vectorLiteral,
    companyId,
    collection,
    Math.min(Number(limit) || 5, 12)
  );
  return rows || [];
}
