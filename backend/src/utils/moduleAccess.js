import { normalizeModules, normalizeTier } from '../constants/plans.js';

const TIER_FEATURES = {
  STARTER: ['dashboard', 'leads', 'follow-ups', 'settings', 'employees'],
  PROFESSIONAL: [
    'dashboard',
    'leads',
    'follow-ups',
    'employees',
    'calls',
    'reports',
    'settings',
    'emailAlerts',
  ],
  ENTERPRISE: [
    'dashboard',
    'leads',
    'follow-ups',
    'employees',
    'calls',
    'reports',
    'settings',
    'emailAlerts',
    'aiAdvisor',
  ],
};

/** Resolve subscription-like object from company (relation or legacy fields). */
export function getSubscriptionSnapshot(company) {
  const sub = company?.subscription;
  if (sub) {
    return {
      modules: normalizeModules(sub.modules),
      tier: normalizeTier(sub.tier || company.plan),
      billingCycleMonths: sub.billingCycleMonths || 3,
      status: sub.status || 'TRIAL',
      renewsAt: sub.renewsAt,
      pricePerMonth: sub.pricePerMonth,
    };
  }
  // Legacy fallback before backfill
  const plan = normalizeTier(company?.plan);
  const modules = plan === 'STARTER' ? ['LEADS'] : ['LEADS', 'IVR'];
  return {
    modules,
    tier: plan,
    billingCycleMonths: 3,
    status: company?.paidAt ? 'ACTIVE' : 'TRIAL',
    renewsAt: company?.trialEndsAt,
    pricePerMonth: null,
  };
}

export function canAccessLeads(company) {
  return getSubscriptionSnapshot(company).modules.includes('LEADS');
}

export function canAccessIVR(company) {
  const sub = getSubscriptionSnapshot(company);
  if (sub.modules.includes('IVR')) return true;
  const status = company?.ivrIntegration?.status;
  return status === 'CONNECTED';
}

/**
 * AI unlocks only for Combo (LEADS+IVR) on 6- or 12-month prepaid — not tier-based.
 */
export function canAccessAI(company) {
  const s = getSubscriptionSnapshot(company);
  const hasCombo = s.modules.includes('LEADS') && s.modules.includes('IVR');
  const eligibleCycle = s.billingCycleMonths === 6 || s.billingCycleMonths === 12;
  return hasCombo && eligibleCycle;
}

export function canAccessTierFeature(company, feature) {
  if (feature === 'aiAdvisor' || feature === 'ai') {
    return canAccessAI(company);
  }
  const { tier } = getSubscriptionSnapshot(company);
  const list = TIER_FEATURES[tier] || TIER_FEATURES.STARTER;

  if (
    feature === 'leads' ||
    feature === 'follow-ups' ||
    feature === 'allocations' ||
    feature === 'gmailInbox' ||
    feature === 'calendar' ||
    feature === 'recurringFollowUps' ||
    feature === 'rechurn' ||
    feature === 'whatsappTemplates'
  ) {
    return canAccessLeads(company);
  }
  if (feature === 'interactions') {
    return canAccessLeads(company) || canAccessIVR(company);
  }
  // Buying the IVR module unlocks Call Bridge + call history (even on Starter).
  if (feature === 'calls' || feature === 'callBridge') {
    return canAccessIVR(company);
  }
  if (feature === 'reports' || feature === 'analytics' || feature === 'requestReports') {
    if (!list.includes('reports') && !canAccessIVR(company) && !canAccessLeads(company)) {
      return false;
    }
    if (!list.includes('reports')) return false;
    return canAccessLeads(company) || canAccessIVR(company);
  }
  if (feature === 'emailTemplates') {
    return list.includes('emailAlerts');
  }
  return list.includes(feature);
}

export function planHasEmailAlerts(companyOrPlan) {
  if (typeof companyOrPlan === 'string') {
    return companyOrPlan === 'PROFESSIONAL' || companyOrPlan === 'ENTERPRISE';
  }
  return canAccessTierFeature(companyOrPlan, 'emailAlerts');
}
