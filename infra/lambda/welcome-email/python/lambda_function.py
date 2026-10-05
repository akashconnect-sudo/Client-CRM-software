"""
AWS Lambda (Python 3.12) — Sales Lead CRM transactional mail.

Supports:
  type=WELCOME (default) — professional welcome email
  type=OTP — login/register verification code (to = end-user email)

Deploy: paste into Console (welcome-email) as lambda_function.py
Runtime: Python 3.12
Handler: lambda_function.lambda_handler

Env:
  MAIL_FROM       e.g. Sales Lead CRM <salesleadcrm@gmail.com>
  MAIL_TRANSPORT  ses | smtp
  SITE_URL        https://salesleadcrm.duckdns.org
  SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS
"""

from __future__ import annotations

import json
import os
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
from typing import Any

import boto3


def _env(name: str, default: str = "") -> str:
    v = os.environ.get(name)
    return default if v is None or str(v).strip() == "" else str(v).strip()


def _smtp_pass() -> str:
    # Gmail App Passwords are often copied with spaces
    return _env("SMTP_PASS").replace(" ", "")


def _role_label(role: str | None) -> str:
    if role == "SUPER_ADMIN":
        return "Super Admin"
    if role == "MANAGER":
        return "Manager"
    return "Sales Team"


def _parse_event(event: Any) -> dict:
    if event is None:
        return {}
    if isinstance(event, str):
        try:
            return json.loads(event)
        except json.JSONDecodeError:
            return {}
    if isinstance(event, dict) and event.get("body") is not None:
        body = event["body"]
        if isinstance(body, str):
            try:
                return json.loads(body)
            except json.JSONDecodeError:
                return {}
        return body if isinstance(body, dict) else {}
    return event if isinstance(event, dict) else {}


