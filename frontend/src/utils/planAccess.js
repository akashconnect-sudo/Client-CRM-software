import {
  canAccessLeads as canAccessLeadsSnap,
  canAccessIVR as canAccessIVRSnap,
  canAccessTierFeature as canAccessTierFeatureSnap,
  canAccessAI as canAccessAISnap,
  getSubscriptionSnapshot,
} from './moduleAccessClient.js';

/** @deprecated Prefer canAccessFeatureForUser — kept for gradual migration */
const PLAN_FEATURES = {
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

export function planHasEmailAlerts(planIdOrUser) {
  if (planIdOrUser && typeof planIdOrUser === 'object') {
    const tier = planIdOrUser.tier || planIdOrUser.plan;
    return tier === 'PROFESSIONAL' || tier === 'ENTERPRISE';
  }
  return planIdOrUser === 'PROFESSIONAL' || planIdOrUser === 'ENTERPRISE';
}

export function getPlanFeatures(planId) {
  return PLAN_FEATURES[planId] || PLAN_FEATURES.STARTER;
}

/** Legacy: plan string only */
export function canAccessFeature(planId, feature) {
  return getPlanFeatures(planId).includes(feature);
}

function companyFromUser(user) {
  return {
    plan: user.tier || user.plan,
    billingCycleMonths: user.billingCycleMonths,
    subscription: user.subscription || {
      modules: user.modules,
      tier: user.tier || user.plan,
      billingCycleMonths: user.billingCycleMonths,
    },
    ivrIntegration: user.ivrIntegration || user.company?.ivrIntegration,
  };
}

/** New: user object with modules / tier / ivrIntegration */
export function canAccessFeatureForUser(user, feature) {
  if (!user) return false;
  const company = companyFromUser(user);

  if (feature === 'callBridge' || feature === 'calls') {
    return canAccessIVRSnap(company);
  }
  if (feature === 'aiAdvisor' || feature === 'ai') {
    return canAccessAISnap(company);
  }

  return canAccessTierFeatureSnap(company, feature);
}

export function userCanAccessLeads(user) {
  if (!user) return false;
  return canAccessLeadsSnap(companyFromUser(user));
}

export function userCanAccessIVR(user) {
  if (!user) return false;
  return canAccessIVRSnap(companyFromUser(user));
}

export function userCanAccessAI(user) {
  if (!user) return false;
  return canAccessAISnap(companyFromUser(user));
}

export { getSubscriptionSnapshot, canAccessAISnap as canAccessAI };
