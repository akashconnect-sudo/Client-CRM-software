import prisma from '../config/db.js';
import { getPlanLimits } from '../constants/planLimits.js';

export async function getCompanyPlan(companyId) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true, subscription: { select: { tier: true, seatCount: true, extraSeats: true } } },
  });
  return company?.subscription?.tier || company?.plan || 'STARTER';
}

export async function getCompanySeatCount(companyId) {
  const sub = await prisma.workspaceSubscription.findUnique({
    where: { companyId },
    select: { seatCount: true, extraSeats: true },
  });
  if (!sub) return 1;
  if (sub.seatCount != null && sub.seatCount >= 1) return sub.seatCount;
  return Math.max(1, 1 + (sub.extraSeats || 0));
}

export async function countCompanyUsers(companyId) {
  return prisma.user.count({ where: { companyId } });
}

export async function countCompanyLeads(companyId) {
  return prisma.lead.count({ where: { companyId } });
}

export async function countCompanyManagers(companyId) {
  return prisma.user.count({ where: { companyId, role: 'MANAGER' } });
}

export async function checkUserSeatAvailability(companyId, planId, additional = 1) {
  const plan = planId || (await getCompanyPlan(companyId));
  const seatCount = await getCompanySeatCount(companyId);
  const limits = getPlanLimits(plan, { seatCount });
  const current = await countCompanyUsers(companyId);

  if (limits.maxUsers == null) {
    return { ok: true, remaining: Infinity, current, max: null, plan, seatCount };
  }

  const remaining = Math.max(0, limits.maxUsers - current);
  return {
    ok: additional <= remaining,
    remaining,
    current,
    max: limits.maxUsers,
    plan,
    seatCount,
    extraSeats: Math.max(0, seatCount - 1),
  };
}

export async function checkLeadCapacity(companyId, planId, additional = 1) {
  const plan = planId || (await getCompanyPlan(companyId));
  const limits = getPlanLimits(plan);
  const current = await countCompanyLeads(companyId);

  if (limits.maxLeads == null) {
    return { ok: true, remaining: Infinity, current, max: null, plan };
  }

  const remaining = Math.max(0, limits.maxLeads - current);
  return {
    ok: additional <= remaining,
    remaining,
    current,
    max: limits.maxLeads,
    plan,
  };
}

export async function checkManagerAvailability(companyId, planId, additional = 1) {
  const plan = planId || (await getCompanyPlan(companyId));
  const limits = getPlanLimits(plan);
  const current = await countCompanyManagers(companyId);

  if (limits.maxManagers == null) {
    return { ok: true, remaining: Infinity, current, max: null, plan };
  }

  const remaining = Math.max(0, limits.maxManagers - current);
  return {
    ok: additional <= remaining,
    remaining,
    current,
    max: limits.maxManagers,
    plan,
  };
}
