import prisma from '../config/db.js';
import { env } from '../config/env.js';

/** Workspace has paid or is inside the free trial window */
function trialEnd(company) {
  if (!company) return null;
  return company.trialEndsAt ?? company.trial_ends_at ?? null;
}

export function hasWorkspaceAccess(company) {
  if (!company) return false;
  if (company.status !== 'ACTIVE') return false;
  if (company.subscriptionStatus !== 'ACTIVE') return false;

  const sub = company.subscription;
  if (sub) {
    if (sub.status === 'CANCELLED') return false;
    if (sub.status === 'ACTIVE' && sub.renewsAt && new Date(sub.renewsAt) > new Date()) return true;
    if (sub.status === 'TRIAL' && sub.renewsAt && new Date(sub.renewsAt) > new Date()) return true;
    if (sub.status === 'PAST_DUE') return false;
  }

  if (company.paidAt) {
    // Legacy paid without renewsAt on Subscription
    if (!sub?.renewsAt) return true;
  }
  const ends = trialEnd(company);
  if (!ends) return true;
  return new Date(ends) > new Date();
}

export function trialDaysRemaining(company) {
  const ends = company?.subscription?.status === 'TRIAL'
    ? company.subscription.renewsAt
    : trialEnd(company);
  if (!ends || (company.paidAt && company.subscription?.status !== 'TRIAL')) return null;
  const ms = new Date(ends).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function ensureTrialColumn() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3);
  `).catch(() => {});
}

export function trialEndDate() {
  const days = env.trialDays || 10;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
