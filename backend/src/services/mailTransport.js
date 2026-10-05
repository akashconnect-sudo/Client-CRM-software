import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let mailTransporter;
let transporterKey = '';

/**
 * Gmail App Passwords are shown as "xxxx xxxx xxxx xxxx".
 * SMTP auth requires the 16 chars with spaces removed.
 */
export function normalizeSmtpPass(pass) {
  return String(pass || '').trim().replace(/\s+/g, '');
}

export function getSmtpFromAddress() {
  const user = String(env.smtpUser || '').trim();
  const from = String(env.smtpFrom || '').trim();
  if (from) return from;
  if (user) return `"Sales Lead CRM" <${user}>`;
  return '';
}

/** Shared nodemailer transport for OTP + notification mail. */
export function getMailTransporter() {
  const user = String(env.smtpUser || '').trim();
  const pass = normalizeSmtpPass(env.smtpPass);
  if (!user || !pass) return null;

  const key = `${env.smtpHost}|${env.smtpPort}|${user}|${pass}`;
  if (!mailTransporter || transporterKey !== key) {
    mailTransporter = nodemailer.createTransport({
      host: env.smtpHost || 'smtp.gmail.com',
      port: env.smtpPort || 587,
      secure: Number(env.smtpPort) === 465,
      requireTLS: Number(env.smtpPort) !== 465,
      auth: { user, pass },
    });
    transporterKey = key;
  }
  return mailTransporter;
}

export function resetMailTransporter() {
  mailTransporter = null;
  transporterKey = '';
}

/**
 * Send mail. `to` must be the end-user address (OTP recipient).
 * From is always the configured CRM mailbox (salesleadcrm@gmail.com).
 */
export async function sendCrmMail({ to, subject, text, html }) {
  const transport = getMailTransporter();
  if (!transport) {
    const err = new Error(
      'Email is not configured. Set SMTP_USER and SMTP_PASS (Gmail App Password, no spaces) in backend/.env'
    );
    err.statusCode = 503;
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }

  const from = getSmtpFromAddress();
  const recipient = String(to || '').trim().toLowerCase();
  if (!recipient || !recipient.includes('@')) {
    const err = new Error('Invalid recipient email');
    err.statusCode = 400;
    throw err;
  }

  try {
    const info = await transport.sendMail({
      from,
      to: recipient,
      subject,
      text,
      html,
      replyTo: env.smtpUser || undefined,
    });
    console.log('[CRM mail]', {
      to: recipient,
      from,
      messageId: info.messageId || null,
      subject,
    });
    return { sent: true, messageId: info.messageId || null, to: recipient };
  } catch (err) {
    resetMailTransporter();
    console.error('[CRM mail failed]', {
      to: recipient,
      from,
      error: err.message,
      code: err.code,
      responseCode: err.responseCode,
    });
    throw err;
  }
}
