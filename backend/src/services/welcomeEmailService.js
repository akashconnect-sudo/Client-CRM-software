import prisma from '../config/db.js';
import { env } from '../config/env.js';
import { invokeMailLambda } from './lambdaMail.js';
import { sendCrmMail } from './mailTransport.js';

const MAX_ATTEMPTS = 5;

function appBaseUrl() {
  return (env.frontendUrl || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
}

function roleLabel(role) {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'MANAGER') return 'Manager';
  return 'Team member';
}

/** Deliver welcome: Lambda first, then SMTP fallback if invoke is blocked. */
async function deliverWelcome(user, job) {
  const siteUrl = appBaseUrl();
  const dashboardUrl = `${siteUrl}/dashboard`;
  const companyName = user.company?.name || 'your workspace';

  if (env.welcomeEmailLambdaName) {
    const viaLambda = await invokeMailLambda({
      type: 'WELCOME',
      to: user.email,
      email: user.email,
      name: user.name,
      companyName,
      role: user.role,
      dashboardUrl,
      siteUrl,
      userId: user.id,
      companyId: user.companyId,
      jobId: job.id,
    });
    if (viaLambda.sent) {
      return { ...viaLambda, via: 'lambda' };
    }
    console.warn('[Welcome email] Lambda failed, trying SMTP fallback:', viaLambda.error);
  }

  try {
    await sendCrmMail({
      to: user.email,
      subject: `Welcome to Sales Lead CRM — ${companyName}`,
      text: [
        `Hi ${user.name || 'there'},`,
        '',
        `Welcome to Sales Lead CRM. Your workspace "${companyName}" is ready.`,
        `Role: ${roleLabel(user.role)}`,
        '',
        `Open your dashboard: ${dashboardUrl}`,
        '',
        '— Sales Lead CRM',
      ].join('\n'),
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f172a;border-radius:16px;color:#f8fafc">
          <p style="margin:0;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#c9a227">Sales Lead CRM</p>
          <h1 style="margin:16px 0;font-size:26px;color:#f8fafc">Welcome aboard</h1>
          <p style="color:#cbd5e1;line-height:1.6">Hi <strong>${user.name || 'there'}</strong> — <strong style="color:#fde68a">${companyName}</strong> is ready. You are signed in as ${roleLabel(user.role)}.</p>
          <p style="margin:24px 0"><a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#c9a227;color:#0f172a;font-weight:700;text-decoration:none;border-radius:8px">Open dashboard</a></p>
        </div>
      `,
    });
    return { sent: true, provider: 'smtp', via: 'smtp', messageId: null };
  } catch (err) {
    return { sent: false, error: err.message || 'SMTP_FAILED', via: 'smtp' };
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
      },
    },
    update: {},
  });
}

/**
 * Dashboard / login /me trigger → EmailJob → Lambda (or SMTP fallback) → SENT.
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
    // Allow one more try after IAM / SMTP fixes by resetting attempt budget.
    if (String(job.lastError || '').includes('not authorized') || String(job.lastError || '').includes('AccessDenied')) {
      await prisma.emailJob.update({
        where: { id: job.id },
        data: { attempts: 0, status: 'FAILED', lastError: 'RESET_AFTER_IAM_DENIED' },
      });
      job = { ...job, attempts: 0, status: 'FAILED' };
    } else {
      return { ok: false, skipped: true, reason: 'max_attempts' };
    }
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

  const delivery = await deliverWelcome(user, job);

  if (!delivery.sent) {
    await prisma.emailJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        lastError: String(delivery.error || 'SEND_FAILED').slice(0, 500),
      },
    });

    console.warn('[Welcome email]', delivery.error, {
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
          via: delivery.via,
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

export function triggerWelcomeEmailAsync(userId) {
  setImmediate(() => {
    triggerWelcomeEmail(userId).catch((err) => {
      console.error('[Welcome email trigger]', err.message);
    });
  });
}
