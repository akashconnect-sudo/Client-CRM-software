import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import prisma from '../config/db.js';
import { env } from '../config/env.js';

const MAX_ATTEMPTS = 5;

let lambdaClient;

function getLambda() {
  if (!lambdaClient) {
    lambdaClient = new LambdaClient({
      region: env.awsRegion || 'ap-south-1',
    });
  }
  return lambdaClient;
}

function appBaseUrl() {
  return (env.frontendUrl || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
}

/**
 * Deliver welcome mail via AWS Lambda (professional HTML lives in the function).
 * CRM must NOT send SMTP/SES itself for welcome — Lambda owns the template + send.
 */
async function deliverWelcomeViaLambda(user, job) {
  const functionName = env.welcomeEmailLambdaName;
  if (!functionName) {
    return { sent: false, error: 'WELCOME_EMAIL_LAMBDA_NAME_NOT_CONFIGURED' };
  }

  const siteUrl = appBaseUrl();
  const payload = {
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
  };

  try {
    const out = await getLambda().send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    );

    if (out.FunctionError) {
      const raw = out.Payload ? Buffer.from(out.Payload).toString('utf8') : out.FunctionError;
      return { sent: false, error: `LAMBDA_ERROR:${String(raw).slice(0, 200)}` };
    }

    let body = {};
    if (out.Payload) {
      try {
        body = JSON.parse(Buffer.from(out.Payload).toString('utf8'));
      } catch {
        body = {};
      }
    }

    // API Gateway-style envelope support
    if (body && typeof body.body === 'string') {
      try {
        body = JSON.parse(body.body);
      } catch {
        /* keep */
      }
    }

    if (body?.ok && body?.sent !== false) {
      return {
        sent: true,
        provider: body.provider || 'lambda',
        messageId: body.messageId || null,
      };
    }

    return {
      sent: false,
      error: String(body?.error || 'LAMBDA_SEND_FAILED').slice(0, 500),
    };
  } catch (err) {
    return { sent: false, error: err.message || 'LAMBDA_INVOKE_FAILED' };
  }
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
    return { ok: true, skipped: true, reason: 'in_flight' };
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
