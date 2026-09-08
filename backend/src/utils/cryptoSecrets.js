import crypto from 'crypto';
import { env } from '../config/env.js';

function getKey() {
  const raw = env.ivrSecretsKey || '';
  if (!raw) return null;
  // Accept 64-char hex (32 bytes) or utf8 string padded/hashed to 32 bytes
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptSecret(plain) {
  if (plain == null || plain === '') return null;
  const key = getKey();
  if (!key) {
    if (env.nodeEnv === 'production') {
      throw Object.assign(new Error('IVR_SECRETS_KEY is required to store IVR credentials'), {
        statusCode: 503,
      });
    }
    // Dev fallback: prefix so we know it's plaintext
    return `plain:${plain}`;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptSecret(stored) {
  if (!stored) return null;
  if (String(stored).startsWith('plain:')) return String(stored).slice(6);
  if (!String(stored).startsWith('v1:')) return stored;
  const key = getKey();
  if (!key) {
    throw Object.assign(new Error('IVR_SECRETS_KEY is required to read IVR credentials'), {
      statusCode: 503,
    });
  }
  const [, ivHex, tagHex, dataHex] = String(stored).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}
