import {
  SEAT_CAPS,
  seatCapForTier,
  normalizeTier,
} from './plans.js';

/** Seat count includes Super Admin + all users in the company. */
export const PLAN_LIMITS = {
  STARTER: { maxUsers: SEAT_CAPS.STARTER, maxLeads: 500, maxManagers: 1 },
  PROFESSIONAL: { maxUsers: SEAT_CAPS.PROFESSIONAL, maxLeads: null, maxManagers: 4 },
  ENTERPRISE: { maxUsers: null, maxLeads: null, maxManagers: null },
};

/**
 * Effective user cap = min(tierCap, purchased seatCount).
 * Enterprise tierCap is null → only seatCount limits (must buy seats for each user).
 */
export function getPlanLimits(planId, { seatCount = 1, extraSeats = 0 } = {}) {
  const base = PLAN_LIMITS[planId] || PLAN_LIMITS.STARTER;
  const tierCap = seatCapForTier(planId);
  const purchased = Math.max(
    1,
    parseInt(seatCount, 10) || Math.max(1, 1 + (parseInt(extraSeats, 10) || 0))
  );
  if (tierCap == null) {
    return { ...base, maxUsers: purchased };
  }
  return { ...base, maxUsers: Math.min(tierCap, purchased) };
}

export function planLimitMessage(planId, type = 'users', { seatCount = 1 } = {}) {
  const limits = getPlanLimits(planId, { seatCount });
  const planName =
    planId === 'STARTER' ? 'Starter' : planId === 'PROFESSIONAL' ? 'Professional' : 'Your';

  if (type === 'users') {
    if (limits.maxUsers == null) return null;
    return `${planName} allows up to ${limits.maxUsers} users (including Super Admin) based on your purchased seats / tier cap. Buy more seats or upgrade tier to add more.`;
  }
  if (type === 'managers') {
    if (limits.maxManagers == null) return null;
    return `${planName} plan allows up to ${limits.maxManagers} managers. Upgrade to add more managers.`;
  }

  if (limits.maxLeads == null) return null;
  return `${planName} plan allows up to ${limits.maxLeads} leads. Upgrade to add more.`;
}

export { seatCapForTier, normalizeTier };
