import './env.js';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

function createClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  // Call logs / recordings must never be deleted via Prisma client.
  // Lead unlink uses updateMany (leadId = null) and remains allowed.
  // Maintenance scripts that wipe data should use raw SQL (see clear-data.js).
  client.$use(async (params, next) => {
    if (params.model === 'CallLog' && (params.action === 'delete' || params.action === 'deleteMany')) {
      throw new Error('CallLog deletion is forbidden. Call recordings and logs are retained permanently.');
    }
    return next(params);
  });

  return client;
}

/** Single client per serverless instance — critical for many companies on Vercel */
const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;

export default prisma;
