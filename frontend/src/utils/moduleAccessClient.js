/** Frontend mirror of backend moduleAccess — keep in sync with backend/src/utils/moduleAccess.js */

function normalizeModules(modules) {
  const set = new Set(
    (Array.isArray(modules) ? modules : [])
      .map((m) => String(m || '').toUpperCase())
      .filter((m) => m === 'LEADS' || m === 'IVR')
  );
  if (!set.size) set.add('LEADS');
  return [...set];
}

function normalizeTier(tier) {
  const t = String(tier || 'STARTER').toUpperCase();
  return ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(t) ? t : 'STARTER';
}

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

export function getSubscriptionSnapshot(companyOrUser) {
  const sub = companyOrUser?.subscription;
  if (sub?.modules) {
    return {
      modules: normalizeModules(sub.modules),
      tier: normalizeTier(sub.tier || companyOrUser.plan),
      billingCycleMonths:
        Number(sub.billingCycleMonths || companyOrUser.billingCycleMonths || 3) || 3,
    };
  }
  if (companyOrUser?.modules) {
    return {
      modules: normalizeModules(companyOrUser.modules),
      tier: normalizeTier(companyOrUser.tier || companyOrUser.plan),
      billingCycleMonths: Number(companyOrUser.billingCycleMonths || 3) || 3,
    };
  }
  const plan = normalizeTier(companyOrUser?.plan || companyOrUser?.tier);
  return {
    modules: plan === 'STARTER' ? ['LEADS'] : ['LEADS', 'IVR'],
    tier: plan,
    billingCycleMonths: Number(companyOrUser?.billingCycleMonths || 3) || 3,
  };
}

export function canAccessLeads(company) {
  return getSubscriptionSnapshot(company).modules.includes('LEADS');
}

export function canAccessIVR(company) {
  const sub = getSubscriptionSnapshot(company);
  if (sub.modules.includes('IVR')) return true;
  return company?.ivrIntegration?.status === 'CONNECTED';
}

/** Combo (LEADS+IVR) on 6- or 12-month prepaid — not tier-based. */
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
  if (feature === 'calls' || feature === 'callBridge') {
    return canAccessIVR(company);
  }
  if (feature === 'reports' || feature === 'analytics' || feature === 'requestReports') {
    if (!list.includes('reports')) return false;
    return canAccessLeads(company) || canAccessIVR(company);
  }
  if (feature === 'emailTemplates') {
    return list.includes('emailAlerts');
  }
  return list.includes(feature);
}