def build_welcome_email(
    *,
    name: str | None,
    company_name: str | None,
    role: str | None,
    dashboard_url: str,
    site_url: str,
) -> tuple[str, str, str]:
    safe_name = escape(name or "there")
    safe_company = escape(company_name or "your workspace")
    safe_role = escape(_role_label(role))
    year = __import__("datetime").datetime.utcnow().year
    home = re.sub(r"/dashboard/?$", "", site_url) or site_url

    subject = f"Welcome to Sales Lead CRM — {company_name or 'your workspace'} is ready"

    text = "\n".join(
        [
            f"Hi {name or 'there'},",
            "",
            f'Welcome to Sales Lead CRM. Your workspace "{company_name or "CRM"}" is ready.',
            f"Role: {_role_label(role)}",
            "",
            "Open your dashboard:",
            dashboard_url,
            "",
            "What you can do next:",
            "• Import or capture leads",
            "• Track calls and follow-ups",
            "• Monitor pipeline and team performance",
            "",
            "— Sales Lead CRM",
        ]
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0b1220;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your Sales Lead CRM workspace is live — open the dashboard and start closing leads.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1220;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(145deg,#0f172a 0%,#1e293b 55%,#0f172a 100%);padding:36px 40px;">
              <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#d4af37;font-weight:600;">Sales Lead CRM</p>
              <h1 style="margin:0 0 16px;font-size:34px;line-height:1.2;font-weight:700;color:#f8fafc;">Welcome to your<br />sales command centre</h1>
              <p style="margin:0;font-size:16px;line-height:1.65;color:#cbd5e1;">
                Hi <strong style="color:#ffffff;">{safe_name}</strong> —
                <strong style="color:#fde68a;">{safe_company}</strong> is provisioned and ready.
                You are signed in as <strong style="color:#ffffff;">{safe_role}</strong>.
              </p>
            </td>
          </tr>
          <tr><td style="height:4px;background:linear-gradient(90deg,#c9a227,#f5d76e,#9a7b1a);font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:36px 40px 12px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#334155;">
                Your workspace is live. From the dashboard you can run leads, calls, follow-ups, and team performance in one place — built for Indian sales teams.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 40px 28px;">
              <a href="{escape(dashboard_url)}" style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:700;color:#0f172a;text-decoration:none;border-radius:10px;background:linear-gradient(135deg,#c9a227,#9a7b1a);">
                Open your dashboard →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="50%" valign="top" style="padding:8px;">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 18px;">
                      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#0f172a;">Lead vault</p>
                      <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">Capture, assign, and move every enquiry through your pipeline.</p>
                    </div>
                  </td>
                  <td width="50%" valign="top" style="padding:8px;">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 18px;">
                      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#0f172a;">Call logging</p>
                      <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">Track conversations and keep history against each lead.</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" valign="top" style="padding:8px;">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 18px;">
                      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#0f172a;">Follow-up radar</p>
                      <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">Never miss a callback — due and overdue items stay visible.</p>
                    </div>
                  </td>
                  <td width="50%" valign="top" style="padding:8px;">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 18px;">
                      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#0f172a;">Team reports</p>
                      <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">See conversion, source mix, and employee performance at a glance.</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 36px;">
              <div style="background:#0f172a;border-radius:12px;padding:22px 24px;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;">Workspace</p>
                <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#f8fafc;">{safe_company}</p>
                <p style="margin:0;font-size:13px;color:#cbd5e1;">
                  Signed in as <strong style="color:#fde68a;">{safe_role}</strong>
                  · <a href="{escape(dashboard_url)}" style="color:#d4af37;text-decoration:none;font-weight:600;">Go to dashboard</a>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
                This is a one-time welcome after your first dashboard visit.
                Visit <a href="{escape(home)}" style="color:#64748b;">Sales Lead CRM</a>.
              </p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;">© {year} Sales Lead CRM · {safe_company}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, text, html


def _send_ses(*, to: str, subject: str, text: str, html: str, mail_from: str) -> str:
    client = boto3.client("ses", region_name=_env("AWS_REGION", _env("SES_REGION", "us-east-1")))
    out = client.send_email(
        Source=mail_from,
        Destination={"ToAddresses": [to]},
        Message={
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {
                "Text": {"Data": text, "Charset": "UTF-8"},
                "Html": {"Data": html, "Charset": "UTF-8"},
            },
        },
    )
    return out.get("MessageId") or ""


def build_otp_email(*, otp: str, to: str, minutes: int) -> tuple[str, str, str]:
    code = escape(str(otp or "").strip())
    safe_to = escape(to)
    mins = int(minutes or 10)
    subject = "Your verification code — Sales Lead CRM"
    text = (
        f"Your verification code is: {otp}\n\n"
        f"Valid for {mins} minutes. Do not share this code.\n\n"
        f"— Sales Lead CRM"
    )
    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0b1220;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b1220;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0f172a;padding:28px 32px;">
          <p style="margin:0;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#d4af37;font-weight:600;">Sales Lead CRM</p>
          <h1 style="margin:12px 0 0;font-size:24px;color:#f8fafc;">Verification code</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:14px;color:#64748b;">Sent to <strong style="color:#0f172a;">{safe_to}</strong></p>
          <p style="margin:16px 0;font-size:40px;font-weight:700;letter-spacing:12px;color:#0f172a;text-align:center;">{code}</p>
          <p style="margin:0;font-size:14px;color:#64748b;text-align:center;">Valid for {mins} minutes. Do not share this code.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return subject, text, html


def _send_smtp(*, to: str, subject: str, text: str, html: str, mail_from: str) -> str:
    host = _env("SMTP_HOST", "smtp.gmail.com")
    port = int(_env("SMTP_PORT", "587") or "587")
    user = _env("SMTP_USER")
    password = _smtp_pass()
    if not user or not password:
        raise RuntimeError("SMTP_USER / SMTP_PASS not configured on Lambda")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = to
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    # Envelope sender must be the authenticated mailbox (not display-name form)
    with smtplib.SMTP(host, port, timeout=30) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(user, password)
        server.sendmail(user, [to], msg.as_string())

    return "smtp-ok"


def lambda_handler(event, context):
    payload = _parse_event(event)
    to = str(payload.get("to") or payload.get("email") or "").strip().lower()
    if not to or "@" not in to:
        return {"ok": False, "error": "INVALID_TO"}

    mail_type = str(payload.get("type") or "WELCOME").strip().upper()
    if payload.get("otp") and mail_type == "WELCOME":
        mail_type = "OTP"

    if mail_type == "OTP":
        otp = str(payload.get("otp") or "").strip()
        if not re.fullmatch(r"\d{6}", otp):
            return {"ok": False, "error": "INVALID_OTP"}
        minutes = int(payload.get("expiresInMinutes") or payload.get("minutes") or 10)
        subject, text, html = build_otp_email(otp=otp, to=to, minutes=minutes)
    else:
        site_url = payload.get("siteUrl") or _env("SITE_URL", "https://salesleadcrm.duckdns.org")
        dashboard_url = payload.get("dashboardUrl") or f"{site_url.rstrip('/')}/dashboard"
        subject, text, html = build_welcome_email(
            name=payload.get("name"),
            company_name=payload.get("companyName"),
            role=payload.get("role"),
            dashboard_url=dashboard_url,
            site_url=site_url,
        )

    mail_from = (
        _env("MAIL_FROM")
        or _env("SES_FROM")
        or _env("SMTP_FROM")
        or (f'"Sales Lead CRM" <{_env("SMTP_USER")}>' if _env("SMTP_USER") else "")
    )
    if not mail_from:
        return {"ok": False, "error": "MAIL_FROM_NOT_CONFIGURED"}

    transport = (_env("MAIL_TRANSPORT") or ("smtp" if _env("SMTP_USER") and not _env("SES_FROM") else "ses")).lower()

    try:
        if transport == "smtp":
            message_id = _send_smtp(to=to, subject=subject, text=text, html=html, mail_from=mail_from)
            provider = "smtp"
        else:
            message_id = _send_ses(to=to, subject=subject, text=text, html=html, mail_from=mail_from)
            provider = "ses"

        print(
            json.dumps(
                {
                    "level": "info",
                    "msg": "mail_sent",
                    "type": mail_type,
                    "to": to,
                    "provider": provider,
                }
            )
        )
        return {
            "ok": True,
            "sent": True,
            "type": mail_type,
            "provider": provider,
            "messageId": message_id,
            "to": to,
        }
    except Exception as err:  # noqa: BLE001 — surface to CRM
        print(json.dumps({"level": "error", "msg": "mail_failed", "type": mail_type, "to": to, "error": str(err)}))
        return {"ok": False, "sent": False, "error": str(err), "to": to, "type": mail_type}
