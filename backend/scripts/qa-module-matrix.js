/**
 * QA: per-user pricing + 4 module states
 * Run: node scripts/qa-module-matrix.js
 */
import {
  canAccessLeads,
  canAccessIVR,
  canAccessTierFeature,
} from '../src/utils/moduleAccess.js';
import {
  computePrepaidTotal,
  computeSeatTopUpCost,
  pricePerUserPerMonth,
  assertComboPriceOrdering,
  PER_USER_MONTH_PRICES,
  COMBO_PRICE_OVERRIDES,
} from '../src/constants/plans.js';
import { getPlanLimits } from '../src/constants/planLimits.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function company({ modules, tier, ivrStatus, seatCount = 1 }) {
  return {
    plan: tier,
    subscription: { modules, tier, status: 'ACTIVE', seatCount },
    ivrIntegration: ivrStatus
      ? {
          mode: modules.includes('IVR') ? 'NATIVE' : 'EXTERNAL',
          status: ivrStatus,
          provider: 'EXOTEL',
        }
      : null,
  };
}

const cases = [
  {
    name: 'Leads-only',
    c: company({ modules: ['LEADS'], tier: 'STARTER' }),
    expect: { leads: true, ivr: false, callBridge: false, followUps: true },
  },
  {
    name: 'Leads + external CONNECTED',
    c: company({ modules: ['LEADS'], tier: 'STARTER', ivrStatus: 'CONNECTED' }),
    expect: { leads: true, ivr: true, callBridge: true, followUps: true },
  },
  {
    name: 'IVR-only',
    c: company({ modules: ['IVR'], tier: 'PROFESSIONAL', ivrStatus: 'CONNECTED' }),
    expect: { leads: false, ivr: true, callBridge: true, followUps: false },
  },
  {
    name: 'Combo',
    c: company({ modules: ['LEADS', 'IVR'], tier: 'PROFESSIONAL', ivrStatus: 'CONNECTED' }),
    expect: { leads: true, ivr: true, callBridge: true, followUps: true },
  },
];

let failed = 0;
for (const row of cases) {
  const got = {
    leads: canAccessLeads(row.c),
    ivr: canAccessIVR(row.c),
    callBridge: canAccessTierFeature(row.c, 'callBridge'),
    followUps: canAccessTierFeature(row.c, 'follow-ups'),
  };
  const ok = Object.keys(row.expect).every((k) => got[k] === row.expect[k]);
  if (!ok) {
    failed += 1;
    console.error('FAIL', row.name, { expect: row.expect, got });
  } else console.log('OK  ', row.name, got);
}

// Price table
assert(pricePerUserPerMonth('LEADS', 3) === 799, 'leads 3');
assert(pricePerUserPerMonth('LEADS', 6) === 599, 'leads 6');
assert(pricePerUserPerMonth('LEADS', 12) === 499, 'leads 12');
assert(pricePerUserPerMonth('IVR', 3) === 899, 'ivr 3');
assert(pricePerUserPerMonth('IVR', 6) === 599, 'ivr 6');
assert(pricePerUserPerMonth('IVR', 12) === 399, 'ivr 12');

const combo3 = PER_USER_MONTH_PRICES.LEADS[3] + PER_USER_MONTH_PRICES.IVR[3];
assert(pricePerUserPerMonth('COMBO', 3) === combo3, 'combo 3 derived');
assert(combo3 === 1698, 'combo 3 = 1698');
assert(pricePerUserPerMonth('COMBO', 6) === COMBO_PRICE_OVERRIDES[6], 'combo 6 override');
assert(pricePerUserPerMonth('COMBO', 12) === COMBO_PRICE_OVERRIDES[12], 'combo 12 override');
assertComboPriceOrdering();
console.log('OK   combo prices 3/6/12 =', combo3, COMBO_PRICE_OVERRIDES[6], COMBO_PRICE_OVERRIDES[12]);

// Invoice = price × seats × months
const inv = computePrepaidTotal({
  packageKey: 'COMBO',
  tier: 'PROFESSIONAL',
  billingCycleMonths: 6,
  seatCount: 5,
});
assert(inv.pricePerUserPerMonth === 999, 'combo 6 rate');
assert(inv.total === 999 * 5 * 6, 'invoice 999×5×6');
assert(inv.discountPercent === Math.round(((1698 - 999) / 1698) * 100), '% off vs 3mo');
console.log('OK   invoice Combo 6mo × 5 seats =', inv.total, `(${inv.discountPercent}% off vs 3mo rate)`);

const top = computeSeatTopUpCost({
  packageKey: 'LEADS',
  billingCycleMonths: 12,
  addSeats: 2,
  remainingMonths: 3,
  tier: 'STARTER',
  currentSeatCount: 3,
});
assert(top.pricePerUserPerMonth === 499, 'top-up uses cycle rate');
assert(top.total === Math.round(2 * 499 * 3), 'top-up math');
console.log('OK   seat top-up 2 × 499 × 3mo =', top.total);

const limits = getPlanLimits('STARTER', { seatCount: 3 });
assert(limits.maxUsers === 3, 'cap = min(tier, purchased)');
const limits2 = getPlanLimits('STARTER', { seatCount: 10 });
assert(limits2.maxUsers === 5, 'tier cap 5 wins');
const ent = getPlanLimits('ENTERPRISE', { seatCount: 40 });
assert(ent.maxUsers === 40, 'enterprise = purchased seats only');
console.log('OK   seat caps starter/enterprise');

if (failed) {
  console.error(`\n${failed} access case(s) failed`);
  process.exit(1);
}
console.log('\nAll per-user pricing QA checks passed.');
