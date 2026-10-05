function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function roleLabel(role) {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'MANAGER') return 'Manager';
  return 'Sales Team';
}

/**
 * Large, professional transactional welcome email (table-based for Outlook/Gmail).
 */
export function buildWelcomeEmail({ name, companyName, role, dashboardUrl, siteUrl }) {
  const safeName = escapeHtml(name || 'there');
  const safeCompany = escapeHtml(companyName || 'your workspace');
  const safeRole = escapeHtml(roleLabel(role));
  const year = new Date().getFullYear();
  const dash = dashboardUrl || `${(siteUrl || '').replace(/\/$/, '')}/dashboard`;
  const home = (siteUrl || dash).replace(/\/dashboard\/?$/, '') || dash;

  const subject = `Welcome to Sales Lead CRM — ${companyName || 'your workspace'} is ready`;

  const text = [
    `Hi ${name || 'there'},`,
    '',
    `Welcome to Sales Lead CRM. Your workspace "${companyName || 'CRM'}" is ready.`,
    `Role: ${roleLabel(role)}`,
    '',
    'Open your dashboard:',
    dash,
    '',
    'What you can do next:',
    '• Import or capture leads',
    '• Track calls and follow-ups',
    '• Monitor pipeline and team performance',
    '',
    '— Sales Lead CRM',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]><style type="text/css">body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#0b1220;font-family:'Segoe UI',Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    Your Sales Lead CRM workspace is live — open the dashboard and start closing leads.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1220;padding:0;margin:0;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.35);">

          <!-- Hero -->
          <tr>
            <td style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 55%,#0f172a 100%);padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:36px 40px 12px 40px;">
                    <p style="margin:0;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#d4af37;font-weight:600;">Sales Lead CRM</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 40px 8px 40px;">
                    <h1 style="margin:0;font-size:34px;line-height:1.2;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;">
                      Welcome to your<br />sales command centre
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 40px 36px 40px;">
                    <p style="margin:0;font-size:16px;line-height:1.65;color:#cbd5e1;max-width:480px;">
                      Hi <strong style="color:#ffffff;">${safeName}</strong> — <strong style="color:#fde68a;">${safeCompany}</strong> is provisioned and ready.
                      You are signed in as <strong style="color:#ffffff;">${safeRole}</strong>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#c9a227,#f5d76e,#9a7b1a);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 8px 40px;">
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.7;color:#334155;">
                Your workspace is live. From the dashboard you can run leads, calls, follow-ups, and team performance in one place — built for Indian sales teams.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:8px 40px 28px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#c9a227,#9a7b1a);">
                    <a href="${escapeHtml(dash)}" target="_blank" style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:700;color:#0f172a;text-decoration:none;letter-spacing:0.01em;">
                      Open your dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Feature grid -->
          <tr>
            <td style="padding:0 40px 12px 40px;">
              <p style="margin:0 0 16px 0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#94a3b8;font-weight:600;">What you can do next</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%" valign="top" style="padding:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                      <tr>
                        <td style="padding:20px 18px;">
                          <p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0f172a;">Lead vault</p>
                          <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">Capture, assign, and move every enquiry through your pipeline.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" valign="top" style="padding:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                      <tr>
                        <td style="padding:20px 18px;">
                          <p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0f172a;">Call logging</p>
                          <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">Track conversations and keep history against each lead.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td width="50%" valign="top" style="padding:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                      <tr>
                        <td style="padding:20px 18px;">
                          <p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0f172a;">Follow-up radar</p>
                          <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">Never miss a callback — due and overdue items stay visible.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" valign="top" style="padding:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                      <tr>
                        <td style="padding:20px 18px;">
                          <p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0f172a;">Team reports</p>
                          <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">See conversion, source mix, and employee performance at a glance.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Workspace card -->
          <tr>
            <td style="padding:0 40px 36px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f172a;border-radius:12px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;">Workspace</p>
                    <p style="margin:0 0 12px 0;font-size:18px;font-weight:700;color:#f8fafc;">${safeCompany}</p>
                    <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.5;">
                      Signed in as <strong style="color:#fde68a;">${safeRole}</strong>
                      &nbsp;·&nbsp;
                      <a href="${escapeHtml(dash)}" style="color:#d4af37;text-decoration:none;font-weight:600;">Go to dashboard</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
                This is a one-time welcome after your first dashboard visit.
                Need help? Reply to this email or visit
                <a href="${escapeHtml(home)}" style="color:#64748b;text-decoration:underline;">Sales Lead CRM</a>.
              </p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;">
                © ${year} Sales Lead CRM · ${safeCompany}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
