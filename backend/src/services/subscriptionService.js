import crypto from 'crypto';
import prisma from '../config/db.js';
import { env } from '../config/env.js';
import {
  computePrepaidTotal,
  normalizeModules,
  normalizeCycle,
  normalizeTier,
  normalizeSeatCount,
} from '../constants/plans.js';

export async function upsertTrialSubscription(companyId, {
  modules = ['LEADS'],
  tier = 'STARTER',
  billingCycleMonths = 3,
  seatCount = 1,
  extraSeats,
} = {}) {
  const pricing = computePrepaidTotal({
    modules,
    tier,
    billingCycleMonths,
    seatCount: seatCount ?? (extraSeats != null ? Math.max(1, extraSeats) : 1),
  });
  const startedAt = new Date();
  const renewsAt = new Date(startedAt.getTime() + env.trialDays * 24 * 60 * 60 * 1000);

  return prisma.workspaceSubscription.upsert({
    where: { companyId },
    create: {
      companyId,
      modules: pricing.modules,
      tier: pricing.tier,
      billingCycleMonths: pricing.months,
      pricePerMonth: pricing.pricePerUserPerMonth,
      seatCount: pricing.seatCount,
      extraSeats: Math.max(0, pricing.seatCount - 1),
      startedAt,
      renewsAt,
      status: 'TRIAL',
    },
    update: {
      modules: pricing.modules,
      tier: pricing.tier,
      billingCycleMonths: pricing.months,
      pricePerMonth: pricing.pricePerUserPerMonth,
      seatCount: pricing.seatCount,
      extraSeats: Math.max(0, pricing.seatCount - 1),
      startedAt,
      renewsAt,
      status: 'TRIAL',
    },
  });
}

export async function activatePaidSubscription(companyId, {
  modules,
  tier,
  billingCycleMonths,
  seatCount,
  extraSeats,
  desiredSeats,
  paymentId,
} = {}) {
  const existing = await prisma.workspaceSubscription.findUnique({ where: { companyId } });
  const seats = normalizeSeatCount(
    seatCount ?? desiredSeats ?? (extraSeats != null ? Math.max(1, extraSeats) : null) ?? existing?.seatCount ?? 1,
    { tier: tier || existing?.tier }
  );
  const pricing = computePrepaidTotal({ modules, tier, billingCycleMonths, seatCount: seats });
  const startedAt = new Date();
  const renewsAt = new Date(startedAt);
  renewsAt.setMonth(renewsAt.getMonth() + pricing.months);

  const [subscription] = await prisma.$transaction([
    prisma.workspaceSubscription.upsert({
      where: { companyId },
      create: {
        companyId,
        modules: pricing.modules,
        tier: pricing.tier,
        billingCycleMonths: pricing.months,
        pricePerMonth: pricing.pricePerUserPerMonth,
        seatCount: pricing.seatCount,
        extraSeats: Math.max(0, pricing.seatCount - 1),
        startedAt,
        renewsAt,
        status: 'ACTIVE',
        razorpayPaymentId: paymentId || null,
      },
      update: {
        modules: pricing.modules,
        tier: pricing.tier,
        billingCycleMonths: pricing.months,
        pricePerMonth: pricing.pricePerUserPerMonth,
        seatCount: pricing.seatCount,
        extraSeats: Math.max(0, pricing.seatCount - 1),
        startedAt,
        renewsAt,
        status: 'ACTIVE',
        razorpayPaymentId: paymentId || null,
      },
    }),
    prisma.company.update({
      where: { id: companyId },
      data: {
        plan: pricing.tier,
        subscriptionStatus: 'ACTIVE',
        paidAt: startedAt,
        paymentId: paymentId || `pay_${Date.now()}`,
      },
    }),
  ]);

  if (pricing.modules.includes('IVR')) {
    await prisma.iVRIntegration.upsert({
      where: { companyId },
      create: {
        companyId,
        mode: 'NATIVE',
        provider: 'AMAZON_CONNECT',
        webhookSecret: crypto.randomUUID(),
        status: 'CONNECTED',
      },
      update: {
        mode: 'NATIVE',
        provider: 'AMAZON_CONNECT',
        status: 'CONNECTED',
        lastError: null,
      },
    });
  }

  return subscription;
}

/** Apply purchased seat top-up — increases billable seatCount (Enterprise allowed; still billed). */
export async function applySeatTopUp(companyId, { addSeats, paymentId } = {}) {
  const add = Math.max(0, parseInt(addSeats, 10) || 0);
  if (!add) {
    throw Object.assign(new Error('addSeats must be at least 1'), { statusCode: 400 });
  }
  const sub = await prisma.workspaceSubscription.findUnique({ where: { companyId } });
  if (!sub) {
    throw Object.assign(new Error('Subscription not found'), { statusCode: 404 });
  }

  const next = normalizeSeatCount((sub.seatCount || 1) + add, { tier: sub.tier });
  if (next <= (sub.seatCount || 1)) {
    throw Object.assign(
      new Error('Cannot add seats — tier seat cap reached. Upgrade tier for a higher cap.'),
      { statusCode: 400 }
    );
  }

  return prisma.workspaceSubscription.update({
    where: { companyId },
    data: {
      seatCount: next,
      extraSeats: Math.max(0, next - 1),
      razorpayPaymentId: paymentId || sub.razorpayPaymentId,
    },
  });
}

export function parseSignupEntitlement(body = {}) {
  let modules = body.modules;
  if (typeof modules === 'string') {
    try {
      modules = JSON.parse(modules);
    } catch {
      modules = modules.split(',').map((s) => s.trim());
    }
  }
  if (body.packageKey === 'COMBO' || body.product === 'COMBO') modules = ['LEADS', 'IVR'];
  if (body.packageKey === 'IVR' || body.product === 'IVR') modules = ['IVR'];
  if (body.packageKey === 'LEADS' || body.product === 'LEADS') modules = ['LEADS'];

  if (!modules?.length && body.plan) {
    const tier = normalizeTier(body.plan);
    modules = tier === 'STARTER' ? ['LEADS'] : ['LEADS', 'IVR'];
  }

  const tier = normalizeTier(body.tier || body.plan || 'STARTER');
  const seatCount = normalizeSeatCount(
    body.seatCount ?? body.desiredSeats ?? (body.extraSeats != null ? Math.max(1, body.extraSeats) : 1),
    { tier }
  );

  return {
    modules: normalizeModules(modules),
    tier,
    billingCycleMonths: normalizeCycle(body.billingCycleMonths || body.billingCycle || 3),
    seatCount,
    extraSeats: Math.max(0, seatCount - 1),
  };
}
