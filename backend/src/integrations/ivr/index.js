import { normalizeExotel } from './exotel.js';
import { normalizeKnowlarity } from './knowlarity.js';
import { normalizeGeneric } from './generic.js';

const PROVIDERS = {
  EXOTEL: normalizeExotel,
  KNOWLARITY: normalizeKnowlarity,
  OZONETEL: (b) => normalizeGeneric(b, 'OZONETEL'),
  MYOPERATOR: (b) => normalizeGeneric(b, 'MYOPERATOR'),
  AMAZON_CONNECT: (b) => normalizeGeneric(b, 'AMAZON_CONNECT'),
  OTHER: (b) => normalizeGeneric(b, 'OTHER'),
};

export function normalizeExternalIvrPayload(provider, body) {
  const key = String(provider || 'OTHER').toUpperCase();
  const fn = PROVIDERS[key] || PROVIDERS.OTHER;
  const normalized = fn(body);
  if (!normalized.externalCallId) {
    throw Object.assign(new Error('Could not find call id in provider payload'), { statusCode: 400 });
  }
  return normalized;
}

export const EXTERNAL_IVR_PROVIDERS = Object.keys(PROVIDERS);
