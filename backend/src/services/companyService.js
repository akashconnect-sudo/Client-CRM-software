import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import { ensureTrialColumn, trialEndDate, hasWorkspaceAccess } from '../utils/subscriptionAccess.js';
import { upsertTrialSubscription, parseSignupEntitlement } from './subscriptionService.js';

const DEFAULT_SETTINGS = {
  google_webhook_secret: '',
  meta_webhook_token: '',
  meta_webhook_secret: '',
  ivr_api_key: '',
  ivr_api_url: '',
  ivr_webhook_secret: '',
  lead_assignment_method: 'ROUND_ROBIN',
  api_base_url: 'http://localhost:5000',
  automation_missed_followup: 'true',
  automation_followup_reminder: 'true',
  automation_stale_lead_enabled: 'true',
  automation_stale_lead_days: '3',
  automation_unassigned_lead_alert: 'true',
  automation_auto_assign_webhook: 'true',
};

function internalGstin() {
  return `CRM-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

async function seedCompanyDefaults(companyId) {
  const settingsRows = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
    companyId,
    key,
    value,
  }));

  await prisma.$transaction([
    prisma.leadAssignmentState.create({ data: { companyId } }),
    prisma.setting.createMany({ data: settingsRows, skipDuplicates: true }),
  ]);
}

export async function getCompanyById(id) {
  await ensureTrialColumn();
  return prisma.company.findUnique({ where: { id } });
}

export async function getDefaultCompany() {
  return prisma.company.findFirst({ orderBy: { createdAt: 'asc' } });
}


export async function createCompany({
  name,
  plan = 'STARTER',
  contactEmail,
  contactPhone,
  modules,
  tier,
  billingCycleMonths,
  extraSeats,
  seatCount,
}) {
  await ensureTrialColumn();
  const ends = trialEndDate();
  const entitlement = parseSignupEntitlement({
    plan,
    modules,
    tier: tier || plan,
    billingCycleMonths,
    extraSeats,
    seatCount,
  });
  const company = await prisma.company.create({
    data: {
      name: String(name).trim(),
      gstin: internalGstin(),
      plan: entitlement.tier,
      subscriptionStatus: 'ACTIVE',
      contactEmail: contactEmail ? String(contactEmail).toLowerCase() : null,
      contactPhone: contactPhone || null,
      status: 'ACTIVE',
    },
  });
  await prisma.$executeRaw`
    UPDATE "companies" SET "trial_ends_at" = ${ends} WHERE "id" = ${company.id}
  `;

  await seedCompanyDefaults(company.id);
  await upsertTrialSubscription(company.id, entitlement);

  if (entitlement.modules.includes('IVR')) {
    await prisma.iVRIntegration.create({
      data: {
        companyId: company.id,
        mode: 'NATIVE',
        provider: 'AMAZON_CONNECT',
        webhookSecret: randomUUID(),
        status: 'CONNECTED',
      },
    }).catch(() => {});
  }

  return { ...company, trialEndsAt: ends, plan: entitlement.tier };
}

export async function getCompanyProfile(companyId) {
  return prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      plan: true,
      subscriptionStatus: true,
      paidAt: true,
      paymentId: true,
      contactPhone: true,
      contactEmail: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateCompanyProfile(companyId, data) {
  const { name, contactPhone, contactEmail } = data;
  const payload = {};
  if (name != null && String(name).trim()) payload.name = String(name).trim();
  if (contactPhone !== undefined) payload.contactPhone = contactPhone || null;
  if (contactEmail !== undefined) {
    payload.contactEmail = contactEmail ? String(contactEmail).toLowerCase() : null;
  }

  if (!Object.keys(payload).length) {
    throw Object.assign(new Error('No valid fields to update'), { statusCode: 400 });
  }

  return prisma.company.update({
    where: { id: companyId },
    data: payload,
    select: {
      id: true,
      name: true,
      plan: true,
      subscriptionStatus: true,
      paidAt: true,
      contactPhone: true,
      contactEmail: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function hasSuperAdminGlobally() {
  const count = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
  return count > 0;
}

export async function hasSuperAdminInCompany(companyId) {
  const count = await prisma.user.count({
    where: { companyId, role: 'SUPER_ADMIN' },
  });
  return count > 0;
}


export function assertSubscriptionActive(company) {
  if (!company) {
    throw Object.assign(new Error('Company not found'), { statusCode: 404 });
  }
  if (company.status !== 'ACTIVE') {
    throw Object.assign(new Error('Company account is suspended'), { statusCode: 403 });
  }
  if (!hasWorkspaceAccess(company)) {
    throw Object.assign(new Error('Please complete your plan payment to use the CRM'), {
      statusCode: 403,
      code: 'PAYMENT_REQUIRED',
      plan: company.plan,
      companyId: company.id,
    });
  }
}
