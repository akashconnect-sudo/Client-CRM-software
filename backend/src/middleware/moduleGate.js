import { canAccessTierFeature } from '../utils/moduleAccess.js';

/** Require a module/tier feature (leads, callBridge, reports, …) for the authenticated company. */
export const requireModuleFeature = (feature) => (req, res, next) => {
  const company = req.user?.company;
  if (!company) {
    return res.status(403).json({ success: false, message: 'Company context required' });
  }
  if (!canAccessTierFeature(company, feature)) {
    return res.status(403).json({
      success: false,
      message: `This workspace does not include access to ${feature}.`,
      code: 'MODULE_REQUIRED',
      feature,
    });
  }
  next();
};
