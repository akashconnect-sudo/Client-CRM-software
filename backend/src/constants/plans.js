/** Modular per-user/month pricing — invoice = pricePerUser × seatCount × months */

export const TIERS = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
export const MODULES = ['LEADS', 'IVR'];
export const BILLING_CYCLES = [3, 6, 12];

/**
 * Final per-user / per-month INR by package × cycle.
 * Combo 3mo is DERIVED as Leads[3]+IVR[3] — never hardcode that cell.
 * Combo 6mo / 12mo are explicit business overrides (not derived).
 */
export const PER_USER_MONTH_PRICES = {
  LEADS: { 3: 799, 6: 599, 12: 499 },
  IVR: { 3: 899, 6: 599, 12: 399 },
};

/** Explicit Combo overrides (6 / 12 only). 3mo always = sum of LEADS+IVR for that cycle. */
export const COMBO_PRICE_OVERRIDES = {
  6: 999,
  12: 949,
};

/** Soft seat caps by tier (feature layer). Enterprise = no cap; still billed per seat. */
export const SEAT_CAPS = {
  STARTER: 5,
  PROFESSIONAL: 25,
  ENTERPRISE: null,
};

/** @deprecated alias — use SEAT_CAPS */
export const INCLUDED_SEATS = SEAT_CAPS;

/** Legacy PLANS list for older UI (display only; billing uses PER_USER_MONTH_PRICES). */
export const PLANS = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 499,
    priceLabel: 'From ₹499',
    period: '/user/month',
    description: 'Small teams — seat cap 5',
    features: ['Up to 5 users', '500 leads', 'Email support', 'Basic reports', 'In-app alerts only'],
    popular: false,
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: 949,
    priceLabel: 'From ₹399',
    period: '/user/month',
    description: 'Growing sales teams — seat cap 25',
    features: [
      'Up to 25 users',
      'Unlimited leads',
      'IVR integration',
      'Automation alerts',
      'Email alerts (leads, notices & reports)',
    ],
    popular: true,
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 949,
    priceLabel: 'Per user',
    period: '/user/month',
    description: 'No seat cap — still billed per active seat',
    features: [
      'Unlimited seats (no cap)',
      'Email alerts (leads, notices & reports)',
      'Priority support',
      'AI root-cause analysis',
      'Predictive follow-up engine',
      'Smart campaign optimization',
      'Dedicated success manager',
      'Custom webhooks',
      'Advanced analytics',
    ],
    popular: false,
  },
];

export function getPlan(planId) {
  return PLANS.find((p) => p.id === planId) || PLANS[0];
}

export function normalizeModules(modules) {
  const set = new Set(
    (Array.isArray(modules) ? modules : [])
      .map((m) => String(m || '').toUpperCase())
      .filter((m) => m === 'LEADS' || m === 'IVR')
  );
  if (!set.size) set.add('LEADS');
  return [...set].sort();
}

export function packageKeyFromModules(modules) {
  const m = normalizeModules(modules);
  if (m.includes('LEADS') && m.includes('IVR')) return 'COMBO';
  if (m.includes('IVR') && !m.includes('LEADS')) return 'IVR';
  return 'LEADS';
}

export function normalizeTier(tier) {
  const t = String(tier || 'STARTER').toUpperCase();
  return TIERS.includes(t) ? t : 'STARTER';
}

export function normalizeCycle(months) {
  const n = parseInt(months, 10);
  return BILLING_CYCLES.includes(n) ? n : 3;
}

export function normalizeSeatCount(n, { tier } = {}) {
  let seats = Math.max(1, parseInt(n, 10) || 1);
  const cap = seatCapForTier(tier);
  if (cap != null) seats = Math.min(seats, cap);
  return seats;
}

export function seatCapForTier(tier) {
  const t = normalizeTier(tier);
  if (Object.prototype.hasOwnProperty.call(SEAT_CAPS, t)) return SEAT_CAPS[t];
  return SEAT_CAPS.STARTER;
}

/**
 * Per-user / per-month list price for a package × cycle.
 * Combo 3mo derived; Combo 6/12 from COMBO_PRICE_OVERRIDES.
 */
export function pricePerUserPerMonth(packageKeyOrModules, billingCycleMonths) {
  const months = normalizeCycle(billingCycleMonths);
  const key =
    typeof packageKeyOrModules === 'string' && ['LEADS', 'IVR', 'COMBO'].includes(packageKeyOrModules)
      ? packageKeyOrModules
      : packageKeyFromModules(packageKeyOrModules);

  if (key === 'COMBO') {
    if (months === 3) {
      return PER_USER_MONTH_PRICES.LEADS[3] + PER_USER_MONTH_PRICES.IVR[3];
    }
    if (COMBO_PRICE_OVERRIDES[months] != null) return COMBO_PRICE_OVERRIDES[months];
  }
  return PER_USER_MONTH_PRICES[key][months];
}

