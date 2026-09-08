import { canAccessAI, canAccessTierFeature } from '../utils/moduleAccess.js';

/** Require AI entitlement (Combo + 6/12 month cycle). */
export const requireAIAccess = (req, res, next) => {
  const company = req.user?.company;
  if (!company) {
    return res.status(403).json({ success: false, message: 'Company context required' });
  }
  if (!canAccessAI(company)) {
    return res.status(403).json({
      success: false,
      message:
        'AI features require Leads + IVR (Combo) on a 6- or 12-month plan. Upgrade to unlock.',
      code: 'AI_REQUIRED',
      feature: 'ai',
    });
  }
  next();
};

/** Soft check used by background enqueue (never throws to callers). */
export function companyHasAI(company) {
  try {
    return canAccessAI(company);
  } catch {
    return false;
  }
}

export function companyHasFeature(company, feature) {
  return canAccessTierFeature(company, feature);
}
