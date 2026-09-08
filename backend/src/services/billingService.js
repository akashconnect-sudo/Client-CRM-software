import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import {
  getPlan,
  PLANS,
  computePrepaidTotal,
  computeSeatTopUpCost,
  remainingPrepaidMonths,
  pricePerUserPerMonth,
  PER_USER_MONTH_PRICES,
  COMBO_PRICE_OVERRIDES,
  SEAT_CAPS,
  packageKeyFromModules,
  formatInr,
} from '../constants/plans.js';
import {
  activatePaidSubscription,
  applySeatTopUp,
  parseSignupEntitlement,
} from './subscriptionService.js';

export function listPlans() {
  return PLANS;
}

export function listModularCatalog() {
  const combo3 = PER_USER_MONTH_PRICES.LEADS[3] + PER_USER_MONTH_PRICES.IVR[3];
  return {
    billingModel: 'per_user_month',
    packages: [
      {
        id: 'LEADS',
        name: 'Leads',
        description: 'Lead Vault, follow-ups, and lead reports',
        pricesPerUserMonth: PER_USER_MONTH_PRICES.LEADS,
      },
      {
        id: 'IVR',
        name: 'IVR',
        description: 'Call Bridge, click-to-call, and call reports',
        pricesPerUserMonth: PER_USER_MONTH_PRICES.IVR,
      },
      {
        id: 'COMBO',
        name: 'Leads + IVR',
        description: 'Full desk — pipeline and IVR together',
        pricesPerUserMonth: {
          3: combo3,
          6: COMBO_PRICE_OVERRIDES[6],
          12: COMBO_PRICE_OVERRIDES[12],
        },
        popularCycle: 6,
      },
    ],
    cycles: [3, 6, 12],
    tiers: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'],
    seatCaps: SEAT_CAPS,
    invoiceFormula: 'pricePerUserPerMonth × seatCount × billingCycleMonths',
  };
}

export function quoteSubscription(input) {
  const entitlement = parseSignupEntitlement(input);
  const quote = computePrepaidTotal({
    ...entitlement,
    seatCount: input.desiredSeats ?? input.seatCount ?? entitlement.seatCount,
  });
  return {
    ...quote,
    format: {
      pricePerUser: formatInr(quote.pricePerUserPerMonth),
      monthlyTeam: formatInr(quote.monthlyTeam),
      total: formatInr(quote.total),
    },
  };
}

export function signPaymentToken({
  companyId,
  email,
  plan,
  modules,
  tier,
  billingCycleMonths,
  seatCount,
  extraSeats,
}) {
  return jwt.sign(
    {
      purpose: 'plan-payment',
      companyId,
      email,
      plan: tier || plan,
      modules,
      tier: tier || plan,
      billingCycleMonths,
      seatCount: seatCount || extraSeats || 1,
    },
    env.jwtSecret,
    { expiresIn: '2h' }
  );
}

export function verifyPaymentToken(token) {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (decoded.purpose !== 'plan-payment' && decoded.purpose !== 'seat-topup') {
    throw Object.assign(new Error('Invalid payment session'), { statusCode: 400 });
  }
  return decoded;
}

export async function activateSubscription(companyId, payload = {}) {
  const entitlement = parseSignupEntitlement(payload);
  return activatePaidSubscription(companyId, {
    ...entitlement,
    paymentId: payload.paymentId,
  });
}

function ensureRazorpayConfigured() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw Object.assign(
      new Error(
        'Real payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
      ),
      { statusCode: 503 }
    );
  }
}

function getRazorpayClient() {
  ensureRazorpayConfigured();
  return new Razorpay({
    key_id: env.razorpayKeyId,
    key_secret: env.razorpayKeySecret,
  });
}

export async function createCheckoutSession({
  companyId,
  plan,
  modules,
  tier,
  billingCycleMonths,
  seatCount,
  desiredSeats,
  extraSeats,
  customer = {},
}) {
  const entitlement = parseSignupEntitlement({
    plan,
    modules,
    tier,
    billingCycleMonths,
    seatCount,
    desiredSeats,
    extraSeats,
  });
  const pricing = computePrepaidTotal(entitlement);

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    throw Object.assign(new Error('Company not found'), { statusCode: 404 });
  }
  const razorpay = getRazorpayClient();
  const amount = Math.round(pricing.total * 100);
  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `crm_${companyId.slice(0, 8)}_${Date.now()}`,
    notes: {
      companyId: String(companyId),
      plan: pricing.tier,
      tier: pricing.tier,
      modules: pricing.modules.join(','),
      billingCycleMonths: String(pricing.months),
      packageKey: pricing.packageKey,
      seatCount: String(pricing.seatCount),
      pricePerUser: String(pricing.pricePerUserPerMonth),
      companyName: company.name,
      kind: 'subscription',
    },
  });

  return {
    provider: 'razorpay',
    keyId: env.razorpayKeyId,
    orderId: order.id,
    amount,
    currency: 'INR',
    plan: pricing.tier,
    tier: pricing.tier,
    modules: pricing.modules,
    billingCycleMonths: pricing.months,
    seatCount: pricing.seatCount,
    pricePerUserPerMonth: pricing.pricePerUserPerMonth,
    packageKey: pricing.packageKey,
    monthlyTeam: pricing.monthlyTeam,
    total: pricing.total,
    discountPercent: pricing.discountPercent,
    planName: `${pricing.packageKey} · ${pricing.seatCount} seats`,
    companyId,
    description: `${pricing.packageKey} · ${formatInr(pricing.pricePerUserPerMonth)}/user/mo × ${pricing.seatCount} × ${pricing.months} mo`,
    name: 'Sales Lead CRM',
    prefill: {
      name: customer.name || '',
      email: customer.email || company.contactEmail || '',
      contact: customer.phone || company.contactPhone || '',
    },
  };
}

