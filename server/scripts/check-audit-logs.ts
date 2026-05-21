import { PrismaClient } from '../generated/prisma';

async function checkAuditLogs() {
  const prisma = new PrismaClient();
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        actor: {
          select: {
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    console.log(`--- Recent Audit Logs (Count: ${logs.length}) ---`);
    for (const log of logs) {
      console.log(`[${log.createdAt.toISOString()}] Action: ${log.action} | Entity: ${log.entityType} (${log.entityId})`);
      console.log(`  Performed By: ${log.actor?.email} (${log.actor?.profile?.firstName} ${log.actor?.profile?.lastName})`);
      console.log(`  Details: ${log.details}`);
      console.log('----------------------------------------------------');
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuditLogs();
