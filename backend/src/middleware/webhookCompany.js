import prisma from '../config/db.js';
import { getCompanyById } from '../services/companyService.js';
import { hasWorkspaceAccess } from '../utils/subscriptionAccess.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Webhooks: header x-company-id (preferred), then ?companyId=, then legacy ?gstin= */
export const resolveWebhookCompany = async (req, res, next) => {
  try {
    const headerId = req.headers['x-company-id'];
    const queryCompanyId = req.query.companyId;
    const gstin = req.query.gstin;

    let company = null;

    if (headerId) {
      if (!UUID_RE.test(String(headerId))) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      company = await getCompanyById(String(headerId));
    } else if (queryCompanyId) {
      if (!UUID_RE.test(String(queryCompanyId))) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      company = await getCompanyById(String(queryCompanyId));
    } else if (gstin) {
      company = await prisma.company.findUnique({
        where: { gstin: String(gstin).trim() },
      });
    } else {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!company) {
      return res.status(404).json({ success: false, message: 'Unauthorized' });
    }
    if (!hasWorkspaceAccess(company) || company.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    req.companyId = company.id;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};
