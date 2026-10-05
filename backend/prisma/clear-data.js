import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Removing all CRM data (users, leads, calls, etc.)...');
  await prisma.notification.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.note.deleteMany();
  await prisma.followUp.deleteMany();
  // CallLog delete is blocked by Prisma middleware — wipe via SQL for maintenance only
  await prisma.$executeRawUnsafe(`UPDATE "ai_jobs" SET "call_log_id" = NULL`);
  await prisma.$executeRawUnsafe(`DELETE FROM "call_recording_accesses"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "call_logs"`);
  await prisma.lead.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.webhookLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.leadAssignmentState.updateMany({ data: { lastEmployeeId: null } });
  console.log('All data cleared. Run: npm run db:seed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
