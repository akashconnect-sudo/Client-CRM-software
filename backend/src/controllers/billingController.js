import { asyncHandler } from '../utils/asyncHandler.js';
import {
  listPlans,
  createCheckoutSession,
  createSeatTopUpCheckout,
  confirmSeatTopUp,
  activateSubscription,
  getSubscription,
  verifyPaymentToken,
  verifyRazorpayPayment,
} from '../services/billingService.js';
import { toSafeUser, userSelectWithCompany } from '../utils/tenant.js';
import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

function issueToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role, companyId: user.companyId },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export const plans = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: listPlans() });
});

export const catalog = asyncHandler(async (_req, res) => {
  const { listModularCatalog } = await import('../services/billingService.js');
  res.json({ success: true, data: listModularCatalog() });
});

export const quote = asyncHandler(async (req, res) => {
  const { quoteSubscription } = await import('../services/billingService.js');
  res.json({ success: true, data: quoteSubscription(req.body || {}) });
});

export const subscription = asyncHandler(async (req, res) => {
  const data = await getSubscription(req.companyId);
  res.json({ success: true, data });
});

export const checkout = asyncHandler(async (req, res) => {
  const { plan, modules, tier, billingCycleMonths, seatCount, desiredSeats, extraSeats } = req.body;
  const order = await createCheckoutSession({
    companyId: req.companyId,
    plan,
    modules,
    tier,
    billingCycleMonths,
    seatCount,
    desiredSeats,
    extraSeats,
    customer: {
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
    },
  });
  res.json({ success: true, data: order });
});

export const checkoutPublic = asyncHandler(async (req, res) => {
  const {
    paymentToken,
    plan,
    modules,
    tier,
    billingCycleMonths,
    seatCount,
    desiredSeats,
    extraSeats,
  } = req.body;
  if (!paymentToken) {
    return res.status(400).json({ success: false, message: 'Payment token is required' });
  }
  const decoded = verifyPaymentToken(paymentToken);
  const order = await createCheckoutSession({
    companyId: decoded.companyId,
    plan: plan || decoded.plan,
    modules: modules || decoded.modules,
    tier: tier || decoded.tier || decoded.plan,
    billingCycleMonths: billingCycleMonths || decoded.billingCycleMonths,
    seatCount: seatCount ?? desiredSeats ?? decoded.seatCount ?? extraSeats ?? decoded.extraSeats,
    customer: { email: decoded.email },
  });
  res.json({ success: true, data: order });
});

export const seatTopUpCheckout = asyncHandler(async (req, res) => {
  const { addSeats } = req.body;
  const order = await createSeatTopUpCheckout({
    companyId: req.companyId,
    addSeats,
    customer: {
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
    },
  });
  res.json({ success: true, data: order });
});

export const confirmSeatTopUpPayment = asyncHandler(async (req, res) => {
  const { addSeats, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  verifyRazorpayPayment({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  const sub = await confirmSeatTopUp(req.companyId, {
    addSeats,
    paymentId: razorpayPaymentId,
  });
  const data = await getSubscription(req.companyId);
  res.json({
    success: true,
    message: `Added ${addSeats} seat(s). Cap is now ${data.effectiveSeats ?? 'unlimited'}.`,
    data: { subscription: data, extraSeats: sub.extraSeats },
  });
});

export const confirmPayment = asyncHandler(async (req, res) => {
  const {
    paymentToken,
    plan,
    modules,
    tier,
    billingCycleMonths,
    seatCount,
    desiredSeats,
    extraSeats,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  } = req.body;

  let companyId;
  let entitlement = { plan, modules, tier, billingCycleMonths, seatCount, desiredSeats, extraSeats };

  if (paymentToken) {
    const decoded = verifyPaymentToken(paymentToken);
    companyId = decoded.companyId;
    entitlement = {
      plan: plan || decoded.plan,
      modules: modules || decoded.modules,
      tier: tier || decoded.tier || decoded.plan,
      billingCycleMonths: billingCycleMonths || decoded.billingCycleMonths,
      seatCount: seatCount ?? desiredSeats ?? decoded.seatCount ?? extraSeats ?? decoded.extraSeats,
    };
  } else if (req.user) {
    companyId = req.companyId;
  } else {
    return res.status(400).json({ success: false, message: 'Payment session required' });
  }

  verifyRazorpayPayment({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  await activateSubscription(companyId, { ...entitlement, paymentId: razorpayPaymentId });

  const superAdmin = await prisma.user.findFirst({
    where: { companyId, role: 'SUPER_ADMIN' },
    select: userSelectWithCompany(),
  });

  if (!superAdmin) {
    return res.json({
      success: true,
      message: 'Payment successful. You can sign in now.',
      data: { paid: true },
    });
  }

  const token = issueToken(superAdmin);
  res.json({
    success: true,
    message: 'Payment successful',
    data: { token, user: toSafeUser(superAdmin), paid: true },
  });
});

export const activatePlan = asyncHandler(async (req, res) => {
  res.status(410).json({
    success: false,
    message:
      'Mock activation is disabled. Please complete real payment via checkout to activate or upgrade plan.',
    code: 'REAL_PAYMENT_REQUIRED',
  });
});
