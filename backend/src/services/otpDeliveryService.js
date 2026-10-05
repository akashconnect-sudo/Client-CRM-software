import { env } from '../config/env.js';
import { sendCrmMail } from './mailTransport.js';

async function sendEmailOtp(email, otp, gstin) {
  const minutes = env.gstOtpExpiryMinutes;
  try {
    await sendCrmMail({
      to: email,
      subject: `GST verification OTP — ${gstin}`,
      text: `Your GST registration OTP is: ${otp}\n\nValid for ${minutes} minutes.\n\n— Sales Lead CRM`,
      html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#16a34a">GST verification</h2>
        <p>Your OTP for GST <strong>${gstin}</strong>:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#111">${otp}</p>
        <p style="color:#666">Valid for ${minutes} minutes.</p>
        <p style="color:#999;font-size:12px">Sales Lead CRM</p>
      </div>
    `,
    });
    return true;
  } catch {
    return false;
  }
}

async function sendSmsHttp(mobile, otp, gstin) {
  if (!env.smsHttpUrl) return false;
  const label = `GST ${gstin}`;
  const res = await fetch(env.smsHttpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: mobile,
      message: `Your ${label} verification OTP is ${otp}. Valid for ${env.gstOtpExpiryMinutes} minutes. — Sales Lead CRM`,
      key: env.smsApiKey,
    }),
  });
  return res.ok;
}

/**
 * Deliver OTP to GST-registered mobile + email (email via SMTP; optional SMS_HTTP_URL).
 */
export async function deliverOtp({ mobile, email, otp, gstin }) {
  const results = { mobile: false, email: false, devOtp: null };

  const canRealEmail = Boolean(env.smtpUser && env.smtpPass);
  const canRealSms = Boolean(env.smsHttpUrl);

  if (env.gstOtpDevExpose && !canRealEmail && !canRealSms) {
    results.devOtp = otp;
  }

  if (mobile) {
    try {
      if (env.smsHttpUrl) {
        results.mobile = await sendSmsHttp(mobile, otp, gstin);
      } else if (!canRealSms) {
        console.warn('[GST OTP] SMS not configured — set SMS_HTTP_URL or use email-only OTP');
      }
    } catch (err) {
      console.error('[GST OTP SMS failed]', err.message);
      results.mobile = false;
    }
  }

  if (email) {
    try {
      if (canRealEmail) {
        results.email = await sendEmailOtp(email, otp, gstin);
      } else if (env.smtpHttpUrl) {
        const res = await fetch(env.smtpHttpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: `GST verification OTP — ${gstin}`,
            body: `Your OTP: ${otp}`,
            key: env.smtpApiKey,
          }),
        });
        results.email = res.ok;
      } else {
        console.warn('[GST OTP] Email not configured — set SMTP_USER + SMTP_PASS in backend/.env');
      }
    } catch (err) {
      console.error('[GST OTP Email failed]', err.message);
      results.email = false;
    }
  }

  return results;
}

/** Auth phone SMS OTP — disabled (use email OTP only). */
export async function deliverAuthPhoneOtp(_mobile, _otp) {
  return {
    sent: false,
    error: 'Phone SMS verification is disabled. Use email OTP to sign in or register.',
  };
}
