import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';
import { buildWelcomeEmail } from './template.js';

const ses = new SESClient({ region: process.env.AWS_REGION || process.env.SES_REGION || 'ap-south-1' });

function env(name, fallback = '') {
  const v = process.env[name];
  return v == null || v === '' ? fallback : String(v).trim();
}

function parseEvent(event) {
  if (!event) return {};
  if (typeof event === 'string') {
    try {
      return JSON.parse(event);
    } catch {
      return {};
    }
  }
  // API Gateway / Function URL
  if (event.body != null) {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    return body || {};
  }
  // Direct Lambda invoke payload
  return event;
}

async function sendViaSes({ to, subject, text, html, from }) {
  const cmd = new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Text: { Data: text, Charset: 'UTF-8' },
        Html: { Data: html, Charset: 'UTF-8' },
      },
    },
  });
  const out = await ses.send(cmd);
  return { provider: 'ses', messageId: out.MessageId || null };
}

async function sendViaSmtp({ to, subject, text, html, from }) {
  const host = env('SMTP_HOST', 'smtp.gmail.com');
  const port = parseInt(env('SMTP_PORT', '587'), 10) || 587;
  const user = env('SMTP_USER');
  const pass = env('SMTP_PASS');
  if (!user || !pass) {
    throw new Error('SMTP_USER / SMTP_PASS not configured on Lambda');
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const info = await transport.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
  return { provider: 'smtp', messageId: info.messageId || null };
}

/**
 * Invoked by CRM backend after first dashboard visit.
 *
 * Payload:
 * {
 *   to, name, companyName, role, dashboardUrl, siteUrl?,
 *   userId?, jobId?, companyId?
 * }
 *
 * Env:
 *   MAIL_FROM          — "Sales Lead CRM <noreply@domain>"
 *   MAIL_TRANSPORT     — ses | smtp (default: ses if SES_FROM/MAIL_FROM set, else smtp)
 *   SES_REGION         — optional override
 *   SMTP_*             — fallback when MAIL_TRANSPORT=smtp
 *   SITE_URL           — default marketing/app base URL for links
 */
export async function handler(event) {
  const payload = parseEvent(event);
  const to = String(payload.to || payload.email || '').trim().toLowerCase();
  if (!to || !to.includes('@')) {
    return { ok: false, error: 'INVALID_TO' };
  }

  const siteUrl = payload.siteUrl || env('SITE_URL', 'https://salesleadcrm.duckdns.org');
  const dashboardUrl =
    payload.dashboardUrl || `${siteUrl.replace(/\/$/, '')}/dashboard`;

  const { subject, text, html } = buildWelcomeEmail({
    name: payload.name,
    companyName: payload.companyName,
    role: payload.role,
    dashboardUrl,
    siteUrl,
  });

  const from =
    env('MAIL_FROM') ||
    env('SES_FROM') ||
    env('SMTP_FROM') ||
    (env('SMTP_USER') ? `"Sales Lead CRM" <${env('SMTP_USER')}>` : '');

  if (!from) {
    return { ok: false, error: 'MAIL_FROM_NOT_CONFIGURED' };
  }

  const transport = (env('MAIL_TRANSPORT') || (env('SMTP_USER') && !env('SES_FROM') ? 'smtp' : 'ses')).toLowerCase();

  try {
    const result =
      transport === 'smtp'
        ? await sendViaSmtp({ to, subject, text, html, from })
        : await sendViaSes({ to, subject, text, html, from });

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'welcome_email_sent',
        to,
        userId: payload.userId || null,
        jobId: payload.jobId || null,
        provider: result.provider,
        messageId: result.messageId,
      })
    );

    return {
      ok: true,
      sent: true,
      provider: result.provider,
      messageId: result.messageId,
      to,
    };
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'welcome_email_failed',
        to,
        userId: payload.userId || null,
        jobId: payload.jobId || null,
        error: err.message,
      })
    );
    return {
      ok: false,
      sent: false,
      error: err.message || 'SEND_FAILED',
      to,
    };
  }
}
