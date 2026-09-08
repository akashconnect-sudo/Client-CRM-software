/** Mirror of backend/src/constants/plans.js — per-user/month billing */

export const PER_USER_MONTH_PRICES = {
  LEADS: { 3: 799, 6: 599, 12: 499 },
  IVR: { 3: 899, 6: 599, 12: 399 },
};

export const COMBO_PRICE_OVERRIDES = {
  6: 999,
  12: 949,
};

export const SEAT_CAPS = {
  STARTER: 5,
  PROFESSIONAL: 25,
  ENTERPRISE: null,
};

export const PACKAGE_META = {
  LEADS: {
    id: 'LEADS',
    name: 'Leads',
    description: 'Lead Vault, Follow-up Radar, and pipeline reporting',
    modules: ['LEADS'],
  },
  IVR: {
    id: 'IVR',
    name: 'IVR',
    description: 'Call Bridge, click-to-call, and call analytics',
    modules: ['IVR'],
  },
  COMBO: {
    id: 'COMBO',
    name: 'Leads + IVR',
    description: 'Full desk — pipeline and native IVR together',
    modules: ['LEADS', 'IVR'],
  },
};

export const TIER_LABELS = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

export function packageKeyFromModules(modules = []) {
  const m = (Array.isArray(modules) ? modules : []).map((x) => String(x).toUpperCase());
  if (m.includes('LEADS') && m.includes('IVR')) return 'COMBO';
  if (m.includes('IVR') && !m.includes('LEADS')) return 'IVR';
  return 'LEADS';
}

export function pricePerUserPerMonth(packageKey, billingCycleMonths) {
  const months = [3, 6, 12].includes(Number(billingCycleMonths)) ? Number(billingCycleMonths) : 3;
  const key = packageKey || 'LEADS';
  if (key === 'COMBO') {
    if (months === 3) return PER_USER_MONTH_PRICES.LEADS[3] + PER_USER_MONTH_PRICES.IVR[3];
    if (COMBO_PRICE_OVERRIDES[months] != null) return COMBO_PRICE_OVERRIDES[months];
  }
  return PER_USER_MONTH_PRICES[key][months];
}

export function reference3MonthPrice(packageKey) {
  return pricePerUserPerMonth(packageKey, 3);
}

export function discountPercentVs3Month(packageKey, billingCycleMonths) {
  const months = [3, 6, 12].includes(Number(billingCycleMonths)) ? Number(billingCycleMonths) : 3;
  if (months === 3) return 0;
  const current = pricePerUserPerMonth(packageKey, months);
  const ref = reference3MonthPrice(packageKey);
  if (!ref || current >= ref) return 0;
  return Math.round(((ref - current) / ref) * 100);
}

export function normalizeSeatCount(n, { tier } = {}) {
  let seats = Math.max(1, parseInt(n, 10) || 1);
  const cap = SEAT_CAPS[tier] ?? null;
  if (cap != null) seats = Math.min(seats, cap);
  return seats;
}

export function computePrepaidTotal({
  packageKey,
  modules,
  tier = 'PROFESSIONAL',
  billingCycleMonths,
  seatCount,
  desiredSeats,
}) {
  const key = packageKey || packageKeyFromModules(modules);
  const months = [3, 6, 12].includes(Number(billingCycleMonths)) ? Number(billingCycleMonths) : 3;
  const seats = normalizeSeatCount(seatCount ?? desiredSeats ?? 1, { tier });
  const pricePerUser = pricePerUserPerMonth(key, months);
  const ref3 = reference3MonthPrice(key);
  const discountPercent = discountPercentVs3Month(key, months);
  const total = Math.round(pricePerUser * seats * months);
  const totalAt3MonthRate = Math.round(ref3 * seats * months);
  const monthlyTeam = Math.round(pricePerUser * seats);

  return {
    packageKey: key,
    modules: PACKAGE_META[key].modules,
    tier,
    months,
    seatCount: seats,
    pricePerUserPerMonth: pricePerUser,
    reference3MonthPrice: ref3,
    discountPercent,
    monthlyTeam,
    total,
    totalAt3MonthRate,
    // aliases for older UI
    pricePerMonthEffective: pricePerUser,
    monthlyBase: pricePerUser,
    modulesTotal: total,
    seatTotal: 0,
    extraSeats: Math.max(0, seats - 1),
    includedSeats: SEAT_CAPS[tier],
    effectiveSeats: seats,
    full: totalAt3MonthRate,
  };
}

export function formatInr(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function signupQuery({ packageKey, tier, billingCycleMonths, desiredSeats }) {
  const pkg = PACKAGE_META[packageKey] || PACKAGE_META.COMBO;
  const params = new URLSearchParams({
    mode: 'register',
    package: pkg.id,
    tier: tier || 'PROFESSIONAL',
    cycle: String(billingCycleMonths || 6),
  });
  if (desiredSeats) params.set('seats', String(desiredSeats));
  return `/login?${params.toString()}`;
}
