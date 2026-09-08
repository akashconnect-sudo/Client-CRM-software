/**
 * Enables pgvector + AI layer columns/tables.
 * Run: node prisma/apply-ai-layer-migration.js && npx prisma generate && npx prisma db push
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function columnExists(table, column) {
  const rows = await prisma.$queryRaw`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function tableExists(table) {
  const rows = await prisma.$queryRaw`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${table}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function enumHasValue(enumName, value) {
  const rows = await prisma.$queryRaw`
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = ${enumName} AND e.enumlabel = ${value}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function main() {
  console.log('AI layer migration…');

  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
  console.log('pgvector extension ready');

  // NotificationType may be a Prisma enum — add AI_JOB_DONE if missing
  try {
    if (!(await enumHasValue('NotificationType', 'AI_JOB_DONE'))) {
      await prisma.$executeRawUnsafe(
        `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AI_JOB_DONE'`
      );
      console.log('Added NotificationType.AI_JOB_DONE');
    }
  } catch (err) {
    console.warn('NotificationType enum update skipped:', err.message);
  }

  if (!(await columnExists('leads', 'pulse_reasoning'))) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "leads" ADD COLUMN "pulse_reasoning" TEXT`
    );
    console.log('Added leads.pulse_reasoning');
  }

  if (!(await columnExists('call_logs', 'transcript'))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "call_logs" ADD COLUMN "transcript" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "call_logs" ADD COLUMN "summary" TEXT`);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "call_logs" ADD COLUMN "sentiment_label" TEXT`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "call_logs" ADD COLUMN "sentiment_score" DOUBLE PRECISION`
    );
    console.log('Added call_logs AI columns');
  }

  // LangChain PGVectorStore table (companyId in metadata for tenant filter)
  if (!(await tableExists('ai_embeddings'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ai_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        collection TEXT NOT NULL DEFAULT 'crm',
        content TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        embedding vector(384),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS ai_embeddings_company_idx ON ai_embeddings (company_id)`
    );
    console.log('Created ai_embeddings (pgvector)');
  }

  console.log('Done. Run: npx prisma generate && npx prisma db push');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
