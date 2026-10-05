import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

/** Strip whitespace/newlines from Vercel env vars (common when pasted via CLI) */
function cleanEnv(value, fallback = '') {
  if (value == null || value === '') return fallback;
  const trimmed = String(value).trim().replace(/[\r\n]+/g, '');
  return trimmed || fallback;
}

/** jwt.sign expiresIn must be seconds (number) or timespan string e.g. 7d, 12h */
function parseJwtExpiresIn(value) {
  const raw = cleanEnv(value, '7d');
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^\d+\s*(ms|s|m|h|d|w|y)$/i.test(raw) || /^\d+[smhdwy]$/i.test(raw)) return raw;
  return '7d';
}

function buildCorsOrigins() {
  const origins = new Set();
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  frontend.split(',').forEach((o) => origins.add(o.trim()));

  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_BRANCH_URL) {
    origins.add(`https://${process.env.VERCEL_BRANCH_URL}`);
  }

  return [...origins].filter(Boolean);
}

/** Allow Vercel preview/production origins when FRONTEND_URL is wrong or missing */
export function corsOriginCheck(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }
  const allowed = buildCorsOrigins();
  if (allowed.includes(origin)) {
    callback(null, true);
    return;
  }
  if (/^https:\/\/[\w-]+\.vercel\.app$/i.test(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error('Not allowed by CORS'));
}

export const env = {
  port: parseInt(cleanEnv(process.env.PORT, '5000'), 10),
  nodeEnv: cleanEnv(process.env.NODE_ENV, 'development'),
  jwtSecret: cleanEnv(process.env.JWT_SECRET, 'dev-secret-change-me'),
  jwtExpiresIn: parseJwtExpiresIn(process.env.JWT_EXPIRES_IN),
  frontendUrl: cleanEnv(process.env.FRONTEND_URL, 'http://localhost:5173'),
  apiBaseUrl: cleanEnv(process.env.API_BASE_URL, ''),
  corsOrigins: buildCorsOrigins(),
  googleWebhookSecret: process.env.GOOGLE_WEBHOOK_SECRET || '',
  metaWebhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || '',
  metaWebhookSecret: process.env.META_WEBHOOK_SECRET || '',
  ivrWebhookSecret: process.env.IVR_WEBHOOK_SECRET || '',
  connectWebhookSecret: cleanEnv(process.env.CONNECT_WEBHOOK_SECRET, ''),
  ivrSecretsKey: cleanEnv(process.env.IVR_SECRETS_KEY, ''),
  gstVerificationMode: cleanEnv(process.env.GST_VERIFICATION_MODE, 'mock').toLowerCase(),
  gstApiKey: cleanEnv(process.env.GST_API_KEY, ''),
  gstApiUrl: cleanEnv(process.env.GST_API_URL, ''),
  gstMockMobile: cleanEnv(process.env.GST_MOCK_MOBILE, '9876543210'),
  gstMockEmail: cleanEnv(process.env.GST_MOCK_EMAIL, ''),
  gstOtpRequired: cleanEnv(process.env.GST_OTP_REQUIRED, 'true').toLowerCase() !== 'false',
  gstOtpExpiryMinutes: parseInt(cleanEnv(process.env.GST_OTP_EXPIRY_MINUTES, '10'), 10) || 10,
  gstOtpDevExpose: cleanEnv(process.env.GST_OTP_DEV_EXPOSE, 'true').toLowerCase() === 'true' &&
    cleanEnv(process.env.NODE_ENV, 'development') !== 'production',
  authEmailOtpRequired: cleanEnv(process.env.AUTH_EMAIL_OTP_REQUIRED, 'true').toLowerCase() !== 'false',
  authOtpExpiryMinutes: parseInt(cleanEnv(process.env.AUTH_OTP_EXPIRY_MINUTES, '10'), 10) || 10,
  authOtpDevExpose:
    cleanEnv(process.env.AUTH_OTP_DEV_EXPOSE, 'false').toLowerCase() === 'true' &&
    cleanEnv(process.env.NODE_ENV, 'development') !== 'production',
  authPhoneOtpRequired: cleanEnv(process.env.AUTH_PHONE_OTP_REQUIRED, 'false').toLowerCase() === 'true',
  trialDays: parseInt(cleanEnv(process.env.TRIAL_DAYS, '10'), 10) || 10,
  stripeSecretKey: cleanEnv(process.env.STRIPE_SECRET_KEY, ''),
  stripeWebhookSecret: cleanEnv(process.env.STRIPE_WEBHOOK_SECRET, ''),
  razorpayKeyId: cleanEnv(process.env.RAZORPAY_KEY_ID, ''),
  razorpayKeySecret: cleanEnv(process.env.RAZORPAY_KEY_SECRET, ''),
  smsHttpUrl: cleanEnv(process.env.SMS_HTTP_URL, ''),
  smsApiKey: cleanEnv(process.env.SMS_API_KEY, ''),
  smtpHttpUrl: cleanEnv(process.env.SMTP_HTTP_URL, ''),
  smtpApiKey: cleanEnv(process.env.SMTP_API_KEY, ''),
  smtpHost: cleanEnv(process.env.SMTP_HOST, 'smtp.gmail.com'),
  smtpPort: parseInt(cleanEnv(process.env.SMTP_PORT, '587'), 10) || 587,
  smtpUser: cleanEnv(process.env.SMTP_USER, ''),
  smtpPass: cleanEnv(process.env.SMTP_PASS, ''),
  smtpFrom: cleanEnv(process.env.SMTP_FROM, ''),
  googleClientId: cleanEnv(process.env.GOOGLE_CLIENT_ID, ''),
  googleClientSecret: cleanEnv(process.env.GOOGLE_CLIENT_SECRET, ''),
  microsoftClientId: cleanEnv(process.env.MICROSOFT_CLIENT_ID, ''),
  microsoftClientSecret: cleanEnv(process.env.MICROSOFT_CLIENT_SECRET, ''),
  microsoftTenantId: cleanEnv(process.env.MICROSOFT_TENANT_ID, 'common'),
  githubClientId: cleanEnv(process.env.GITHUB_CLIENT_ID, ''),
  githubClientSecret: cleanEnv(process.env.GITHUB_CLIENT_SECRET, ''),
  /** Private GPU ai-inference base URL (never public). Example: http://10.0.1.20:8080 */
  aiInferenceUrl: cleanEnv(process.env.AI_INFERENCE_URL, ''),
  /** Shared secret header for CRM ↔ ai-inference */
  aiInternalSecret: cleanEnv(process.env.AI_INTERNAL_SECRET, ''),
  aiChatModel: cleanEnv(process.env.AI_CHAT_MODEL, 'llama-3.1-8b-instruct'),
  aiEmbedModel: cleanEnv(process.env.AI_EMBED_MODEL, 'bge-small-en'),
  /** Private S3 bucket for Amazon Connect call recordings (presigned playback). */
  recordingsBucket: cleanEnv(process.env.RECORDINGS_BUCKET, ''),
  awsRegion: cleanEnv(process.env.AWS_REGION, 'ap-south-1'),
  /** AWS Lambda function name or ARN that sends the professional welcome email. */
  welcomeEmailLambdaName: cleanEnv(process.env.WELCOME_EMAIL_LAMBDA_NAME, ''),
};

export function apiPublicUrl(req) {
  if (env.apiBaseUrl) return env.apiBaseUrl.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}
