import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import prisma from '../config/db.js';
import { toSafeUser, userSelectWithCompany } from '../utils/tenant.js';
import { hasWorkspaceAccess } from '../utils/subscriptionAccess.js';
import { withDbRetry } from '../utils/dbRetry.js';

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtSecret);

    const user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: decoded.userId },
        select: userSelectWithCompany(),
      })
    );

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'Invalid or inactive user' });
    }

    if (user.company?.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Company account is suspended' });
    }

    if (!hasWorkspaceAccess(user.company)) {
      return res.status(403).json({
        success: false,
        message: 'Your free trial has ended. Complete payment to continue using the CRM.',
        code: 'PAYMENT_REQUIRED',
        plan: user.company?.plan,
      });
    }

    if (decoded.companyId && decoded.companyId !== user.companyId) {
      return res.status(401).json({ success: false, message: 'Session expired — please sign in again' });
    }

    req.user = user;
    req.companyId = user.companyId;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/** Sets req.user when Bearer token is valid; does not fail when missing. */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, env.jwtSecret);

    const user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: decoded.userId },
        select: userSelectWithCompany(),
      })
    );

    if (user && user.status === 'ACTIVE') {
      req.user = user;
      req.companyId = user.companyId;
    }
  } catch {
    /* ignore invalid token for optional auth */
  }
  next();
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};

export const scopeToEmployee = (req, res, next) => {
  if (req.user.role === 'SALES_EMPLOYEE') {
    req.employeeScopeId = req.user.id;
  }
  next();
};

export const managerOrSuperAdmin = authorize('SUPER_ADMIN', 'MANAGER');
