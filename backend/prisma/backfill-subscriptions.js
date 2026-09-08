/**
 * Backfill WorkspaceSubscription (+ optional NATIVE IVRIntegration) for existing companies.
 * Run: node prisma/backfill-subscriptions.js
 */
import prisma from '../src/config/db.js';
import crypto from 'crypto';
import { env } from '../src/config/env.js';

async function main() {
  const companies = await prisma.company.findMany();
  console.log(`Backfilling ${companies.length} companies…`);

  for (const c of companies) {
    const existing = await prisma.workspaceSubscription.findUnique({ where: { companyId: c.id } });
    if (existing) {
      console.log(`skip sub ${c.name}`);
    } else {
      const tier = c.plan || 'STARTER';
      const modules = tier === 'STARTER' ? ['LEADS'] : ['LEADS', 'IVR'];
      const startedAt = c.createdAt || new Date();
      let renewsAt;
      let status;
      if (c.paidAt) {
        status = 'ACTIVE';
        renewsAt = new Date(c.paidAt);
        renewsAt.setMonth(renewsAt.getMonth() + 3);
      } else if (c.trialEndsAt) {
        status = 'TRIAL';
        renewsAt = new Date(c.trialEndsAt);
      } else {
        status = 'TRIAL';
        renewsAt = new Date(Date.now() + (env.trialDays || 10) * 86400000);
      }

      await prisma.workspaceSubscription.create({
        data: {
          companyId: c.id,
          modules,
          tier,
          billingCycleMonths: 3,
          pricePerMonth: 0,
          startedAt,
          renewsAt,
          status,
          razorpayPaymentId: c.paymentId || null,
        },
      });
      console.log(`+ sub ${c.name} → ${modules.join('+')} ${tier} ${status}`);
    }

    if (c.plan !== 'STARTER') {
      const ivr = await prisma.iVRIntegration.findUnique({ where: { companyId: c.id } });
      if (!ivr) {
        await prisma.iVRIntegration.create({
          data: {
            companyId: c.id,
            mode: 'NATIVE',
            provider: 'AMAZON_CONNECT',
            webhookSecret: crypto.randomUUID(),
            status: 'CONNECTED',
          },
        });
        console.log(`+ native IVR ${c.name}`);
      }
    }
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
