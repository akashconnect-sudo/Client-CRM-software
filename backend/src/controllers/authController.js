import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createCompany,
  hasSuperAdminGlobally,
  hasSuperAdminInCompany,
} from '../services/companyService.js';
import { signPaymentToken } from '../services/billingService.js';
import { getPlan, computePrepaidTotal, formatInr } from '../constants/plans.js';
import { parseSignupEntitlement } from '../services/subscriptionService.js';
import { toSafeUser, userSelectWithCompany } from '../utils/tenant.js';
import {
  getOAuthStartUrl,
  handleOAuthCallback,
  listOAuthProviders,
  oauthErrorRedirect,
  oauthSuccessRedirect,
} from '../services/oauthService.js';
import {
  assertEmailVerifyToken,
  assertPhoneVerifyToken,
  sendAuthEmailOtp,
  sendAuthPhoneOtp,
  verifyAuthEmailOtp,
  verifyAuthPhoneOtp,
} from '../services/authOtpService.js';
import { normalizeIndianMobile } from '../utils/maskContact.js';
import { assertPassword } from '../utils/passwordPolicy.js';
import { hasWorkspaceAccess } from '../utils/subscriptionAccess.js';
import { triggerWelcomeEmailAsync } from '../services/welcomeEmailService.js';

function issueToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, companyId: user.companyId },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function normalizeWorkspaceName(value) {
  return String(value || '').trim().toLowerCase();
}

async function getCompanyByWorkspaceName(workspaceName) {
  const normalized = normalizeWorkspaceName(workspaceName);
  if (!normalized) return null;

  return prisma.company.findFirst({
    where: { name: { equals: normalized, mode: 'insensitive' } },
  });
}

async function resolveCompanyForExistingWorkspace(companyName) {
  return getCompanyByWorkspaceName(companyName);
}

async function resolveLoginUser(emailLower, companyName) {
  const candidates = await prisma.user.findMany({
    where: { email: emailLower, status: 'ACTIVE' },
    include: { company: true },
  });

  if (!candidates.length) return { user: null, message: 'Invalid email or password' };
  if (candidates.length === 1) return { user: candidates[0], message: null };

  const normalizedCompanyName = normalizeWorkspaceName(companyName);
  if (!normalizedCompanyName) {
    return { user: null, message: 'Please enter your workspace name to continue.' };
  }

  const matched = candidates.find((candidate) => normalizeWorkspaceName(candidate.company?.name) === normalizedCompanyName);
  if (!matched) {
    return { user: null, message: 'Workspace name does not match this email.' };
  }

  return { user: matched, message: null };
}

export const setupStatus = asyncHandler(async (_req, res) => {
  const hasSuperAdmin = await hasSuperAdminGlobally();
  res.json({
    success: true,
    data: {
      hasSuperAdmin,
      hasCompanies: hasSuperAdmin,
      canRegisterSuperAdmin: !hasSuperAdmin,
      oauthProviders: listOAuthProviders(),
      emailOtpRequired: env.authEmailOtpRequired,
      phoneOtpRequired: env.authPhoneOtpRequired,
      trialDays: env.trialDays,
    },
  });
});

export const sendPhoneOtp = asyncHandler(async (req, res) => {
  if (!env.authPhoneOtpRequired) {
    return res.status(400).json({
      success: false,
      message: 'Phone SMS verification is not enabled. Use email OTP instead.',
      code: 'PHONE_OTP_DISABLED',
    });
  }
  const { phone } = req.body;
  let target = phone;
  if (req.user) {
    target = phone || req.user.phone;
  }
  if (!target) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }
  const data = await sendAuthPhoneOtp(target, req.user ? 'settings' : 'auth');
  res.json({
    success: true,
    message: 'Verification code sent via SMS',
    data,
  });
});

export const verifyPhoneOtp = asyncHandler(async (req, res) => {
  const { phone, otp, challengeId } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Phone and verification code are required',
    });
  }
  const data = await verifyAuthPhoneOtp({ phone, otp, challengeId });
  res.json({
    success: true,
    message: 'Phone verified',
    data,
  });
});

export const sendEmailOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  const data = await sendAuthEmailOtp(email, 'auth');
  res.json({
    success: true,
    message: 'Verification code sent to your email',
    data,
  });
});

export const verifyEmailOtp = asyncHandler(async (req, res) => {
  const { email, otp, challengeId } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and verification code are required' });
  }
  const data = await verifyAuthEmailOtp({ email, otp, challengeId });
  res.json({
    success: true,
    message: 'Email verified',
    data,
  });
});