/** 3-month rate for the same package — real reference for strikethrough / % off. */
export function reference3MonthPrice(packageKeyOrModules) {
  return pricePerUserPerMonth(packageKeyOrModules, 3);
}

/** % off vs paying the 3-month per-user rate for the same package (0 when cycle is 3). */
export function discountPercentVs3Month(packageKey, billingCycleMonths) {
  const months = normalizeCycle(billingCycleMonths);
  if (months === 3) return 0;
  const current = pricePerUserPerMonth(packageKey, months);
  const ref = reference3MonthPrice(packageKey);
  if (!ref || current >= ref) return 0;
  return Math.round(((ref - current) / ref) * 100);
}

/**
 * Invoice: pricePerUserPerMonth × seatCount × billingCycleMonths
 */
export function computePrepaidTotal({
  modules,
  packageKey,
  tier,
  billingCycleMonths,
  seatCount,
  desiredSeats,
  extraSeats, // legacy alias — treated as seatCount if seatCount omitted
}) {
  const months = normalizeCycle(billingCycleMonths);
  const key = packageKey || packageKeyFromModules(modules);
  const t = normalizeTier(tier);
  const seats = normalizeSeatCount(seatCount ?? desiredSeats ?? extraSeats ?? 1, { tier: t });
  const pricePerUser = pricePerUserPerMonth(key, months);
  const ref3 = reference3MonthPrice(key);
  const discountPercent = discountPercentVs3Month(key, months);
  const total = Math.round(pricePerUser * seats * months);
  const totalAt3MonthRate = Math.round(ref3 * seats * months);
  const monthlyTeam = Math.round(pricePerUser * seats);

  return {
    packageKey: key,
    modules: key === 'COMBO' ? ['LEADS', 'IVR'] : key === 'IVR' ? ['IVR'] : ['LEADS'],
    tier: t,
    months,
    seatCount: seats,
    pricePerUserPerMonth: pricePerUser,
    reference3MonthPrice: ref3,
    discountPercent,
    discountRate: discountPercent / 100,
    monthlyTeam,
    total,
    /** Same seats × months at 3-mo rate — real strikethrough reference */
    totalAt3MonthRate,
    pricePerMonth: pricePerUser,
    pricePerMonthEffective: pricePerUser,
    /** @deprecated flat-era fields kept so older callers don't crash */
    monthlyBase: pricePerUser,
    modulesTotal: total,
    seatTopUp: { total: 0, extraSeats: 0 },
    extraSeats: Math.max(0, seats - 1),
    includedSeats: seatCapForTier(t),
    effectiveSeats: seats,
  };
}

/** Mid-cycle seat top-up: addSeats × current per-user rate × remaining months */
export function computeSeatTopUpCost({
  modules,
  packageKey,
  billingCycleMonths,
  addSeats = 0,
  remainingMonths = null,
  tier,
  currentSeatCount = 1,
}) {
  const key = packageKey || packageKeyFromModules(modules);
  const months =
    remainingMonths != null
      ? Math.max(0, Number(remainingMonths))
      : normalizeCycle(billingCycleMonths);
  const add = Math.max(0, parseInt(addSeats, 10) || 0);
  const pricePerUser = pricePerUserPerMonth(key, billingCycleMonths || 3);
  const cap = seatCapForTier(tier);
  let allowed = add;
  if (cap != null) {
    allowed = Math.max(0, Math.min(add, cap - (parseInt(currentSeatCount, 10) || 1)));
  }
  const total = Math.round(allowed * pricePerUser * months);
  return {
    addSeats: allowed,
    requestedSeats: add,
    pricePerUserPerMonth: pricePerUser,
    months,
    total,
    unlimited: cap == null,
    seatCap: cap,
    nextSeatCount: (parseInt(currentSeatCount, 10) || 1) + allowed,
  };
}

export function estimateTeamCost({ packageKey, modules, billingCycleMonths, desiredSeats = 1, tier }) {
  return computePrepaidTotal({
    packageKey,
    modules,
    billingCycleMonths,
    desiredSeats,
    tier,
  });
}

/** Months remaining until renewsAt */
export function remainingPrepaidMonths(renewsAt) {
  if (!renewsAt) return 0;
  const ms = new Date(renewsAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.max(ms / (1000 * 60 * 60 * 24 * 30.4375), 1 / 30);
}

export function formatInr(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

/** Assert combo longer cycles stay cheaper (guard for future edits). */
export function assertComboPriceOrdering() {
  const c3 = pricePerUserPerMonth('COMBO', 3);
  const c6 = pricePerUserPerMonth('COMBO', 6);
  const c12 = pricePerUserPerMonth('COMBO', 12);
  if (!(c12 < c6 && c6 < c3)) {
    throw new Error(`Combo price ordering broken: 12=${c12} 6=${c6} 3=${c3}`);
  }
}
