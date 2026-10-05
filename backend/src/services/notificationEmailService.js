import prisma from '../config/db.js';
import { env } from '../config/env.js';
import { planHasEmailAlerts } from '../constants/planFeatures.js';
import { sendCrmMail } from './mailTransport.js';

function resolveNotificationPath(notification) {
  const { type, leadId, callId, title } = notification;
  if (leadId) {
    if (type === 'MISSED_FOLLOW_UP') return '/follow-ups?type=missed';
    return `/leads/${leadId}`;
  }
  if (callId) return '/calls';
  if (type === 'MISSED_FOLLOW_UP') return '/follow-ups?type=missed';
  if (type === 'REPORT_SHARED') return '/reports';
  if (type === 'ADMIN_NOTICE') return '/settings';
  if (title?.toLowerCase().includes('unassigned')) return '/leads?status=NEW';
  return '/';
}

function roleLabel(role) {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'MANAGER') return 'Manager';
  return 'Admin';
}

function buildActionUrl(notification) {
  const base = (env.frontendUrl || 'http://localhost:5173').split(',')[0].trim();
  const path = resolveNotificationPath(notification);
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildNotificationEmailHtml({
  recipientName,
  senderName,
  senderRole,
  companyName,
  title,
  message,
  actionUrl,
  kind = 'notification',
}) {
  const senderLine = senderName
    ? `${senderName}${senderRole ? ` · ${roleLabel(senderRole)}` : ''}`
    : 'Your workspace admin';
  const preheader = message?.slice(0, 120) || title;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',system-ui,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 32px;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#c9a227;">Sales Lead CRM</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#f8fafc;line-height:1.3;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">
                Hi ${recipientName || 'there'},
              </p>
              <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.65;">
                ${message}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">From</p>
                    <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">${senderLine}</p>
                    <p style="margin:8px 0 0;font-size:12px;color:#64748b;">${companyName || 'Your workspace'}</p>
                  </td>
                </tr>
              </table>
              ${
                actionUrl
                  ? `<a href="${actionUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a227,#9a7b1a);color:#0f172a;font-weight:600;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:8px;">Open in CRM</a>`
                  : ''
              }
              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
                You received this because ${kind === 'notice' ? 'your Super Admin sent a team notice' : 'an update was posted to your account'} on Sales Lead CRM — even if the app was closed.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
                © ${new Date().getFullYear()} Sales Lead CRM · ${companyName || 'Workspace notification'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendNotificationEmail({
  to,
  recipientName,
  senderName,
  senderRole,
  companyName,
  title,
  message,
  notification,
  kind,
}) {
  if (!to) {
    if (env.nodeEnv !== 'production') {
      console.log('[Notification email skipped]', { to, title, message: message?.slice(0, 80) });
    }
    return { sent: false };
  }

  const actionUrl = notification ? buildActionUrl(notification) : null;
  const html = buildNotificationEmailHtml({
    recipientName,
    senderName,
    senderRole,
    companyName,
    title,
    message,
    actionUrl,
    kind,
  });

  try {
    await sendCrmMail({
      to,
      subject: `${title} — ${companyName || 'Sales Lead CRM'}`,
      text: `${title}\n\n${message}\n\nFrom: ${senderName || 'Admin'} (${companyName || 'CRM'})\n${actionUrl || ''}`,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[Notification email]', err.message);
    return { sent: false };
  }
}

const ADMIN_EMAIL_ROLES = ['SUPER_ADMIN', 'MANAGER'];

/** Fire-and-forget email when plan includes alerts and sender is admin. */
export async function dispatchNotificationEmail(notification, emailFrom) {
  if (!emailFrom?.id || !ADMIN_EMAIL_ROLES.includes(emailFrom.role)) return;

  try {
    const recipient = await prisma.user.findUnique({
      where: { id: notification.userId },
      select: {
        email: true,
        name: true,
        company: { select: { name: true, plan: true } },
      },
    });

    if (!recipient?.email || !planHasEmailAlerts(recipient.company?.plan)) return;

    await sendNotificationEmail({
      to: recipient.email,
      recipientName: recipient.name,
      senderName: emailFrom.name,
      senderRole: emailFrom.role,
      companyName: recipient.company?.name,
      title: notification.title,
      message: notification.message,
      notification,
      kind:
        notification.type === 'ADMIN_NOTICE' || notification.type === 'REPORT_SHARED'
          ? 'notice'
          : 'notification',
    });
  } catch (err) {
    console.error('[dispatchNotificationEmail]', err.message);
  }
}