function subscriptionErrorResponse(company, emailLower) {
  const paymentToken = signPaymentToken({
    companyId: company.id,
    email: emailLower,
    plan: company.plan,
  });
  return {
    success: false,
    message: 'Please complete your plan payment to use the CRM',
    code: 'PAYMENT_REQUIRED',
    data: {
      needsPayment: true,
      paymentToken,
      plan: company.plan,
      planDetails: getPlan(company.plan),
      companyId: company.id,
    },
  };
}

export const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    role,
    companyName,
    plan,
    modules,
    tier,
    billingCycleMonths,
    extraSeats,
    seatCount,
    desiredSeats,
    createWorkspace,
    emailVerifyToken,
    phoneVerifyToken,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required',
    });
  }

  const emailLower = email.toLowerCase();
  const phoneNorm = normalizeIndianMobile(phone);
  if (!phoneNorm || phoneNorm.length !== 10) {
    return res.status(400).json({
      success: false,
      message: 'Valid 10-digit phone number is required',
    });
  }

  assertEmailVerifyToken(emailVerifyToken, emailLower);
  assertPhoneVerifyToken(phoneVerifyToken, phoneNorm);
  assertPassword(password);
  const existingCompany = companyName ? await resolveCompanyForExistingWorkspace(companyName) : null;
  const isCreatingWorkspace =
    createWorkspace === true || Boolean(plan) || Boolean(modules) || Boolean(tier);

  if (isCreatingWorkspace) {
    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: 'Company / workspace name is required',
      });
    }

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message:
          'This workspace name is already taken. Use a different name or sign in to join an existing workspace.',
      });
    }

    const selectedPlan = plan && getPlan(plan) ? plan : tier || 'STARTER';
    const entitlement = parseSignupEntitlement({
      plan: selectedPlan,
      modules,
      tier: tier || selectedPlan,
      billingCycleMonths,
      extraSeats,
      seatCount,
      desiredSeats,
    });
    const pricing = computePrepaidTotal(entitlement);
    const company = await createCompany({
      name: companyName,
      plan: entitlement.tier,
      modules: entitlement.modules,
      tier: entitlement.tier,
      billingCycleMonths: entitlement.billingCycleMonths,
      seatCount: entitlement.seatCount,
      extraSeats: entitlement.extraSeats,
      contactEmail: emailLower,
      contactPhone: phoneNorm,
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name,
        email: emailLower,
        phone: phoneNorm,
        passwordHash,
        role: 'SUPER_ADMIN',
        department: 'Management',
        status: 'ACTIVE',
      },
      select: userSelectWithCompany(),
    });

    if (!hasWorkspaceAccess({ ...company, subscription: user.company?.subscription })) {
      const paymentToken = signPaymentToken({
        companyId: company.id,
        email: emailLower,
        plan: entitlement.tier,
        modules: entitlement.modules,
        tier: entitlement.tier,
        billingCycleMonths: entitlement.billingCycleMonths,
        seatCount: entitlement.seatCount,
      });
      const planBase = getPlan(entitlement.tier);
      return res.status(201).json({
        success: true,
        message: 'Account created. Complete payment to start using the CRM.',
        data: {
          needsPayment: true,
          paymentToken,
          plan: entitlement.tier,
          modules: entitlement.modules,
          tier: entitlement.tier,
          billingCycleMonths: entitlement.billingCycleMonths,
          seatCount: entitlement.seatCount,
          extraSeats: entitlement.extraSeats,
          planDetails: {
            ...planBase,
            prepaidTotal: pricing.total,
            priceLabel: formatInr(pricing.total),
            period: ` / ${pricing.months} mo`,
            name: `${pricing.packageKey} · ${pricing.seatCount} seats`,
          },
          companyId: company.id,
          user: toSafeUser(user),
        },
      });
    }

    const token = issueToken(user);
    triggerWelcomeEmailAsync(user.id);
    return res.status(201).json({
      success: true,
      message: `Workspace ready — ${env.trialDays}-day free trial started. No card required.`,
      data: { token, user: toSafeUser(user), trialDays: env.trialDays },
    });
  }

  if (!companyName) {
    return res.status(400).json({
      success: false,
      message: 'Company / workspace name is required to join a workspace',
    });
  }

  if (!existingCompany) {
    return res.status(404).json({
      success: false,
      message: 'Workspace not found. Check the name with your admin or create a new workspace.',
    });
  }

  const requestedRole = role || 'SALES_EMPLOYEE';
  const superAdminExists = await hasSuperAdminInCompany(existingCompany.id);

  if (requestedRole === 'SUPER_ADMIN') {
    if (superAdminExists) {
      return res.status(409).json({
        success: false,
        message: 'Super Admin already exists. Register as Manager or Sales Employee.',
      });
    }
  } else if (!['MANAGER', 'SALES_EMPLOYEE'].includes(requestedRole)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  if (!hasWorkspaceAccess(existingCompany)) {
    return res.status(403).json(subscriptionErrorResponse(existingCompany, emailLower));
  }

  if (existingCompany.status !== 'ACTIVE') {
    return res.status(403).json({ success: false, message: 'Company account is suspended' });
  }

  const existingUser = await prisma.user.findUnique({
    where: { companyId_email: { companyId: existingCompany.id, email: emailLower } },
  });

  if (!existingUser) {
    return res.status(403).json({
      success: false,
      message:
        'Your email is not on this workspace yet. Ask your admin to import you under Employees, then register again.',
    });
  }

  return res.status(409).json({
    success: false,
    message: 'Email already registered. Please sign in.',
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password, companyName, emailVerifyToken } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const emailLower = email.toLowerCase();
  assertEmailVerifyToken(emailVerifyToken, emailLower);
  const { user, message } = await resolveLoginUser(emailLower, companyName);

  if (!user || !user.passwordHash) {
    return res.status(401).json({ success: false, message: message || 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (!hasWorkspaceAccess(user.company)) {
    const paymentToken = signPaymentToken({
      companyId: user.companyId,
      email: user.email,
      plan: user.company.plan,
    });
    return res.status(403).json({
      success: false,
      message: 'Please complete your plan payment to access the CRM',
      code: 'PAYMENT_REQUIRED',
      data: {
        needsPayment: true,
        paymentToken,
        plan: user.company.plan,
        planDetails: getPlan(user.company.plan),
        companyId: user.companyId,
      },
    });
  }

  if (user.company.status !== 'ACTIVE') {
    return res.status(403).json({ success: false, message: 'Company account is suspended' });
  }

  const token = issueToken(user);
  // First successful login → welcome (idempotent; also covered by /me + dashboard).
  triggerWelcomeEmailAsync(user.id);
  res.json({ success: true, data: { token, user: toSafeUser(user) } });
});

export const me = asyncHandler(async (req, res) => {
  // Reliable path: AuthContext always hits /me after login — does not depend on frontend build.
  triggerWelcomeEmailAsync(req.user.id);
  res.json({ success: true, data: toSafeUser(req.user) });
});

/**
 * Dashboard trigger: enqueue/process one-time WELCOME email for the signed-in user.
 * Safe to call on every dashboard visit — idempotent via EmailJob + welcomeEmailSentAt.
 */
export const triggerWelcome = asyncHandler(async (req, res) => {
  triggerWelcomeEmailAsync(req.user.id);
  res.json({
    success: true,
    message: 'Welcome email trigger accepted',
    data: { queued: true },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, currentPassword, newPassword, phoneVerifyToken } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const phoneForVerify = normalizeIndianMobile(
    phone !== undefined ? phone : user.phone
  );
  if (!phoneForVerify) {
    return res.status(400).json({
      success: false,
      message: 'Add a valid 10-digit phone number',
    });
  }
  assertPhoneVerifyToken(phoneVerifyToken, phoneForVerify);

  const data = {};
  if (name != null && String(name).trim()) data.name = String(name).trim();
  if (phone !== undefined) data.phone = phoneForVerify;

  if (newPassword) {
    if (!user.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'Social login accounts cannot set password here',
      });
    }
    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is required' });
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    assertPassword(newPassword);
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (!Object.keys(data).length) {
    return res.status(400).json({ success: false, message: 'No changes provided' });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: userSelectWithCompany(),
  });

  res.json({ success: true, message: 'Profile updated', data: toSafeUser(updated) });
});

export const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export const oauthProviders = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: listOAuthProviders() });
});

export const oauthStart = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const url = getOAuthStartUrl(req, provider);
  res.redirect(url);
});

export const oauthCallback = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(oauthErrorRedirect(String(error)));
  }

  try {
    const { token } = await handleOAuthCallback(req, provider, { code, state });
    return res.redirect(oauthSuccessRedirect(token));
  } catch (err) {
    return res.redirect(oauthErrorRedirect(err.message || 'OAuth login failed'));
  }
});