/** Mid-cycle: addSeats × pricePerUser(current cycle) × remaining months */
export async function createSeatTopUpCheckout({ companyId, addSeats, customer = {} }) {
  const add = Math.max(0, parseInt(addSeats, 10) || 0);
  if (!add) {
    throw Object.assign(new Error('Select at least 1 extra seat'), { statusCode: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { subscription: true },
  });
  if (!company?.subscription) {
    throw Object.assign(new Error('Subscription not found'), { statusCode: 404 });
  }
  const sub = company.subscription;
  const monthsLeft = remainingPrepaidMonths(sub.renewsAt);
  if (monthsLeft <= 0 && sub.status !== 'TRIAL') {
    throw Object.assign(new Error('Subscription period ended — renew the plan first'), {
      statusCode: 400,
    });
  }
  const months = sub.status === 'TRIAL' ? sub.billingCycleMonths || 3 : monthsLeft;
  const pricing = computeSeatTopUpCost({
    modules: sub.modules,
    billingCycleMonths: sub.billingCycleMonths,
    addSeats: add,
    remainingMonths: months,
    tier: sub.tier,
    currentSeatCount: sub.seatCount || 1,
  });
  if (pricing.addSeats < 1 || pricing.total < 1) {
    throw Object.assign(
      new Error(
        pricing.seatCap != null
          ? `Tier seat cap is ${pricing.seatCap}. Upgrade tier or reduce seats.`
          : 'Nothing to charge for seat top-up'
      ),
      { statusCode: 400 }
    );
  }

  const razorpay = getRazorpayClient();
  const amount = Math.round(pricing.total * 100);
  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `seat_${companyId.slice(0, 8)}_${Date.now()}`,
    notes: {
      companyId: String(companyId),
      kind: 'seat_topup',
      addSeats: String(pricing.addSeats),
      remainingMonths: String(months),
      pricePerUser: String(pricing.pricePerUserPerMonth),
      tier: sub.tier,
    },
  });

  return {
    provider: 'razorpay',
    keyId: env.razorpayKeyId,
    orderId: order.id,
    amount,
    currency: 'INR',
    kind: 'seat_topup',
    addSeats: pricing.addSeats,
    remainingMonths: months,
    total: pricing.total,
    pricePerUserPerMonth: pricing.pricePerUserPerMonth,
    nextSeatCount: pricing.nextSeatCount,
    companyId,
    description: `${pricing.addSeats} seats × ${formatInr(pricing.pricePerUserPerMonth)}/mo × ${Number(months).toFixed(2)} mo`,
    name: 'Sales Lead CRM — Seat top-up',
    prefill: {
      name: customer.name || '',
      email: customer.email || company.contactEmail || '',
      contact: customer.phone || company.contactPhone || '',
    },
  };
}

export async function confirmSeatTopUp(companyId, { addSeats, paymentId }) {
  return applySeatTopUp(companyId, { addSeats, paymentId });
}

export function verifyRazorpayPayment({ orderId, paymentId, signature }) {
  ensureRazorpayConfigured();
  if (!orderId || !paymentId || !signature) {
    throw Object.assign(new Error('Missing payment verification fields'), { statusCode: 400 });
  }
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(payload)
    .digest('hex');
  if (expected !== signature) {
    throw Object.assign(new Error('Invalid payment signature'), { statusCode: 400 });
  }
}

export async function getSubscription(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      plan: true,
      subscriptionStatus: true,
      paidAt: true,
      paymentId: true,
      contactEmail: true,
      contactPhone: true,
      trialEndsAt: true,
      subscription: true,
      ivrIntegration: {
        select: {
          id: true,
          mode: true,
          provider: true,
          status: true,
          instanceId: true,
          webhookSecret: true,
          lastSyncedAt: true,
          lastError: true,
        },
      },
    },
  });
  if (!company) return null;
  const sub = company.subscription;
  const packageKey = packageKeyFromModules(sub?.modules || ['LEADS']);
  const seatCount = Math.max(1, sub?.seatCount || 1);
  const months = sub?.billingCycleMonths || 3;
  const pricePerUser = pricePerUserPerMonth(packageKey, months);
  const monthsLeft = remainingPrepaidMonths(sub?.renewsAt);
  return {
    ...company,
    planDetails: getPlan(company.plan),
    modules: sub?.modules || (company.plan === 'STARTER' ? ['LEADS'] : ['LEADS', 'IVR']),
    tier: sub?.tier || company.plan,
    billingCycleMonths: months,
    seatCount,
    extraSeats: Math.max(0, seatCount - 1),
    includedSeats: SEAT_CAPS[sub?.tier || company.plan] ?? SEAT_CAPS.STARTER,
    effectiveSeats: seatCount,
    seatCap: SEAT_CAPS[sub?.tier || company.plan] ?? SEAT_CAPS.STARTER,
    remainingMonths: monthsLeft,
    pricePerUserPerMonth: pricePerUser,
    monthlyTeam: pricePerUser * seatCount,
    workspaceSubscription: sub,
    packageKey,
  };
}
