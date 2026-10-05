import prisma from '../config/db.js';
import { env } from '../config/env.js';
import { invokeMailLambda } from './lambdaMail.js';

const MAX_ATTEMPTS = 5;

function appBaseUrl() {
  return (env.frontendUrl || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
}

/** Deliver welcome mail via AWS Lambda. */
async function deliverWelcomeViaLambda(user, job) {
  const siteUrl = appBaseUrl();
  return invokeMailLambda({
    type: 'WELCOME',
    to: user.email,
    email: user.email,
    name: user.name,
    companyName: user.company?.name || null,
    role: user.role,
    dashboardUrl: `${siteUrl}/dashboard`,
    siteUrl,
    userId: user.id,
    companyId: user.companyId,
    jobId: job.id,
  });
}

async function ensureWelcomeJob(user) {
  return prisma.emailJob.upsert({
    where: { userId_type: { userId: user.id, type: 'WELCOME' } },
    create: {
      userId: user.id,
      companyId: user.companyId,
      type: 'WELCOME',
      toEmail: user.email,
      status: 'PENDING',
      payload: {
        name: user.name,
        companyName: user.company?.name || null,
        role: user.role,
        via: 'lambda',
      },
    },
    update: {},
  });
}

/**
 * Dashboard trigger → EmailJob → Invoke welcome-email Lambda → mark SENT.
 * Idempotent via unique (userId, type) and user.welcomeEmailSentAt.
 */
export async function triggerWelcomeEmail(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
      status: true,
      welcomeEmailSentAt: true,
      company: { select: { name: true, status: true } },
    },
  });

  if (!user?.email) {
    return { ok: false, skipped: true, reason: 'no_user' };
  }
  if (user.status !== 'ACTIVE' || user.company?.status === 'SUSPENDED') {
    return { ok: false, skipped: true, reason: 'inactive' };
  }
  if (user.welcomeEmailSentAt) {
    return { ok: true, skipped: true, reason: 'already_sent' };
  }

  let job = await ensureWelcomeJob(user);

  if (job.status === 'SENT') {
    await prisma.user.update({
      where: { id: user.id },
      data: { welcomeEmailSentAt: job.sentAt || new Date() },
    });
    return { ok: true, skipped: true, reason: 'already_sent' };
  }

  if (job.status === 'PROCESSING') {
    // Recover stuck claims older than 2 minutes so welcome can retry.
    const ageMs = Date.now() - new Date(job.updatedAt).getTime();
    if (ageMs < 2 * 60 * 1000) {
      return { ok: true, skipped: true, reason: 'in_flight' };
    }
    await prisma.emailJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', lastError: 'STALE_PROCESSING_RESET' },
    });
    job = { ...job, status: 'FAILED' };
  }

  if (job.attempts >= MAX_ATTEMPTS && job.status === 'FAILED') {
    return { ok: false, skipped: true, reason: 'max_attempts' };
  }

  const claimed = await prisma.emailJob.updateMany({
    where: {
      id: job.id,
      status: { in: ['PENDING', 'FAILED'] },
      attempts: { lt: MAX_ATTEMPTS },
    },
    data: {
      status: 'PROCESSING',
      attempts: { increment: 1 },
      lastError: null,
    },
  });

  if (claimed.count === 0) {
    job = await prisma.emailJob.findUnique({ where: { id: job.id } });
    if (job?.status === 'SENT' || user.welcomeEmailSentAt) {
      return { ok: true, skipped: true, reason: 'already_sent' };
    }
    return { ok: true, skipped: true, reason: 'in_flight' };
  }

  const delivery = await deliverWelcomeViaLambda(user, job);

  if (!delivery.sent) {
    await prisma.emailJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        lastError: String(delivery.error || 'SEND_FAILED').slice(0, 500),
      },
    });

    console.warn('[Welcome email Lambda]', delivery.error, {
      userId: user.id,
      to: user.email,
    });

    return { ok: false, skipped: false, reason: delivery.error || 'send_failed' };
  }

  const sentAt = new Date();
  await prisma.$transaction([
    prisma.emailJob.update({
      where: { id: job.id },
      data: {
        status: 'SENT',
        sentAt,
        lastError: null,
        payload: {
          ...(job.payload && typeof job.payload === 'object' ? job.payload : {}),
          via: 'lambda',
          provider: delivery.provider,
          messageId: delivery.messageId,
        },
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { welcomeEmailSentAt: sentAt },
    }),
  ]);

  return { ok: true, skipped: false, reason: 'sent', provider: delivery.provider };
}

/** Fire-and-forget so dashboard/API stay fast. */
export function triggerWelcomeEmailAsync(userId) {
  setImmediate(() => {
    triggerWelcomeEmail(userId).catch((err) => {
      console.error('[Welcome email trigger]', err.message);
    });
  });
}
